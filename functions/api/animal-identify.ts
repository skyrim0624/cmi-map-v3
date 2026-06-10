const CLASSIFICATION_MODEL_ID = '@cf/microsoft/resnet-50';
const DETECTION_MODEL_ID = '@cf/facebook/detr-resnet-50';
const VISION_SPECIES_MODEL_ID = '@cf/meta/llama-3.2-11b-vision-instruct';
const VISION_SPECIES_FALLBACK_MODEL_ID = '@cf/llava-hf/llava-1.5-7b-hf';
const GEMINI_SPECIES_MODEL_ID = 'gemini-2.5-flash';
const GEMINI_GENERATE_CONTENT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_SPECIES_MODEL_ID}:generateContent`;
const GBIF_SPECIES_MATCH_URL = 'https://api.gbif.org/v1/species/match';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MIN_CLASSIFICATION_SCORE = 0.32;
const MIN_DETECTION_SCORE = 0.25;
const MIN_DETECTION_BOX_AREA_RATIO = 0.015;
const MIN_DETECTION_BOX_SHORT_SIDE = 72;
const MIN_VISION_SPECIES_CONFIDENCE = 0.68;
const MIN_GBIF_SPECIES_CONFIDENCE = 82;
const TAXON_RANK_SPECIES = 'SPECIES';
const TAXON_RANK_SUBSPECIES = 'SUBSPECIES';

type AiBinding = {
  run: (
    model: string,
    input: Record<string, unknown>
  ) => Promise<unknown>;
};

type PagesContext = {
  request: Request;
  env: {
    AI?: AiBinding;
    CMI_MAP_ENABLE_META_VISION_SPECIES?: string;
    GOOGLE_AI_STUDIO_API_KEY?: string;
  };
};

interface AnimalCandidate {
  id: string;
  nameZh: string;
  nameEn: string;
  scientificName?: string;
  score: number;
  rawLabel: string;
  source: 'detection' | 'classification' | 'vision';
  taxonRank?: string;
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
  taxonRank?: string;
  iconId?: string;
  keywords: string[];
}> = [
  {
    id: 'tokay-gecko',
    nameZh: '大壁虎',
    nameEn: 'Tokay gecko',
    scientificName: 'Gekko gecko',
    taxonRank: TAXON_RANK_SPECIES,
    iconId: 'egg-v2-37-gecko',
    keywords: ['gecko', 'lizard', 'agama', 'iguana', 'chameleon'],
  },
  {
    id: 'cat',
    nameZh: '猫',
    nameEn: 'Cat',
    scientificName: 'Felis catus',
    taxonRank: TAXON_RANK_SPECIES,
    iconId: 'egg-v2-03-cat-face',
    keywords: ['cat', 'tabby', 'tiger cat', 'egyptian cat', 'persian cat', 'siamese'],
  },
  {
    id: 'dog',
    nameZh: '狗',
    nameEn: 'Dog',
    scientificName: 'Canis lupus familiaris',
    taxonRank: TAXON_RANK_SUBSPECIES,
    iconId: 'egg-v2-05-dog-face',
    keywords: ['dog', 'hound', 'terrier', 'retriever', 'poodle', 'chihuahua', 'spaniel', 'shepherd'],
  },
  {
    id: 'bird',
    nameZh: '鸟',
    nameEn: 'Bird',
    scientificName: 'Aves',
    taxonRank: 'CLASS',
    iconId: 'egg-v2-38-bird',
    keywords: ['bird', 'bulbul', 'sparrow', 'parrot', 'kingfisher', 'hornbill', 'drongo', 'myna', 'jay'],
  },
  {
    id: 'butterfly',
    nameZh: '蝴蝶',
    nameEn: 'Butterfly',
    scientificName: 'Lepidoptera',
    taxonRank: 'ORDER',
    iconId: 'egg-v2-36-butterfly',
    keywords: ['butterfly', 'monarch', 'sulphur butterfly', 'ringlet'],
  },
  {
    id: 'fish',
    nameZh: '鱼',
    nameEn: 'Fish',
    scientificName: 'Actinopterygii',
    taxonRank: 'CLASS',
    iconId: 'egg-v2-39-fish',
    keywords: ['fish', 'goldfish', 'tench', 'eel', 'ray'],
  },
  {
    id: 'snake',
    nameZh: '蛇',
    nameEn: 'Snake',
    scientificName: 'Serpentes',
    taxonRank: 'SUBORDER',
    keywords: ['snake', 'cobra', 'viper', 'python', 'boa'],
  },
  {
    id: 'frog',
    nameZh: '蛙',
    nameEn: 'Frog',
    scientificName: 'Anura',
    taxonRank: 'ORDER',
    keywords: ['frog', 'toad', 'tree frog', 'bullfrog'],
  },
  {
    id: 'insect',
    nameZh: '昆虫',
    nameEn: 'Insect',
    scientificName: 'Insecta',
    taxonRank: 'CLASS',
    keywords: ['bee', 'ant', 'beetle', 'grasshopper', 'cricket', 'mantis', 'dragonfly', 'damselfly', 'fly'],
  },
  {
    id: 'squirrel',
    nameZh: '松鼠',
    nameEn: 'Squirrel',
    scientificName: 'Sciuridae',
    taxonRank: 'FAMILY',
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
    taxonRank: match.taxonRank,
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
    taxonRank: match.taxonRank,
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

type VisionSpeciesResult = {
  animalPresent?: boolean;
  commonNameZh?: string;
  commonNameEn?: string;
  scientificName?: string;
  taxonRank?: string;
  confidence?: number;
};

type GbifSpeciesMatch = {
  canonicalName?: string;
  scientificName?: string;
  rank?: string;
  status?: string;
  confidence?: number;
  matchType?: string;
  kingdom?: string;
};

const isSpeciesLevelRank = (rank: string | undefined) => (
  rank === TAXON_RANK_SPECIES || rank === TAXON_RANK_SUBSPECIES
);

const bestSpeciesLevelCandidate = (candidates: AnimalCandidate[]) =>
  candidates.find(candidate => isSpeciesLevelRank(candidate.taxonRank) && Boolean(candidate.scientificName));

const needsVisionSpeciesLookup = (candidates: AnimalCandidate[]) => (
  candidates.length === 0 || !bestSpeciesLevelCandidate(candidates)
);

const getAiResponseText = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;
  for (const key of ['response', 'description', 'result', 'text']) {
    if (typeof record[key] === 'string') return record[key];
    if (record[key] && typeof record[key] === 'object') return JSON.stringify(record[key]);
  }

  return '';
};

const extractJsonObject = (text: string) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const normalizeScientificName = (value: unknown) => (
  typeof value === 'string'
    ? value
      .replace(/[`*_]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[。.,;:]+$/g, '')
      .trim()
    : ''
);

const toConfidence = (value: unknown) => {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) return 0;
  return confidence > 1 ? confidence / 100 : confidence;
};

const toVisionSpeciesResult = (text: string): VisionSpeciesResult | null => {
  const parsed = extractJsonObject(text);
  if (!parsed) return null;

  const scientificName = normalizeScientificName(parsed.scientificName);
  const confidence = toConfidence(parsed.confidence);

  return {
    animalPresent: parsed.animalPresent === true,
    commonNameZh: typeof parsed.commonNameZh === 'string' ? parsed.commonNameZh.trim() : '',
    commonNameEn: typeof parsed.commonNameEn === 'string' ? parsed.commonNameEn.trim() : '',
    scientificName,
    taxonRank: typeof parsed.taxonRank === 'string' ? parsed.taxonRank.trim().toUpperCase() : '',
    confidence,
  };
};

const buildSpeciesPrompt = (coarseCandidates: AnimalCandidate[]) => {
  const coarseLabels = coarseCandidates
    .map(candidate => `${candidate.nameEn}${candidate.scientificName ? ` / ${candidate.scientificName}` : ''}`)
    .join(', ') || 'none';

  return [
    'Identify the primary visible animal in this user photo.',
    'The user wants a taxonomic scientific name for a field observation in Chiang Mai, Thailand.',
    `Coarse detector candidates: ${coarseLabels}.`,
    'Return only strict JSON with this exact shape:',
    '{"animalPresent":true,"commonNameZh":"","commonNameEn":"","scientificName":"","taxonRank":"SPECIES","confidence":0.0}',
    'Rules:',
    '- Use a species or subspecies scientific name only when the animal is visually clear enough.',
    '- For domestic cat use Felis catus. For domestic dog use Canis lupus familiaris.',
    '- If the photo does not contain a clear animal, set animalPresent to false and leave names empty.',
    '- If you can only identify a broad group, use that taxon name and set taxonRank to CLASS, ORDER, FAMILY, or GENUS with confidence below 0.68.',
    '- Do not include explanations, markdown, or any words outside JSON.',
  ].join('\n');
};

const toBase64 = (imageBytes: number[]) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < imageBytes.length; index += chunkSize) {
    binary += String.fromCharCode(...imageBytes.slice(index, index + chunkSize));
  }

  return btoa(binary);
};

const toBase64Image = (imageBytes: number[]) => {
  return `data:image/jpeg;base64,${toBase64(imageBytes)}`;
};

const runVisionSpeciesModel = async (ai: AiBinding, modelId: string, imageBytes: number[], coarseCandidates: AnimalCandidate[]) => {
  const result = await ai.run(modelId, {
    image: modelId === VISION_SPECIES_FALLBACK_MODEL_ID ? imageBytes : toBase64Image(imageBytes),
    prompt: buildSpeciesPrompt(coarseCandidates),
    max_tokens: 220,
    temperature: 0,
  });

  const responseText = getAiResponseText(result);
  return toVisionSpeciesResult(responseText);
};

const validateScientificNameWithGbif = async (scientificName: string): Promise<GbifSpeciesMatch | null> => {
  const url = new URL(GBIF_SPECIES_MATCH_URL);
  url.searchParams.set('name', scientificName);
  url.searchParams.set('kingdom', 'Animalia');

  try {
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'user-agent': 'CMI Map animal identification (https://cmimap.com)',
      },
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data || typeof data !== 'object') return null;
    return data as GbifSpeciesMatch;
  } catch (error) {
    console.warn('GBIF 学名校验失败:', error);
    return null;
  }
};

const toGbifCanonicalScientificName = (match: GbifSpeciesMatch) =>
  normalizeScientificName(match.canonicalName ?? match.scientificName);

const toVisionSpeciesCandidate = (
  vision: VisionSpeciesResult,
  gbif: GbifSpeciesMatch,
  modelId: string
): AnimalCandidate | null => {
  const gbifConfidence = typeof gbif.confidence === 'number' ? gbif.confidence : 0;
  const taxonRank = (gbif.rank || vision.taxonRank || '').toUpperCase();
  const scientificName = toGbifCanonicalScientificName(gbif);

  if (
    !vision.animalPresent ||
    vision.confidence === undefined ||
    vision.confidence < MIN_VISION_SPECIES_CONFIDENCE ||
    gbifConfidence < MIN_GBIF_SPECIES_CONFIDENCE ||
    gbif.kingdom !== 'Animalia' ||
    !scientificName ||
    !isSpeciesLevelRank(taxonRank)
  ) {
    return null;
  }

  const commonNameZh = vision.commonNameZh || vision.commonNameEn || scientificName;
  const commonNameEn = vision.commonNameEn || scientificName;

  return {
    id: `species-${scientificName.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    nameZh: commonNameZh,
    nameEn: commonNameEn,
    scientificName,
    score: Math.min(0.99, vision.confidence * 0.82 + (gbifConfidence / 100) * 0.18),
    rawLabel: `${modelId}: ${vision.scientificName}`,
    source: 'vision',
    taxonRank,
  };
};

const getGeminiResponseText = (value: unknown) => {
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  const candidates = Array.isArray(record.candidates) ? record.candidates : [];
  const firstCandidate = candidates[0];
  if (!firstCandidate || typeof firstCandidate !== 'object') return '';

  const content = (firstCandidate as Record<string, unknown>).content;
  if (!content || typeof content !== 'object') return '';

  const parts = (content as Record<string, unknown>).parts;
  if (!Array.isArray(parts)) return '';

  return parts
    .map(part => (part && typeof part === 'object' ? (part as Record<string, unknown>).text : ''))
    .filter((text): text is string => typeof text === 'string')
    .join('\n');
};

const runGeminiSpeciesModel = async (
  apiKey: string,
  imageBytes: number[],
  mimeType: string,
  coarseCandidates: AnimalCandidate[]
) => {
  const response = await fetch(GEMINI_GENERATE_CONTENT_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: mimeType || 'image/jpeg',
              data: toBase64(imageBytes),
            },
          },
          { text: buildSpeciesPrompt(coarseCandidates) },
        ],
      }],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0,
        maxOutputTokens: 220,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.warn('Gemini 物种识别失败:', response.status, errorText.slice(0, 240));
    return null;
  }

  const data = await response.json().catch(() => null);
  return toVisionSpeciesResult(getGeminiResponseText(data));
};

type SpeciesIdentificationResult = {
  candidate: AnimalCandidate | null;
  provider?: string;
};

const identifySpeciesCandidate = async (
  env: PagesContext['env'],
  imageBytes: number[],
  mimeType: string,
  coarseCandidates: AnimalCandidate[]
): Promise<SpeciesIdentificationResult> => {
  if (env.GOOGLE_AI_STUDIO_API_KEY) {
    try {
      const vision = await runGeminiSpeciesModel(env.GOOGLE_AI_STUDIO_API_KEY, imageBytes, mimeType, coarseCandidates);
      if (vision?.scientificName) {
        const gbif = await validateScientificNameWithGbif(vision.scientificName);
        const candidate = gbif ? toVisionSpeciesCandidate(vision, gbif, GEMINI_SPECIES_MODEL_ID) : null;
        if (candidate) return { candidate, provider: GEMINI_SPECIES_MODEL_ID };
      }
    } catch (error) {
      console.warn('Gemini 动物物种识别失败:', error);
    }
  }

  if (env.CMI_MAP_ENABLE_META_VISION_SPECIES !== '1' || !env.AI) {
    return { candidate: null };
  }

  for (const modelId of [VISION_SPECIES_MODEL_ID, VISION_SPECIES_FALLBACK_MODEL_ID]) {
    try {
      const vision = await runVisionSpeciesModel(env.AI, modelId, imageBytes, coarseCandidates);
      if (!vision?.scientificName) continue;

      const gbif = await validateScientificNameWithGbif(vision.scientificName);
      if (!gbif) continue;
      const candidate = toVisionSpeciesCandidate(vision, gbif, modelId);
      if (candidate) return { candidate, provider: modelId };
    } catch (error) {
      console.warn('动物物种视觉识别失败:', modelId, error);
    }
  }

  return { candidate: null, provider: VISION_SPECIES_MODEL_ID };
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
  const coarseCandidates = detectionResult.candidates.length > 0
    ? detectionResult.candidates
    : classificationResult.candidates;
  const speciesLookupNeeded = needsVisionSpeciesLookup(coarseCandidates);
  const speciesResult = speciesLookupNeeded
    ? await identifySpeciesCandidate(env, bytes, image.type || 'image/jpeg', coarseCandidates)
    : { candidate: bestSpeciesLevelCandidate(coarseCandidates) ?? null };
  const speciesCandidate = speciesResult.candidate;
  const candidates = speciesCandidate
    ? uniqueCandidates([speciesCandidate, ...coarseCandidates])
    : coarseCandidates;
  const providerModels = [
    ...(detectionResult.detectionAvailable ? [DETECTION_MODEL_ID] : []),
    CLASSIFICATION_MODEL_ID,
    ...(speciesLookupNeeded && speciesResult.provider ? [speciesResult.provider] : []),
  ];

  return jsonResponse({
    status: candidates.length > 0 ? 'ready' : 'no-match',
    provider: providerModels.join('+'),
    elapsedMs: Date.now() - startedAt,
    candidates,
    rawDetections: detectionResult.rawDetections,
    rawLabels: classificationResult.rawLabels,
  });
};
