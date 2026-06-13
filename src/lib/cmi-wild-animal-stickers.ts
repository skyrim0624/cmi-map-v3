import { CMI_MAP_WILD_CHIANG_MAI_EVENT_ID } from '@/data/cmi-events';
import { getRecommendationLinkedEvent } from '@/lib/cmi-recommendation-events';
import type { Recommendation } from '@/types/types';

export interface AnimalSubjectBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnimalSubjectPoint {
  x: number;
  y: number;
}

export interface WildAnimalStickerMetadata {
  stickerUrl?: string | null;
  commonName?: string | null;
  scientificName?: string | null;
  subjectBox?: AnimalSubjectBox | null;
}

export interface WildAnimalStickerEntry {
  id: string;
  stickerUrl: string;
  photoUrl?: string | null;
  commonName: string;
  scientificName?: string | null;
  placeName: string;
  createdAt: string;
}

type StickerGeometryInput = {
  subjectBox?: AnimalSubjectBox;
  subjectPolygon?: AnimalSubjectPoint[];
  nameZh?: string;
  scientificName?: string;
};

const STICKER_OUTPUT_SIZE = 720;
const WILD_ANIMAL_STICKER_META_PATTERN = /\[\[cmi:wild-animal=([^\]\n]+)\]\]\s*/i;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const toNormalizedNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? clamp(numberValue, 0, 1000) : null;
};

export const normalizeAnimalSubjectBox = (value: unknown): AnimalSubjectBox | undefined => {
  if (!isRecord(value)) return undefined;

  const x = toNormalizedNumber(value.x);
  const y = toNormalizedNumber(value.y);
  const width = toNormalizedNumber(value.width);
  const height = toNormalizedNumber(value.height);

  if (x === null || y === null || width === null || height === null || width < 8 || height < 8) {
    return undefined;
  }
  const maxWidth = 1000 - x;
  const maxHeight = 1000 - y;
  if (maxWidth < 8 || maxHeight < 8) return undefined;

  return {
    x: clamp(x, 0, 1000),
    y: clamp(y, 0, 1000),
    width: clamp(width, 8, maxWidth),
    height: clamp(height, 8, maxHeight),
  };
};

export const normalizeAnimalSubjectPolygon = (value: unknown): AnimalSubjectPoint[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const points = value
    .slice(0, 32)
    .map(point => {
      if (!isRecord(point)) return null;
      const x = toNormalizedNumber(point.x);
      const y = toNormalizedNumber(point.y);
      return x === null || y === null ? null : { x, y };
    })
    .filter((point): point is AnimalSubjectPoint => point !== null);

  return points.length >= 3 ? points : undefined;
};

export const stripWildAnimalStickerMetadata = (reason?: string | null): string => (
  (reason ?? '').replace(WILD_ANIMAL_STICKER_META_PATTERN, '').trim()
);

export const encodeWildAnimalStickerMetadata = (
  reason: string,
  metadata: WildAnimalStickerMetadata
): string => {
  const cleanReason = stripWildAnimalStickerMetadata(reason);
  const payload = encodeURIComponent(JSON.stringify({
    stickerUrl: metadata.stickerUrl ?? '',
    commonName: metadata.commonName ?? '',
    scientificName: metadata.scientificName ?? '',
    subjectBox: metadata.subjectBox ?? null,
  }));

  return `[[cmi:wild-animal=${payload}]]\n${cleanReason}`;
};

export const extractWildAnimalStickerMetadata = (reason?: string | null): WildAnimalStickerMetadata | null => {
  const match = reason?.match(WILD_ANIMAL_STICKER_META_PATTERN);
  if (!match?.[1]) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as Record<string, unknown>;
    return {
      stickerUrl: typeof parsed.stickerUrl === 'string' ? parsed.stickerUrl.trim() : '',
      commonName: typeof parsed.commonName === 'string' ? parsed.commonName.trim() : '',
      scientificName: typeof parsed.scientificName === 'string' ? parsed.scientificName.trim() : '',
      subjectBox: normalizeAnimalSubjectBox(parsed.subjectBox) ?? null,
    };
  } catch {
    return null;
  }
};

export const getRecommendationAnimalSticker = (
  recommendation: Pick<Recommendation, 'animal_sticker_url' | 'animal_common_name' | 'animal_scientific_name' | 'animal_subject_box' | 'reason'>
): WildAnimalStickerMetadata | null => {
  const stickerUrl = recommendation.animal_sticker_url?.trim();
  const metadata = extractWildAnimalStickerMetadata(recommendation.reason);

  if (!stickerUrl && !metadata?.stickerUrl) return metadata;

  return {
    stickerUrl: stickerUrl || metadata?.stickerUrl || '',
    commonName: recommendation.animal_common_name?.trim() || metadata?.commonName || '',
    scientificName: recommendation.animal_scientific_name?.trim() || metadata?.scientificName || '',
    subjectBox: normalizeAnimalSubjectBox(recommendation.animal_subject_box) ?? metadata?.subjectBox ?? null,
  };
};

export const getWildAnimalStickerEntries = (recommendations: Recommendation[]): WildAnimalStickerEntry[] => (
  recommendations.flatMap(recommendation => {
    const linkedEvent = getRecommendationLinkedEvent(recommendation);
    const isWildAnimalEntry = linkedEvent?.id === CMI_MAP_WILD_CHIANG_MAI_EVENT_ID;
    const metadata = getRecommendationAnimalSticker(recommendation);
    const fallbackPhotoUrl = recommendation.images?.find(Boolean) ?? null;
    const stickerUrl = metadata?.stickerUrl || fallbackPhotoUrl;

    if (!stickerUrl || (!isWildAnimalEntry && !metadata?.stickerUrl)) return [];

    return [{
      id: recommendation.id,
      stickerUrl,
      photoUrl: fallbackPhotoUrl,
      commonName: metadata?.commonName || '神奇动物',
      scientificName: metadata?.scientificName || null,
      placeName: recommendation.place_name,
      createdAt: recommendation.created_at,
    }];
  })
);

const loadImageFromFile = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('动物贴纸图片读取失败'));
  };
  image.src = objectUrl;
});

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('动物贴纸生成失败'));
    }, type, quality);
  });

const getExpandedCrop = (
  image: HTMLImageElement,
  subjectBox?: AnimalSubjectBox
) => {
  const box = subjectBox ?? { x: 90, y: 90, width: 820, height: 820 };
  const sourceX = box.x / 1000 * image.naturalWidth;
  const sourceY = box.y / 1000 * image.naturalHeight;
  const sourceWidth = box.width / 1000 * image.naturalWidth;
  const sourceHeight = box.height / 1000 * image.naturalHeight;
  const paddedSize = Math.max(sourceWidth, sourceHeight) * 1.34;
  const size = Math.min(Math.max(paddedSize, 1), Math.max(image.naturalWidth, image.naturalHeight));
  const centerX = sourceX + sourceWidth / 2;
  const centerY = sourceY + sourceHeight / 2;

  return {
    x: clamp(centerX - size / 2, 0, Math.max(0, image.naturalWidth - size)),
    y: clamp(centerY - size / 2, 0, Math.max(0, image.naturalHeight - size)),
    size,
  };
};

const buildFallbackStickerPolygon = (): AnimalSubjectPoint[] => [
  { x: 500, y: 76 },
  { x: 782, y: 172 },
  { x: 908, y: 454 },
  { x: 820, y: 738 },
  { x: 544, y: 908 },
  { x: 220, y: 824 },
  { x: 82, y: 544 },
  { x: 172, y: 220 },
];

const toCanvasPolygon = (
  image: HTMLImageElement,
  crop: ReturnType<typeof getExpandedCrop>,
  subjectPolygon?: AnimalSubjectPoint[]
) => {
  const points = subjectPolygon?.length ? subjectPolygon : buildFallbackStickerPolygon();

  return points.map(point => ({
    x: clamp(((point.x / 1000 * image.naturalWidth) - crop.x) / crop.size * STICKER_OUTPUT_SIZE, 24, STICKER_OUTPUT_SIZE - 24),
    y: clamp(((point.y / 1000 * image.naturalHeight) - crop.y) / crop.size * STICKER_OUTPUT_SIZE, 24, STICKER_OUTPUT_SIZE - 24),
  }));
};

const addPolygonPath = (context: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>) => {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    context.lineTo(point.x, point.y);
  }
  context.closePath();
};

const getStickerFileName = (geometry: StickerGeometryInput) => {
  const source = geometry.scientificName || geometry.nameZh || 'wild-animal';
  const safeName = source
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42) || 'wild-animal';
  return `${safeName}-sticker.webp`;
};

export const createAnimalStickerFromPhoto = async (
  photoFile: File,
  geometry: StickerGeometryInput
): Promise<File> => {
  const image = await loadImageFromFile(photoFile);
  const canvas = document.createElement('canvas');
  canvas.width = STICKER_OUTPUT_SIZE;
  canvas.height = STICKER_OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持生成动物贴纸');

  const crop = getExpandedCrop(image, geometry.subjectBox);
  const polygon = toCanvasPolygon(image, crop, normalizeAnimalSubjectPolygon(geometry.subjectPolygon));

  context.clearRect(0, 0, STICKER_OUTPUT_SIZE, STICKER_OUTPUT_SIZE);
  context.save();
  context.shadowColor = 'rgba(11, 23, 36, 0.22)';
  context.shadowBlur = 24;
  context.shadowOffsetX = 12;
  context.shadowOffsetY = 18;
  addPolygonPath(context, polygon);
  context.fillStyle = '#fffef5';
  context.fill();
  context.restore();

  context.save();
  addPolygonPath(context, polygon);
  context.clip();
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.size,
    crop.size,
    0,
    0,
    STICKER_OUTPUT_SIZE,
    STICKER_OUTPUT_SIZE
  );
  context.restore();

  context.save();
  addPolygonPath(context, polygon);
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.strokeStyle = '#fffef5';
  context.lineWidth = 30;
  context.stroke();
  context.strokeStyle = 'rgba(11, 23, 36, 0.2)';
  context.lineWidth = 2;
  context.stroke();
  context.restore();

  const blob = await canvasToBlob(canvas, 'image/webp', 0.92);
  return new File([blob], getStickerFileName(geometry), { type: 'image/webp' });
};
