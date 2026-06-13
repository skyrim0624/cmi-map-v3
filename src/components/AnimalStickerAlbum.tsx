import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createAnimalStickerFromImageUrl,
  type WildAnimalStickerEntry,
} from '@/lib/cmi-wild-animal-stickers';

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
  colSpan: number;
  rowSpan: number;
  rotation: number;
  scale: number;
  translateY: number;
};

const ALBUM_STICKER_SLOTS: AlbumStickerSlot[] = [
  { colSpan: 5, rowSpan: 9, rotation: -9, scale: 1.04, translateY: 0 },
  { colSpan: 4, rowSpan: 8, rotation: 7, scale: 0.94, translateY: 12 },
  { colSpan: 5, rowSpan: 9, rotation: -3, scale: 1.08, translateY: -6 },
  { colSpan: 6, rowSpan: 8, rotation: 5, scale: 1.02, translateY: 4 },
  { colSpan: 4, rowSpan: 7, rotation: -11, scale: 0.92, translateY: -8 },
  { colSpan: 5, rowSpan: 10, rotation: 8, scale: 1.08, translateY: 10 },
  { colSpan: 5, rowSpan: 8, rotation: -5, scale: 1, translateY: 2 },
  { colSpan: 7, rowSpan: 9, rotation: 4, scale: 1.06, translateY: -4 },
];

const WILD_CHIANG_MAI_KV_IMAGE = '/cmi-home/event-posters/cmi-wild-chiang-mai-2026-06.png';

const getAlbumStickerSlot = (index: number) => ALBUM_STICKER_SLOTS[index % ALBUM_STICKER_SLOTS.length];

type DisplayStickerEntry = WildAnimalStickerEntry & {
  displayStickerUrl?: string;
};

export default function AnimalStickerAlbum({
  entries,
  emptyText = '还没有神奇生物贴纸',
  emptyActionLabel,
  onEmptyAction,
}: AnimalStickerAlbumProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [generatedStickerUrls, setGeneratedStickerUrls] = useState<Record<string, string>>({});
  const generatedUrlsRef = useRef<string[]>([]);
  const generatedStickerIdsRef = useRef<Set<string>>(new Set());
  const generatingStickerIdsRef = useRef<Set<string>>(new Set());
  const failedStickerIdsRef = useRef<Set<string>>(new Set());
  const displayEntries = useMemo<DisplayStickerEntry[]>(
    () => entries.map(entry => ({
      ...entry,
      displayStickerUrl: generatedStickerUrls[entry.id] || (entry.needsStickerGeneration ? undefined : entry.stickerUrl),
    })),
    [entries, generatedStickerUrls]
  );
  const selectedEntry = selectedIndex === null ? null : displayEntries[selectedIndex] ?? null;
  const canStep = entries.length > 1;

  useEffect(() => {
    let cancelled = false;

    const generateMissingStickers = async () => {
      for (const entry of entries) {
        if (
          !entry.needsStickerGeneration
          || !entry.photoUrl
          || generatedStickerIdsRef.current.has(entry.id)
          || generatingStickerIdsRef.current.has(entry.id)
          || failedStickerIdsRef.current.has(entry.id)
        ) {
          continue;
        }

        try {
          generatingStickerIdsRef.current.add(entry.id);
          const generatedUrl = await createAnimalStickerFromImageUrl(entry.photoUrl, {
            subjectBox: entry.subjectBox ?? undefined,
            nameZh: entry.commonName,
            scientificName: entry.scientificName ?? undefined,
          });

          if (cancelled) {
            URL.revokeObjectURL(generatedUrl);
            return;
          }

          generatedUrlsRef.current.push(generatedUrl);
          generatedStickerIdsRef.current.add(entry.id);
          setGeneratedStickerUrls(current => ({ ...current, [entry.id]: generatedUrl }));
        } catch (error) {
          failedStickerIdsRef.current.add(entry.id);
          console.warn('图鉴贴纸预览生成失败:', error);
        } finally {
          generatingStickerIdsRef.current.delete(entry.id);
        }
      }
    };

    void generateMissingStickers();

    return () => {
      cancelled = true;
    };
  }, [entries]);

  useEffect(() => () => {
    generatedUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    generatedUrlsRef.current = [];
  }, []);

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
        className="relative isolate overflow-hidden rounded-[1.8rem] border-[3px] border-[#0b3d24] bg-[#fff8df] px-3 py-5 shadow-[8px_10px_0_rgba(11,61,36,0.18)]"
      >
        {/* NOTE: 用“清迈神奇动物在哪里主 KV”做底纹，避免图鉴变成另一套视觉。 */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              `linear-gradient(rgba(255,248,223,0.7), rgba(255,248,223,0.76)), url("${WILD_CHIANG_MAI_KV_IMAGE}")`,
            backgroundPosition: 'center top',
            backgroundSize: 'cover',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(255,216,63,0.22)_0_3px,transparent_4px),radial-gradient(circle_at_84%_30%,rgba(255,143,181,0.2)_0_6px,transparent_7px)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-2 top-2 h-20 w-28 -rotate-6 rounded-[48%] border-[3px] border-[#ff4a24]/80"
        />
        <img
          src="/map-icons/cmi-easter-v2/egg-v2-08-leaf.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-6 -top-5 h-20 w-20 -rotate-12 opacity-70"
        />
        <img
          src="/map-icons/cmi-easter-v2/egg-v2-07-flower.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-5 top-7 h-16 w-16 rotate-12 opacity-70"
        />
        <img
          src="/map-icons/cmi-easter-v2/egg-v2-08-leaf.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-5 right-3 h-16 w-16 rotate-[28deg] opacity-65"
        />

        <div
          className="relative grid grid-flow-row-dense grid-cols-12 gap-x-1 gap-y-3"
          style={{ gridAutoRows: '1rem' }}
        >
          {displayEntries.map((entry, index) => {
            const slot = getAlbumStickerSlot(index);
            const isPreparingSticker = entry.needsStickerGeneration && Boolean(entry.photoUrl) && !entry.displayStickerUrl;

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className="group relative flex h-full min-w-0 items-center justify-center outline-none transition duration-200 active:scale-95 focus-visible:z-30 focus-visible:rounded-[1.25rem] focus-visible:ring-2 focus-visible:ring-[#0b3d24]"
                style={{
                  gridColumn: `span ${slot.colSpan}`,
                  gridRow: `span ${slot.rowSpan}`,
                  transform: `translateY(${slot.translateY}px) rotate(${slot.rotation}deg) scale(${slot.scale})`,
                  zIndex: 10 + index,
                }}
              >
                <span className="sr-only">{entry.commonName}</span>
                {entry.displayStickerUrl ? (
                  <img
                    src={entry.displayStickerUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain drop-shadow-[0_12px_0_rgba(11,61,36,0.12)] transition duration-200 group-hover:scale-105"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`grid h-20 w-20 place-items-center rounded-[45%_55%_48%_52%] border-2 border-dashed border-[#0b3d24]/25 bg-[#fff7dc]/78 ${isPreparingSticker ? 'animate-pulse' : ''}`}
                  >
                    <img src="/map-icons/cmi-easter-v2/egg-v2-08-leaf.png" alt="" className="h-9 w-9 opacity-55" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
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
              {selectedEntry.displayStickerUrl ? (
                <img
                  src={selectedEntry.displayStickerUrl}
                  alt={selectedEntry.commonName}
                  className="max-h-full max-w-full object-contain drop-shadow-[0_16px_0_rgba(11,61,36,0.12)]"
                />
              ) : (
                <div className="h-28 w-28 animate-pulse rounded-[45%_55%_48%_52%] border-2 border-dashed border-[#0b3d24]/25 bg-[#fffef4]" />
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
