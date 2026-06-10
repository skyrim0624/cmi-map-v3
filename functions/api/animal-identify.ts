const CLASSIFICATION_MODEL_ID = '@cf/microsoft/resnet-50';
const DETECTION_MODEL_ID = '@cf/facebook/detr-resnet-50';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MIN_CLASSIFICATION_SCORE = 0.32;
const MIN_DETECTION_SCORE = 0.25;
const MIN_DETECTION_BOX_AREA_RATIO = 0.015;
const MIN_DETECTION_BOX_SHORT_SIDE = 72;

type AiBinding = {
  run: (
    model: string,
    input: { image: number[] }
  ) => Promise<unknown>;
};

type PagesContext = {
  request: Request;
  env: {
    AI?: AiBinding;
  };
};

interface AnimalCandidate {
  id: string;
  nameZh: string;
  nameEn: string;
  scientificName?: string;
  score: number;
  rawLabel: string;
  source: 'detection' | 'classification';
  iconId?: string;
}

type ImageClassificationPrediction = {
  label?: string;
  score?: number;
};

type ObjectDetectionPrediction = {
  label?: string;
  score?: number;
  box?: unknown;
};

type ImageDimensions = {
  width: number;
  height: number;
};

const animalMatchers: Array<{
  id: string;
  nameZh: string;
  nameEn: string;
  scientificName?: string;
  iconId?: string;
  keywords: string[];
}> = [
  {
    id: 'tokay-gecko',
    nameZh: '大壁虎',
    nameEn: 'Tokay gecko',
    scientificName: 'Gekko gecko',
    iconId: 'egg-v2-37-gecko',
    keywords: ['gecko', 'lizard', 'agama', 'iguana', 'chameleon'],
  },
  {
    id: 'cat',
    nameZh: '猫',
    nameEn: 'Cat',
    iconId: 'egg-v2-03-cat-face',
    keywords: ['cat', 'tabby', 'tiger cat', 'egyptian cat', 'persian cat', 'siamese'],
  },
  {
    id: 'dog',
    nameZh: '狗',
    nameEn: 'Dog',
    iconId: 'egg-v2-05-dog-face',
    keywords: ['dog', 'hound', 'terrier', 'retriever', 'poodle', 'chihuahua', 'spaniel', 'shepherd'],
  },
  {
    id: 'bird',
    nameZh: '鸟',
    nameEn: 'Bird',
    iconId: 'egg-v2-38-bird',
    keywords: ['bird', 'bulbul', 'sparrow', 'parrot', 'kingfisher', 'hornbill', 'drongo', 'myna', 'jay'],
  },
  {
    id: 'butterfly',
    nameZh: '蝴蝶',
    nameEn: 'Butterfly',
    iconId: 'egg-v2-36-butterfly',
    keywords: ['butterfly', 'monarch', 'sulphur butterfly', 'ringlet'],
  },
  {
    id: 'fish',
    nameZh: '鱼',
    nameEn: 'Fish',
    iconId: 'egg-v2-39-fish',
    keywords: ['fish', 'goldfish', 'tench', 'eel', 'ray'],
  },
  {
    id: 'snake',
    nameZh: '蛇',
    nameEn: 'Snake',
    keywords: ['snake', 'cobra', 'viper', 'python', 'boa'],
  },
  {
    id: 'frog',
    nameZh: '蛙',
    nameEn: 'Frog',
    keywords: ['frog', 'toad', 'tree frog', 'bullfrog'],
  },
  {
    id: 'insect',
    nameZh: '昆虫',
    nameEn: 'Insect',
    keywords: ['bee', 'ant', 'beetle', 'grasshopper', 'cricket', 'mantis', 'dragonfly', 'damselfly', 'fly'],
  },
  {
    id: 'squirrel',
    nameZh: '松鼠',
    nameEn: 'Squirrel',
    keywords: ['squirrel'],
  },
];

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  });

const normalizeLabel = (label: string) => label.toLocaleLowerCase();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const labelMatchesKeyword = (label: string, keyword: string) => {
  const normalizedLabel = normalizeLabel(label);
  const normalizedKeyword = normalizeLabel(keyword);
  return new RegExp(`(^|[^a-z])${escapeRegExp(normalizedKeyword)}([^a-z]|$)`).test(normalizedLabel);
};

const findAnimalMatch = (label: string) => {
  const normalizedLabel = normalizeLabel(label);
  return animalMatchers.find(item => item.keywords.some(keyword => labelMatchesKeyword(normalizedLabel, keyword)));
};

const getImageDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return {
      width: (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19],
      height: (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23],
    };
  }

  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset < bytes.length - 9) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (segmentLength < 2) return null;

    const isStartOfFrame = marker >= 0xc0 && marker <= 0xc3;
    if (isStartOfFrame) {
      return {
        height: (bytes[offset + 5] << 8) | bytes[offset + 6],
        width: (bytes[offset + 7] << 8) | bytes[offset + 8],
      };
    }

    offset += 2 + segmentLength;
  }

  return null;
};

const getDetectionBoxRect = (box: unknown) => {
  if (!box || typeof box !== 'object') return null;

  const record = box as Record<string, unknown>;
  const xMin = Number(record.xmin ?? record.xMin ?? record.left ?? record.x);
  const yMin = Number(record.ymin ?? record.yMin ?? record.top ?? record.y);
  const xMax = Number(record.xmax ?? record.xMax ?? record.right);
  const yMax = Number(record.ymax ?? record.yMax ?? record.bottom);
  const width = Number(record.width);
  const height = Number(record.height);

  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height, area: width * height };
  }

  if (
    Number.isFinite(xMin) &&
    Number.isFinite(yMin) &&
    Number.isFinite(xMax) &&
    Number.isFinite(yMax) &&
    xMax > xMin &&
    yMax > yMin
  ) {
    const boxWidth = xMax - xMin;
    const boxHeight = yMax - yMin;
    return { width: boxWidth, height: boxHeight, area: boxWidth * boxHeight };
  }

  return null;
};

const hasUsableDetectionBox = (prediction: ObjectDetectionPrediction, dimensions: ImageDimensions | null) => {
  const rect = getDetectionBoxRect(prediction.box);
  if (!rect) return true;

  const shortSide = Math.min(rect.width, rect.height);
  if (shortSide < MIN_DETECTION_BOX_SHORT_SIDE) return false;
  if (!dimensions) return true;

  const imageArea = dimensions.width * dimensions.height;
  return imageArea > 0 && rect.area / imageArea >= MIN_DETECTION_BOX_AREA_RATIO;
};

const detectionScore = (prediction: ObjectDetectionPrediction) => {
  const score = typeof prediction.score === 'number' ? prediction.score : 0;
  const boxArea = getDetectionBoxRect(prediction.box)?.area ?? 0;
  const areaBonus = boxArea > 0 ? Math.min(0.14, Math.log10(boxArea + 1) / 100) : 0;

  return Math.min(0.99, 0.7 + score * 0.25 + areaBonus);
};

const classificationScore = (prediction: ImageClassificationPrediction) =>
  typeof prediction.score === 'number' ? prediction.score : 0;

const toClassificationCandidate = (prediction: ImageClassificationPrediction): AnimalCandidate | null => {
  const label = prediction.label?.trim();
  const score = classificationScore(prediction);
  if (!label || score < MIN_CLASSIFICATION_SCORE) return null;

  const match = findAnimalMatch(label);
  if (!match) return null;

  return {
    id: match.id,
    nameZh: match.nameZh,
    nameEn: match.nameEn,
    scientificName: match.scientificName,
    score,
    rawLabel: label,
    source: 'classification',
    iconId: match.iconId,
  };
};

const toDetectionCandidate = (prediction: ObjectDetectionPrediction, dimensions: ImageDimensions | null): AnimalCandidate | null => {
  const label = prediction.label?.trim();
  const rawScore = typeof prediction.score === 'number' ? prediction.score : 0;
  if (!label || rawScore < MIN_DETECTION_SCORE) return null;
  if (!hasUsableDetectionBox(prediction, dimensions)) return null;

  const match = findAnimalMatch(label);
  if (!match) return null;

  return {
    id: match.id,
    nameZh: match.nameZh,
    nameEn: match.nameEn,
    scientificName: match.scientificName,
    score: detectionScore(prediction),
    rawLabel: label,
    source: 'detection',
    iconId: match.iconId,
  };
};

const uniqueCandidates = (candidates: AnimalCandidate[]) => {
  const bestById = new Map<string, AnimalCandidate>();

  for (const candidate of candidates) {
    const current = bestById.get(candidate.id);
    if (!current || candidate.score > current.score) {
      bestById.set(candidate.id, candidate);
    }
  }

  return [...bestById.values()].sort((left, right) => right.score - left.score).slice(0, 3);
};

const toPredictionList = (value: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.response)) {
      return record.response.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
    }
  }

  return [];
};

const detectAnimalCandidates = async (ai: AiBinding, imageBytes: number[], dimensions: ImageDimensions | null) => {
  try {
    const detections = await ai.run(DETECTION_MODEL_ID, { image: imageBytes });
    return {
      candidates: uniqueCandidates(
        toPredictionList(detections)
          .map(prediction => toDetectionCandidate(prediction, dimensions))
          .filter((item): item is AnimalCandidate => Boolean(item))
      ),
      rawDetections: toPredictionList(detections).slice(0, 8),
      detectionAvailable: true,
    };
  } catch (error) {
    console.warn('动物主体检测失败，改用分类兜底:', error);
    return {
      candidates: [],
      rawDetections: [],
      detectionAvailable: false,
    };
  }
};

const classifyAnimalCandidates = async (ai: AiBinding, imageBytes: number[]) => {
  try {
    const predictions = await ai.run(CLASSIFICATION_MODEL_ID, { image: imageBytes });
    const predictionList = toPredictionList(predictions);

    return {
      candidates: uniqueCandidates(predictionList.map(toClassificationCandidate).filter((item): item is AnimalCandidate => Boolean(item))),
      rawLabels: predictionList.slice(0, 5),
    };
  } catch (error) {
    console.warn('动物分类兜底失败:', error);
    return {
      candidates: [],
      rawLabels: [],
    };
  }
};

export const onRequestPost = async ({ request, env }: PagesContext) => {
  const startedAt = Date.now();

  if (!env.AI) {
    return jsonResponse({
      status: 'unavailable',
      provider: 'cloudflare-workers-ai',
      candidates: [],
      message: '识别服务暂时不可用',
    }, { status: 503 });
  }

  const formData = await request.formData();
  const image = formData.get('image');

  if (!(image instanceof File) || !image.type.startsWith('image/')) {
    return jsonResponse({ status: 'error', candidates: [], message: '需要上传图片' }, { status: 400 });
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return jsonResponse({ status: 'error', candidates: [], message: '图片太大，请重新拍一张' }, { status: 413 });
  }

  const byteArray = new Uint8Array(await image.arrayBuffer());
  const bytes = [...byteArray];
  const dimensions = getImageDimensions(byteArray);
  const [detectionResult, classificationResult] = await Promise.all([
    detectAnimalCandidates(env.AI, bytes, dimensions),
    classifyAnimalCandidates(env.AI, bytes),
  ]);
  const candidates = detectionResult.candidates.length > 0
    ? detectionResult.candidates
    : classificationResult.candidates;

  return jsonResponse({
    status: candidates.length > 0 ? 'ready' : 'no-match',
    provider: detectionResult.detectionAvailable
      ? `${DETECTION_MODEL_ID}+${CLASSIFICATION_MODEL_ID}`
      : CLASSIFICATION_MODEL_ID,
    elapsedMs: Date.now() - startedAt,
    candidates,
    rawDetections: detectionResult.rawDetections,
    rawLabels: classificationResult.rawLabels,
  });
};
