const GEMINI_SPECIES_MODEL_ID = 'gemini-2.5-flash';
const SELF_HOSTED_SPECIES_MODEL_ID = 'self-hosted-species-model';
const GEMINI_GENERATE_CONTENT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_SPECIES_MODEL_ID}:generateContent`;
const GBIF_SPECIES_MATCH_URL = 'https://api.gbif.org/v1/species/match';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MIN_VISION_SPECIES_CONFIDENCE = 0.68;
const MIN_VISION_BROAD_CONFIDENCE = 0.35;
const MIN_GBIF_SPECIES_CONFIDENCE = 82;
const GEMINI_MAX_ATTEMPTS = 2;
const GEMINI_MODEL_TIMEOUT_MS = 12000;
const SELF_HOSTED_MODEL_TIMEOUT_MS = 55000;
const TAXON_RANK_SPECIES = 'SPECIES';
const TAXON_RANK_SUBSPECIES = 'SUBSPECIES';
const TAXON_KINGDOM_ANIMALIA = 'Animalia';
const TAXON_KINGDOM_PLANTAE = 'Plantae';
const ALLOWED_GBIF_KINGDOMS = new Set([TAXON_KINGDOM_ANIMALIA, TAXON_KINGDOM_PLANTAE]);
const REJECTED_SCIENTIFIC_NAMES = new Set(['Homo sapiens']);
const GEMINI_RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

class GeminiSpeciesModelUnavailableError extends Error {
  constructor() {
    super('Gemini species model unavailable');
  }
}

type PagesContext = {
  request: Request;
  env: {
    GOOGLE_AI_STUDIO_API_KEY?: string;
    CMI_MAP_SPECIES_MODEL_URL?: string;
    CMI_MAP_SPECIES_MODEL_TOKEN?: string;
  };
};

interface AnimalCandidate {
  id: string;
  nameZh: string;
  nameEn: string;
  scientificName?: string;
  kingdom?: string;
  introZh?: string;
  score: number;
  rawLabel: string;
  source: 'vision';
  taxonRank?: string;
  subjectBox?: SubjectBox;
  subjectPolygon?: SubjectPoint[];
}

type SubjectBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type SubjectPoint = {
  x: number;
  y: number;
};

type VisionSpeciesResult = {
  organismPresent?: boolean;
  commonNameZh?: string;
  commonNameEn?: string;
  scientificName?: string;
  taxonRank?: string;
  confidence?: number;
  introZh?: string;
  provider?: string;
  subjectBox?: SubjectBox;
  subjectPolygon?: SubjectPoint[];
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

const chineseNameByScientificName = new Map<string, string>([
  ['Canis lupus familiaris', '家犬'],
  ['Felis catus', '家猫'],
  ['Gekko gecko', '大壁虎'],
  ['Hemidactylus frenatus', '疣尾蜥虎'],
  ['Hemidactylus platyurus', '扁尾蜥虎'],
  ['Calotes versicolor', '变色树蜥'],
  ['Varanus salvator', '水巨蜥'],
  ['Duttaphrynus melanostictus', '黑眶蟾蜍'],
  ['Kaloula pulchra', '花狭口蛙'],
  ['Fejervarya limnocharis', '泽陆蛙'],
  ['Hylarana erythraea', '绿背蛙'],
  ['Acridotheres tristis', '家八哥'],
  ['Acridotheres grandis', '大八哥'],
  ['Passer montanus', '树麻雀'],
  ['Pycnonotus goiavier', '黄臀鹎'],
  ['Pycnonotus jocosus', '红耳鹎'],
  ['Spilopelia chinensis', '珠颈斑鸠'],
  ['Geopelia striata', '斑姬地鸠'],
  ['Halcyon pileata', '蓝翡翠'],
  ['Naja kaouthia', '单眼镜蛇'],
  ['Ptyas korros', '灰鼠蛇'],
  ['Boiga cyanea', '绿瘦蛇'],
  ['Trimeresurus albolabris', '白唇竹叶青'],
  ['Junonia almana', '眼蛱蝶'],
  ['Papilio polytes', '玉带凤蝶'],
  ['Papilio demoleus', '达摩凤蝶'],
  ['Bougainvillea spectabilis', '叶子花'],
  ['Plumeria rubra', '红鸡蛋花'],
  ['Cassia fistula', '腊肠树'],
  ['Delonix regia', '凤凰木'],
  ['Hibiscus rosa-sinensis', '朱槿'],
  ['Ixora coccinea', '龙船花'],
  ['Nymphaea nouchali', '蓝睡莲'],
  ['Nelumbo nucifera', '莲'],
  ['Musa acuminata', '尖蕉'],
  ['Cocos nucifera', '椰子'],
  ['Mangifera indica', '杧果'],
  ['Tamarindus indica', '酸豆'],
  ['Samanea saman', '雨树'],
  ['Ficus religiosa', '菩提树'],
  ['Dendrobium anosmum', '石斛兰'],
  ['Dendrobium crumenatum', '鸽子兰'],
  ['Rhynchostylis gigantea', '狐尾兰'],
  ['Etlingera elatior', '火炬姜'],
  ['Strelitzia reginae', '鹤望兰'],
  ['Jasminum sambac', '茉莉花'],
  ['Heliconia psittacorum', '鹦鹉蕉'],
  ['Canna indica', '美人蕉'],
]);

const broadTaxonFallbacks = [
  {
    id: 'bird',
    nameZh: '鸟类',
    nameEn: 'Bird',
    scientificName: 'Aves',
    kingdom: TAXON_KINGDOM_ANIMALIA,
    taxonRank: 'CLASS',
    introZh: '鸟类识别可以先看体型、喙形、羽色和活动环境；远距离照片通常先定到大类，再用近照确认物种。',
    keywords: ['aves', 'bird', 'birds', 'avian', 'flamingo', 'kingfisher', 'myna', 'sparrow', 'pigeon', 'dove', '鸟', '鸟类', '火烈鸟'],
  },
  {
    id: 'lizard',
    nameZh: '蜥蜴类',
    nameEn: 'Lizard',
    scientificName: 'Sauria',
    kingdom: TAXON_KINGDOM_ANIMALIA,
    taxonRank: 'SUBORDER',
    introZh: '蜥蜴类常在树干、墙面和灌木附近活动，体色、头部形态和尾巴长度是后续确认物种的关键。',
    keywords: ['sauria', 'lizard', 'gecko', 'calotes', 'agamid', 'reptile', '蜥蜴', '壁虎', '树蜥', '爬行动物'],
  },
  {
    id: 'snake',
    nameZh: '蛇类',
    nameEn: 'Snake',
    scientificName: 'Serpentes',
    kingdom: TAXON_KINGDOM_ANIMALIA,
    taxonRank: 'SUBORDER',
    introZh: '蛇类需要结合头型、体色、斑纹和环境继续确认；现场观察时保持距离，不要徒手接近。',
    keywords: ['serpentes', 'snake', 'snakes', '蛇', '蛇类'],
  },
  {
    id: 'frog',
    nameZh: '蛙类',
    nameEn: 'Frog',
    scientificName: 'Anura',
    kingdom: TAXON_KINGDOM_ANIMALIA,
    taxonRank: 'ORDER',
    introZh: '蛙类常和潮湿环境有关，体型、背纹、趾端和叫声能帮助进一步确认。',
    keywords: ['anura', 'frog', 'toad', '蛙', '蛙类', '蟾蜍'],
  },
  {
    id: 'insect',
    nameZh: '昆虫',
    nameEn: 'Insect',
    scientificName: 'Insecta',
    kingdom: TAXON_KINGDOM_ANIMALIA,
    taxonRank: 'CLASS',
    introZh: '昆虫种类很多，触角、翅膀、足和身体分节是关键特征；清晰近照会显著提高识别准确度。',
    keywords: ['insecta', 'insect', 'butterfly', 'lepidoptera', 'dragonfly', 'bee', 'ant', 'mantis', '昆虫', '蝴蝶', '蜻蜓', '蜂', '蚂蚁'],
  },
  {
    id: 'spider',
    nameZh: '蜘蛛类',
    nameEn: 'Spider',
    scientificName: 'Araneae',
    kingdom: TAXON_KINGDOM_ANIMALIA,
    taxonRank: 'ORDER',
    introZh: '蜘蛛类可以通过体型、足的姿态、腹部斑纹和蛛网形态继续确认，近照会更稳。',
    keywords: ['araneae', 'spider', 'spiders', '蜘蛛', '蜘蛛类'],
  },
  {
    id: 'fish',
    nameZh: '鱼类',
    nameEn: 'Fish',
    scientificName: 'Actinopterygii',
    kingdom: TAXON_KINGDOM_ANIMALIA,
    taxonRank: 'CLASS',
    introZh: '鱼类需要结合水体环境、体色、体型和游动方式识别，远距离照片通常只能先判断到大类。',
    keywords: ['actinopterygii', 'fish', '鱼', '鱼类'],
  },
  {
    id: 'plant',
    nameZh: '植物',
    nameEn: 'Plant',
    scientificName: 'Plantae',
    kingdom: TAXON_KINGDOM_PLANTAE,
    taxonRank: 'KINGDOM',
    introZh: '植物识别要看花、叶、果实、树皮和生长环境；先定到植物大类后，可以用近照继续确认。',
    keywords: ['plantae', 'plant', 'flower', 'angiosperms', 'orchid', 'orchidaceae', 'palm', 'arecaceae', '植物', '花', '兰花', '棕榈'],
  },
] as const;

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  });

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

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
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

const clampCoordinate = (value: number) => Math.min(1000, Math.max(0, value));

const toSubjectCoordinate = (value: unknown) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return clampCoordinate(Math.round(numberValue));
};

const normalizeSubjectBox = (value: unknown): SubjectBox | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const x = toSubjectCoordinate(record.x);
  const y = toSubjectCoordinate(record.y);
  const width = toSubjectCoordinate(record.width);
  const height = toSubjectCoordinate(record.height);

  if (x === null || y === null || width === null || height === null || width < 8 || height < 8) {
    return undefined;
  }
  const maxWidth = 1000 - x;
  const maxHeight = 1000 - y;
  if (maxWidth < 8 || maxHeight < 8) return undefined;

  return {
    x,
    y,
    width: Math.min(width, maxWidth),
    height: Math.min(height, maxHeight),
  };
};

const normalizeSubjectPolygon = (value: unknown): SubjectPoint[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const points = value
    .slice(0, 32)
    .map(point => {
      if (!point || typeof point !== 'object') return null;
      const record = point as Record<string, unknown>;
      const x = toSubjectCoordinate(record.x);
      const y = toSubjectCoordinate(record.y);
      return x === null || y === null ? null : { x, y };
    })
    .filter((point): point is SubjectPoint => point !== null);

  return points.length >= 3 ? points : undefined;
};

const toVisionSpeciesResult = (text: string): VisionSpeciesResult | null => {
  const parsed = extractJsonObject(text);
  if (!parsed) return null;

  return {
    organismPresent: parsed.organismPresent === true || parsed.animalPresent === true,
    commonNameZh: typeof parsed.commonNameZh === 'string' ? parsed.commonNameZh.trim() : '',
    commonNameEn: typeof parsed.commonNameEn === 'string' ? parsed.commonNameEn.trim() : '',
    scientificName: normalizeScientificName(parsed.scientificName),
    taxonRank: typeof parsed.taxonRank === 'string' ? parsed.taxonRank.trim().toUpperCase() : '',
    confidence: toConfidence(parsed.confidence),
    introZh: typeof parsed.introZh === 'string' ? parsed.introZh.trim() : '',
    provider: typeof parsed.provider === 'string' ? parsed.provider.trim() : '',
    subjectBox: normalizeSubjectBox(parsed.subjectBox),
    subjectPolygon: normalizeSubjectPolygon(parsed.subjectPolygon),
  };
};

const buildSpeciesPrompt = () => [
  'Identify the primary visible animal or plant in this user photo.',
  'The user wants a taxonomic scientific name for a field observation in Chiang Mai, Thailand.',
  'Return only strict JSON with this exact shape:',
  '{"organismPresent":true,"commonNameZh":"","commonNameEn":"","scientificName":"","taxonRank":"SPECIES","confidence":0.0,"introZh":"","subjectBox":{"x":0,"y":0,"width":0,"height":0},"subjectPolygon":[{"x":0,"y":0}]}',
  'Rules:',
  '- Use a species or subspecies scientific name only when the animal or plant is visually clear enough.',
  '- introZh must be 2 concise Chinese sentences about distinctive visual traits, typical habitat or distribution, and useful observation notes.',
  '- subjectBox is the tight rectangle around the primary organism, using integer x/y/width/height from 0 to 1000 relative to the image.',
  '- subjectPolygon is a rough outside silhouette of the same organism with 8 to 16 clockwise points from 0 to 1000. Keep the whole visible body inside it.',
  '- Do not write uncertainty phrases in introZh, and do not tell the user to keep confirming later.',
  '- For domestic cat use Felis catus. For domestic dog use Canis lupus familiaris.',
  '- If the primary visible subject is a human, set organismPresent to false and leave names empty.',
  '- If the photo is a screenshot, poster, web page, menu, document, or UI capture and does not contain a clear real animal or plant subject, set organismPresent to false and leave names empty.',
  '- If the photo does not contain a clear animal or plant, set organismPresent to false and leave names empty.',
  '- If you can only identify a broad group, use that taxon name and set taxonRank to CLASS, ORDER, FAMILY, or GENUS with confidence below 0.68.',
  '- Do not include explanations, markdown, or any words outside JSON.',
].join('\n');

const toBase64 = (imageBytes: number[]) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < imageBytes.length; index += chunkSize) {
    binary += String.fromCharCode(...imageBytes.slice(index, index + chunkSize));
  }

  return btoa(binary);
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
  mimeType: string
) => {
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    const response = await fetchWithTimeout(GEMINI_GENERATE_CONTENT_URL, {
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
            { text: buildSpeciesPrompt() },
          ],
        }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0,
          thinkingConfig: {
            thinkingBudget: 0,
          },
          maxOutputTokens: 512,
        },
      }),
    }, GEMINI_MODEL_TIMEOUT_MS);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.warn('Gemini 物种识别失败:', response.status, errorText.slice(0, 240));
      if (GEMINI_RETRYABLE_STATUS_CODES.has(response.status) && attempt < GEMINI_MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      if (GEMINI_RETRYABLE_STATUS_CODES.has(response.status)) {
        throw new GeminiSpeciesModelUnavailableError();
      }
      return null;
    }

    const data = await response.json().catch(() => null);
    return toVisionSpeciesResult(getGeminiResponseText(data));
  }

  throw new GeminiSpeciesModelUnavailableError();
};

const validateScientificNameWithGbif = async (scientificName: string): Promise<GbifSpeciesMatch | null> => {
  const url = new URL(GBIF_SPECIES_MATCH_URL);
  url.searchParams.set('name', scientificName);

  try {
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'user-agent': 'CMI Map species identification (https://cmimap.com)',
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

const isSpeciesLevelRank = (rank: string | undefined) => (
  rank === TAXON_RANK_SPECIES || rank === TAXON_RANK_SUBSPECIES
);

const normalizeTaxonSearchText = (value: string) =>
  value.toLocaleLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ').trim();

const findBroadTaxonFallback = (vision: VisionSpeciesResult) => {
  const haystack = normalizeTaxonSearchText([
    vision.scientificName,
    vision.commonNameEn,
    vision.commonNameZh,
    vision.taxonRank,
  ].filter(Boolean).join(' '));

  if (!haystack) return null;

  return broadTaxonFallbacks.find(taxon =>
    taxon.keywords.some(keyword => haystack.includes(normalizeTaxonSearchText(keyword)))
  ) ?? null;
};

const toBroadVisionCandidate = (
  vision: VisionSpeciesResult,
  modelId: string
): AnimalCandidate | null => {
  if (
    !vision.organismPresent ||
    vision.confidence === undefined ||
    vision.confidence < MIN_VISION_BROAD_CONFIDENCE
  ) {
    return null;
  }

  const taxon = findBroadTaxonFallback(vision);
  if (!taxon) return null;

  return {
    id: taxon.id,
    nameZh: taxon.nameZh,
    nameEn: taxon.nameEn,
    scientificName: taxon.scientificName,
    kingdom: taxon.kingdom,
    introZh: vision.introZh || taxon.introZh,
    score: Math.min(0.67, Math.max(MIN_VISION_BROAD_CONFIDENCE, vision.confidence)),
    rawLabel: `${modelId}: ${vision.scientificName || vision.commonNameEn || taxon.scientificName}`,
    source: 'vision',
    taxonRank: taxon.taxonRank,
    subjectBox: vision.subjectBox,
    subjectPolygon: vision.subjectPolygon,
  };
};

const toVisionSpeciesCandidate = (
  vision: VisionSpeciesResult,
  gbif: GbifSpeciesMatch,
  modelId: string
): AnimalCandidate | null => {
  const gbifConfidence = typeof gbif.confidence === 'number' ? gbif.confidence : 0;
  const taxonRank = (gbif.rank || vision.taxonRank || '').toUpperCase();
  const scientificName = toGbifCanonicalScientificName(gbif);

  if (
    !vision.organismPresent ||
    vision.confidence === undefined ||
    vision.confidence < MIN_VISION_SPECIES_CONFIDENCE ||
    gbifConfidence < MIN_GBIF_SPECIES_CONFIDENCE ||
    !ALLOWED_GBIF_KINGDOMS.has(gbif.kingdom || '') ||
    !scientificName ||
    REJECTED_SCIENTIFIC_NAMES.has(scientificName) ||
    !isSpeciesLevelRank(taxonRank)
  ) {
    return null;
  }

  const commonNameZh = vision.commonNameZh || chineseNameByScientificName.get(scientificName) || vision.commonNameEn || scientificName;
  const commonNameEn = vision.commonNameEn || scientificName;

  return {
    id: `species-${scientificName.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    nameZh: commonNameZh,
    nameEn: commonNameEn,
    scientificName,
    kingdom: gbif.kingdom,
    introZh: vision.introZh,
    score: Math.min(0.99, vision.confidence * 0.82 + (gbifConfidence / 100) * 0.18),
    rawLabel: `${modelId}: ${vision.scientificName}`,
    source: 'vision',
    taxonRank,
    subjectBox: vision.subjectBox,
    subjectPolygon: vision.subjectPolygon,
  };
};

const toTrustedSpeciesCandidate = (
  vision: VisionSpeciesResult,
  modelId: string
): AnimalCandidate | null => {
  const scientificName = normalizeScientificName(vision.scientificName);
  const taxonRank = (vision.taxonRank || '').toUpperCase();
  const confidence = vision.confidence ?? 0;

  if (
    !vision.organismPresent ||
    !scientificName ||
    !isSpeciesLevelRank(taxonRank) ||
    confidence <= 0 ||
    REJECTED_SCIENTIFIC_NAMES.has(scientificName)
  ) {
    return null;
  }

  return {
    id: `species-${scientificName.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    nameZh: vision.commonNameZh || chineseNameByScientificName.get(scientificName) || vision.commonNameEn || scientificName,
    nameEn: vision.commonNameEn || scientificName,
    scientificName,
    kingdom: vision.scientificName === 'Plantae' ? TAXON_KINGDOM_PLANTAE : undefined,
    introZh: vision.introZh,
    score: Math.min(0.99, confidence),
    rawLabel: `${modelId}: ${scientificName}`,
    source: 'vision',
    taxonRank,
    subjectBox: vision.subjectBox,
    subjectPolygon: vision.subjectPolygon,
  };
};

type SpeciesIdentificationResult = {
  candidate: AnimalCandidate | null;
  provider: string;
  unavailable?: boolean;
};

const getSelfHostedSpeciesModelUrl = (env: PagesContext['env']) =>
  env.CMI_MAP_SPECIES_MODEL_URL?.trim() || '';

const getSelfHostedSpeciesModelToken = (env: PagesContext['env']) =>
  env.CMI_MAP_SPECIES_MODEL_TOKEN?.trim() || '';

const runSelfHostedSpeciesModel = async (
  env: PagesContext['env'],
  imageBytes: number[],
  mimeType: string,
  coarseCandidates: AnimalCandidate[]
): Promise<VisionSpeciesResult | null> => {
  const speciesModelUrl = getSelfHostedSpeciesModelUrl(env);
  if (!speciesModelUrl) return null;

  const formData = new FormData();
  formData.append('image', new File([Uint8Array.from(imageBytes)], 'animal-checkin.jpg', { type: mimeType || 'image/jpeg' }));
  if (coarseCandidates.length > 0) {
    formData.append('coarseCandidates', JSON.stringify(coarseCandidates.map(candidate => ({
      id: candidate.id,
      nameZh: candidate.nameZh,
      nameEn: candidate.nameEn,
      scientificName: candidate.scientificName,
      taxonRank: candidate.taxonRank,
      score: candidate.score,
    }))));
  }

  const headers = new Headers({ accept: 'application/json' });
  const token = getSelfHostedSpeciesModelToken(env);
  if (token) headers.set('authorization', `Bearer ${token}`);

  try {
    const response = await fetchWithTimeout(speciesModelUrl, {
      method: 'POST',
      headers,
      body: formData,
    }, SELF_HOSTED_MODEL_TIMEOUT_MS);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.warn('自托管物种识别失败:', response.status, errorText.slice(0, 160));
      return null;
    }

    const data = await response.json().catch(() => null);
    return data ? toVisionSpeciesResult(JSON.stringify(data)) : null;
  } catch (error) {
    console.warn('自托管物种识别不可用:', error);
    return null;
  }
};

const identifyWithSelfHostedSpeciesModel = async (
  env: PagesContext['env'],
  imageBytes: number[],
  mimeType: string,
  coarseCandidates: AnimalCandidate[]
): Promise<SpeciesIdentificationResult | null> => {
  const vision = await runSelfHostedSpeciesModel(env, imageBytes, mimeType, coarseCandidates);
  if (!vision) return getSelfHostedSpeciesModelUrl(env)
    ? { candidate: null, provider: SELF_HOSTED_SPECIES_MODEL_ID }
    : null;

  const provider = vision.provider || SELF_HOSTED_SPECIES_MODEL_ID;
  const speciesCandidate = toTrustedSpeciesCandidate(vision, provider);
  if (speciesCandidate) return { candidate: speciesCandidate, provider };

  const broadCandidate = toBroadVisionCandidate(vision, provider);
  if (broadCandidate) return { candidate: broadCandidate, provider };

  return { candidate: null, provider };
};

const identifySpeciesCandidate = async (
  env: PagesContext['env'],
  imageBytes: number[],
  mimeType: string
): Promise<SpeciesIdentificationResult> => {
  let geminiUnavailable = false;
  let geminiBroadCandidate: AnimalCandidate | null = null;

  if (env.GOOGLE_AI_STUDIO_API_KEY) {
    try {
      const vision = await runGeminiSpeciesModel(env.GOOGLE_AI_STUDIO_API_KEY, imageBytes, mimeType);
      if (vision?.scientificName) {
        const gbif = await validateScientificNameWithGbif(vision.scientificName);
        const candidate = gbif ? toVisionSpeciesCandidate(vision, gbif, GEMINI_SPECIES_MODEL_ID) : null;
        if (candidate) return { candidate, provider: GEMINI_SPECIES_MODEL_ID };
      }
      if (vision) {
        geminiBroadCandidate = toBroadVisionCandidate(vision, GEMINI_SPECIES_MODEL_ID);
      }
    } catch (error) {
      if (error instanceof GeminiSpeciesModelUnavailableError) {
        geminiUnavailable = true;
      } else {
        console.warn('Gemini 生物物种识别失败:', error);
      }
    }
  }

  const selfHostedResult = await identifyWithSelfHostedSpeciesModel(
    env,
    imageBytes,
    mimeType,
    geminiBroadCandidate ? [geminiBroadCandidate] : []
  );
  if (selfHostedResult?.candidate) return selfHostedResult;
  if (geminiBroadCandidate) return { candidate: geminiBroadCandidate, provider: GEMINI_SPECIES_MODEL_ID };
  if (selfHostedResult) return selfHostedResult;

  return {
    candidate: null,
    provider: env.GOOGLE_AI_STUDIO_API_KEY ? GEMINI_SPECIES_MODEL_ID : SELF_HOSTED_SPECIES_MODEL_ID,
    unavailable: geminiUnavailable || (!env.GOOGLE_AI_STUDIO_API_KEY && !getSelfHostedSpeciesModelUrl(env)),
  };
};

export const onRequestPost = async ({ request, env }: PagesContext) => {
  const startedAt = Date.now();

  if (!env.GOOGLE_AI_STUDIO_API_KEY && !getSelfHostedSpeciesModelUrl(env)) {
    return jsonResponse({
      status: 'unavailable',
      provider: SELF_HOSTED_SPECIES_MODEL_ID,
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

  const imageBytes = [...new Uint8Array(await image.arrayBuffer())];
  const speciesResult = await identifySpeciesCandidate(env, imageBytes, image.type || 'image/jpeg');
  if (speciesResult.unavailable) {
    return jsonResponse({
      status: 'unavailable',
      provider: speciesResult.provider,
      elapsedMs: Date.now() - startedAt,
      candidates: [],
      message: '识别服务繁忙，请稍后再试',
      rawDetections: [],
      rawLabels: [],
    }, { status: 503 });
  }

  const speciesCandidate = speciesResult.candidate;
  const candidates = speciesCandidate ? [speciesCandidate] : [];

  return jsonResponse({
    status: candidates.length > 0 ? 'ready' : 'no-match',
    provider: speciesResult.provider,
    elapsedMs: Date.now() - startedAt,
    candidates,
    rawDetections: [],
    rawLabels: [],
  });
};
