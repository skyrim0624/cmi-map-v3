import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  Check,
  Crosshair,
  Edit3,
  HelpCircle,
  ImagePlus,
  Loader2,
  MapPin,
  Megaphone,
  MessageCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import type { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LeafletMap } from '@/components/map/LeafletMap';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getAllRecommendations } from '@/db/api';
import {
  createBlackboardComment,
  createBlackboardAnnouncement,
  createBlackboardPost,
  deleteBlackboardPost,
  getBlackboardActivityStats,
  getBlackboardPosts,
  getBlackboardAnnouncements,
  getBlackboardTitlePreferences,
  hideBlackboardAnnouncement,
  type BlackboardAnnouncementRecord,
  type BlackboardCommentRecord,
  type BlackboardPostCategory,
  type BlackboardPostRecord,
  setBlackboardPostFeatured,
  updateBlackboardPost,
  uploadBlackboardImages,
} from '@/db/blackboard-posts';
import { supabase } from '@/db/supabase';
import {
  buildEventPlaceCandidates,
  createEventPlaceCandidateFromExternalPlace,
  findExactEventPlaceCandidate,
  inferEventPlaceCandidatesFromText,
  searchEventPlaceCandidates,
  type EventPlaceCandidate,
} from '@/features/cmi-events/event-place-binding';
import {
  BLACKBOARD_CATEGORY_LABELS,
  BLACKBOARD_CATEGORY_OPTIONS,
  coerceBlackboardCategory,
  formatBlackboardCreatedLabel,
  getBlackboardAchievementTitleById,
  getBlackboardActivityTitle,
  getBlackboardFeedFilters,
  getBlackboardDateGroupLabel,
  sortBlackboardFeedPosts,
  type BlackboardAchievementTitleId,
  type BlackboardPostFilter,
} from '@/features/home/blackboard/blackboard-model';
import { searchExternalPlaceCandidates } from '@/features/places/external-place-search';
import { useDebounce } from '@/hooks/use-debounce';
import { getCmiEventPath, getPersonMapPath, getPlacePath } from '@/lib/paths';
import { cn } from '@/lib/utils';
import { isPublicMapRecommendation } from '@/types/types';
import { normalizeImageFile } from '@/utils/imageCompression';

type DraftImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type BlackboardComment = BlackboardCommentRecord & {
  authorAvatarUrl: string;
  authorActivityLevel: number;
  authorActivityTitle: string;
  authorAchievementTitle: string;
};

interface BlackboardPublicProfile {
  id: string;
  user_name: string | null;
  avatar_url: string | null;
}

interface BlackboardPost {
  id: string;
  category: BlackboardPostCategory;
  title: string;
  body: string;
  linkedEventId?: string;
  linkedEventTitle?: string;
  linkedPlaceName?: string;
  authorId: string;
  author: string;
  authorInitial: string;
  authorAvatarUrl: string;
  authorActivityLevel: number;
  authorActivityTitle: string;
  authorAchievementTitle: string;
  createdAt: string;
  createdLabel: string;
  dateGroupLabel: string;
  timeLabel: string;
  locationLabel: string;
  peopleLabel: string;
  contactLabel: string;
  imageUrls: string[];
  isFeatured: boolean;
  featuredAt: string;
  comments: BlackboardComment[];
}

interface BlackboardAnnouncement {
  id: string;
  title: string;
  body: string;
  linkLabel: string;
  linkUrl: string;
  createdLabel: string;
}

export interface BlackboardDraft {
  category: BlackboardPostCategory;
  title: string;
  body: string;
  timeLabel: string;
  locationLabel: string;
  peopleLabel: string;
  contactLabel: string;
  imageUrls: string[];
  imageFiles: DraftImage[];
  linkedEventId?: string;
  linkedEventTitle?: string;
  linkedPlaceName?: string;
}

interface CategoryMeta {
  id: BlackboardPostFilter;
  label: string;
  Icon: LucideIcon;
}

const POST_TITLE_LIMIT = 48;
const POST_BODY_LIMIT = 600;
const COMMENT_BODY_LIMIT = 500;
const ANNOUNCEMENT_TITLE_LIMIT = 48;
const ANNOUNCEMENT_BODY_LIMIT = 280;
const BLACKBOARD_ICON_URL = '/cmi-home/blackboard-together.svg';
const CHIANG_MAI_MAP_CENTER = { lat: 18.7883, lng: 98.9853 };

const FILTER_ICON_BY_ID: Record<BlackboardPostFilter, LucideIcon> = {
  all: Sparkles,
  featured: Star,
  companion: UsersRound,
  help: HelpCircle,
  share: MessageCircle,
};

const CATEGORY_META: CategoryMeta[] = getBlackboardFeedFilters().map(({ id, label }) => ({
  id,
  label,
  Icon: FILTER_ICON_BY_ID[id],
}));

const CATEGORY_ICON_BY_ID: Record<BlackboardPostCategory, LucideIcon> = {
  companion: UsersRound,
  help: HelpCircle,
  share: MessageCircle,
};

const CATEGORY_TONES: Record<BlackboardPostCategory, string> = {
  companion: 'bg-primary/10 text-primary border-primary/20',
  help: 'bg-[#eef3ff] text-[#4a6a9e] border-[#4a6a9e]/15',
  share: 'bg-[#ecf7f1] text-[#2f7651] border-[#2f7651]/15',
};
const DEFAULT_BLACKBOARD_ACTIVITY_TITLE = getBlackboardActivityTitle({ postCount: 0, commentCount: 0 });

const createEmptyDraft = (): BlackboardDraft => ({
  category: 'companion',
  title: '',
  body: '',
  timeLabel: '',
  locationLabel: '',
  peopleLabel: '',
  contactLabel: '',
  imageUrls: [],
  imageFiles: [],
});

const getAuthorInitial = (author: string) => author.trim().charAt(0).toUpperCase() || '?';

const EMPTY_META_VALUES = new Set(['时间待定', '地点待定', '0']);

const getDisplayValue = (value: string | null | undefined) => {
  const displayValue = value?.trim() || '';
  return EMPTY_META_VALUES.has(displayValue) ? '' : displayValue;
};

const stopCardOpen = (event: MouseEvent<HTMLElement>) => {
  event.stopPropagation();
};

const isMissingPublicProfilesError = (error: { code?: string; message?: string }) => {
  const message = error.message?.toLocaleLowerCase() ?? '';
  return error.code === '42P01' || error.code === 'PGRST205' || message.includes('public_profiles');
};

const indexPublicProfilesById = (profiles: BlackboardPublicProfile[]) =>
  profiles.reduce<Record<string, BlackboardPublicProfile>>((profilesById, profile) => {
    profilesById[profile.id] = profile;
    return profilesById;
  }, {});

const getBlackboardProfilesByUserIds = async (userIds: string[]): Promise<BlackboardPublicProfile[]> => {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return [];

  const publicProfilesResult = await supabase
    .from('public_profiles')
    .select('id,user_name,avatar_url')
    .in('id', uniqueUserIds);

  if (!publicProfilesResult.error) {
    return Array.isArray(publicProfilesResult.data)
      ? publicProfilesResult.data as BlackboardPublicProfile[]
      : [];
  }

  if (!isMissingPublicProfilesError(publicProfilesResult.error)) {
    console.warn('获取论坛作者公开资料失败:', publicProfilesResult.error);
    return [];
  }

  const profilesResult = await supabase
    .from('profiles')
    .select('id,user_name,avatar_url')
    .in('id', uniqueUserIds);

  if (profilesResult.error) {
    console.warn('获取论坛作者资料失败:', profilesResult.error);
    return [];
  }

  return Array.isArray(profilesResult.data)
    ? profilesResult.data as BlackboardPublicProfile[]
    : [];
};

const hydratePostProfiles = async (posts: BlackboardPost[]): Promise<BlackboardPost[]> => {
  const authorIds = posts.flatMap(post => [
    post.authorId,
    ...post.comments.map(comment => comment.author_id),
  ]);
  const [profiles, activityStats, titlePreferences] = await Promise.all([
    getBlackboardProfilesByUserIds(authorIds),
    getBlackboardActivityStats(authorIds),
    getBlackboardTitlePreferences(authorIds),
  ]);
  const profilesById = indexPublicProfilesById(profiles);
  const activityTitlesByAuthorId = activityStats.reduce<Record<string, typeof DEFAULT_BLACKBOARD_ACTIVITY_TITLE>>(
    (titlesByAuthorId, stats) => {
      titlesByAuthorId[stats.author_id] = getBlackboardActivityTitle({
        postCount: stats.post_count,
        commentCount: stats.comment_count,
      });
      return titlesByAuthorId;
    },
    {}
  );
  const getActivityTitleForAuthor = (authorId: string) =>
    activityTitlesByAuthorId[authorId] || DEFAULT_BLACKBOARD_ACTIVITY_TITLE;
  const achievementTitlesByAuthorId = titlePreferences.reduce<Record<string, string>>(
    (titlesByAuthorId, preference) => {
      titlesByAuthorId[preference.user_id] =
        getBlackboardAchievementTitleById(preference.achievement_title_id)?.title || '';
      return titlesByAuthorId;
    },
    {}
  );
  const getAchievementTitleForAuthor = (authorId: string) => achievementTitlesByAuthorId[authorId] || '';

  return posts.map(post => ({
    ...post,
    authorAvatarUrl: profilesById[post.authorId]?.avatar_url || '',
    authorActivityLevel: getActivityTitleForAuthor(post.authorId).level,
    authorActivityTitle: getActivityTitleForAuthor(post.authorId).title,
    authorAchievementTitle: getAchievementTitleForAuthor(post.authorId),
    comments: post.comments.map(comment => ({
      ...comment,
      authorAvatarUrl: profilesById[comment.author_id]?.avatar_url || '',
      authorActivityLevel: getActivityTitleForAuthor(comment.author_id).level,
      authorActivityTitle: getActivityTitleForAuthor(comment.author_id).title,
      authorAchievementTitle: getAchievementTitleForAuthor(comment.author_id),
    })),
  }));
};

const mapBlackboardPost = (record: BlackboardPostRecord): BlackboardPost => {
  const author = record.author_name || 'CMI 朋友';

  return {
    id: record.id,
    category: coerceBlackboardCategory(record.category),
    title: record.title,
    body: record.body,
    linkedEventId: record.linked_event_id ?? undefined,
    linkedEventTitle: record.linked_event_title ?? undefined,
    linkedPlaceName: record.linked_place_name ?? undefined,
    authorId: record.author_id,
    author,
    authorInitial: getAuthorInitial(author),
    authorAvatarUrl: '',
    authorActivityLevel: DEFAULT_BLACKBOARD_ACTIVITY_TITLE.level,
    authorActivityTitle: DEFAULT_BLACKBOARD_ACTIVITY_TITLE.title,
    authorAchievementTitle: '',
    createdAt: record.created_at,
    createdLabel: formatBlackboardCreatedLabel(record.created_at),
    dateGroupLabel: getBlackboardDateGroupLabel(record.created_at),
    timeLabel: getDisplayValue(record.time_label),
    locationLabel: getDisplayValue(record.location_label),
    peopleLabel: getDisplayValue(record.people_label),
    contactLabel: getDisplayValue(record.contact_label),
    imageUrls: Array.isArray(record.image_urls) ? record.image_urls.filter(Boolean) : [],
    isFeatured: record.is_featured === true,
    featuredAt: record.featured_at ?? '',
    comments: (record.comments || []).map(comment => ({
      ...comment,
      authorAvatarUrl: '',
      authorActivityLevel: DEFAULT_BLACKBOARD_ACTIVITY_TITLE.level,
      authorActivityTitle: DEFAULT_BLACKBOARD_ACTIVITY_TITLE.title,
      authorAchievementTitle: '',
    })),
  };
};

const mapBlackboardAnnouncement = (record: BlackboardAnnouncementRecord): BlackboardAnnouncement => ({
  id: record.id,
  title: record.title,
  body: record.body,
  linkLabel: getDisplayValue(record.link_label),
  linkUrl: getDisplayValue(record.link_url),
  createdLabel: formatBlackboardCreatedLabel(record.created_at),
});

const revokeDraftImages = (images: DraftImage[]) => {
  images.forEach(image => URL.revokeObjectURL(image.previewUrl));
};

function getPostCount(posts: BlackboardPost[], filter: BlackboardPostFilter) {
  if (filter === 'all') return posts.length;
  if (filter === 'featured') return posts.filter(post => post.isFeatured).length;
  return posts.filter(post => post.category === filter).length;
}

function SheetShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/35 px-0" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="关闭"
        onClick={onClose}
      />
      <section
        className="relative flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[1.6rem] border border-border bg-background shadow-[0_-18px_48px_rgba(32,25,54,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-4">
          <h3 className="text-[1.55rem] font-black leading-tight text-foreground">{title}</h3>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-white text-foreground"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          {children}
        </div>
      </section>
    </div>
  );
}

function PostMeta({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-white px-3 text-xs font-black text-muted-foreground">
      <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
      {children}
    </span>
  );
}

function PostImages({ imageUrls }: { imageUrls: string[] }) {
  if (imageUrls.length === 0) return null;

  return (
    <div className={cn('grid gap-2', imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
      {imageUrls.map((imageUrl, index) => (
        <img
          key={`${imageUrl}-${index}`}
          src={imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            'w-full rounded-[1rem] border border-border object-cover',
            imageUrls.length === 1 ? 'max-h-[19rem]' : 'aspect-square'
          )}
        />
      ))}
    </div>
  );
}

function UserAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#eef0f4] font-black text-[#6f86a0]',
        className
      )}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={`${name} 的头像`} className="h-full w-full object-cover" />
      ) : (
        getAuthorInitial(name)
      )}
    </span>
  );
}

function UserActivityBadge({ title }: { title: string }) {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-[0.35rem] bg-primary/10 px-1.5 text-[0.68rem] font-black leading-none text-primary">
      {title}
    </span>
  );
}

function UserAchievementBadge({ title }: { title: string }) {
  if (!title) return null;

  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-[0.35rem] bg-[#edf7f3] px-1.5 text-[0.68rem] font-black leading-none text-[#237454]">
      {title}
    </span>
  );
}

function renderPostBody(post: BlackboardPost, options?: { onLinkClick?: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  if (!post.linkedEventId || !post.linkedEventTitle) return post.body;

  const mention = `@${post.linkedEventTitle}`;
  const mentionIndex = post.body.indexOf(mention);
  if (mentionIndex < 0) return post.body;

  const beforeMention = post.body.slice(0, mentionIndex);
  const afterMention = post.body.slice(mentionIndex + mention.length);

  return (
    <>
      {beforeMention}
      <Link
        to={getCmiEventPath(post.linkedEventId)}
        onClick={options?.onLinkClick}
        className="font-black text-primary underline decoration-primary/35 underline-offset-4 active:opacity-70"
      >
        {mention}
      </Link>
      {afterMention}
    </>
  );
}

function BlackboardPostCard({
  post,
  userId,
  isAdmin,
  onOpen,
  onEdit,
  onDelete,
  onToggleFeatured,
}: {
  post: BlackboardPost;
  userId?: string;
  isAdmin: boolean;
  onOpen: (post: BlackboardPost) => void;
  onEdit: (post: BlackboardPost) => void;
  onDelete: (post: BlackboardPost) => void;
  onToggleFeatured: (post: BlackboardPost) => void;
}) {
  const CategoryIcon = CATEGORY_ICON_BY_ID[post.category];
  const placePath = post.linkedPlaceName ? getPlacePath(post.linkedPlaceName) : undefined;
  const canManagePost = Boolean(userId && post.authorId === userId);
  const metaItems = [
    post.timeLabel ? { id: 'time', value: post.timeLabel } : null,
    post.locationLabel ? { id: 'location', value: post.locationLabel, to: placePath } : null,
  ].filter(Boolean) as Array<{ id: string; value: string; to?: string }>;
  const openPost = () => onOpen(post);
  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    openPost();
  };

  return (
    <article
      className="cursor-pointer bg-white px-5 pb-5 pt-6 transition-colors active:bg-[#fafafa]"
      role="button"
      tabIndex={0}
      aria-label={`打开帖子：${post.title}`}
      onClick={openPost}
      onKeyDown={handleCardKeyDown}
    >
      <div className="flex items-start gap-3">
        <Link
          to={getPersonMapPath(post.authorId)}
          onClick={stopCardOpen}
          className="shrink-0 active:opacity-80"
          aria-label={`查看${post.author}的清迈地图`}
        >
          <UserAvatar name={post.author} avatarUrl={post.authorAvatarUrl} className="h-[3.15rem] w-[3.15rem] text-[1.15rem]" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link
              to={getPersonMapPath(post.authorId)}
              onClick={stopCardOpen}
              className="min-w-0 truncate text-[1.06rem] font-black leading-tight text-[#6d839b] active:opacity-70"
            >
              {post.author}
            </Link>
            <UserActivityBadge title={post.authorActivityTitle} />
            <UserAchievementBadge title={post.authorAchievementTitle} />
            {isAdmin && userId === post.authorId && (
              <span className="inline-flex h-5 shrink-0 items-center rounded-[0.35rem] bg-[#fff4c7] px-1.5 text-[0.68rem] font-black leading-none text-[#9a6a00]">
                管理员
              </span>
            )}
          </div>
          <p className="mt-1 text-[0.94rem] font-semibold leading-none text-[#9b9b9b]">
            {post.createdLabel}
          </p>
        </div>

        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#9c9c9c] active:bg-[#f2f2f2]"
          onClick={openPost}
          aria-label="打开帖子详情"
        >
          <span className="text-[1.6rem] font-black leading-none">...</span>
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-[1.32rem] font-medium leading-snug text-[#5c5c5c]">{post.title}</h3>
        <p className="whitespace-pre-wrap text-[1.08rem] font-normal leading-[1.58] text-[#5f5f5f]">
          {renderPostBody(post, { onLinkClick: stopCardOpen })}
        </p>
      </div>

      {metaItems.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.94rem] font-semibold text-[#8c8c8c]">
          {metaItems.map((item, index) => (
            <span key={item.id} className="inline-flex min-w-0 items-center gap-2">
              {index > 0 && <span className="text-[#c3c3c3]">·</span>}
              {item.to ? (
                <Link to={item.to} onClick={stopCardOpen} className="min-w-0 truncate active:opacity-70">
                  {item.value}
                </Link>
              ) : (
                <span className="min-w-0 truncate">{item.value}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {post.contactLabel && (
        <p className="mt-2 whitespace-pre-wrap text-[0.94rem] font-semibold leading-relaxed text-[#8c8c8c]">
          {post.contactLabel}
        </p>
      )}

      <div className="mt-3">
        <PostImages imageUrls={post.imageUrls} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-[0.35rem] px-1.5 py-0.5 text-[0.72rem] font-black leading-none',
              CATEGORY_TONES[post.category]
            )}
          >
            <CategoryIcon className="h-3 w-3" strokeWidth={2.4} />
            {BLACKBOARD_CATEGORY_LABELS[post.category]}
          </span>
          {post.isFeatured && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-[0.35rem] bg-[#fff4c7] px-1.5 py-0.5 text-[0.72rem] font-black leading-none text-[#9a6a00]">
              <Star className="h-3 w-3 fill-current" strokeWidth={2.4} />
              精选
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-4 text-[#525252]">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-1 text-[0.95rem] font-bold active:bg-[#f2f2f2]"
            onClick={openPost}
            aria-label="查看评论"
          >
            <MessageCircle className="h-5 w-5" strokeWidth={2.1} />
            {post.comments.length > 0 && <span>{post.comments.length}</span>}
          </button>

          {canManagePost && (
            <>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full text-[#606060] active:bg-[#f2f2f2]"
                onClick={event => {
                  event.stopPropagation();
                  onEdit(post);
                }}
                aria-label="编辑帖子"
              >
                <Edit3 className="h-5 w-5" strokeWidth={2.1} />
              </button>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full text-destructive active:bg-destructive/10"
                onClick={event => {
                  event.stopPropagation();
                  onDelete(post);
                }}
                aria-label="删除帖子"
              >
                <Trash2 className="h-5 w-5" strokeWidth={2.1} />
              </button>
            </>
          )}
          {isAdmin && (
            <button
              type="button"
              className={cn(
                'inline-flex h-10 items-center gap-1 rounded-full px-1 text-[0.95rem] font-bold active:bg-[#f2f2f2]',
                post.isFeatured ? 'text-[#a87900]' : 'text-[#606060]'
              )}
              onClick={event => {
                event.stopPropagation();
                onToggleFeatured(post);
              }}
              aria-label={post.isFeatured ? '取消精选' : '设为精选'}
            >
              <Star className={cn('h-5 w-5', post.isFeatured && 'fill-current')} strokeWidth={2.1} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function AnnouncementStrip({
  announcements,
  isAdmin,
  onCreate,
  onHide,
}: {
  announcements: BlackboardAnnouncement[];
  isAdmin: boolean;
  onCreate: () => void;
  onHide: (announcement: BlackboardAnnouncement) => void;
}) {
  if (announcements.length === 0 && !isAdmin) return null;

  const primaryAnnouncement = announcements[0];

  return (
    <section className="border-b border-[#eeeeee] bg-white px-5 py-3" aria-label="公告栏">
      {primaryAnnouncement ? (
        <div className="flex items-start gap-3 rounded-[0.85rem] bg-[#f5f6f8] px-3 py-3">
          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#18b99c]/12 text-[#12967e]">
            <Megaphone className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[0.98rem] font-black text-[#333333]">
                {primaryAnnouncement.title}
              </p>
              <span className="shrink-0 text-[0.72rem] font-bold text-[#9b9b9b]">
                {primaryAnnouncement.createdLabel}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-[0.95rem] font-medium leading-relaxed text-[#666666]">
              {primaryAnnouncement.body}
            </p>
            {primaryAnnouncement.linkLabel && primaryAnnouncement.linkUrl && (
              <a
                href={primaryAnnouncement.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-[0.9rem] font-black text-[#12967e] active:opacity-70"
              >
                {primaryAnnouncement.linkLabel}
              </a>
            )}
          </div>
          {isAdmin && (
            <button
              type="button"
              className="shrink-0 rounded-full px-2 py-1 text-xs font-black text-[#888888] active:bg-white"
              onClick={() => onHide(primaryAnnouncement)}
            >
              隐藏
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[0.85rem] border border-dashed border-[#d7d7d7] bg-[#fafafa] text-[0.95rem] font-black text-[#666666]"
          onClick={onCreate}
        >
          <Megaphone className="h-4 w-4" strokeWidth={2.4} />
          发一条公告
        </button>
      )}

      {isAdmin && primaryAnnouncement && (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-[0.86rem] font-black text-[#12967e]"
          onClick={onCreate}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
          新公告
        </button>
      )}
    </section>
  );
}

function AnnouncementSheet({
  draft,
  submitting,
  onDraftChange,
  onSubmit,
  onClose,
}: {
  draft: { title: string; body: string; linkLabel: string; linkUrl: string };
  submitting: boolean;
  onDraftChange: (draft: { title: string; body: string; linkLabel: string; linkUrl: string }) => void;
  onSubmit: () => Promise<void>;
  onClose: () => void;
}) {
  const isValid = draft.title.trim().length > 0 && draft.body.trim().length > 0;

  const updateDraft = (field: keyof typeof draft, value: string) => {
    onDraftChange({ ...draft, [field]: value });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || submitting) return;
    void onSubmit();
  };

  return (
    <SheetShell title="发公告" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="flex items-center justify-between gap-3 text-sm font-black text-foreground">
            标题
            <span className="text-xs text-muted-foreground">
              {draft.title.length}/{ANNOUNCEMENT_TITLE_LIMIT}
            </span>
          </span>
          <input
            value={draft.title}
            maxLength={ANNOUNCEMENT_TITLE_LIMIT}
            onChange={event => updateDraft('title', event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-border bg-white px-4 text-base font-bold text-foreground outline-none focus:border-primary"
            placeholder="比如：今晚客栈有饭局"
          />
        </label>

        <label className="block">
          <span className="flex items-center justify-between gap-3 text-sm font-black text-foreground">
            内容
            <span className="text-xs text-muted-foreground">
              {draft.body.length}/{ANNOUNCEMENT_BODY_LIMIT}
            </span>
          </span>
          <textarea
            value={draft.body}
            maxLength={ANNOUNCEMENT_BODY_LIMIT}
            onChange={event => updateDraft('body', event.target.value)}
            className="mt-2 min-h-[7.5rem] w-full resize-none rounded-2xl border border-border bg-white px-4 py-3 text-base font-semibold leading-relaxed text-foreground outline-none focus:border-primary"
            placeholder="写清楚要通知大家的事。"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-black text-muted-foreground">链接文字，可不填</span>
            <input
              value={draft.linkLabel}
              onChange={event => updateDraft('linkLabel', event.target.value)}
              className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm font-bold outline-none focus:border-primary"
              placeholder="查看详情"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black text-muted-foreground">链接，可不填</span>
            <input
              value={draft.linkUrl}
              onChange={event => updateDraft('linkUrl', event.target.value)}
              className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm font-bold outline-none focus:border-primary"
              placeholder="https://..."
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-black text-primary-foreground shadow-[0_12px_26px_rgba(111,90,168,0.24)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submitting ? '发布中…' : '发布公告'}
        </button>
      </form>
    </SheetShell>
  );
}

function LocationMapPickerSheet({
  center,
  onCenterChange,
  onConfirm,
  onClose,
}: {
  center: { lat: number; lng: number };
  onCenterChange: (center: { lat: number; lng: number }) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const initialCenterRef = useRef(center);

  return (
    <div className="fixed inset-0 z-[80] flex justify-center bg-white sm:bg-foreground/30" role="presentation">
      <section
        className="flex h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden bg-white shadow-[0_0_44px_rgba(28,28,28,0.18)]"
        role="dialog"
        aria-modal="true"
        aria-label="地图选点"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#ededed] bg-white px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-[#222222] active:bg-[#f2f2f2]"
            onClick={onClose}
            aria-label="返回发帖"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2.35} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[1.15rem] font-black leading-tight text-[#222222]">地图选点</p>
            <p className="mt-0.5 text-[0.78rem] font-bold text-[#8c8c8c]">
              拖动地图，让红点对准大概位置。
            </p>
          </div>
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground"
            onClick={onConfirm}
          >
            确认
          </button>
        </header>

        <div className="relative min-h-0 flex-1">
          <LeafletMap
            mode="mark"
            defaultCenter={initialCenterRef.current}
            defaultZoom={16}
            markTargetYRatio={0.5}
            onCenterChange={(lat, lng) => onCenterChange({ lat, lng })}
            className="h-full w-full border-none outline-none"
          />
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1002] -translate-x-1/2 -translate-y-full text-[#e53b35] drop-shadow-[0_5px_10px_rgba(0,0,0,0.3)]">
            <MapPin className="h-12 w-12 fill-[#e53b35]" strokeWidth={2.2} />
          </div>
          <div className="pointer-events-none absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[1002] rounded-2xl bg-white/92 px-4 py-3 text-center shadow-[0_12px_30px_rgba(0,0,0,0.16)] backdrop-blur">
            <p className="text-sm font-black text-[#222222]">
              {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function BlackboardLocationField({
  draft,
  onDraftChange,
}: {
  draft: BlackboardDraft;
  onDraftChange: (draft: BlackboardDraft) => void;
}) {
  const [placeCandidates, setPlaceCandidates] = useState<EventPlaceCandidate[]>(() => buildEventPlaceCandidates([]));
  const [selectedPlace, setSelectedPlace] = useState<EventPlaceCandidate | null>(null);
  const [placeCandidatesLoading, setPlaceCandidatesLoading] = useState(false);
  const [externalPlaceCandidates, setExternalPlaceCandidates] = useState<EventPlaceCandidate[]>([]);
  const [externalPlaceCandidatesLoading, setExternalPlaceCandidatesLoading] = useState(false);
  const [externalPlaceCandidatesError, setExternalPlaceCandidatesError] = useState<string | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapPickerCenter, setMapPickerCenter] = useState(CHIANG_MAI_MAP_CENTER);
  const debouncedLocationQuery = useDebounce(draft.locationLabel, 520);

  const naturalPlaceCandidates = useMemo(
    () =>
      selectedPlace
        ? []
        : inferEventPlaceCandidatesFromText(
          placeCandidates,
          [draft.title, draft.body].filter(Boolean).join(' ')
        ),
    [draft.body, draft.title, placeCandidates, selectedPlace]
  );

  const searchPlaceCandidates = useMemo(
    () =>
      selectedPlace
        ? []
        : searchEventPlaceCandidates(placeCandidates, draft.locationLabel, draft.locationLabel.trim() ? 5 : 3),
    [draft.locationLabel, placeCandidates, selectedPlace]
  );

  const hasLocationQuery = Boolean(draft.locationLabel.trim());
  const visibleInternalPlaceCandidates = hasLocationQuery ? searchPlaceCandidates : naturalPlaceCandidates;
  const shouldSearchExternalPlaces =
    hasLocationQuery &&
    debouncedLocationQuery.trim().length >= 2 &&
    !selectedPlace &&
    !placeCandidatesLoading &&
    searchPlaceCandidates.length === 0;
  const visibleExternalPlaceCandidates = shouldSearchExternalPlaces ? externalPlaceCandidates : [];

  useEffect(() => {
    let isMounted = true;
    setPlaceCandidatesLoading(true);

    getAllRecommendations()
      .then(recommendations => {
        if (!isMounted) return;
        setPlaceCandidates(buildEventPlaceCandidates(recommendations.filter(isPublicMapRecommendation)));
      })
      .catch(() => {
        if (!isMounted) return;
        setPlaceCandidates(buildEventPlaceCandidates([]));
      })
      .finally(() => {
        if (isMounted) setPlaceCandidatesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!shouldSearchExternalPlaces) {
      setExternalPlaceCandidates([]);
      setExternalPlaceCandidatesLoading(false);
      setExternalPlaceCandidatesError(null);
      return;
    }

    const controller = new AbortController();
    setExternalPlaceCandidatesLoading(true);
    setExternalPlaceCandidatesError(null);

    searchExternalPlaceCandidates(debouncedLocationQuery, {
      signal: controller.signal,
      limit: 5,
    })
      .then(places => {
        setExternalPlaceCandidates(places.map(createEventPlaceCandidateFromExternalPlace));
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setExternalPlaceCandidates([]);
        setExternalPlaceCandidatesError('外部地点暂时搜不到，可以直接地图选点');
      })
      .finally(() => {
        if (!controller.signal.aborted) setExternalPlaceCandidatesLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedLocationQuery, shouldSearchExternalPlaces]);

  const updateLocationDraft = (locationLabel: string, linkedPlaceName?: string) => {
    onDraftChange({
      ...draft,
      locationLabel,
      linkedPlaceName,
    });
  };

  const handleLocationChange = (value: string) => {
    updateLocationDraft(value);
    if (selectedPlace && selectedPlace.placeName !== value) setSelectedPlace(null);
  };

  const applyPlaceCandidate = (candidate: EventPlaceCandidate) => {
    setSelectedPlace(candidate);
    const linkedPlaceName = candidate.recommendationCount > 0 ? candidate.placeName : undefined;
    updateLocationDraft(candidate.placeName, linkedPlaceName);
    toast.success(candidate.bindingSource === 'external' ? '已定位外部地点' : '已绑定地图地点', {
      description: candidate.placeName,
    });
  };

  const getMapInitialCenter = () => {
    const exactCandidate = findExactEventPlaceCandidate(placeCandidates, draft.locationLabel);
    const candidate = selectedPlace ?? exactCandidate ?? visibleInternalPlaceCandidates[0] ?? visibleExternalPlaceCandidates[0];
    return candidate
      ? { lat: candidate.latitude, lng: candidate.longitude }
      : CHIANG_MAI_MAP_CENTER;
  };

  const openMapPicker = () => {
    setMapPickerCenter(getMapInitialCenter());
    setMapPickerOpen(true);
  };

  const confirmMapPicker = () => {
    // NOTE: 黑板表当前只保存 location_label；手动地图选点先落成可读位置文本，后续社交地图坐标字段再接这里。
    updateLocationDraft(`地图选点 · ${mapPickerCenter.lat.toFixed(5)}, ${mapPickerCenter.lng.toFixed(5)}`);
    setSelectedPlace(null);
    setMapPickerOpen(false);
  };

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-xs font-black text-muted-foreground">地点 / 区域，可不填</span>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={draft.locationLabel}
            onChange={event => handleLocationChange(event.target.value)}
            className="h-11 w-full rounded-2xl border border-border bg-white px-9 text-sm font-bold outline-none focus:border-primary"
            placeholder="搜地点 / 俗称，比如 北门"
          />
          {draft.locationLabel && (
            <button
              type="button"
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-[#f2f2f2] text-muted-foreground"
              onClick={() => {
                updateLocationDraft('');
                setSelectedPlace(null);
              }}
              aria-label="清除地点"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </label>

      <button
        type="button"
        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white text-sm font-black text-muted-foreground active:scale-[0.99]"
        onClick={openMapPicker}
      >
        <Crosshair className="h-4 w-4" strokeWidth={2.4} />
        地图选点
      </button>

      {selectedPlace ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-bold text-primary">
          <div className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="truncate font-black">已选：{selectedPlace.placeName}</p>
              <p className="mt-0.5 truncate text-xs text-primary/75">{selectedPlace.areaLabel}</p>
            </div>
          </div>
        </div>
      ) : visibleInternalPlaceCandidates.length > 0 || visibleExternalPlaceCandidates.length > 0 ? (
        <div className="rounded-2xl border border-border bg-white p-2">
          <div className="mb-1 flex items-center gap-1.5 px-2 text-[11px] font-black text-muted-foreground">
            {hasLocationQuery ? <MapPin className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {visibleExternalPlaceCandidates.length > 0
              ? '外部地点候选'
              : hasLocationQuery ? 'CMI 地点候选' : '从标题 / 内容识别到'}
          </div>
          <div className="space-y-1.5">
            {visibleInternalPlaceCandidates.map(candidate => (
              <button
                key={`${candidate.placeName}-${candidate.latitude}-${candidate.longitude}`}
                type="button"
                onClick={() => applyPlaceCandidate(candidate)}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#f7f7f7] px-3 py-2 text-left active:scale-[0.99]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-foreground">{candidate.placeName}</span>
                  <span className="mt-0.5 block truncate text-[11px] font-bold text-muted-foreground">
                    {candidate.areaLabel}
                    {candidate.recommendationCount > 0 ? ` · ${candidate.recommendationCount} 条痕迹` : ' · 俗称候选'}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-black text-primary">
                  使用
                </span>
              </button>
            ))}
            {visibleExternalPlaceCandidates.map(candidate => (
              <button
                key={`${candidate.externalPlaceId}-${candidate.latitude}-${candidate.longitude}`}
                type="button"
                onClick={() => applyPlaceCandidate(candidate)}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#f5fbf6] px-3 py-2 text-left active:scale-[0.99]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-foreground">{candidate.placeName}</span>
                  <span className="mt-0.5 block truncate text-[11px] font-bold text-[#53705b]">
                    {candidate.areaLabel} · 外部地点
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-[#3f6e52] px-2.5 py-1 text-[11px] font-black text-white">
                  定位
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : externalPlaceCandidatesLoading ? (
        <p className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          正在查清迈外部地点
        </p>
      ) : externalPlaceCandidatesError ? (
        <p className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-muted-foreground">
          {externalPlaceCandidatesError}
        </p>
      ) : placeCandidatesLoading ? (
        <p className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-muted-foreground">
          正在同步 CMI Map 地点候选
        </p>
      ) : null}

      {mapPickerOpen && (
        <LocationMapPickerSheet
          center={mapPickerCenter}
          onCenterChange={setMapPickerCenter}
          onConfirm={confirmMapPicker}
          onClose={() => setMapPickerOpen(false)}
        />
      )}
    </div>
  );
}

function ComposerSheet({
  draft,
  title,
  submitting,
  onDraftChange,
  onAddImages,
  onRemoveExistingImage,
  onRemoveDraftImage,
  onSubmit,
  onClose,
}: {
  draft: BlackboardDraft;
  title: string;
  submitting: boolean;
  onDraftChange: (draft: BlackboardDraft) => void;
  onAddImages: (files: File[]) => Promise<void>;
  onRemoveExistingImage: (imageUrl: string) => void;
  onRemoveDraftImage: (imageId: string) => void;
  onSubmit: () => Promise<void>;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isValid = draft.title.trim().length > 0 && draft.body.trim().length > 0;

  const updateDraft = <Field extends keyof BlackboardDraft>(
    field: Field,
    value: BlackboardDraft[Field]
  ) => {
    onDraftChange({ ...draft, [field]: value });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || submitting) return;
    void onSubmit();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      void onAddImages(files);
    }
    event.target.value = '';
  };

  return (
    <SheetShell title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-2">
          {BLACKBOARD_CATEGORY_OPTIONS.map(({ id, label }) => {
            const CategoryIcon = CATEGORY_ICON_BY_ID[id];

            return (
              <button
                key={id}
                type="button"
                className={cn(
                  'flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-black transition-colors',
                  draft.category === id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-white text-muted-foreground'
                )}
                onClick={() => updateDraft('category', id)}
              >
                <CategoryIcon className="h-4 w-4" strokeWidth={2.4} />
                {label}
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="flex items-center justify-between gap-3 text-sm font-black text-foreground">
            标题
            <span className="text-xs text-muted-foreground">{draft.title.length}/{POST_TITLE_LIMIT}</span>
          </span>
          <input
            value={draft.title}
            maxLength={POST_TITLE_LIMIT}
            onChange={event => updateDraft('title', event.target.value)}
            className="mt-2 h-12 w-full rounded-2xl border border-border bg-white px-4 text-base font-bold text-foreground outline-none focus:border-primary"
            placeholder="比如：今晚有人去北门听爵士吗"
          />
        </label>

        <label className="block">
          <span className="flex items-center justify-between gap-3 text-sm font-black text-foreground">
            内容
            <span className="text-xs text-muted-foreground">{draft.body.length}/{POST_BODY_LIMIT}</span>
          </span>
          <textarea
            value={draft.body}
            maxLength={POST_BODY_LIMIT}
            onChange={event => updateDraft('body', event.target.value)}
            className="mt-2 min-h-[8.75rem] w-full resize-none rounded-2xl border border-border bg-white px-4 py-3 text-base font-semibold leading-relaxed text-foreground outline-none focus:border-primary"
            placeholder="直接写你想说的事。可以约人、求助，也可以随手分享清迈生活。"
          />
        </label>

        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-white text-sm font-black text-muted-foreground active:scale-[0.99]"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
            加照片
          </button>

          {(draft.imageUrls.length > 0 || draft.imageFiles.length > 0) && (
            <div className="grid grid-cols-3 gap-2">
              {draft.imageUrls.map(imageUrl => (
                <div key={imageUrl} className="relative">
                  <img src={imageUrl} alt="" className="aspect-square w-full rounded-xl border border-border object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-foreground shadow"
                    onClick={() => onRemoveExistingImage(imageUrl)}
                    aria-label="移除已有照片"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {draft.imageFiles.map(image => (
                <div key={image.id} className="relative">
                  <img src={image.previewUrl} alt="" className="aspect-square w-full rounded-xl border border-border object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-foreground shadow"
                    onClick={() => onRemoveDraftImage(image.id)}
                    aria-label="移除待上传照片"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black text-muted-foreground">时间，可不填</span>
            <input
              value={draft.timeLabel}
              onChange={event => updateDraft('timeLabel', event.target.value)}
              className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm font-bold outline-none focus:border-primary"
              placeholder="今晚 / 周末"
            />
          </label>
          <BlackboardLocationField draft={draft} onDraftChange={onDraftChange} />
        </div>

        <label className="block">
          <span className="text-xs font-black text-muted-foreground">联系方式或联系说明，可不填</span>
          <input
            value={draft.contactLabel}
            onChange={event => updateDraft('contactLabel', event.target.value)}
            className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm font-bold outline-none focus:border-primary"
            placeholder="比如：评论里说 / 到群里找我"
          />
        </label>

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-black text-primary-foreground shadow-[0_12px_26px_rgba(111,90,168,0.24)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submitting ? '发布中…' : '发布'}
        </button>
      </form>
    </SheetShell>
  );
}

function PostDetailSheet({
  post,
  commentText,
  commentSubmitting,
  userId,
  isAdmin,
  onCommentChange,
  onSubmitComment,
  onEdit,
  onDelete,
  onClose,
}: {
  post: BlackboardPost;
  commentText: string;
  commentSubmitting: boolean;
  userId?: string;
  isAdmin: boolean;
  onCommentChange: (value: string) => void;
  onSubmitComment: () => Promise<void>;
  onEdit: (post: BlackboardPost) => void;
  onDelete: (post: BlackboardPost) => void;
  onClose: () => void;
}) {
  const CategoryIcon = CATEGORY_ICON_BY_ID[post.category];
  const canManagePost = Boolean(userId && post.authorId === userId);
  const detailPlacePath = post.linkedPlaceName ? getPlacePath(post.linkedPlaceName) : undefined;

  const handleSubmitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!commentText.trim() || commentSubmitting) return;
    void onSubmitComment();
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-center bg-white sm:bg-foreground/30" role="presentation">
      <section
        className="flex h-[100dvh] w-full max-w-[520px] flex-col overflow-hidden bg-white shadow-[0_0_44px_rgba(28,28,28,0.18)]"
        role="dialog"
        aria-modal="true"
        aria-label="帖子详情"
      >
        <header className="flex h-[4.25rem] shrink-0 items-center justify-between border-b border-[#ededed] bg-white px-4">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-[#222222] active:bg-[#f2f2f2]"
            onClick={onClose}
            aria-label="返回"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2.4} />
          </button>

          <p className="text-[1rem] font-black text-[#2b2b2b]">帖子详情</p>

          <div className="flex h-11 min-w-11 items-center justify-end gap-1">
            {canManagePost && (
              <>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-full text-[#666666] active:bg-[#f2f2f2]"
                  onClick={() => onEdit(post)}
                  aria-label="编辑帖子"
                >
                  <Edit3 className="h-5 w-5" strokeWidth={2.1} />
                </button>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-full text-destructive active:bg-destructive/10"
                  onClick={() => onDelete(post)}
                  aria-label="删除帖子"
                >
                  <Trash2 className="h-5 w-5" strokeWidth={2.1} />
                </button>
              </>
            )}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto pb-3">
          <article className="px-5 pb-5 pt-5">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                to={getPersonMapPath(post.authorId)}
                className="shrink-0 active:opacity-80"
                aria-label={`查看${post.author}的清迈地图`}
              >
                <UserAvatar name={post.author} avatarUrl={post.authorAvatarUrl} className="h-[3.2rem] w-[3.2rem] text-[1.15rem]" />
              </Link>
              <div className="min-w-0">
                <Link
                  to={getPersonMapPath(post.authorId)}
                  className="block truncate text-[1.06rem] font-black leading-tight text-[#6d839b] active:opacity-70"
                >
                  {post.author}
                </Link>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                  <UserActivityBadge title={post.authorActivityTitle} />
                  <UserAchievementBadge title={post.authorAchievementTitle} />
                  {isAdmin && userId === post.authorId && (
                    <span className="inline-flex h-5 shrink-0 items-center rounded-[0.35rem] bg-[#fff4c7] px-1.5 text-[0.68rem] font-black leading-none text-[#9a6a00]">
                      管理员
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[0.92rem] font-semibold leading-none text-[#9b9b9b]">
                  {post.createdLabel}
                </p>
              </div>
            </div>

            <h1 className="mt-6 text-[1.55rem] font-medium leading-snug text-[#2d2d2d]">{post.title}</h1>
            <p className="mt-3 whitespace-pre-wrap text-[1.13rem] font-normal leading-[1.58] text-[#333333]">
              {renderPostBody(post)}
            </p>

            <div className="mt-4">
              <PostImages imageUrls={post.imageUrls} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.95rem] font-semibold text-[#8c8c8c]">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-[0.35rem] px-1.5 py-0.5 text-[0.72rem] font-black leading-none',
                  CATEGORY_TONES[post.category]
                )}
              >
                <CategoryIcon className="h-3 w-3" strokeWidth={2.4} />
                {BLACKBOARD_CATEGORY_LABELS[post.category]}
              </span>
              {post.timeLabel && <span>{post.timeLabel}</span>}
              {post.locationLabel && (
                <>
                  <span className="text-[#c3c3c3]">·</span>
                  {detailPlacePath ? (
                    <Link to={detailPlacePath} className="min-w-0 truncate active:opacity-70">
                      {post.locationLabel}
                    </Link>
                  ) : (
                    <span>{post.locationLabel}</span>
                  )}
                </>
              )}
            </div>

            {post.contactLabel && (
              <p className="mt-3 whitespace-pre-wrap text-[0.98rem] font-semibold leading-relaxed text-[#666666]">
                {post.contactLabel}
              </p>
            )}
          </article>

          <section className="border-t-[0.65rem] border-[#f3f3f3] px-5 pb-5 pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[1.12rem] font-medium text-[#222222]">共{post.comments.length}条评论</h2>
            </div>

            {post.comments.length > 0 ? (
              <div className="divide-y divide-[#f1f1f1]">
                {post.comments.map(comment => (
                  <article key={comment.id} className="flex gap-3 py-4">
                    <Link
                      to={getPersonMapPath(comment.author_name)}
                      className="shrink-0 active:opacity-80"
                      aria-label={`查看${comment.author_name}的清迈地图`}
                    >
                      <UserAvatar
                        name={comment.author_name}
                        avatarUrl={comment.authorAvatarUrl}
                        className="h-11 w-11 text-[0.95rem] text-[#7a8da2]"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <Link
                          to={getPersonMapPath(comment.author_name)}
                          className="min-w-0 truncate text-[0.98rem] font-black text-[#6d839b] active:opacity-70"
                        >
                          {comment.author_name}
                        </Link>
                        <UserActivityBadge title={comment.authorActivityTitle} />
                        <UserAchievementBadge title={comment.authorAchievementTitle} />
                        <span className="shrink-0 text-[0.88rem] font-semibold text-[#9b9b9b]">
                          {formatBlackboardCreatedLabel(comment.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-[1.03rem] font-normal leading-relaxed text-[#303030]">
                        {comment.body}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-[0.98rem] font-semibold text-[#9b9b9b]">还没有评论。</p>
            )}
          </section>
        </main>

        <form
          className="flex shrink-0 items-center gap-2 border-t border-[#ededed] bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3"
          onSubmit={handleSubmitComment}
        >
          <input
            value={commentText}
            onChange={event => onCommentChange(event.target.value)}
            maxLength={COMMENT_BODY_LIMIT}
            className="h-11 min-w-0 flex-1 rounded-full border-0 bg-[#f3f3f3] px-4 text-[1rem] font-semibold text-[#333333] outline-none placeholder:text-[#9b9b9b] focus:bg-[#eeeeee]"
            placeholder="写评论"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || commentSubmitting}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#18b99c] text-white shadow-[0_6px_18px_rgba(24,185,156,0.25)] disabled:bg-[#d8d8d8] disabled:shadow-none"
            aria-label="发送评论"
          >
            <Send className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </form>
      </section>
    </div>
  );
}

export function CmiBlackboard({
  autoOpenComposer = false,
  initialDraft,
}: {
  autoOpenComposer?: boolean;
  initialDraft?: Partial<BlackboardDraft>;
} = {}) {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeFilter, setActiveFilter] = useState<BlackboardPostFilter>('all');
  const [posts, setPosts] = useState<BlackboardPost[]>([]);
  const [announcements, setAnnouncements] = useState<BlackboardAnnouncement[]>([]);
  const [draft, setDraft] = useState<BlackboardDraft>(() => createEmptyDraft());
  const [announcementDraft, setAnnouncementDraft] = useState({
    title: '',
    body: '',
    linkLabel: '',
    linkUrl: '',
  });
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [announcementComposerOpen, setAnnouncementComposerOpen] = useState(false);
  const [selectedAchievementTitleId, setSelectedAchievementTitleId] = useState<BlackboardAchievementTitleId | null>(null);
  const draftImageFilesRef = useRef<DraftImage[]>([]);
  const isAdmin = profile?.role === 'admin';
  const selectedAchievementTitle = useMemo(
    () => getBlackboardAchievementTitleById(selectedAchievementTitleId),
    [selectedAchievementTitleId]
  );

  const loadPosts = async () => {
    setLoadingPosts(true);
    setPostsError(null);

    try {
      const records = await getBlackboardPosts();
      const mappedPosts = records.map(mapBlackboardPost);
      setPosts(await hydratePostProfiles(mappedPosts));
    } catch {
      setPostsError('论坛加载失败，稍后再试。');
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadAnnouncements = async () => {
    const records = await getBlackboardAnnouncements();
    setAnnouncements(records.map(mapBlackboardAnnouncement));
  };

  useEffect(() => {
    void loadPosts();
    void loadAnnouncements();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setSelectedAchievementTitleId(null);
      return;
    }

    let isMounted = true;

    getBlackboardTitlePreferences([user.id])
      .then(([preference]) => {
        if (!isMounted) return;
        setSelectedAchievementTitleId(preference?.achievement_title_id ?? null);
      })
      .catch(error => {
        console.warn('加载我的论坛称号失败:', error);
        if (isMounted) setSelectedAchievementTitleId(null);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    draftImageFilesRef.current = draft.imageFiles;
  }, [draft.imageFiles]);

  useEffect(() => () => {
    revokeDraftImages(draftImageFilesRef.current);
  }, []);

  useEffect(() => {
    if (!autoOpenComposer || !initialDraft) return;

    const nextDraft = {
      ...createEmptyDraft(),
      ...initialDraft,
      category: initialDraft.category ? coerceBlackboardCategory(initialDraft.category) : 'companion',
      imageUrls: initialDraft.imageUrls || [],
      imageFiles: [],
    };

    setDraft(nextDraft);
    setActiveFilter(nextDraft.category);
    setEditingPostId(null);
    setComposerOpen(true);
  }, [
    autoOpenComposer,
    initialDraft?.category,
    initialDraft?.title,
    initialDraft?.body,
    initialDraft?.timeLabel,
    initialDraft?.locationLabel,
    initialDraft?.peopleLabel,
    initialDraft?.contactLabel,
    initialDraft?.linkedEventId,
    initialDraft?.linkedEventTitle,
    initialDraft?.linkedPlaceName,
  ]);

  const visiblePosts = useMemo(() => {
    const filteredPosts =
      activeFilter === 'all'
        ? posts
        : activeFilter === 'featured'
          ? posts.filter(post => post.isFeatured)
          : posts.filter(post => post.category === activeFilter);

    return sortBlackboardFeedPosts(filteredPosts);
  }, [activeFilter, posts]);

  const selectedPost = selectedPostId
    ? posts.find(post => post.id === selectedPostId) || null
    : null;

  const openCreateComposer = () => {
    revokeDraftImages(draft.imageFiles);
    setDraft(createEmptyDraft());
    setEditingPostId(null);
    setComposerOpen(true);
  };

  const openEditComposer = (post: BlackboardPost) => {
    revokeDraftImages(draft.imageFiles);
    setDraft({
      category: post.category,
      title: post.title,
      body: post.body,
      timeLabel: post.timeLabel,
      locationLabel: post.locationLabel,
      peopleLabel: post.peopleLabel,
      contactLabel: post.contactLabel,
      imageUrls: post.imageUrls,
      imageFiles: [],
      linkedEventId: post.linkedEventId,
      linkedEventTitle: post.linkedEventTitle,
      linkedPlaceName: post.linkedPlaceName,
    });
    setEditingPostId(post.id);
    setComposerOpen(true);
  };

  const closeComposer = () => {
    revokeDraftImages(draft.imageFiles);
    setDraft(createEmptyDraft());
    setEditingPostId(null);
    setComposerOpen(false);
  };

  const handleAddDraftImages = async (files: File[]) => {
    const normalizedImages = await Promise.all(
      files.map(async file => {
        const normalizedFile = await normalizeImageFile(file).catch(() => file);
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file: normalizedFile,
          previewUrl: URL.createObjectURL(normalizedFile),
        };
      })
    );

    setDraft(currentDraft => ({
      ...currentDraft,
      imageFiles: [...currentDraft.imageFiles, ...normalizedImages],
    }));
  };

  const handleRemoveExistingImage = (imageUrl: string) => {
    setDraft(currentDraft => ({
      ...currentDraft,
      imageUrls: currentDraft.imageUrls.filter(candidate => candidate !== imageUrl),
    }));
  };

  const handleRemoveDraftImage = (imageId: string) => {
    setDraft(currentDraft => {
      const imageToRemove = currentDraft.imageFiles.find(image => image.id === imageId);
      if (imageToRemove) URL.revokeObjectURL(imageToRemove.previewUrl);

      return {
        ...currentDraft,
        imageFiles: currentDraft.imageFiles.filter(image => image.id !== imageId),
      };
    });
  };

  const handleSubmitPost = async () => {
    if (authLoading || !user) {
      toast('登录后才能发帖');
      return;
    }

    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title || !body) return;

    const authorName = profile?.user_name?.trim() || user.email?.split('@')[0] || 'CMI 朋友';

    setSubmitting(true);

    try {
      const uploadedImageUrls = draft.imageFiles.length > 0
        ? await uploadBlackboardImages(draft.imageFiles.map(image => image.file))
        : [];

      if (uploadedImageUrls.length !== draft.imageFiles.length) {
        toast.error('有照片没有传上去，请重试或先移除失败照片');
        return;
      }

      const imageUrls = [...draft.imageUrls, ...uploadedImageUrls];
      const input = {
        category: draft.category,
        title,
        body,
        timeLabel: draft.timeLabel.trim(),
        locationLabel: draft.locationLabel.trim(),
        peopleLabel: draft.peopleLabel.trim(),
        contactLabel: draft.contactLabel.trim(),
        imageUrls,
        linkedEventId: draft.linkedEventId,
        linkedEventTitle: draft.linkedEventTitle,
        linkedPlaceName: draft.linkedPlaceName,
        authorId: user.id,
        authorName,
      };

      const record = editingPostId
        ? await updateBlackboardPost({ ...input, id: editingPostId })
        : await createBlackboardPost(input);

      const [mappedPost] = await hydratePostProfiles([mapBlackboardPost(record)]);
      setPosts(currentPosts => {
        if (!editingPostId) return [mappedPost, ...currentPosts];
        return currentPosts.map(post => post.id === mappedPost.id ? mappedPost : post);
      });
      setSelectedPostId(mappedPost.id);
      setActiveFilter('all');
      toast.success(editingPostId ? '帖子已更新' : '已发布到生活板');
      closeComposer();
    } catch {
      toast.error(editingPostId ? '更新失败，请稍后再试' : '发布失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (post: BlackboardPost) => {
    if (!user || post.authorId !== user.id) return;
    if (!window.confirm('确定删除这条帖子吗？')) return;

    try {
      await deleteBlackboardPost(post.id, user.id);
      setPosts(currentPosts => currentPosts.filter(candidate => candidate.id !== post.id));
      if (selectedPostId === post.id) setSelectedPostId(null);
      toast.success('帖子已删除');
    } catch {
      toast.error('删除失败，请稍后再试');
    }
  };

  const handleToggleFeatured = async (post: BlackboardPost) => {
    if (!user || !isAdmin) return;

    try {
      const record = await setBlackboardPostFeatured(post.id, !post.isFeatured, user.id);
      const [mappedPost] = await hydratePostProfiles([mapBlackboardPost(record)]);
      setPosts(currentPosts => currentPosts.map(candidate => candidate.id === mappedPost.id ? mappedPost : candidate));
      toast.success(mappedPost.isFeatured ? '已设为精选' : '已取消精选');
    } catch {
      toast.error('精选状态更新失败，请稍后再试');
    }
  };

  const closeAnnouncementComposer = () => {
    setAnnouncementDraft({ title: '', body: '', linkLabel: '', linkUrl: '' });
    setAnnouncementComposerOpen(false);
  };

  const handleCreateAnnouncement = async () => {
    if (!user || !isAdmin) {
      toast('只有管理员可以发公告');
      return;
    }

    const title = announcementDraft.title.trim();
    const body = announcementDraft.body.trim();
    if (!title || !body) return;

    const authorName = profile?.user_name?.trim() || user.email?.split('@')[0] || 'CMI 客栈';
    setAnnouncementSubmitting(true);

    try {
      const record = await createBlackboardAnnouncement({
        title,
        body,
        linkLabel: announcementDraft.linkLabel.trim(),
        linkUrl: announcementDraft.linkUrl.trim(),
        authorId: user.id,
        authorName,
      });
      setAnnouncements(currentAnnouncements => [
        mapBlackboardAnnouncement(record),
        ...currentAnnouncements,
      ]);
      toast.success('公告已发布');
      closeAnnouncementComposer();
    } catch {
      toast.error('公告发布失败，请稍后再试');
    } finally {
      setAnnouncementSubmitting(false);
    }
  };

  const handleHideAnnouncement = async (announcement: BlackboardAnnouncement) => {
    if (!isAdmin) return;
    if (!window.confirm('确定隐藏这条公告吗？')) return;

    try {
      await hideBlackboardAnnouncement(announcement.id);
      setAnnouncements(currentAnnouncements =>
        currentAnnouncements.filter(candidate => candidate.id !== announcement.id)
      );
      toast.success('公告已隐藏');
    } catch {
      toast.error('公告隐藏失败，请稍后再试');
    }
  };

  const handleSubmitComment = async (post: BlackboardPost) => {
    if (authLoading || !user) {
      toast('登录后才能评论');
      return;
    }

    const body = (commentDrafts[post.id] || '').trim();
    if (!body) return;

    const authorName = profile?.user_name?.trim() || user.email?.split('@')[0] || 'CMI 朋友';
    setCommentSubmitting(true);

    try {
      const comment = await createBlackboardComment({
        postId: post.id,
        body,
        authorId: user.id,
        authorName,
      });
      const [currentAuthorStats] = await getBlackboardActivityStats([user.id]);
      const currentActivityTitle = currentAuthorStats
        ? getBlackboardActivityTitle({
            postCount: currentAuthorStats.post_count,
            commentCount: currentAuthorStats.comment_count,
          })
        : DEFAULT_BLACKBOARD_ACTIVITY_TITLE;
      const mappedComment: BlackboardComment = {
        ...comment,
        authorAvatarUrl: profile?.avatar_url || '',
        authorActivityLevel: currentActivityTitle.level,
        authorActivityTitle: currentActivityTitle.title,
        authorAchievementTitle: selectedAchievementTitle?.title || '',
      };

      setPosts(currentPosts =>
        currentPosts.map(candidate => {
          const nextCandidate = candidate.id === post.id
            ? { ...candidate, comments: [...candidate.comments, mappedComment] }
            : candidate;

          return {
            ...nextCandidate,
            ...(nextCandidate.authorId === user.id
              ? {
                  authorActivityLevel: currentActivityTitle.level,
                  authorActivityTitle: currentActivityTitle.title,
                }
              : {}),
            comments: nextCandidate.comments.map(candidateComment =>
              candidateComment.author_id === user.id
                ? {
                    ...candidateComment,
                    authorActivityLevel: currentActivityTitle.level,
                    authorActivityTitle: currentActivityTitle.title,
                  }
                : candidateComment
            ),
          };
        })
      );
      setCommentDrafts(currentDrafts => ({ ...currentDrafts, [post.id]: '' }));
      toast.success('评论已发出');
    } catch {
      toast.error('评论失败，请稍后再试');
    } finally {
      setCommentSubmitting(false);
    }
  };

  return (
    <section className="-mx-4 min-h-[calc(100dvh-6.5rem)] bg-[#f1edfa]" aria-label="清迈生活板">
      <div className="sticky top-[calc(env(safe-area-inset-top)+4.6rem)] z-20 border-b border-[#ded4f1] bg-[#f7f3ff] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2">
              {CATEGORY_META.map(({ id, label, Icon }) => {
                const active = activeFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={cn(
                      'flex h-10 shrink-0 items-center gap-1.5 rounded-[0.65rem] px-3.5 text-[1rem] font-medium transition-colors',
                      active
                        ? 'bg-[#9579ca] text-white'
                        : 'border border-[#ded4f1] bg-white/80 text-[#453b5b]'
                    )}
                    onClick={() => setActiveFilter(id)}
                  >
                    <Icon className={cn('h-4 w-4', !active && id !== 'all' && 'hidden')} strokeWidth={2.4} />
                    {label}
                    <span>{getPostCount(posts, id)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <AnnouncementStrip
        announcements={announcements}
        isAdmin={isAdmin}
        onCreate={() => setAnnouncementComposerOpen(true)}
        onHide={announcement => void handleHideAnnouncement(announcement)}
      />

      <div className="divide-y-[0.65rem] divide-[#e7def6]">
        {loadingPosts ? (
          <div className="bg-white/90 px-5 py-10 text-center">
            <p className="text-[1.05rem] font-bold text-[#555555]">正在加载论坛</p>
            <p className="mt-1 text-[0.95rem] font-medium leading-relaxed text-[#8c8c8c]">
              会按最新发布往下排。
            </p>
          </div>
        ) : postsError ? (
          <div className="bg-white/90 px-5 py-10 text-center">
            <p className="text-[1.05rem] font-bold text-[#555555]">{postsError}</p>
          </div>
        ) : visiblePosts.length > 0 ? (
          visiblePosts.map(post => (
            <BlackboardPostCard
              key={post.id}
              post={post}
              userId={user?.id}
              isAdmin={isAdmin}
              onOpen={selectedPost => setSelectedPostId(selectedPost.id)}
              onEdit={openEditComposer}
              onDelete={postToDelete => void handleDeletePost(postToDelete)}
              onToggleFeatured={postToFeature => void handleToggleFeatured(postToFeature)}
            />
          ))
        ) : (
          <div className="bg-white/90 px-5 py-10 text-center">
            <p className="text-[1.05rem] font-bold text-[#555555]">还没有帖子</p>
            <p className="mt-1 text-[0.95rem] font-medium leading-relaxed text-[#8c8c8c]">
              有人找搭子、求助或分享清迈现场后，会显示在这里。
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] right-5 z-40 grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-[#9579ca] text-white shadow-[0_10px_28px_rgba(90,63,132,0.28)] active:scale-[0.97]"
        onClick={openCreateComposer}
        aria-label="发帖"
      >
        <Plus className="h-10 w-10" strokeWidth={2.2} />
      </button>

      {composerOpen && (
        <ComposerSheet
          draft={draft}
          title={editingPostId ? '编辑帖子' : '发一条'}
          submitting={submitting}
          onDraftChange={setDraft}
          onAddImages={handleAddDraftImages}
          onRemoveExistingImage={handleRemoveExistingImage}
          onRemoveDraftImage={handleRemoveDraftImage}
          onSubmit={handleSubmitPost}
          onClose={closeComposer}
        />
      )}

      {announcementComposerOpen && (
        <AnnouncementSheet
          draft={announcementDraft}
          submitting={announcementSubmitting}
          onDraftChange={setAnnouncementDraft}
          onSubmit={handleCreateAnnouncement}
          onClose={closeAnnouncementComposer}
        />
      )}

      {selectedPost && (
        <PostDetailSheet
          post={selectedPost}
          userId={user?.id}
          isAdmin={isAdmin}
          commentText={commentDrafts[selectedPost.id] || ''}
          commentSubmitting={commentSubmitting}
          onCommentChange={value => setCommentDrafts(currentDrafts => ({ ...currentDrafts, [selectedPost.id]: value }))}
          onSubmitComment={() => handleSubmitComment(selectedPost)}
          onEdit={openEditComposer}
          onDelete={postToDelete => void handleDeletePost(postToDelete)}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </section>
  );
}

export function CmiBlackboardEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <section aria-label="清迈生活板入口">
      <button
        type="button"
        className="group flex w-full items-center gap-3 rounded-[1.35rem] border border-primary/20 bg-[#fbfaff]/95 p-3 text-left shadow-[0_16px_36px_rgba(65,51,112,0.12)] transition-transform active:scale-[0.99]"
        onClick={onOpen}
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] bg-primary/10">
          <img src={BLACKBOARD_ICON_URL} alt="" className="h-10 w-10 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="truncate text-[1.35rem] font-black leading-tight text-foreground">
              清迈生活板
            </h2>
            <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground">
              进入
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs font-black leading-snug text-muted-foreground">
            找搭子、求助、分享清迈现场。
          </p>
        </div>
      </button>
    </section>
  );
}

export function CmiBlackboardHomeCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="min-h-[124px] rounded-2xl border-2 border-foreground bg-[#fbfaff]/95 p-3.5 text-left text-foreground shadow-[4px_4px_0_#000] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_#000] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] transition-all duration-200 rotate-[0.5deg] hover:rotate-1 touch-manipulation"
      onClick={onOpen}
      aria-label="打开清迈生活板"
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-foreground/10">
          <img src={BLACKBOARD_ICON_URL} alt="" className="h-10 w-10 object-contain" />
        </div>
      </div>
      <p className="text-base font-black leading-tight text-foreground">清迈生活板</p>
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-foreground/75">
        找搭子、求助、分享。
      </p>
    </button>
  );
}
