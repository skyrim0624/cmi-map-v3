import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import type { WildAnimalStickerEntry } from '@/lib/cmi-wild-animal-stickers';

interface AnimalStickerAlbumProps {
  entries: WildAnimalStickerEntry[];
  emptyText?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

const formatStickerDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export default function AnimalStickerAlbum({
  entries,
  emptyText = '还没有动物贴纸',
  emptyActionLabel,
  onEmptyAction,
}: AnimalStickerAlbumProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedEntry = selectedIndex === null ? null : entries[selectedIndex] ?? null;
  const canStep = entries.length > 1;

  const step = (offset: number) => {
    if (selectedIndex === null || entries.length === 0) return;
    setSelectedIndex((selectedIndex + offset + entries.length) % entries.length);
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-[1.35rem] border-2 border-dashed border-[#2e6e45]/25 bg-[#fff7dc] px-5 py-8 text-center">
        <p className="text-sm font-black text-[#0b3d24]">{emptyText}</p>
        {emptyActionLabel && onEmptyAction && (
          <button
            type="button"
            onClick={onEmptyAction}
            className="mt-4 rounded-full border-2 border-[#0b3d24] bg-[#ffd83f] px-4 py-2 text-xs font-black text-[#0b3d24] shadow-[3px_4px_0_rgba(11,61,36,0.22)] active:translate-y-0.5 active:shadow-[1px_2px_0_rgba(11,61,36,0.2)]"
          >
            {emptyActionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {entries.map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className="min-w-0 text-left"
          >
            <span className="flex aspect-square items-center justify-center rounded-[1.2rem] border-2 border-[#0b3d24] bg-[#fff7dc] p-2 shadow-[4px_5px_0_rgba(11,61,36,0.18)] active:translate-y-0.5">
              <img
                src={entry.stickerUrl}
                alt={entry.commonName}
                className="h-full w-full object-contain drop-shadow-[0_8px_0_rgba(11,61,36,0.12)]"
              />
            </span>
            <span className="mt-2 block truncate text-center text-xs font-black text-[#0b3d24]">
              {entry.commonName}
            </span>
          </button>
        ))}
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 z-[90] flex min-h-[100dvh] items-center justify-center bg-[#063f27] px-5 py-[calc(env(safe-area-inset-top)+1rem)]">
          <button
            type="button"
            onClick={() => setSelectedIndex(null)}
            aria-label="关闭图鉴"
            className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] grid h-11 w-11 place-items-center rounded-full border-2 border-[#fff7dc] bg-[#0b3d24] text-[#fff7dc] shadow-[3px_4px_0_rgba(0,0,0,0.2)]"
          >
            <X className="h-5 w-5" strokeWidth={3} />
          </button>

          {canStep && (
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="上一张"
              className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border-2 border-[#0b3d24] bg-[#fff7dc] text-[#0b3d24] shadow-[3px_4px_0_rgba(0,0,0,0.2)]"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={3} />
            </button>
          )}

          <article className="w-full max-w-[22rem] rounded-[1.8rem] border-2 border-[#0b3d24] bg-[#fff7dc] px-5 pb-5 pt-6 text-center shadow-[8px_10px_0_rgba(0,0,0,0.22)]">
            <div className="mx-auto flex aspect-square max-h-[52dvh] items-center justify-center">
              <img
                src={selectedEntry.stickerUrl}
                alt={selectedEntry.commonName}
                className="max-h-full max-w-full object-contain drop-shadow-[0_16px_0_rgba(11,61,36,0.12)]"
              />
            </div>
            <h2 className="mt-3 text-2xl font-black leading-tight text-[#0b3d24]">{selectedEntry.commonName}</h2>
            {selectedEntry.scientificName && (
              <p className="mt-1 text-xs font-bold italic text-[#0b3d24]/65">{selectedEntry.scientificName}</p>
            )}
            <p className="mt-3 truncate text-sm font-black text-[#0b3d24]/80">
              {selectedEntry.placeName}
              {formatStickerDate(selectedEntry.createdAt) && (
                <span className="ml-2 text-[#0b3d24]/55">{formatStickerDate(selectedEntry.createdAt)}</span>
              )}
            </p>
          </article>

          {canStep && (
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="下一张"
              className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border-2 border-[#0b3d24] bg-[#fff7dc] text-[#0b3d24] shadow-[3px_4px_0_rgba(0,0,0,0.2)]"
            >
              <ChevronRight className="h-6 w-6" strokeWidth={3} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
