import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AnimalSubjectBox, WildAnimalStickerEntry } from '@/lib/cmi-wild-animal-stickers';

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

type AlbumStickerSlot = {
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
  rotation: number;
  scale: number;
};

const ALBUM_STICKER_SLOTS: AlbumStickerSlot[] = [
  { colStart: 1, rowStart: 2, colSpan: 5, rowSpan: 6, rotation: -9, scale: 1.08 },
  { colStart: 8, rowStart: 3, colSpan: 4, rowSpan: 5, rotation: 7, scale: 1 },
  { colStart: 2, rowStart: 9, colSpan: 5, rowSpan: 6, rotation: -3, scale: 1.08 },
  { colStart: 7, rowStart: 10, colSpan: 5, rowSpan: 7, rotation: 5, scale: 1.05 },
  { colStart: 1, rowStart: 18, colSpan: 4, rowSpan: 5, rotation: -11, scale: 0.98 },
  { colStart: 6, rowStart: 20, colSpan: 5, rowSpan: 7, rotation: 8, scale: 1.06 },
  { colStart: 2, rowStart: 25, colSpan: 5, rowSpan: 5, rotation: -5, scale: 1 },
  { colStart: 8, rowStart: 25, colSpan: 4, rowSpan: 5, rotation: 4, scale: 1 },
];

const WILD_ANIMAL_ALBUM_BOARD_IMAGE = '/cmi-home/animal-album-backgrounds/wild-sticker-album-board-v1.webp';
const ALBUM_BOARD_ASPECT_WIDTH = 941;
const ALBUM_BOARD_ASPECT_HEIGHT = 1672;
const ALBUM_STICKER_ROW_COUNT = 30;
const ALBUM_PAGE_CONTENT_INSET_PERCENT = 5.5;
const ALBUM_PAGE_CONTENT_HEIGHT_PERCENT = 100 - ALBUM_PAGE_CONTENT_INSET_PERCENT * 2;
const ALBUM_STICKERS_PER_PAGE = ALBUM_STICKER_SLOTS.length;

const getAlbumStickerSlot = (index: number) => ALBUM_STICKER_SLOTS[index % ALBUM_STICKER_SLOTS.length];

const getAlbumPageCount = (entryCount: number) => Math.max(1, Math.ceil(entryCount / ALBUM_STICKERS_PER_PAGE));

const getAnimalStickerPhotoUrl = (entry: WildAnimalStickerEntry) => (
  entry.photoUrl?.trim() || entry.stickerUrl
);

const getAnimalStickerObjectPosition = (subjectBox?: AnimalSubjectBox | null) => {
  if (!subjectBox) return '50% 50%';

  const centerX = subjectBox.x + subjectBox.width / 2;
  const centerY = subjectBox.y + subjectBox.height / 2;
  return `${centerX / 10}% ${centerY / 10}%`;
};

export default function AnimalStickerAlbum({
  entries,
  emptyText = '还没有神奇生物贴纸',
  emptyActionLabel,
  onEmptyAction,
}: AnimalStickerAlbumProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const albumPageCount = getAlbumPageCount(entries.length);
  const albumPages = useMemo(
    () => Array.from({ length: albumPageCount }, (_, pageIndex) => (
      entries.slice(
        pageIndex * ALBUM_STICKERS_PER_PAGE,
        (pageIndex + 1) * ALBUM_STICKERS_PER_PAGE
      )
    )),
    [albumPageCount, entries]
  );
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
      <section
        aria-label="神奇生物贴画册"
        className="relative isolate mx-auto w-full max-w-[34rem] overflow-hidden rounded-[1.8rem] border-[3px] border-[#0b3d24] bg-[#fff8df] shadow-[8px_10px_0_rgba(11,61,36,0.18)]"
        style={{
          aspectRatio: `${ALBUM_BOARD_ASPECT_WIDTH} / ${ALBUM_BOARD_ASPECT_HEIGHT * albumPageCount}`,
          backgroundImage: `url(${WILD_ANIMAL_ALBUM_BOARD_IMAGE})`,
          backgroundPosition: 'top center',
          backgroundRepeat: 'repeat-y',
          backgroundSize: '100% auto',
        }}
      >
        {/* NOTE: 背景图按页重复，贴纸位按每页 8 个继续往下排。 */}
        {albumPages.map((pageEntries, pageIndex) => (
          <div
            key={pageIndex}
            className="absolute left-[5.5%] right-[5.5%] grid grid-cols-12 gap-0"
            style={{
              top: `${(pageIndex * 100 + ALBUM_PAGE_CONTENT_INSET_PERCENT) / albumPageCount}%`,
              height: `${ALBUM_PAGE_CONTENT_HEIGHT_PERCENT / albumPageCount}%`,
              gridTemplateRows: `repeat(${ALBUM_STICKER_ROW_COUNT}, minmax(0, 1fr))`,
            }}
          >
            {pageEntries.map((entry, slotIndex) => {
              const index = pageIndex * ALBUM_STICKERS_PER_PAGE + slotIndex;
              const slot = getAlbumStickerSlot(slotIndex);
              const photoUrl = getAnimalStickerPhotoUrl(entry);

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className="group relative flex h-full min-w-0 items-center justify-center outline-none transition duration-200 active:scale-95 focus-visible:z-30 focus-visible:rounded-[1.25rem] focus-visible:ring-2 focus-visible:ring-[#0b3d24]"
                  style={{
                    gridColumn: `${slot.colStart} / span ${slot.colSpan}`,
                    gridRow: `${slot.rowStart} / span ${slot.rowSpan}`,
                    transform: `rotate(${slot.rotation}deg) scale(${slot.scale})`,
                    zIndex: 10 + index,
                  }}
                >
                  <span className="sr-only">{entry.commonName}</span>
                  {photoUrl && (
                    <span className="relative block aspect-square h-full max-h-full max-w-full overflow-hidden rounded-full border-[7px] border-[#fffef5] bg-[#fffef5] shadow-[8px_12px_0_rgba(11,61,36,0.13)] transition duration-200 group-hover:scale-105">
                      <img
                        src={photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        style={{ objectPosition: getAnimalStickerObjectPosition(entry.subjectBox) }}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </section>

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
              {getAnimalStickerPhotoUrl(selectedEntry) && (
                <span className="relative block aspect-square h-full max-h-full max-w-full overflow-hidden rounded-full border-[10px] border-[#fffef5] bg-[#fffef5] shadow-[10px_16px_0_rgba(11,61,36,0.14)]">
                  <img
                    src={getAnimalStickerPhotoUrl(selectedEntry)}
                    alt={selectedEntry.commonName}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: getAnimalStickerObjectPosition(selectedEntry.subjectBox) }}
                  />
                </span>
              )}
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
