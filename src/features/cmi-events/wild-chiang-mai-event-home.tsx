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
    <div className="min-h-[100dvh] bg-white text-[#111827]">
      <main className="mx-auto min-h-[100dvh] max-w-[520px] overflow-hidden bg-[#f8f1df]">
        <section className="relative min-h-[46rem] overflow-hidden px-6 pb-10 pt-[calc(env(safe-area-inset-top)+28px)]">
          <div className="grid grid-cols-3 text-[10px] font-black uppercase tracking-normal text-[#111827]/80">
            <span>CMI MAP</span>
            <span className="text-center">清迈</span>
            <span className="text-right">2026</span>
          </div>

          <h1 className="relative z-20 mt-8 text-[3.85rem] font-black leading-[0.96] tracking-normal text-[#050505]">
            清迈神奇
            <br />
            动物在哪里
          </h1>

          <div className="absolute left-0 right-0 top-[15.6rem] h-[31rem] overflow-hidden">
            <img
              src={posterUrl}
              alt=""
              className="h-full w-full object-cover object-[50%_68%]"
              loading="eager"
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#f8f1df] to-[#f8f1df]/0" />
          </div>

          <div className="absolute left-7 top-[15.6rem] z-20 -rotate-3 bg-[#0b8d45] px-4 py-2 text-sm font-black text-white shadow-[4px_5px_0_rgba(17,24,39,0.18)]">
            在清迈发现城市里的生命痕迹
          </div>

          <div className="absolute bottom-12 left-6 right-6 z-20 flex justify-end">
            <button
              type="button"
              className="rotate-2 border-[3px] border-[#111827] bg-[#ff5a4d] px-3 py-2 text-sm font-black text-white shadow-[3px_4px_0_rgba(17,24,39,0.2)]"
            >
              活动介绍
            </button>
          </div>

          <div className="absolute right-9 top-[13rem] h-10 w-10 rotate-12 bg-[#ff8bb9] [clip-path:polygon(50%_0,61%_34%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_34%)]" />
          <div className="absolute right-8 top-[25rem] z-20 text-[3.2rem] font-black leading-none text-[#1297d8]">↘</div>
        </section>

        <section className="relative bg-[#5fc4e8] px-6 pb-10 pt-12">
          <div className="absolute left-0 top-0 h-8 w-full bg-[#f8f1df] [clip-path:polygon(0_0,100%_0,100%_45%,72%_72%,42%_45%,0_80%)]" />

          <section className="relative rotate-[-1deg] border-[3px] border-[#111827] bg-white p-5 shadow-[6px_7px_0_rgba(17,24,39,0.18)]">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#1297d8]" strokeWidth={2.6} />
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
              <p className="text-sm font-bold text-[#56616f]">暂无捕获记录</p>
            )}
          </section>

          <section className="relative mt-12">
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className="max-w-[13rem] text-[2.1rem] font-black leading-[0.95] tracking-normal text-white [text-shadow:3px_3px_0_#111827]">
                大家捕获的
                <br />
                神奇动物
              </h2>
              <Button
                className="h-10 rounded-none border-[3px] border-[#111827] bg-[#ffe733] px-3 text-xs font-black text-[#111827] shadow-[3px_4px_0_rgba(17,24,39,0.2)]"
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
                {recapImages.map((image, index) => (
                  <article
                    key={image.id}
                    className={cn(
                      'grid grid-cols-[5.6rem_minmax(0,1fr)] gap-3 border-[3px] border-[#111827] bg-white p-3 shadow-[4px_5px_0_rgba(17,24,39,0.16)]',
                      index % 2 === 0 ? 'rotate-[1deg]' : 'rotate-[-1deg]'
                    )}
                  >
                    <img
                      src={image.imageUrl}
                      alt={`${image.userName} 捕获的神奇动物`}
                      className="aspect-square w-full border-[2px] border-[#111827] object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="min-w-0 py-1">
                      <p className="inline-block max-w-full truncate bg-[#111827] px-2 py-1 text-sm font-black text-white">
                        {image.userName}
                      </p>
                      <p className="mt-2 text-xs font-black text-[#1297d8]">{image.placeName}</p>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-[#384252]">
                        {image.reason || '发现了一只神奇动物'}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="border-[3px] border-dashed border-[#111827] bg-white p-6 text-center shadow-[4px_5px_0_rgba(17,24,39,0.12)]">
                <p className="text-sm font-black text-[#56616f]">还没有人捕获神奇动物</p>
              </div>
            )}
          </section>

          <div className="mt-12 border-[3px] border-[#111827] bg-[#f8f1df] p-5 shadow-[6px_7px_0_rgba(17,24,39,0.18)]">
            <p className="text-[2.2rem] font-black leading-none text-[#1297d8] [text-shadow:2px_2px_0_#ffffff,4px_4px_0_#111827]">
              CMI MAP
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
