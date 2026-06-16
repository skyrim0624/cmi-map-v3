import type { WildAnimalStickerEntry } from '@/lib/cmi-wild-animal-stickers';

interface WildAnimalPhotoAlbumProps {
  entries: WildAnimalStickerEntry[];
  emptyText?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

const getAnimalPhotoUrl = (entry: WildAnimalStickerEntry) => (
  entry.photoUrl?.trim() || entry.stickerUrl
);

const getAnimalIntro = (entry: WildAnimalStickerEntry) => {
  if (entry.commonName === '神奇生物') {
    return '在清迈探索里被记录下来的神奇生物。';
  }

  return `这只${entry.commonName}被记录在清迈的一次探索里。`;
};

export default function WildAnimalPhotoAlbum({
  entries,
  emptyText = '还没有神奇生物照片',
  emptyActionLabel,
  onEmptyAction,
}: WildAnimalPhotoAlbumProps) {
  if (entries.length === 0) {
    return (
      <div className="wild-animal-photo-album__empty">
        <p>{emptyText}</p>
        {emptyActionLabel && onEmptyAction && (
          <button type="button" onClick={onEmptyAction}>
            {emptyActionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="wild-animal-photo-album" aria-label="神奇生物图鉴">
      <div className="wild-animal-photo-album__grid">
        {entries.map(entry => {
          const photoUrl = getAnimalPhotoUrl(entry);

          return (
            <article key={entry.id} className="wild-animal-photo-card">
              <div className="wild-animal-photo-card__media">
                <img src={photoUrl} alt={entry.commonName} loading="lazy" />
              </div>
              <div className="wild-animal-photo-card__body">
                <h2>{entry.commonName}</h2>
                <p>{getAnimalIntro(entry)}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
