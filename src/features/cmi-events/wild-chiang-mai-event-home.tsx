import { Bookmark, Camera, MessageCircle, Sticker as StickerIcon, Trophy } from 'lucide-react';
import { type MouseEvent as ReactMouseEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { CmiEvent } from '@/data/cmi-events';
import type { PublicProfile } from '@/db/api';
import {
  getEventRecapLeaderboard,
  type EventRecapImage,
} from '@/features/cmi-events/event-recaps';
import type { PlacedStickerMap, WishlistStateMap } from '@/features/interactions/recommendation-card-interactions';
import { cn } from '@/lib/utils';
import type { PlacedSticker, Recommendation, Sticker } from '@/types/types';

interface WildChiangMaiEventHomeProps {
  event: CmiEvent;
  posterUrl: string;
  recapImages: EventRecapImage[];
  recapRecommendations: Recommendation[];
  recapsLoading: boolean;
  activeRecIdForSticker: string | null;
  activeStickerId: string | null;
  availableStickers: Sticker[];
  authorProfilesByKey: Record<string, PublicProfile>;
  placedStickers: PlacedStickerMap;
  showStickerDrawer: boolean;
  wishlistStateByRecommendationId: WishlistStateMap;
  onCloseStickerDrawer: () => void;
  onOpenComment: (recommendation: Recommendation) => void;
  onOpenGuide: () => void;
  onPlaceStamp: (event: ReactMouseEvent<HTMLElement>, recommendationId: string) => void;
  onOpenRecapComposer: () => void;
  onSelectSticker: (stickerId: string) => void;
  onStartStamp: (recommendationId: string) => void;
  onToggleWishlist: (recommendation: Recommendation) => void;
}

const formatCaptureCount = (count: number) => `${count} 次捕获`;
const USER_AVATAR_FALLBACK_COLORS = ['#f6c85f', '#f28c6b', '#70b7a7', '#6f9fd8', '#b58ad9', '#ef9eb3'];

const getProfileLookupKey = (value: string | null | undefined) =>
  value?.normalize('NFKC').trim().toLowerCase() ?? '';

const getRecommendationAuthorProfile = (
  recommendation: Recommendation,
  profiles: Record<string, PublicProfile>
) => profiles[getProfileLookupKey(recommendation.user_id)]
  ?? profiles[getProfileLookupKey(recommendation.user_name)]
  ?? null;

const getUserInitial = (name: string | null | undefined) => {
  const normalizedName = name?.normalize('NFKC').trim();
  return normalizedName ? Array.from(normalizedName)[0].toUpperCase() : 'C';
};

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const getFallbackAvatarUrl = (name: string) => {
  const initial = getUserInitial(name);
  const colorIndex = Array.from(name || initial).reduce(
    (sum, character) => sum + (character.codePointAt(0) ?? 0),
    0
  ) % USER_AVATAR_FALLBACK_COLORS.length;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="48" fill="${USER_AVATAR_FALLBACK_COLORS[colorIndex]}"/>
      <text x="48" y="48" text-anchor="middle" dominant-baseline="central" alignment-baseline="middle" font-family="Arial, sans-serif" font-size="38" font-weight="800" fill="#2f2a23">${escapeSvgText(initial)}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const formatTraceTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '刚刚';

  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;

  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });
};

export function WildChiangMaiEventHome({
  event,
  posterUrl,
  recapImages,
  recapRecommendations,
  recapsLoading,
  activeRecIdForSticker,
  activeStickerId,
  availableStickers,
  authorProfilesByKey,
  placedStickers,
  showStickerDrawer,
  wishlistStateByRecommendationId,
  onCloseStickerDrawer,
  onOpenComment,
  onOpenGuide,
  onPlaceStamp,
  onOpenRecapComposer,
  onSelectSticker,
  onStartStamp,
  onToggleWishlist,
}: WildChiangMaiEventHomeProps) {
  const leaderboard = useMemo(() => getEventRecapLeaderboard(recapImages), [recapImages]);
  const recommendationsById = useMemo(
    () => new Map(recapRecommendations.map(recommendation => [recommendation.id, recommendation])),
    [recapRecommendations]
  );

  return (
    <div className="relative min-h-[100dvh] bg-white text-[#111827]">
      <main className="mx-auto min-h-[100dvh] max-w-[520px] overflow-hidden bg-[#f8f1df]">
        <section className="relative overflow-hidden bg-[#f8f1df]">
          <img
            src={posterUrl}
            alt={`${event.title}主视觉`}
            className="block h-auto w-full"
            loading="eager"
          />

          <div className="absolute bottom-10 left-6 right-6 z-20 flex justify-end">
            <button
              type="button"
              onClick={onOpenGuide}
              className="rotate-2 border-[3px] border-[#111827] bg-[#ff5a4d] px-3 py-2 text-sm font-black text-white shadow-[3px_4px_0_rgba(17,24,39,0.2)]"
            >
              活动介绍
            </button>
          </div>
        </section>

        <section className="relative -mt-px bg-[#07934d] px-6 pb-11 pt-6">
          <div className="absolute inset-x-0 top-0 h-7 bg-[#066d42] [clip-path:polygon(0_0,100%_0,100%_64%,78%_88%,55%_68%,31%_91%,0_70%)]" />
          <div className="pointer-events-none absolute left-4 top-14 h-10 w-10 rotate-[-18deg] bg-[#ff8bb9] opacity-90 [clip-path:polygon(50%_0,61%_34%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_34%)]" />
          <div className="pointer-events-none absolute right-5 top-24 h-5 w-16 rotate-[12deg] rounded-full bg-[#ffe733]" />

          <section className="relative rotate-[-1deg] bg-[#fff7dc] px-5 py-6 shadow-[9px_10px_0_rgba(4,62,34,0.32)] [clip-path:polygon(0_4%,18%_2%,36%_4%,54%_1%,74%_3%,100%_0,98%_92%,84%_96%,64%_94%,47%_99%,28%_95%,3%_98%)]">
            <div className="absolute -right-3 -top-3 h-12 w-20 rotate-[10deg] bg-[#ff8bb9]/80" />
            <div className="mb-5 inline-flex -rotate-2 items-center gap-2 border-[2px] border-[#111827] bg-[#ffe733] px-4 py-2 text-[#111827] shadow-[4px_5px_0_rgba(17,24,39,0.16)]">
              <Trophy className="h-5 w-5" strokeWidth={2.8} />
              <h2 className="text-[1.45rem] font-black leading-tight">排行榜</h2>
            </div>
            {leaderboard.length > 0 ? (
              <ol className="space-y-3">
                {leaderboard.slice(0, 5).map((entry, index) => (
                  <li key={entry.userName} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3">
                    <span
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-white',
                        index === 0 ? 'bg-[#ff5a4d]' : 'bg-[#1297d8]'
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-black">{entry.userName}</span>
                    <span className="text-sm font-black text-[#1297d8]">{formatCaptureCount(entry.captureCount)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_4rem] items-center gap-x-3 gap-y-4 border-t-[2px] border-[#111827]/18 pt-1">
                {[1, 2, 3].map(rank => (
                  <div key={rank} className="contents">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-[#fff7dc] text-sm font-black text-white shadow-[2px_3px_0_rgba(17,24,39,0.2)]',
                        rank === 1 ? 'bg-[#ff5a4d]' : 'bg-[#0b8d45]'
                      )}
                    >
                      {rank}
                    </span>
                    <span className="h-3 rounded-full bg-[#0b8d45] shadow-[2px_2px_0_rgba(17,24,39,0.08)]" />
                    <span className="text-right text-xs font-black text-[#243447]">待捕获</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="relative mt-11 bg-[#fff7dc] px-4 pb-6 pt-6 shadow-[8px_9px_0_rgba(4,62,34,0.28)] [clip-path:polygon(0_0,28%_2%,52%_0,76%_3%,100%_1%,98%_97%,78%_95%,55%_100%,31%_96%,0_99%)]">
            <div className="absolute -left-3 top-3 h-10 w-20 rotate-[-12deg] bg-[#ffe733]/85" />
            <div className="absolute -right-2 bottom-16 h-10 w-20 rotate-[13deg] bg-[#ff8bb9]/70" />
            <div className="mb-5 flex items-end justify-between gap-3">
              <h2 className="relative inline-block -rotate-2 border-[2px] border-[#111827] bg-[#ff8bb9] px-3 py-2 text-[1.6rem] font-black leading-tight tracking-normal text-[#111827] shadow-[4px_5px_0_rgba(17,24,39,0.14)]">
                大家捕获的神奇动物
              </h2>
              <Button
                className="relative h-10 rounded-none border-[3px] border-[#111827] bg-[#ffe733] px-3 text-xs font-black text-[#111827] shadow-[3px_4px_0_rgba(17,24,39,0.2)]"
                onClick={onOpenRecapComposer}
              >
                <Camera className="mr-1 h-3.5 w-3.5" />
                打卡
              </Button>
            </div>

            {recapsLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map(index => (
                  <div key={index} className="h-28 animate-pulse bg-white/80" />
                ))}
              </div>
            ) : recapImages.length > 0 ? (
              <div className="space-y-4">
                {recapImages.map((image, index) => {
                  const recommendation = recommendationsById.get(image.recommendationId);
                  const isStampTargetActive = Boolean(
                    recommendation && activeStickerId && activeRecIdForSticker === recommendation.id
                  );
                  const authorProfile = recommendation
                    ? getRecommendationAuthorProfile(recommendation, authorProfilesByKey)
                    : null;
                  const authorName = recommendation?.user_name || authorProfile?.user_name || image.userName || 'CMI 朋友';
                  const authorAvatarUrl = authorProfile?.avatar_url?.trim() || getFallbackAvatarUrl(authorName);
                  const createdLabel = formatTraceTime(recommendation?.created_at ?? image.createdAt);

                  return (
                    <article
                      key={image.id}
                      className={cn(
                        'relative grid grid-cols-[96px_minmax(0,1fr)] items-start gap-[13px] overflow-hidden border-[2px] border-[#111827] bg-white px-[14px] py-[13px] shadow-[4px_5px_0_rgba(17,24,39,0.16)]',
                        index % 2 === 0 ? 'rotate-[1deg]' : 'rotate-[-1deg]',
                        isStampTargetActive && 'cursor-crosshair outline outline-[3px] outline-offset-2 outline-[#ff8bb9]'
                      )}
                      onClick={(event) => {
                        if (!recommendation || !isStampTargetActive) return;
                        onPlaceStamp(event, recommendation.id);
                      }}
                    >
                      {recommendation && (
                        <WildPlacedStickerLayer placements={placedStickers[recommendation.id]} />
                      )}
                      <img
                        src={image.imageUrl}
                        alt={`${image.userName} 捕获的神奇动物`}
                        className="relative z-0 h-24 w-24 rounded-[13px] border border-[#111827]/15 bg-[#f7f7f7] object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="relative z-20 flex min-w-0 flex-col">
                        <div className="grid grid-cols-[34px_minmax(0,1fr)] items-start gap-2.5">
                          <span className="block h-[34px] w-[34px] overflow-hidden rounded-full bg-white">
                            <img src={authorAvatarUrl} alt="" className="h-full w-full object-cover" />
                          </span>
                          <div className="min-w-0">
                            <strong className="block truncate text-[14px] font-black leading-[1.12] text-[#111827]">
                              {authorName}
                            </strong>
                            <span className="mt-0.5 block truncate text-[12px] font-black leading-tight text-[#111827]">
                              {createdLabel}
                            </span>
                          </div>
                        </div>
                        <p className="mt-3 line-clamp-2 text-[17px] font-black leading-snug text-[#111827]">
                          {image.reason || '发现了一只神奇动物'}
                        </p>
                        {recommendation && (
                          <WildCaptureActions
                            isWishlisted={wishlistStateByRecommendationId[recommendation.id] ?? false}
                            onComment={() => onOpenComment(recommendation)}
                            onStamp={() => onStartStamp(recommendation.id)}
                            onWishlist={() => onToggleWishlist(recommendation)}
                          />
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {[0, 1, 2].map(index => (
                  <div
                    key={index}
                    className={cn(
                      'relative grid grid-cols-[5.6rem_minmax(0,1fr)] gap-3 border-[2px] border-[#111827] bg-white p-3 shadow-[4px_5px_0_rgba(17,24,39,0.14)]',
                      index % 2 === 0 ? 'rotate-[0.8deg]' : 'rotate-[-0.8deg]'
                    )}
                  >
                    <div className="absolute -right-2 -top-2 h-7 w-14 rotate-[12deg] bg-[#ffe733]/80" />
                    <div className="aspect-square border-[2px] border-[#111827] bg-[linear-gradient(135deg,#dbeed0_0%,#dbeed0_48%,#fff7dc_49%,#fff7dc_100%)]" />
                    <div className="min-w-0 py-1">
                      <p className="inline-block bg-[#0b8d45] px-2 py-1 text-sm font-black text-white">等待捕获</p>
                      <p className="mt-2 text-xs font-black text-[#111827]/60">清迈 · 神奇动物在哪里</p>
                      <p className="mt-2 text-sm font-semibold leading-snug text-[#384252]">还没有人捕获神奇动物</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="relative mt-10 border-[2px] border-[#111827] bg-[#ffe733] px-5 py-4 text-center text-xl font-black text-[#111827] shadow-[6px_7px_0_rgba(4,62,34,0.28)] [clip-path:polygon(0_10%,100%_0,98%_88%,72%_94%,50%_90%,28%_100%,2%_90%)]">
            <span className="relative">一起去发现更多神奇动物吧</span>
          </div>
        </section>
      </main>
      <WildStickerDrawer
        availableStickers={availableStickers}
        isOpen={showStickerDrawer}
        onClose={onCloseStickerDrawer}
        onSelectSticker={onSelectSticker}
      />
    </div>
  );
}

function WildPlacedStickerLayer({ placements = [] }: { placements?: PlacedSticker[] }) {
  if (placements.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      {placements.map(placement => {
        if (!placement.sticker?.icon_url) return null;

        return (
          <span
            key={placement.id}
            className="absolute block h-14 w-14 mix-blend-multiply drop-shadow-sm"
            style={{
              left: `${placement.x_ratio}%`,
              top: `${placement.y_ratio}%`,
              transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
            }}
          >
            <img
              src={placement.sticker.icon_url}
              alt=""
              className="h-full w-full object-contain saturate-[0.84] contrast-[1.08]"
            />
          </span>
        );
      })}
    </div>
  );
}

function WildCaptureActions({
  isWishlisted,
  onComment,
  onStamp,
  onWishlist,
}: {
  isWishlisted: boolean;
  onComment: () => void;
  onStamp: () => void;
  onWishlist: () => void;
}) {
  const handleActionClick = (event: ReactMouseEvent<HTMLButtonElement>, action: () => void) => {
    event.stopPropagation();
    action();
  };

  return (
    <div className="mt-4 flex items-center gap-9 text-[#111827]" aria-label="神奇动物互动">
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-full bg-transparent transition active:scale-95"
        onClick={(event) => handleActionClick(event, onStamp)}
        aria-label="盖戳"
        title="盖戳"
      >
        <StickerIcon className="h-5 w-5" strokeWidth={3} />
      </button>
      <button
        type="button"
        className={cn(
          'grid h-8 w-8 place-items-center rounded-full bg-transparent transition active:scale-95',
          isWishlisted && 'text-[#ff5a4d]'
        )}
        onClick={(event) => handleActionClick(event, onWishlist)}
        aria-label={isWishlisted ? '取消收藏' : '收藏'}
        aria-pressed={isWishlisted}
        title="收藏"
      >
        <Bookmark className={cn('h-5 w-5', isWishlisted && 'fill-current')} strokeWidth={3} />
      </button>
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-full bg-transparent transition active:scale-95"
        onClick={(event) => handleActionClick(event, onComment)}
        aria-label="评论"
        title="评论"
      >
        <MessageCircle className="h-5 w-5" strokeWidth={3} />
      </button>
    </div>
  );
}

function WildStickerDrawer({
  availableStickers,
  isOpen,
  onClose,
  onSelectSticker,
}: {
  availableStickers: Sticker[];
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (stickerId: string) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="选择盖戳图章">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" onClick={onClose} aria-label="关闭盖戳选择" />
      <div className="relative w-full max-w-[520px] rounded-t-[1.6rem] border-[2px] border-b-0 border-[#111827] bg-[#fff7dc] px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4 shadow-[0_-18px_50px_rgba(0,0,0,0.28)]">
        <div className="mb-4 flex items-center justify-center gap-2 text-[1.05rem] font-black text-[#111827]">
          <StickerIcon className="h-5 w-5" strokeWidth={3} />
          <strong>选择一个图章</strong>
        </div>
        {availableStickers.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {availableStickers.map(sticker => (
              <button
                key={sticker.id}
                type="button"
                className="grid min-w-0 justify-items-center gap-1.5 bg-transparent p-0 text-[#111827]"
                onClick={() => onSelectSticker(sticker.id)}
              >
                <span className="grid h-16 w-16 place-items-center rounded-[1.1rem] border border-[#111827]/20 bg-white/70">
                  <img
                    src={sticker.icon_url}
                    alt=""
                    className="h-12 w-12 object-contain mix-blend-multiply saturate-[0.84] contrast-[1.08]"
                  />
                </span>
                <strong className="max-w-full truncate text-[0.68rem] font-black text-[#111827]/70">{sticker.name}</strong>
              </button>
            ))}
          </div>
        ) : (
          <p className="my-5 text-center text-sm font-black text-[#111827]/65">正在准备图章</p>
        )}
      </div>
    </div>
  );
}
