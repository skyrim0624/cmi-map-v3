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
                {recapImages.map((image, index) => (
                  <article
                    key={image.id}
                    className={cn(
                      'grid grid-cols-[5.6rem_minmax(0,1fr)] gap-3 border-[2px] border-[#111827] bg-white p-3 shadow-[4px_5px_0_rgba(17,24,39,0.16)]',
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
    </div>
  );
}
