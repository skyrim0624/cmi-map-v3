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
              className="rotate-2 border-[3px] border-[#111827] bg-[#ff5a4d] px-3 py-2 text-sm font-black text-white shadow-[3px_4px_0_rgba(17,24,39,0.2)]"
            >
              活动介绍
            </button>
          </div>
        </section>

        <section className="relative bg-[#0b8d45] px-6 pb-10 pt-10">
          <div className="absolute left-0 top-0 h-9 w-full bg-[#f8f1df] [clip-path:polygon(0_0,100%_0,100%_36%,82%_60%,58%_44%,36%_66%,0_42%)]" />
          <div className="absolute inset-x-0 top-8 h-5 bg-[#0a6f50]" />

          <section className="relative rotate-[-1deg] bg-[#f8f1df] px-5 py-5 shadow-[7px_8px_0_rgba(17,24,39,0.2)] [clip-path:polygon(0_3%,100%_0,98%_94%,76%_98%,54%_95%,28%_100%,2%_96%)]">
            <div className="mb-4 inline-flex -rotate-2 items-center gap-2 bg-[#ffe733] px-4 py-2 text-[#111827] shadow-[4px_5px_0_rgba(17,24,39,0.16)]">
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
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_4rem] items-center gap-x-3 gap-y-4">
                {[1, 2, 3].map(rank => (
                  <div key={rank} className="contents">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-black text-white',
                        rank === 1 ? 'bg-[#ff5a4d]' : 'bg-[#0b8d45]'
                      )}
                    >
                      {rank}
                    </span>
                    <span className="h-3 rounded-full bg-[#0b8d45]" />
                    <span className="text-right text-xs font-black text-[#111827]">待捕获</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="relative mt-11 bg-[#f8f1df] px-4 pb-5 pt-6 [clip-path:polygon(0_0,100%_2%,98%_98%,73%_96%,48%_100%,21%_96%,0_99%)]">
            <div className="mb-5 flex items-end justify-between gap-3">
              <h2 className="inline-block -rotate-2 bg-[#ff8bb9] px-3 py-2 text-[1.7rem] font-black leading-tight tracking-normal text-[#111827]">
                大家捕获的神奇动物
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
              <div className="space-y-4">
                {[0, 1, 2].map(index => (
                  <div
                    key={index}
                    className={cn(
                      'grid grid-cols-[5.6rem_minmax(0,1fr)] gap-3 border-[2px] border-[#111827] bg-white p-3 shadow-[3px_4px_0_rgba(17,24,39,0.12)]',
                      index % 2 === 0 ? 'rotate-[0.8deg]' : 'rotate-[-0.8deg]'
                    )}
                  >
                    <div className="aspect-square border-[2px] border-[#111827] bg-[linear-gradient(135deg,#dbeed0_0%,#dbeed0_48%,#f8f1df_49%,#f8f1df_100%)]" />
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

          <div className="mt-10 bg-[#ffe733] px-5 py-4 text-center text-xl font-black text-[#111827] shadow-[5px_6px_0_rgba(17,24,39,0.18)]">
            一起去发现更多神奇动物吧
          </div>
        </section>
      </main>
    </div>
  );
}
