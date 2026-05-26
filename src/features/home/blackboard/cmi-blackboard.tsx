import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  Edit3,
  HelpCircle,
  ImagePlus,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  createBlackboardComment,
  createBlackboardPost,
  deleteBlackboardPost,
  getBlackboardPosts,
  type BlackboardCommentRecord,
  type BlackboardPostCategory,
  type BlackboardPostRecord,
  updateBlackboardPost,
  uploadBlackboardImages,
} from '@/db/blackboard-posts';
import {
  BLACKBOARD_CATEGORY_LABELS,
  BLACKBOARD_CATEGORY_OPTIONS,
  coerceBlackboardCategory,
  formatBlackboardCreatedLabel,
  getBlackboardDateGroupLabel,
  type BlackboardPostFilter,
} from '@/features/home/blackboard/blackboard-model';
import { getCmiEventPath, getPersonMapPath, getPlacePath } from '@/lib/paths';
import { cn } from '@/lib/utils';
import { normalizeImageFile } from '@/utils/imageCompression';

type DraftImage = {
  id: string;
  file: File;
  previewUrl: string;
};

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
  createdAt: string;
  createdLabel: string;
  dateGroupLabel: string;
  timeLabel: string;
  locationLabel: string;
  peopleLabel: string;
  contactLabel: string;
  imageUrls: string[];
  comments: BlackboardCommentRecord[];
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
const BLACKBOARD_ICON_URL = '/cmi-home/blackboard-together.svg';

const CATEGORY_META: CategoryMeta[] = [
  { id: 'all', label: '全部', Icon: Sparkles },
  { id: 'companion', label: '找搭子', Icon: UsersRound },
  { id: 'help', label: '求助', Icon: HelpCircle },
  { id: 'share', label: '分享', Icon: MessageCircle },
];

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
    createdAt: record.created_at,
    createdLabel: formatBlackboardCreatedLabel(record.created_at),
    dateGroupLabel: getBlackboardDateGroupLabel(record.created_at),
    timeLabel: getDisplayValue(record.time_label),
    locationLabel: getDisplayValue(record.location_label),
    peopleLabel: getDisplayValue(record.people_label),
    contactLabel: getDisplayValue(record.contact_label),
    imageUrls: Array.isArray(record.image_urls) ? record.image_urls.filter(Boolean) : [],
    comments: record.comments || [],
  };
};

const revokeDraftImages = (images: DraftImage[]) => {
  images.forEach(image => URL.revokeObjectURL(image.previewUrl));
};

function getPostCount(posts: BlackboardPost[], filter: BlackboardPostFilter) {
  if (filter === 'all') return posts.length;
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

function PostMeta({
  icon: Icon,
  children,
  to,
}: {
  icon: LucideIcon;
  children: ReactNode;
  to?: string;
}) {
  const className =
    'inline-flex min-h-7 items-center gap-1 rounded-full border border-border bg-background/80 px-2.5 text-xs font-black text-muted-foreground';
  const content = (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
      <span className="min-w-0 truncate">{children}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cn(className, 'transition active:scale-[0.98] active:bg-primary/10')}>
        {content}
      </Link>
    );
  }

  return <span className={className}>{content}</span>;
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

function renderPostBody(post: BlackboardPost) {
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
  onOpen,
  onEdit,
  onDelete,
}: {
  post: BlackboardPost;
  userId?: string;
  onOpen: (post: BlackboardPost) => void;
  onEdit: (post: BlackboardPost) => void;
  onDelete: (post: BlackboardPost) => void;
}) {
  const CategoryIcon = CATEGORY_ICON_BY_ID[post.category];
  const placePath = post.linkedPlaceName ? getPlacePath(post.linkedPlaceName) : undefined;
  const canManagePost = Boolean(userId && post.authorId === userId);
  const metaItems = [
    post.timeLabel ? { id: 'time', value: post.timeLabel } : null,
    post.locationLabel ? { id: 'location', value: post.locationLabel, to: placePath } : null,
  ].filter(Boolean) as Array<{ id: string; value: string; to?: string }>;

  return (
    <article className="bg-white px-5 pb-5 pt-6">
      <div className="flex items-start gap-3">
        <Link
          to={getPersonMapPath(post.author)}
          className="grid h-[3.15rem] w-[3.15rem] shrink-0 place-items-center overflow-hidden rounded-full bg-[#eef0f4] text-[1.15rem] font-black text-[#6f86a0]"
          aria-label={`查看${post.author}的清迈地图`}
        >
          {post.authorInitial}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link
              to={getPersonMapPath(post.author)}
              className="min-w-0 truncate text-[1.06rem] font-black leading-tight text-[#6d839b] active:opacity-70"
            >
              {post.author}
            </Link>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-[0.35rem] px-1.5 py-0.5 text-[0.72rem] font-black leading-none',
                CATEGORY_TONES[post.category]
              )}
            >
              <CategoryIcon className="h-3 w-3" strokeWidth={2.4} />
              {BLACKBOARD_CATEGORY_LABELS[post.category]}
            </span>
          </div>
          <p className="mt-1 text-[0.94rem] font-semibold leading-none text-[#9b9b9b]">
            {post.createdLabel}
          </p>
        </div>

        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#9c9c9c] active:bg-[#f2f2f2]"
          onClick={() => onOpen(post)}
          aria-label="打开帖子详情"
        >
          <span className="text-[1.6rem] font-black leading-none">...</span>
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="text-[1.32rem] font-medium leading-snug text-[#5c5c5c]">{post.title}</h3>
        <p className="whitespace-pre-wrap text-[1.08rem] font-normal leading-[1.58] text-[#5f5f5f]">
          {renderPostBody(post)}
        </p>
      </div>

      {metaItems.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.94rem] font-semibold text-[#8c8c8c]">
          {metaItems.map((item, index) => (
            <span key={item.id} className="inline-flex min-w-0 items-center gap-2">
              {index > 0 && <span className="text-[#c3c3c3]">·</span>}
              {item.to ? (
                <Link to={item.to} className="min-w-0 truncate active:opacity-70">
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

      <div className="mt-5 flex items-center justify-end gap-4 text-[#525252]">
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-1 text-[0.95rem] font-bold active:bg-[#f2f2f2]"
          onClick={() => onOpen(post)}
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
    </article>
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

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-black text-muted-foreground">时间，可不填</span>
            <input
              value={draft.timeLabel}
              onChange={event => updateDraft('timeLabel', event.target.value)}
              className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm font-bold outline-none focus:border-primary"
              placeholder="今晚 / 周末"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black text-muted-foreground">地点 / 区域，可不填</span>
            <input
              value={draft.locationLabel}
              onChange={event => updateDraft('locationLabel', event.target.value)}
              className="mt-1.5 h-11 w-full rounded-2xl border border-border bg-white px-3 text-sm font-bold outline-none focus:border-primary"
              placeholder="宁曼 / 北门"
            />
          </label>
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
  onCommentChange: (value: string) => void;
  onSubmitComment: () => Promise<void>;
  onEdit: (post: BlackboardPost) => void;
  onDelete: (post: BlackboardPost) => void;
  onClose: () => void;
}) {
  const CategoryIcon = CATEGORY_ICON_BY_ID[post.category];
  const canManagePost = Boolean(userId && post.authorId === userId);

  const handleSubmitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!commentText.trim() || commentSubmitting) return;
    void onSubmitComment();
  };

  return (
    <SheetShell title="帖子详情" onClose={onClose}>
      <article className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black',
                CATEGORY_TONES[post.category]
              )}
            >
              <CategoryIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
              {BLACKBOARD_CATEGORY_LABELS[post.category]}
            </span>
            <h2 className="mt-3 text-2xl font-black leading-tight text-foreground">{post.title}</h2>
          </div>

          {canManagePost && (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-white text-muted-foreground"
                onClick={() => onEdit(post)}
                aria-label="编辑帖子"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full border border-destructive/20 bg-white text-destructive"
                onClick={() => onDelete(post)}
                aria-label="删除帖子"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <p className="whitespace-pre-wrap text-[16px] font-semibold leading-relaxed text-foreground/82">
          {renderPostBody(post)}
        </p>

        <PostImages imageUrls={post.imageUrls} />

        <div className="flex flex-wrap gap-2">
          <PostMeta icon={CalendarDays}>{post.createdLabel}</PostMeta>
          {post.timeLabel && <PostMeta icon={CalendarDays}>{post.timeLabel}</PostMeta>}
          {post.locationLabel && <PostMeta icon={MapPin}>{post.locationLabel}</PostMeta>}
        </div>

        {post.contactLabel && (
          <div className="rounded-[1rem] border border-primary/15 bg-primary/5 p-3">
            <p className="text-xs font-black text-primary">联系说明</p>
            <p className="mt-1 whitespace-pre-wrap text-sm font-bold leading-relaxed text-foreground/80">
              {post.contactLabel}
            </p>
          </div>
        )}

        <div className="flex min-w-0 items-center gap-2 rounded-[1rem] border border-border bg-white p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-black text-primary">
            {post.authorInitial}
          </span>
          <div className="min-w-0">
            <Link to={getPersonMapPath(post.author)} className="block truncate text-sm font-black text-foreground">
              {post.author}
            </Link>
            <p className="text-xs font-bold text-muted-foreground">{post.dateGroupLabel}发布</p>
          </div>
        </div>
      </article>

      <section className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-foreground">评论</h3>
          <span className="text-sm font-black text-muted-foreground">{post.comments.length}</span>
        </div>

        {post.comments.length > 0 ? (
          <div className="space-y-2">
            {post.comments.map(comment => (
              <article key={comment.id} className="rounded-[1rem] border border-border bg-white p-3">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-black text-foreground">{comment.author_name}</p>
                  <span className="shrink-0 text-xs font-bold text-muted-foreground">
                    {formatBlackboardCreatedLabel(comment.created_at)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-foreground/80">
                  {comment.body}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1rem] border border-dashed border-border bg-white/70 p-4 text-center text-sm font-bold text-muted-foreground">
            还没有评论。
          </div>
        )}

        <form className="flex gap-2" onSubmit={handleSubmitComment}>
          <input
            value={commentText}
            onChange={event => onCommentChange(event.target.value)}
            maxLength={COMMENT_BODY_LIMIT}
            className="min-h-11 min-w-0 flex-1 rounded-full border border-border bg-white px-4 text-sm font-bold outline-none focus:border-primary"
            placeholder="写评论"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || commentSubmitting}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-45"
            aria-label="发送评论"
          >
            <Send className="h-4 w-4" strokeWidth={2.6} />
          </button>
        </form>
      </section>
    </SheetShell>
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
  const [draft, setDraft] = useState<BlackboardDraft>(() => createEmptyDraft());
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const draftImageFilesRef = useRef<DraftImage[]>([]);

  const loadPosts = async () => {
    setLoadingPosts(true);
    setPostsError(null);

    try {
      const records = await getBlackboardPosts();
      setPosts(records.map(mapBlackboardPost));
    } catch {
      setPostsError('论坛加载失败，稍后再试。');
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, []);

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
    if (activeFilter === 'all') return posts;
    return posts.filter(post => post.category === activeFilter);
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

      const mappedPost = mapBlackboardPost(record);
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

      setPosts(currentPosts =>
        currentPosts.map(candidate =>
          candidate.id === post.id
            ? { ...candidate, comments: [...candidate.comments, comment] }
            : candidate
        )
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
    <section className="-mx-4 min-h-[calc(100dvh-6.5rem)] bg-[#f2f2f2]" aria-label="清迈生活板">
      <div className="sticky top-[calc(env(safe-area-inset-top)+4.6rem)] z-20 border-b border-[#eeeeee] bg-white px-4 py-3">
        <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORY_META.map(({ id, label, Icon }) => {
            const active = activeFilter === id;
            return (
              <button
                key={id}
                type="button"
                className={cn(
                  'flex h-10 shrink-0 items-center gap-1.5 rounded-[0.65rem] px-3.5 text-[1rem] font-medium transition-colors',
                  active
                    ? 'bg-[#353535] text-white'
                    : 'bg-[#eeeeee] text-[#222222]'
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

      <div className="divide-y-[0.65rem] divide-[#f2f2f2]">
        {loadingPosts ? (
          <div className="bg-white px-5 py-10 text-center">
            <p className="text-[1.05rem] font-bold text-[#555555]">正在加载论坛</p>
            <p className="mt-1 text-[0.95rem] font-medium leading-relaxed text-[#8c8c8c]">
              会按最新发布往下排。
            </p>
          </div>
        ) : postsError ? (
          <div className="bg-white px-5 py-10 text-center">
            <p className="text-[1.05rem] font-bold text-[#555555]">{postsError}</p>
          </div>
        ) : visiblePosts.length > 0 ? (
          visiblePosts.map(post => (
            <BlackboardPostCard
              key={post.id}
              post={post}
              userId={user?.id}
              onOpen={selectedPost => setSelectedPostId(selectedPost.id)}
              onEdit={openEditComposer}
              onDelete={postToDelete => void handleDeletePost(postToDelete)}
            />
          ))
        ) : (
          <div className="bg-white px-5 py-10 text-center">
            <p className="text-[1.05rem] font-bold text-[#555555]">还没有帖子</p>
            <p className="mt-1 text-[0.95rem] font-medium leading-relaxed text-[#8c8c8c]">
              有人找搭子、求助或分享清迈现场后，会显示在这里。
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] right-5 z-40 grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-[#18b99c] text-white shadow-[0_10px_28px_rgba(0,0,0,0.24)] active:scale-[0.97]"
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

      {selectedPost && (
        <PostDetailSheet
          post={selectedPost}
          userId={user?.id}
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
      className="min-h-[124px] rounded-lg border-2 border-primary bg-[#fbfaff]/95 p-3 text-left text-foreground shadow-[3px_4px_0_rgba(0,0,0,0.16)] transition-transform active:translate-y-0.5 active:shadow-[2px_3px_0_rgba(0,0,0,0.14)]"
      onClick={onOpen}
      aria-label="打开清迈生活板"
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <img src={BLACKBOARD_ICON_URL} alt="" className="h-10 w-10 object-contain" />
        </div>
      </div>
      <p className="text-base font-black leading-tight">清迈生活板</p>
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-muted-foreground">
        找搭子、求助、分享。
      </p>
    </button>
  );
}
