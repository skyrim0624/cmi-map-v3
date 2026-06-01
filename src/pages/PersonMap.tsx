import { ArrowLeft, Award, Check, MessageCircle, MapPin, UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPublicProfileByIdentity,
  getRecommendationsByUser,
  getRecommendationsByUserId,
  type PublicProfile,
} from '@/db/api';
import {
  getBlackboardActivityStats,
  getBlackboardPostsByAuthorId,
  getBlackboardTitlePreferences,
  setBlackboardAchievementTitlePreference,
  type BlackboardPostRecord,
} from '@/db/blackboard-posts';
import {
  BLACKBOARD_ACHIEVEMENT_TITLE_OPTIONS,
  BLACKBOARD_CATEGORY_LABELS,
  formatBlackboardCreatedLabel,
  getBlackboardAchievementTitleById,
  getBlackboardActivityTitle,
  type BlackboardAchievementTitleId,
} from '@/features/home/blackboard/blackboard-model';
import {
  buildPublicProfileTabs,
  getPublicProfileDisplayName,
  type PublicProfileTabId,
} from '@/features/profiles/public-profile-page';
import { getRecommendationReasonText } from '@/lib/easter-icons';
import { getCmiFeedPath, getPlacePath } from '@/lib/paths';
import { cn } from '@/lib/utils';
import type { Category, PlacedSticker, Recommendation, Sticker } from '@/types/types';
import { CATEGORIES, categoryMatchesFilter, getCategoryIconUrl } from '@/types/types';

const isUuidLike = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const DEFAULT_PERSON_ACTIVITY_TITLE = getBlackboardActivityTitle({ postCount: 0, commentCount: 0 });

const getTopStickers = (placedStickers: PlacedSticker[] | undefined, topN = 3) => {
  if (!placedStickers || placedStickers.length === 0) return [];
  const stickersArray = Array.isArray(placedStickers) ? placedStickers : [placedStickers];
  const counts: Record<string, { count: number; sticker: Sticker }> = {};

  for (const placedSticker of stickersArray) {
    if (!placedSticker.sticker) continue;
    const sticker = Array.isArray(placedSticker.sticker) ? placedSticker.sticker[0] : placedSticker.sticker;
    if (!sticker) continue;
    if (!counts[placedSticker.sticker_id]) counts[placedSticker.sticker_id] = { count: 0, sticker };
    counts[placedSticker.sticker_id].count++;
  }

  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
};

function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const navigate = useNavigate();
  const topStickers = getTopStickers(recommendation.placed_stickers);

  return (
    <button
      type="button"
      className="flex w-full gap-3 rounded-2xl border border-border/60 bg-card p-3.5 text-left shadow-sm transition-transform active:scale-[0.99]"
      onClick={() => navigate(getPlacePath(recommendation.place_name))}
    >
      {recommendation.images && recommendation.images.length > 0 ? (
        <img
          src={recommendation.images[0]}
          alt=""
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-accent p-3">
          <img
            src={getCategoryIconUrl(recommendation.category)}
            alt=""
            className="h-full w-full object-contain opacity-70"
          />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="line-clamp-2 text-sm font-semibold leading-relaxed">
          “{getRecommendationReasonText(recommendation)}”
        </p>
        <p className="truncate text-xs font-semibold text-muted-foreground">
          <span className="mr-1">📍</span>
          {recommendation.place_name}
          <span className="mx-0.5 opacity-50">|</span>
          {recommendation.user_name}
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {topStickers.map(({ sticker, count }) => (
            <span
              key={sticker.id}
              className="inline-flex items-center rounded-full bg-accent/50 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground"
            >
              <img src={sticker.icon_url} alt="" className="mr-1 h-3 w-3 object-contain" />
              {count}
            </span>
          ))}
          {recommendation.upvotes && recommendation.upvotes.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              🔥 {recommendation.upvotes.length}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function BlackboardPostCard({ post }: { post: BlackboardPostRecord }) {
  const navigate = useNavigate();
  const imageUrl = post.image_urls?.find(Boolean);
  const placeLabel = post.linked_place_name || post.location_label;

  return (
    <button
      type="button"
      className="flex w-full gap-3 rounded-2xl border border-border/60 bg-card p-3.5 text-left shadow-sm transition-transform active:scale-[0.99]"
      onClick={() => {
        if (post.linked_place_name) {
          navigate(getPlacePath(post.linked_place_name));
          return;
        }
        navigate(getCmiFeedPath());
      }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#eef4f1] text-[#12967e]">
          {post.category === 'companion' ? (
            <UsersRound className="h-7 w-7" strokeWidth={2.3} />
          ) : (
            <MessageCircle className="h-7 w-7" strokeWidth={2.3} />
          )}
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-[#18b99c]/10 px-2 py-0.5 text-[10px] font-black text-[#12967e]">
            {BLACKBOARD_CATEGORY_LABELS[post.category]}
          </span>
          <span className="truncate text-[11px] font-semibold text-muted-foreground">
            {formatBlackboardCreatedLabel(post.created_at)}
          </span>
        </div>
        <p className="truncate text-sm font-black leading-tight">{post.title}</p>
        <p className="line-clamp-2 text-xs font-semibold leading-relaxed text-muted-foreground">
          {post.body}
        </p>
        {placeLabel && (
          <p className="truncate text-xs font-semibold text-muted-foreground">
            <MapPin className="mr-0.5 inline h-3 w-3" />
            {placeLabel}
          </p>
        )}
      </div>
    </button>
  );
}

function ProfileTitleBadge({
  title,
  tone = 'activity',
}: {
  title: string;
  tone?: 'activity' | 'achievement';
}) {
  if (!title) return null;

  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center rounded-[0.42rem] px-2 text-[0.75rem] font-black leading-none',
        tone === 'achievement'
          ? 'bg-[#edf7f3] text-[#237454]'
          : 'bg-primary/10 text-primary'
      )}
    >
      {title}
    </span>
  );
}

function TitlePreferenceSheet({
  activityTitle,
  selectedTitleId,
  submitting,
  onSelect,
  onClose,
}: {
  activityTitle: string;
  selectedTitleId: BlackboardAchievementTitleId | null;
  submitting: boolean;
  onSelect: (titleId: BlackboardAchievementTitleId | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 px-0" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="关闭称号选择"
        onClick={onClose}
      />
      <section
        className="relative max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] w-full max-w-[520px] overflow-hidden rounded-t-[1.45rem] bg-background shadow-[0_-18px_48px_rgba(32,25,54,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-label="选择称号"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h2 className="text-[1.35rem] font-black leading-tight text-foreground">我的称号</h2>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">活跃称号自动佩戴，成就称号可以自己换。</p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-white text-foreground"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="h-5 w-5" strokeWidth={2.4} />
          </button>
        </div>

        <div className="max-h-[70dvh] overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4">
          <div className="mb-4 rounded-[1rem] border border-primary/15 bg-primary/5 px-4 py-3">
            <p className="text-xs font-black text-primary/75">活跃称号</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <ProfileTitleBadge title={activityTitle} />
              <span className="shrink-0 text-xs font-black text-primary/70">自动佩戴</span>
            </div>
          </div>

          <p className="mb-2 text-xs font-black text-muted-foreground">成就称号</p>
          <div className="space-y-2">
            <button
              type="button"
              disabled={submitting}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-[0.95rem] border px-4 py-3 text-left transition active:scale-[0.99] disabled:opacity-55',
                selectedTitleId === null
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-white text-[#333333]'
              )}
              onClick={() => onSelect(null)}
            >
              <span className="min-w-0">
                <span className="block text-[1rem] font-black">不佩戴成就称号</span>
                <span className="mt-0.5 block text-[0.82rem] font-semibold text-muted-foreground">
                  主页和帖子里只显示活跃称号
                </span>
              </span>
              {selectedTitleId === null && <Check className="h-5 w-5 shrink-0" strokeWidth={2.6} />}
            </button>

            {BLACKBOARD_ACHIEVEMENT_TITLE_OPTIONS.map(option => {
              const selected = option.id === selectedTitleId;

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={submitting}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-[0.95rem] border px-4 py-3 text-left transition active:scale-[0.99] disabled:opacity-55',
                    selected
                      ? 'border-[#8dd3b8] bg-[#edf7f3] text-[#237454]'
                      : 'border-border bg-white text-[#333333]'
                  )}
                  onClick={() => onSelect(option.id)}
                >
                  <span className="min-w-0">
                    <ProfileTitleBadge title={option.title} tone="achievement" />
                    <span className="mt-1.5 block text-[0.86rem] font-semibold leading-relaxed text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                  {selected && <Check className="h-5 w-5 shrink-0" strokeWidth={2.6} />}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function PersonMap() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profileIdentity, userName } = useParams<{ profileIdentity?: string; userName?: string }>();
  const decodedIdentity = decodeURIComponent(profileIdentity || userName || '');
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [posts, setPosts] = useState<BlackboardPostRecord[]>([]);
  const [activityTitle, setActivityTitle] = useState(DEFAULT_PERSON_ACTIVITY_TITLE);
  const [selectedAchievementTitleId, setSelectedAchievementTitleId] = useState<BlackboardAchievementTitleId | null>(null);
  const [titlePreferenceOpen, setTitlePreferenceOpen] = useState(false);
  const [titlePreferenceSubmitting, setTitlePreferenceSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [activeTab, setActiveTab] = useState<PublicProfileTabId>('recommendations');

  useEffect(() => {
    let ignore = false;

    const loadProfile = async () => {
      setLoading(true);
      const profile = decodedIdentity ? await getPublicProfileByIdentity(decodedIdentity) : null;
      const recommendationsData = profile?.id
        ? await getRecommendationsByUserId(profile.id)
        : isUuidLike(decodedIdentity)
          ? await getRecommendationsByUserId(decodedIdentity)
          : decodedIdentity
            ? await getRecommendationsByUser(decodedIdentity)
            : [];
      const authorId = profile?.id || (isUuidLike(decodedIdentity) ? decodedIdentity : recommendationsData[0]?.user_id);
      let postsData: BlackboardPostRecord[] = [];
      let activityStats: Awaited<ReturnType<typeof getBlackboardActivityStats>> = [];
      let titlePreferences: Awaited<ReturnType<typeof getBlackboardTitlePreferences>> = [];

      if (authorId) {
        [postsData, activityStats, titlePreferences] = await Promise.all([
          getBlackboardPostsByAuthorId(authorId),
          getBlackboardActivityStats([authorId]),
          getBlackboardTitlePreferences([authorId]),
        ]);
      }

      if (ignore) return;
      setPublicProfile(profile);
      setRecommendations(recommendationsData);
      setPosts(postsData);
      const [authorStats] = activityStats;
      setActivityTitle(authorStats
        ? getBlackboardActivityTitle({
            postCount: authorStats.post_count,
            commentCount: authorStats.comment_count,
          })
        : DEFAULT_PERSON_ACTIVITY_TITLE
      );
      setSelectedAchievementTitleId(titlePreferences[0]?.achievement_title_id ?? null);
      setLoading(false);
    };

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [decodedIdentity]);

  const displayName = getPublicProfileDisplayName({
    profile: publicProfile,
    recommendations,
    posts,
    routeIdentity: isUuidLike(decodedIdentity) ? 'CMI 朋友' : decodedIdentity,
  });
  const avatarUrl = publicProfile?.avatar_url;
  const avatarFallback = displayName.trim().charAt(0).toUpperCase() || '?';
  const profileUserId = publicProfile?.id
    || (isUuidLike(decodedIdentity) ? decodedIdentity : recommendations[0]?.user_id || posts[0]?.author_id || '');
  const isOwnProfile = Boolean(user?.id && profileUserId === user.id);
  const selectedAchievementTitle = useMemo(
    () => getBlackboardAchievementTitleById(selectedAchievementTitleId),
    [selectedAchievementTitleId]
  );
  const filteredRecommendations = selectedCategory === 'all'
    ? recommendations
    : recommendations.filter(recommendation => categoryMatchesFilter(recommendation.category, selectedCategory));
  const tabs = useMemo(
    () => buildPublicProfileTabs({ recommendationCount: recommendations.length, postCount: posts.length }),
    [posts.length, recommendations.length]
  );

  const handleSelectAchievementTitle = async (titleId: BlackboardAchievementTitleId | null) => {
    if (!user || !isOwnProfile) {
      toast('只能在自己的主页换称号');
      return;
    }

    setTitlePreferenceSubmitting(true);

    try {
      await setBlackboardAchievementTitlePreference(user.id, titleId);
      setSelectedAchievementTitleId(titleId);
      toast.success(titleId ? '称号已换上' : '已摘下成就称号');
      setTitlePreferenceOpen(false);
    } catch {
      toast.error('称号更新失败，请稍后再试');
    } finally {
      setTitlePreferenceSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-border/40 bg-background/85 px-4 py-3 backdrop-blur-md safe-top">
        <Button variant="ghost" size="icon" className="rounded-full press-feedback" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-4 px-5 py-4">
        <Avatar className="h-20 w-20 shrink-0 border-2 border-border/60 shadow-[2px_3px_0_rgba(0,0,0,0.08)]">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={`${displayName} 的头像`} className="object-cover" />}
          <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1.5">
            <h1 className="min-w-0 max-w-full truncate text-2xl font-black text-foreground">
              {displayName || 'CMI 朋友'}
            </h1>
            <ProfileTitleBadge title={activityTitle.title} />
            {selectedAchievementTitle && (
              <ProfileTitleBadge title={selectedAchievementTitle.title} tone="achievement" />
            )}
            {isOwnProfile && (
              <button
                type="button"
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-white px-2 text-[0.72rem] font-black text-primary shadow-sm active:bg-primary/5"
                onClick={() => setTitlePreferenceOpen(true)}
                aria-label="选择称号"
              >
                <Award className="h-3.5 w-3.5" strokeWidth={2.4} />
                称号
              </button>
            )}
          </div>
          <p className="mb-2 text-sm font-semibold text-muted-foreground">清迈数字游民 · 社区建设者</p>
          <div className="flex gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black">{recommendations.length}</span>
              <span className="text-[11px] font-semibold text-muted-foreground">贡献</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black">{posts.length}</span>
              <span className="text-[11px] font-semibold text-muted-foreground">动态</span>
            </div>
          </div>
        </div>
      </div>

      {titlePreferenceOpen && isOwnProfile && (
        <TitlePreferenceSheet
          activityTitle={activityTitle.title}
          selectedTitleId={selectedAchievementTitleId}
          submitting={titlePreferenceSubmitting}
          onSelect={titleId => void handleSelectAchievementTitle(titleId)}
          onClose={() => setTitlePreferenceOpen(false)}
        />
      )}

      <div className="sticky top-[52px] z-40 flex border-b border-border/50 bg-background px-5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 whitespace-nowrap pb-3 text-center text-sm font-bold transition-colors ${
              activeTab === tab.id ? 'text-foreground' : 'text-stone-400'
            }`}
          >
            {tab.label} ({tab.count})
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-3 right-3 h-[2.5px] rounded-full bg-foreground" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'recommendations' && (
        <div className="overflow-x-auto px-5 py-3 hide-scrollbar">
          <div className="flex min-w-max gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full whitespace-nowrap press-feedback border border-border/60"
              onClick={() => setSelectedCategory('all')}
            >
              全部
            </Button>
            {CATEGORIES.map(category => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? 'default' : 'outline'}
                size="sm"
                className="rounded-full whitespace-nowrap press-feedback border border-border/60"
                onClick={() => setSelectedCategory(category.name)}
              >
                <img src={category.iconUrl} alt={category.name} className="mr-1 h-5 w-5 object-contain" />
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <main className="px-5 pb-12">
        {activeTab === 'recommendations' && (
          <div className="space-y-3">
            {loading ? (
              <div className="py-10 text-center text-sm font-medium text-muted-foreground">正在翻 TA 的清迈痕迹...</div>
            ) : filteredRecommendations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                TA 还没有留下这一类地点。
              </div>
            ) : (
              filteredRecommendations.map(recommendation => (
                <RecommendationCard key={recommendation.id} recommendation={recommendation} />
              ))
            )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="space-y-3 pt-3">
            {loading ? (
              <div className="py-10 text-center text-sm font-medium text-muted-foreground">正在翻 TA 的动态...</div>
            ) : posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                TA 还没有公开动态。
              </div>
            ) : (
              posts.map(post => <BlackboardPostCard key={post.id} post={post} />)
            )}
          </div>
        )}
      </main>
    </div>
  );
}
