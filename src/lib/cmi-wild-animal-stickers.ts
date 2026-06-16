import { CMI_MAP_WILD_CHIANG_MAI_EVENT_ID } from '@/data/cmi-events';
import { getRecommendationLinkedEvent } from '@/lib/cmi-recommendation-events';
import type { Recommendation } from '@/types/types';
import { compressImage } from '@/utils/imageCompression';

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
  subjectBox?: AnimalSubjectBox | null;
  needsStickerGeneration: boolean;
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
  sourceImageUrl?: string;
};

const STICKER_OUTPUT_SIZE = 720;
const STICKER_SEGMENT_MAX_SIZE = 584;
const STICKER_OUTLINE_RADIUS = 18;
const ANIMAL_SEGMENT_ENDPOINT = '/api/animal-segment';
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
  const commonName = recommendation.animal_common_name?.trim() || metadata?.commonName || '';
  const scientificName = recommendation.animal_scientific_name?.trim() || metadata?.scientificName || '';
  const subjectBox = normalizeAnimalSubjectBox(recommendation.animal_subject_box) ?? metadata?.subjectBox ?? null;

  if (!stickerUrl && !metadata?.stickerUrl && !commonName && !scientificName && !subjectBox) return metadata;

  return {
    stickerUrl: stickerUrl || metadata?.stickerUrl || '',
    commonName,
    scientificName,
    subjectBox,
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
      subjectBox: metadata?.subjectBox || null,
      needsStickerGeneration: !metadata?.stickerUrl,
      commonName: metadata?.commonName || '神奇生物',
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

const loadImageFromBlob = (blob: Blob) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  const objectUrl = URL.createObjectURL(blob);
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('动物抠图图片读取失败'));
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

const requestAnimalSubjectCutout = async (
  photoFile: File,
  geometry: StickerGeometryInput
): Promise<Blob> => {
  const uploadFile = await compressImage(photoFile, {
    maxSizeMB: 1.4,
    maxWidthOrHeight: 1180,
    quality: 0.86,
    force: true,
    outputType: 'image/jpeg',
  });

  const formData = new FormData();
  formData.append('image', uploadFile, 'animal-segment.jpg');
  if (geometry.sourceImageUrl) formData.append('imageUrl', geometry.sourceImageUrl);
  if (geometry.subjectBox) formData.append('subjectBox', JSON.stringify(geometry.subjectBox));

  const response = await fetch(ANIMAL_SEGMENT_ENDPOINT, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('自动抠图接口失败');

  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('自动抠图结果不是图片');
  return blob;
};

type AlphaBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const getAlphaBounds = (imageData: ImageData): AlphaBounds | null => {
  let left = imageData.width;
  let top = imageData.height;
  let right = -1;
  let bottom = -1;
  const data = imageData.data;

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const alpha = data[(y * imageData.width + x) * 4 + 3];
      if (alpha <= 10) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  return right >= left && bottom >= top ? { left, top, right, bottom } : null;
};

const createTrimmedCutoutCanvas = (image: HTMLImageElement) => {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = Math.max(1, image.naturalWidth || image.width);
  sourceCanvas.height = Math.max(1, image.naturalHeight || image.height);
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('当前浏览器不支持读取动物抠图');

  sourceContext.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  sourceContext.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
  const bounds = getAlphaBounds(sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height));
  if (!bounds) throw new Error('动物抠图没有主体');

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = bounds.right - bounds.left + 1;
  trimmedCanvas.height = bounds.bottom - bounds.top + 1;
  const trimmedContext = trimmedCanvas.getContext('2d');
  if (!trimmedContext) throw new Error('当前浏览器不支持生成动物贴纸');

  trimmedContext.drawImage(
    sourceCanvas,
    bounds.left,
    bounds.top,
    trimmedCanvas.width,
    trimmedCanvas.height,
    0,
    0,
    trimmedCanvas.width,
    trimmedCanvas.height
  );

  return trimmedCanvas;
};

const createTintedSilhouette = (
  source: HTMLCanvasElement,
  fillStyle: string
) => {
  const silhouette = document.createElement('canvas');
  silhouette.width = source.width;
  silhouette.height = source.height;
  const context = silhouette.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持生成动物贴纸');

  context.drawImage(source, 0, 0);
  context.globalCompositeOperation = 'source-in';
  context.fillStyle = fillStyle;
  context.fillRect(0, 0, silhouette.width, silhouette.height);
  context.globalCompositeOperation = 'source-over';
  return silhouette;
};

const drawStickerOutline = (
  context: CanvasRenderingContext2D,
  silhouette: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const step = 3;
  for (let offsetY = -STICKER_OUTLINE_RADIUS; offsetY <= STICKER_OUTLINE_RADIUS; offsetY += step) {
    for (let offsetX = -STICKER_OUTLINE_RADIUS; offsetX <= STICKER_OUTLINE_RADIUS; offsetX += step) {
      if (offsetX * offsetX + offsetY * offsetY > STICKER_OUTLINE_RADIUS * STICKER_OUTLINE_RADIUS) continue;
      context.drawImage(silhouette, x + offsetX, y + offsetY, width, height);
    }
  }
};

const createStickerFromSegmentedCutout = async (
  cutoutBlob: Blob,
  geometry: StickerGeometryInput
): Promise<File> => {
  const image = await loadImageFromBlob(cutoutBlob);
  const subjectCanvas = createTrimmedCutoutCanvas(image);
  const silhouette = createTintedSilhouette(subjectCanvas, '#fffef5');
  const scale = Math.min(
    STICKER_SEGMENT_MAX_SIZE / subjectCanvas.width,
    STICKER_SEGMENT_MAX_SIZE / subjectCanvas.height
  );
  const targetWidth = Math.max(1, Math.round(subjectCanvas.width * scale));
  const targetHeight = Math.max(1, Math.round(subjectCanvas.height * scale));
  const targetX = Math.round((STICKER_OUTPUT_SIZE - targetWidth) / 2);
  const targetY = Math.round((STICKER_OUTPUT_SIZE - targetHeight) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = STICKER_OUTPUT_SIZE;
  canvas.height = STICKER_OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持生成动物贴纸');

  context.clearRect(0, 0, STICKER_OUTPUT_SIZE, STICKER_OUTPUT_SIZE);

  context.save();
  context.shadowColor = 'rgba(11, 23, 36, 0.24)';
  context.shadowBlur = 22;
  context.shadowOffsetX = 10;
  context.shadowOffsetY = 16;
  context.drawImage(silhouette, targetX, targetY, targetWidth, targetHeight);
  context.restore();

  drawStickerOutline(context, silhouette, targetX, targetY, targetWidth, targetHeight);
  context.drawImage(subjectCanvas, targetX, targetY, targetWidth, targetHeight);

  const blob = await canvasToBlob(canvas, 'image/webp', 0.94);
  return new File([blob], getStickerFileName(geometry), { type: 'image/webp' });
};

const createFallbackPolygonStickerFromPhoto = async (
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

export const createAnimalStickerFromPhoto = async (
  photoFile: File,
  geometry: StickerGeometryInput
): Promise<File> => {
  try {
    const cutoutBlob = await requestAnimalSubjectCutout(photoFile, geometry);
    return await createStickerFromSegmentedCutout(cutoutBlob, geometry);
  } catch (error) {
    console.warn('自动抠图失败，回退到粗轮廓贴纸:', error);
    return createFallbackPolygonStickerFromPhoto(photoFile, geometry);
  }
};

export const createAnimalStickerFromImageUrl = async (
  photoUrl: string,
  geometry: StickerGeometryInput
): Promise<string> => {
  const response = await fetch(photoUrl);
  if (!response.ok) throw new Error('动物照片读取失败');

  const sourceBlob = await response.blob();
  const sourceFile = new File(
    [sourceBlob],
    'wild-animal-source.jpg',
    { type: sourceBlob.type || 'image/jpeg' }
  );
  const stickerFile = await createAnimalStickerFromPhoto(sourceFile, {
    ...geometry,
    sourceImageUrl: photoUrl,
  });
  return URL.createObjectURL(stickerFile);
};
