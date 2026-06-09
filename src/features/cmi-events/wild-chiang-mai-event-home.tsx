import { Camera, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { CmiEvent } from '@/data/cmi-events';
import {
  getEventRecapLeaderboard,
  type EventRecapImage,
} from '@/features/cmi-events/event-recaps';
import { cn } from '@/lib/utils';

interface WildChiangMaiEventHomeProps {
  event: CmiEvent;
  posterUrl: string;
  recapImages: EventRecapImage[];
  recapsLoading: boolean;
  onOpenRecapComposer: () => void;
}

const formatCaptureCount = (count: number) => `${count} 次捕获`;

export function WildChiangMaiEventHome({
  event,
  posterUrl,
  recapImages,
  recapsLoading,
  onOpenRecapComposer,
}: WildChiangMaiEventHomeProps) {
  const leaderboard = useMemo(() => getEventRecapLeaderboard(recapImages), [recapImages]);

  return (
    <div className="min-h-[100dvh] bg-[#f6edd7] text-[#111827]">
      <main className="relative mx-auto min-h-[100dvh] max-w-[520px] overflow-hidden px-4 py-[calc(env(safe-area-inset-top)+16px)]">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-14 overflow-hidden opacity-20">
          <img
            src={posterUrl}
            alt=""
            className="h-full w-40 max-w-none object-cover object-left"
            loading="eager"
            aria-hidden="true"
          />
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-14 overflow-hidden opacity-20">
          <img
            src={posterUrl}
            alt=""
            className="h-full w-40 max-w-none object-cover object-right"
            loading="eager"
            aria-hidden="true"
          />
        </div>

        <section className="relative overflow-hidden rounded-[1.5rem] border-[3px] border-[#111827] bg-white p-4 shadow-[5px_6px_0_rgba(17,24,39,0.16)]">
          <h1 className="relative z-10 text-[2.05rem] font-black leading-[1.05] tracking-normal">
            {event.title}
          </h1>
          <div className="relative mt-5 h-52 overflow-hidden rounded-[1.15rem] border-[3px] border-[#111827] bg-[#fff8e8]">
            <img
              src={posterUrl}
              alt=""
              className="h-full w-full object-cover object-[50%_64%]"
              loading="eager"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-white/8" />
            <button
              type="button"
              className="absolute bottom-3 right-3 rounded-[0.85rem] border-[2px] border-[#111827] bg-white px-3 py-2 text-sm font-black text-[#111827] shadow-[3px_4px_0_rgba(17,24,39,0.18)]"
            >
              活动介绍
            </button>
          </div>
        </section>

        <section className="relative mt-5 rounded-[1.4rem] border-[3px] border-[#111827] bg-white p-4 shadow-[4px_5px_0_rgba(17,24,39,0.12)]">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#218f4f]" strokeWidth={2.6} />
            <h2 className="text-[1.25rem] font-black leading-tight">排行榜</h2>
          </div>
          {leaderboard.length > 0 ? (
            <ol className="space-y-3">
              {leaderboard.slice(0, 5).map((entry, index) => (
                <li key={entry.userName} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3">
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-white',
                      index === 0 ? 'bg-[#ef5b3f]' : 'bg-[#218f4f]'
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-black">{entry.userName}</span>
                  <span className="text-sm font-black text-[#218f4f]">{formatCaptureCount(entry.captureCount)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm font-bold text-[#56616f]">暂无捕获记录</p>
          )}
        </section>

        <section className="relative mt-5 pb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[1.25rem] font-black leading-tight">大家捕获的神奇动物</h2>
            <Button
              className="h-10 rounded-full border-[2px] border-[#111827] bg-[#111827] px-3 text-xs font-black text-white"
              onClick={onOpenRecapComposer}
            >
              <Camera className="mr-1 h-3.5 w-3.5" />
              打卡
            </Button>
          </div>

          {recapsLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map(index => (
                <div key={index} className="h-28 animate-pulse rounded-[1.25rem] bg-white/80" />
              ))}
            </div>
          ) : recapImages.length > 0 ? (
            <div className="space-y-4">
              {recapImages.map(image => (
                <article
                  key={image.id}
                  className="grid grid-cols-[5.6rem_minmax(0,1fr)] gap-3 rounded-[1.25rem] border-[3px] border-[#111827] bg-white p-3 shadow-[4px_5px_0_rgba(17,24,39,0.1)]"
                >
                  <img
                    src={image.imageUrl}
                    alt={`${image.userName} 捕获的神奇动物`}
                    className="aspect-square w-full rounded-[0.9rem] object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="min-w-0 py-1">
                    <p className="truncate text-sm font-black">{image.userName}</p>
                    <p className="mt-1 text-xs font-black text-[#218f4f]">{image.placeName}</p>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-[#384252]">
                      {image.reason || '发现了一只神奇动物'}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.25rem] border-[3px] border-dashed border-[#111827]/30 bg-white/80 p-5 text-center">
              <p className="text-sm font-bold text-[#56616f]">还没有人捕获神奇动物</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
