const GEMINI_SPECIES_MODEL_ID = 'gemini-2.5-flash';
const GEMINI_GENERATE_CONTENT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_SPECIES_MODEL_ID}:generateContent`;
const GBIF_SPECIES_MATCH_URL = 'https://api.gbif.org/v1/species/match';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MIN_VISION_SPECIES_CONFIDENCE = 0.68;
const MIN_GBIF_SPECIES_CONFIDENCE = 82;
const GEMINI_MAX_ATTEMPTS = 2;
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
}

type VisionSpeciesResult = {
  organismPresent?: boolean;
  commonNameZh?: string;
  commonNameEn?: string;
  scientificName?: string;
  taxonRank?: string;
  confidence?: number;
  introZh?: string;
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

  return {
    organismPresent: parsed.organismPresent === true || parsed.animalPresent === true,
    commonNameZh: typeof parsed.commonNameZh === 'string' ? parsed.commonNameZh.trim() : '',
    commonNameEn: typeof parsed.commonNameEn === 'string' ? parsed.commonNameEn.trim() : '',
    scientificName: normalizeScientificName(parsed.scientificName),
    taxonRank: typeof parsed.taxonRank === 'string' ? parsed.taxonRank.trim().toUpperCase() : '',
    confidence: toConfidence(parsed.confidence),
    introZh: typeof parsed.introZh === 'string' ? parsed.introZh.trim() : '',
  };
};

const buildSpeciesPrompt = () => [
  'Identify the primary visible animal or plant in this user photo.',
  'The user wants a taxonomic scientific name for a field observation in Chiang Mai, Thailand.',
  'Return only strict JSON with this exact shape:',
  '{"organismPresent":true,"commonNameZh":"","commonNameEn":"","scientificName":"","taxonRank":"SPECIES","confidence":0.0,"introZh":""}',
  'Rules:',
  '- Use a species or subspecies scientific name only when the animal or plant is visually clear enough.',
  '- introZh must be 2 concise Chinese sentences about distinctive visual traits, typical habitat or distribution, and useful observation notes.',
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
    });

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
  };
};

type SpeciesIdentificationResult = {
  candidate: AnimalCandidate | null;
  provider: string;
  unavailable?: boolean;
};

const identifySpeciesCandidate = async (
  env: PagesContext['env'],
  imageBytes: number[],
  mimeType: string
): Promise<SpeciesIdentificationResult> => {
  if (!env.GOOGLE_AI_STUDIO_API_KEY) {
    return { candidate: null, provider: GEMINI_SPECIES_MODEL_ID };
  }

  try {
    const vision = await runGeminiSpeciesModel(env.GOOGLE_AI_STUDIO_API_KEY, imageBytes, mimeType);
    if (vision?.scientificName) {
      const gbif = await validateScientificNameWithGbif(vision.scientificName);
      const candidate = gbif ? toVisionSpeciesCandidate(vision, gbif, GEMINI_SPECIES_MODEL_ID) : null;
      if (candidate) return { candidate, provider: GEMINI_SPECIES_MODEL_ID };
    }
  } catch (error) {
    if (error instanceof GeminiSpeciesModelUnavailableError) {
      return { candidate: null, provider: GEMINI_SPECIES_MODEL_ID, unavailable: true };
    }
    console.warn('Gemini 生物物种识别失败:', error);
  }

  return { candidate: null, provider: GEMINI_SPECIES_MODEL_ID };
};

export const onRequestPost = async ({ request, env }: PagesContext) => {
  const startedAt = Date.now();

  if (!env.GOOGLE_AI_STUDIO_API_KEY) {
    return jsonResponse({
      status: 'unavailable',
      provider: GEMINI_SPECIES_MODEL_ID,
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
      provider: GEMINI_SPECIES_MODEL_ID,
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
    provider: GEMINI_SPECIES_MODEL_ID,
    elapsedMs: Date.now() - startedAt,
    candidates,
    rawDetections: [],
    rawLabels: [],
  });
};
