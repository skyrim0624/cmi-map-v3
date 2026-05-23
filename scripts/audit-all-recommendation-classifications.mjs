import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const PROJECT_REF = 'sfpcpxlxslnulzlmjcby';
const OUTPUT_DIR = join(ROOT, 'scratch', 'recommendation-classification-audit');
const TAXONOMY_PATH = join(ROOT, 'src/data/cmi-taxonomy.ts');
const CORRECTIONS_PATH = join(ROOT, 'src/data/cmi-place-corrections.ts');
const OUTPUT_BASENAME = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
}).format(new Date());
const OUTPUT_STAMP = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}).format(new Date()).replace(/[-: ]/g, '');
const SHOULD_APPLY = process.argv.includes('--apply');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

if (!SUPABASE_URL) {
  console.error('缺少 Supabase URL 环境变量。请先 source .env。');
  process.exit(1);
}

const CATEGORY_ALIASES = {
  拍照: '景点',
  放松: '马杀鸡',
};

const CATEGORY_TO_INPUT_INTENT = {
  吃饭: ['eat', 'eat'],
  咖啡: ['work', 'work'],
  户外: ['play', 'play'],
  景点: ['landmark', 'play'],
  拍照: ['landmark', 'play'],
  购物: ['shopping', 'shopping'],
  市集: ['shopping', 'shopping'],
  马杀鸡: ['relax', 'relax'],
  放松: ['relax', 'relax'],
  运动: ['sport', 'sport'],
  酒吧: ['play', 'play'],
  身心: ['relax', 'relax'],
  生存指南: ['errands', 'errands'],
  彩蛋: ['easter', 'easter'],
  清迈客栈: ['cmi-inn', null],
};

const normalize = (value) => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase();
const normalizeCategory = (category) => CATEGORY_ALIASES[category] ?? category;
const normalizePlaceKey = (value) => normalize(value).replace(/\s+/g, ' ');
const dedupe = (values) => [...new Set(values.filter(Boolean))];

const containsLatinToken = (text, keyword) => {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
};

const matchesKeyword = (text, keyword) => {
  const normalizedKeyword = normalize(keyword);
  if (!normalizedKeyword) return false;
  if (/[a-z0-9]/i.test(normalizedKeyword)) return containsLatinToken(text, normalizedKeyword);
  return text.includes(normalizedKeyword);
};

const containsAny = (text, keywords) => keywords.some((keyword) => matchesKeyword(text, keyword));

const parseStringList = (source) => {
  if (!source) return [];
  return [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

const extractArrayBlock = (source, marker) => {
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`未找到 ${marker}`);
  const equalsIndex = source.indexOf('=', start);
  const bracketStart = source.indexOf('[', equalsIndex);
  let depth = 0;

  for (let index = bracketStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '[') depth += 1;
    if (char === ']') depth -= 1;
    if (depth === 0) return source.slice(bracketStart, index + 1);
  }

  throw new Error(`无法解析 ${marker} 数组块`);
};

const splitTopLevelObjects = (arrayBlock) => {
  const objects = [];
  let depth = 0;
  let current = '';
  let inside = false;

  for (const char of arrayBlock) {
    if (char === '{') {
      depth += 1;
      inside = true;
    }
    if (inside) current += char;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        objects.push(current);
        current = '';
        inside = false;
      }
    }
  }

  return objects;
};

const parsePlaceTypeIds = (source) => {
  const block = extractArrayBlock(source, 'export const CMI_PLACE_TYPE_TAGS');
  return new Set(
    splitTopLevelObjects(block)
      .map((objectSource) => objectSource.match(/id:\s*'([^']+)'/)?.[1])
      .filter(Boolean),
  );
};

const parseDetailTagIds = (source) => {
  const block = extractArrayBlock(source, 'export const CMI_DETAIL_TAGS');
  return new Set(
    splitTopLevelObjects(block)
      .map((objectSource) => objectSource.match(/id:\s*'([^']+)'/)?.[1])
      .filter(Boolean),
  );
};

const parseCorrectionCategories = (source) => {
  const corrections = new Map();
  const entries = [...source.matchAll(/\[\s*\n\s*'([^']+)'\s*,\s*\n\s*\{([\s\S]*?)\n\s*\}\s*,?\s*\n\s*\]/g)];

  for (const entry of entries) {
    const placeName = entry[1];
    const objectSource = entry[2];
    const category = objectSource.match(/category:\s*'([^']+)'/)?.[1];
    if (category) corrections.set(normalizePlaceKey(placeName), category);
  }

  return corrections;
};

const getCategoryIntent = (category) => CATEGORY_TO_INPUT_INTENT[category] ?? [null, null];

const getServiceRoleFromCli = () => {
  try {
    const output = execFileSync(
      'supabase',
      ['projects', 'api-keys', '--project-ref', PROJECT_REF, '--output', 'json'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const keys = JSON.parse(output);
    return keys.find((item) => item.name === 'service_role' || item.id === 'service_role')?.api_key ?? null;
  } catch {
    return null;
  }
};

const fetchRecommendations = async () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getServiceRoleFromCli();
  if (!serviceRoleKey) throw new Error('未拿到 service_role，无法做全量审计。');

  const supabase = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from('recommendations')
    .select(
      [
        'id',
        'place_name',
        'category',
        'reason',
        'user_name',
        'user_id',
        'latitude',
        'longitude',
        'created_at',
        'input_category_id',
        'primary_intent_id',
        'place_type_ids',
        'detail_tag_ids',
        'classification_status',
        'classification_source',
        'classification_confidence',
        'classified_at',
      ].join(','),
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

const getOwnerType = (row) => (row.user_name === 'CMI社区' ? 'community' : 'user');
const rowText = (row) => normalize([row.place_name, row.reason].filter(Boolean).join(' '));

const candidate = ({
  id,
  category,
  acceptableCategories,
  placeTypeIds,
  detailTagIds = [],
  confidence,
  reason,
}) => ({
  ruleId: id,
  suggestedCategory: category,
  acceptableCategories,
  suggestedPlaceTypeIds: placeTypeIds,
  suggestedDetailTagIds: detailTagIds,
  confidence,
  reason,
});

const inferExpectedClassification = (row) => {
  const text = rowText(row);
  const placeNameText = normalize(row.place_name);
  const hasRestaurantSignal = containsAny(text, ['餐厅', '饭店', 'restaurant', 'kitchen', 'bistro', '泰国菜', '中餐', '日料', '韩餐', '素食']);
  const hasCafeSignal = containsAny(text, ['咖啡', 'cafe', 'coffee', 'roastery', 'brunch', 'starbucks']);
  const hasMarketSignal = containsAny(text, ['市集', '集市', 'walking street', 'bazaar', '手作市集', '周末市集']);
  const hasFreshMarketSignal = containsAny(text, ['菜市场', '生鲜', '水果', '榴莲', '榴莲摊', 'fresh market', 'produce']);

  if (containsAny(text, ['money exchange', 'exchange', '换汇', 'super money', 'sk exchange', 'mr.pierre'])) {
    return candidate({
      id: 'exchange',
      category: '生存指南',
      acceptableCategories: ['生存指南'],
      placeTypeIds: ['exchange'],
      confidence: 0.96,
      reason: '换汇语义明确，应归入生活服务/换汇。',
    });
  }

  if (containsAny(text, ['打印', '复印', 'print shop', 'printing', 'copy shop'])) {
    return candidate({
      id: 'print',
      category: '生存指南',
      acceptableCategories: ['生存指南'],
      placeTypeIds: ['print'],
      confidence: 0.94,
      reason: '打印/复印语义明确，应归入生活服务/打印。',
    });
  }

  if (containsAny(text, ['理发', '剪头发', 'barber', 'haircut', 'hair salon', 'salon'])) {
    return candidate({
      id: 'haircut',
      category: '生存指南',
      acceptableCategories: ['生存指南'],
      placeTypeIds: ['haircut'],
      confidence: 0.92,
      reason: '理发店语义明确，应归入生活服务/理发。',
    });
  }

  if (containsAny(text, ['药店', 'pharmacy', 'boots', 'watsons', '买药'])) {
    return candidate({
      id: 'pharmacy',
      category: '生存指南',
      acceptableCategories: ['生存指南'],
      placeTypeIds: ['pharmacy'],
      confidence: 0.92,
      reason: '药店语义明确，应归入生活服务/药店。',
    });
  }

  if (normalize(row.place_name) === '清迈客栈') {
    return candidate({
      id: 'cmi-inn',
      category: '清迈客栈',
      acceptableCategories: ['清迈客栈'],
      placeTypeIds: [],
      confidence: 0.98,
      reason: '清迈客栈应进入客栈专属分类，而不是普通地图粗分类。',
    });
  }

  if (containsAny(text, ['医院', '诊所', 'clinic', 'hospital', '看病', 'medicine center'])) {
    return candidate({
      id: 'clinic',
      category: '生存指南',
      acceptableCategories: ['生存指南', '马杀鸡'],
      placeTypeIds: ['clinic'],
      confidence: 0.85,
      reason: '诊所/医疗中心语义明确，应归入生活服务/诊所。',
    });
  }

  if (containsAny(text, ['洗衣', 'laundry', '烘干'])) {
    return candidate({
      id: 'laundry',
      category: '生存指南',
      acceptableCategories: ['生存指南'],
      placeTypeIds: ['laundry'],
      confidence: 0.92,
      reason: '洗衣语义明确，应归入生活服务/洗衣。',
    });
  }

  if (containsAny(text, ['租车', '租摩托', 'motorbike rental', 'car rental'])) {
    return candidate({
      id: 'rental',
      category: '生存指南',
      acceptableCategories: ['生存指南'],
      placeTypeIds: ['rental'],
      confidence: 0.92,
      reason: '租车语义明确，应归入生活服务/租车。',
    });
  }

  if (containsAny(text, ['sim', '电话卡', '手机卡', '流量卡', 'ais', 'dtac'])) {
    return candidate({
      id: 'sim',
      category: '生存指南',
      acceptableCategories: ['生存指南'],
      placeTypeIds: ['sim'],
      confidence: 0.9,
      reason: '电话卡语义明确，应归入生活服务/SIM 卡。',
    });
  }

  if (containsAny(text, ['livehouse', 'live music', '现场音乐', 'originaLive', '乐队'])) {
    return candidate({
      id: 'livehouse',
      category: '酒吧',
      acceptableCategories: ['酒吧'],
      placeTypeIds: ['livehouse'],
      confidence: 0.93,
      reason: '现场音乐/Livehouse 语义明确，应归入夜生活。',
    });
  }

  if (containsAny(text, ['酒吧', 'cocktail', '小酌', 'bar fine', 'บ่าฟาย'])) {
    return candidate({
      id: 'bar',
      category: '酒吧',
      acceptableCategories: ['酒吧'],
      placeTypeIds: ['bar'],
      confidence: 0.92,
      reason: '酒吧语义明确，应归入酒吧。',
    });
  }

  if (containsAny(text, ['nightclub', 'night club', '蹦迪', '夜店', 'dj', '6ixcret'])) {
    return candidate({
      id: 'club',
      category: '酒吧',
      acceptableCategories: ['酒吧'],
      placeTypeIds: ['club'],
      confidence: 0.9,
      reason: '夜店/蹦迪语义明确，应归入夜生活。',
    });
  }

  if (containsAny(text, ['ktv', 'karaoke', '唱歌'])) {
    return candidate({
      id: 'ktv',
      category: '酒吧',
      acceptableCategories: ['酒吧'],
      placeTypeIds: ['ktv'],
      confidence: 0.9,
      reason: 'KTV 语义明确，应归入夜生活。',
    });
  }

  if (containsAny(text, ['按摩', '马杀鸡', 'massage', 'spa', '身体调理'])) {
    return candidate({
      id: 'massage',
      category: '马杀鸡',
      acceptableCategories: ['马杀鸡', '身心'],
      placeTypeIds: ['massage'],
      confidence: 0.9,
      reason: '按摩/SPA 语义明确，应归入放松。',
    });
  }

  if (containsAny(text, ['温泉', 'hot spring', '泡汤'])) {
    return candidate({
      id: 'hot-spring',
      category: '户外',
      acceptableCategories: ['户外', '马杀鸡'],
      placeTypeIds: ['hot-spring'],
      confidence: 0.9,
      reason: '温泉语义明确，可归入自然短途/放松。',
    });
  }

  if (containsAny(text, ['超市', '便利店', '日用品', 'supermarket', 'grocery', 'lotus', 'big c', 'makro', '韩国超市'])) {
    return candidate({
      id: 'daily',
      category: '购物',
      acceptableCategories: ['购物', '生存指南'],
      placeTypeIds: ['daily'],
      confidence: 0.93,
      reason: '超市/日用品语义明确，不应停留在市集或彩蛋。',
    });
  }

  if (containsAny(text, ['商场', 'mall', 'central', 'maya', 'one nimman'])) {
    return candidate({
      id: 'mall',
      category: '购物',
      acceptableCategories: ['购物'],
      placeTypeIds: ['mall'],
      confidence: 0.9,
      reason: '商场语义明确，应归入购物/商场。',
    });
  }

  if (containsAny(text, ['图书馆', 'library', '书店', 'bookstore', '看书', '买书', '外文书'])) {
    return candidate({
      id: 'reading',
      category: '购物',
      acceptableCategories: ['购物'],
      placeTypeIds: ['reading', 'stationery'],
      confidence: 0.88,
      reason: '书店/阅读语义明确，应归入购物/看书或文具。',
    });
  }

  if (containsAny(placeNameText, ['寺庙', 'temple', 'wat ', 'wat-', '素贴山', 'doi suthep', '契迪龙寺', 'qidilongsi'])) {
    return candidate({
      id: 'temple',
      category: '景点',
      acceptableCategories: ['景点', '彩蛋'],
      placeTypeIds: ['temple'],
      confidence: 0.92,
      reason: '地点名直接指向寺庙；即使描述里有集市，也应以地点主体作为主分类。',
    });
  }

  if (containsAny(placeNameText, ['大炮', '坦克', '城门', '观景台', 'viewpoint', 'monument', '地标'])) {
    return candidate({
      id: 'landmark',
      category: '景点',
      acceptableCategories: ['景点'],
      placeTypeIds: ['landmark'],
      detailTagIds: ['photo-friendly'],
      confidence: 0.86,
      reason: '地点名直接指向地标/打卡物，应以地点主体作为主分类。',
    });
  }

  if (hasFreshMarketSignal) {
    return candidate({
      id: 'fresh-market',
      category: '市集',
      acceptableCategories: ['市集'],
      placeTypeIds: ['fresh-market'],
      confidence: 0.91,
      reason: '菜市场/水果/生鲜语义明确，应优先标为菜市场。',
    });
  }

  if (containsAny(text, ['夜市', 'night market', 'night bazaar'])) {
    return candidate({
      id: 'night-market',
      category: '市集',
      acceptableCategories: ['市集'],
      placeTypeIds: ['night-market'],
      confidence: 0.9,
      reason: '夜市语义明确，应归入市集/夜市。',
    });
  }

  if (hasMarketSignal) {
    return candidate({
      id: 'market',
      category: '市集',
      acceptableCategories: ['市集'],
      placeTypeIds: ['market'],
      confidence: 0.82,
      reason: '市集/集市语义明确，应归入市集。',
    });
  }

  if (containsAny(text, ['展览', 'exhibition', 'gallery', '艺术', 'tcdc', 'baan kang wat', 'sang ga dee'])) {
    return candidate({
      id: 'gallery',
      category: '景点',
      acceptableCategories: ['景点', '购物', '咖啡'],
      placeTypeIds: ['gallery'],
      confidence: 0.86,
      reason: '展览/艺术空间语义明确，应归入游玩/艺术。',
    });
  }

  if (containsAny(text, ['寺庙', 'temple', 'wat ', 'wat-', '素贴山', 'doi suthep', '契迪龙寺', 'qidilongsi'])) {
    return candidate({
      id: 'temple',
      category: '景点',
      acceptableCategories: ['景点'],
      placeTypeIds: ['temple'],
      confidence: 0.92,
      reason: '寺庙语义明确，应归入景点/寺庙。',
    });
  }

  if (containsAny(text, ['瀑布', 'waterfall', '最高峰', '山顶', 'doi inthanon', '上山', '山村', 'mae kampong'])) {
    return candidate({
      id: 'nature',
      category: '户外',
      acceptableCategories: ['户外'],
      placeTypeIds: ['nature'],
      detailTagIds: ['photo-friendly'],
      confidence: 0.92,
      reason: '自然短途语义明确，应归入户外。',
    });
  }

  if (containsAny(text, ['公园', 'park', 'royal park'])) {
    return candidate({
      id: 'park',
      category: '户外',
      acceptableCategories: ['户外', '景点', '运动'],
      placeTypeIds: ['park'],
      confidence: 0.86,
      reason: '公园语义明确，应归入公园相关类型。',
    });
  }

  if (containsAny(text, ['城门', '观景台', 'viewpoint', 'monument', '地标', '打卡', '坦克', '大炮'])) {
    return candidate({
      id: 'landmark',
      category: '景点',
      acceptableCategories: ['景点'],
      placeTypeIds: ['landmark'],
      detailTagIds: ['photo-friendly'],
      confidence: 0.82,
      reason: '地标/打卡语义明确，应归入景点。',
    });
  }

  if (containsAny(text, ['健身房', 'gym', '街头健身', '健身器械', 'crossfit', '功能训练'])) {
    return candidate({
      id: 'gym',
      category: '运动',
      acceptableCategories: ['运动'],
      placeTypeIds: containsAny(text, ['体育场', 'stadium']) ? ['gym', 'stadium'] : ['gym'],
      confidence: 0.9,
      reason: '健身语义明确，应归入运动。',
    });
  }

  if (containsAny(text, ['体育场', '运动场', 'stadium', '球场'])) {
    return candidate({
      id: 'stadium',
      category: '运动',
      acceptableCategories: ['运动'],
      placeTypeIds: ['stadium'],
      confidence: 0.88,
      reason: '体育场/球场语义明确，应归入运动。',
    });
  }

  if (containsAny(text, ['跑步', '慢跑', 'running', 'jogging'])) {
    return candidate({
      id: 'running',
      category: '运动',
      acceptableCategories: ['运动', '户外'],
      placeTypeIds: ['running'],
      confidence: 0.84,
      reason: '跑步语义明确，应归入运动/跑步。',
    });
  }

  if (containsAny(text, ['瑜伽', 'yoga', '冥想'])) {
    return candidate({
      id: 'yoga',
      category: '运动',
      acceptableCategories: ['运动', '身心', '马杀鸡'],
      placeTypeIds: ['yoga'],
      confidence: 0.86,
      reason: '瑜伽/冥想语义明确，应归入运动或身心。',
    });
  }

  if (hasCafeSignal && !hasRestaurantSignal) {
    return candidate({
      id: 'cafe',
      category: '咖啡',
      acceptableCategories: ['咖啡'],
      placeTypeIds: containsAny(text, ['brunch']) ? ['cafe', 'breakfast'] : ['cafe'],
      confidence: 0.9,
      reason: '咖啡馆语义明确，应归入咖啡。',
    });
  }

  if (hasCafeSignal && hasRestaurantSignal) {
    return candidate({
      id: 'cafe-restaurant',
      category: '咖啡',
      acceptableCategories: ['咖啡', '吃饭'],
      placeTypeIds: ['cafe', 'restaurant'],
      confidence: 0.84,
      reason: '同时具备咖啡和餐厅语义，粗分类咖啡或吃饭都可接受。',
    });
  }

  if (containsAny(text, ['小吃', '船面', '牛肉粉', '芒果糯米饭', '豆浆', '油条', '路边摊', 'street food'])) {
    return candidate({
      id: 'snack',
      category: '吃饭',
      acceptableCategories: ['吃饭'],
      placeTypeIds: ['snack'],
      confidence: 0.86,
      reason: '小吃语义明确，应归入吃饭/小吃。',
    });
  }

  if (containsAny(text, ['早餐', '早饭', 'brunch', '粥'])) {
    return candidate({
      id: 'breakfast',
      category: '吃饭',
      acceptableCategories: ['吃饭', '咖啡'],
      placeTypeIds: ['breakfast'],
      confidence: 0.82,
      reason: '早餐/Brunch 语义明确，应补早餐细分类。',
    });
  }

  if (containsAny(text, ['甜品', '甜点', 'dessert', '蛋糕', '冰淇淋'])) {
    return candidate({
      id: 'dessert',
      category: '吃饭',
      acceptableCategories: ['吃饭', '咖啡'],
      placeTypeIds: ['dessert'],
      confidence: 0.82,
      reason: '甜品语义明确，应补甜品细分类。',
    });
  }

  if (hasRestaurantSignal) {
    return candidate({
      id: 'restaurant',
      category: '吃饭',
      acceptableCategories: ['吃饭'],
      placeTypeIds: ['restaurant'],
      confidence: 0.84,
      reason: '餐厅/菜系语义明确，应归入吃饭/餐厅。',
    });
  }

  return null;
};

const categoryIntentMismatch = (row) => {
  const [expectedInputId, expectedPrimaryIntentId] = CATEGORY_TO_INPUT_INTENT[row.category] ?? [];
  const issues = [];

  if (expectedInputId && row.input_category_id && row.input_category_id !== expectedInputId) {
    issues.push(`input_category_id=${row.input_category_id} 与 category=${row.category} 不一致，应为 ${expectedInputId}`);
  }

  if (expectedPrimaryIntentId && row.primary_intent_id && row.primary_intent_id !== expectedPrimaryIntentId) {
    issues.push(`primary_intent_id=${row.primary_intent_id} 与 category=${row.category} 不一致，应为 ${expectedPrimaryIntentId}`);
  }

  return issues;
};

const auditRow = (row, correctionCategories, validPlaceTypeIds, validDetailTagIds) => {
  const issues = [];
  const currentCategory = normalizeCategory(row.category);
  const correctionCategory = correctionCategories.get(normalizePlaceKey(row.place_name));
  const inferred = inferExpectedClassification(row);
  const persistedPlaceTypeIds = Array.isArray(row.place_type_ids) ? row.place_type_ids : [];
  const persistedDetailTagIds = Array.isArray(row.detail_tag_ids) ? row.detail_tag_ids : [];

  if (row.category !== currentCategory) {
    issues.push({
      type: 'legacy_category_alias',
      severity: 'medium',
      confidence: 0.98,
      suggestedCategory: currentCategory,
      suggestedPlaceTypeIds: [],
      reason: `数据库仍使用旧 category=${row.category}，前端会归一化为 ${currentCategory}。`,
    });
  }

  if (correctionCategory && normalizeCategory(correctionCategory) !== currentCategory) {
    issues.push({
      type: 'source_category_error',
      severity: 'high',
      confidence: 0.99,
      suggestedCategory: correctionCategory,
      suggestedPlaceTypeIds: inferred?.suggestedPlaceTypeIds ?? [],
      reason: `前端修正表已把该地点改成 ${correctionCategory}，说明数据库原始 category=${row.category} 与产品分类不一致。`,
    });
  }

  if (inferred && !inferred.acceptableCategories.map(normalizeCategory).includes(currentCategory)) {
    issues.push({
      type: 'source_category_error',
      severity: inferred.confidence >= 0.9 ? 'high' : 'medium',
      confidence: inferred.confidence,
      suggestedCategory: inferred.suggestedCategory,
      suggestedPlaceTypeIds: inferred.suggestedPlaceTypeIds,
      suggestedDetailTagIds: inferred.suggestedDetailTagIds,
      reason: inferred.reason,
    });
  }

  if (inferred) {
    const invalidSuggestedPlaceTypes = inferred.suggestedPlaceTypeIds.filter((id) => !validPlaceTypeIds.has(id));
    const invalidSuggestedDetailTags = inferred.suggestedDetailTagIds.filter((id) => !validDetailTagIds.has(id));
    if (invalidSuggestedPlaceTypes.length > 0 || invalidSuggestedDetailTags.length > 0) {
      throw new Error(`脚本候选标签不在 taxonomy 中: ${[...invalidSuggestedPlaceTypes, ...invalidSuggestedDetailTags].join(', ')}`);
    }

    const missingPlaceTypes = inferred.suggestedPlaceTypeIds.filter((id) => !persistedPlaceTypeIds.includes(id));
    const persistedHasData = persistedPlaceTypeIds.length > 0 || persistedDetailTagIds.length > 0;

    if (persistedHasData && missingPlaceTypes.length > 0) {
      issues.push({
        type: 'place_type_mismatch',
        severity: inferred.confidence >= 0.9 ? 'high' : 'medium',
        confidence: inferred.confidence,
        suggestedCategory: inferred.suggestedCategory,
        suggestedPlaceTypeIds: inferred.suggestedPlaceTypeIds,
        suggestedDetailTagIds: inferred.suggestedDetailTagIds,
        reason: `已持久化 place_type_ids=${JSON.stringify(persistedPlaceTypeIds)}，但文本更匹配 ${inferred.suggestedPlaceTypeIds.join(', ')}。`,
      });
    }

    if (!persistedHasData && missingPlaceTypes.length > 0 && inferred.confidence >= 0.82) {
      issues.push({
        type: 'missing_place_type',
        severity: inferred.confidence >= 0.9 ? 'high' : 'medium',
        confidence: inferred.confidence,
        suggestedCategory: inferred.suggestedCategory,
        suggestedPlaceTypeIds: inferred.suggestedPlaceTypeIds,
        suggestedDetailTagIds: inferred.suggestedDetailTagIds,
        reason: inferred.reason,
      });
    }
  }

  for (const mismatchReason of categoryIntentMismatch(row)) {
    issues.push({
      type: 'input_intent_mismatch',
      severity: 'medium',
      confidence: 0.9,
      suggestedCategory: row.category,
      suggestedPlaceTypeIds: inferred?.suggestedPlaceTypeIds ?? [],
      reason: mismatchReason,
    });
  }

  const hasConcreteContent = Boolean(inferred || correctionCategory);
  const needsManualReview =
    issues.length === 0
    && getOwnerType(row) === 'user'
    && ['彩蛋', '拍照', '身心'].includes(row.category)
    && !hasConcreteContent;

  return {
    id: row.id,
    placeName: row.place_name,
    userName: row.user_name,
    ownerType: getOwnerType(row),
    category: row.category,
    inputCategoryId: row.input_category_id,
    primaryIntentId: row.primary_intent_id,
    placeTypeIds: persistedPlaceTypeIds,
    detailTagIds: persistedDetailTagIds,
    reason: row.reason,
    createdAt: row.created_at,
    inferred,
    issues,
    needsManualReview,
  };
};

const groupCounts = (rows, getKey) =>
  rows.reduce((counts, row) => {
    const key = getKey(row);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

const issueRows = (audited) => audited.filter((row) => row.issues.length > 0);
const hasHighPriorityIssue = (row) =>
  row.issues.some((issue) =>
    ['source_category_error', 'place_type_mismatch', 'missing_place_type'].includes(issue.type)
    && issue.confidence >= 0.82,
  );

const issuePriority = {
  source_category_error: 0,
  place_type_mismatch: 1,
  missing_place_type: 2,
  input_intent_mismatch: 3,
  legacy_category_alias: 4,
};

const getPrimaryIssue = (row) =>
  [...row.issues].sort((left, right) =>
    (issuePriority[left.type] ?? 99) - (issuePriority[right.type] ?? 99)
    || right.confidence - left.confidence,
  )[0];

const buildUpdateForRow = (row) => {
  const issue = getPrimaryIssue(row);
  if (!issue) return null;

  const update = {};
  let nextCategory = row.category;

  if (issue.type === 'source_category_error') {
    nextCategory = issue.suggestedCategory ?? row.category;
  } else if (CATEGORY_ALIASES[row.category]) {
    nextCategory = normalizeCategory(row.category);
  }

  if (nextCategory !== row.category) {
    update.category = nextCategory;
  }

  const taxonomyIssue = row.issues.find((item) =>
    (item.suggestedPlaceTypeIds?.length ?? 0) > 0
    || (item.suggestedDetailTagIds?.length ?? 0) > 0,
  );
  const suggestedPlaceTypeIds = taxonomyIssue?.suggestedPlaceTypeIds ?? row.inferred?.suggestedPlaceTypeIds ?? [];
  const suggestedDetailTagIds = taxonomyIssue?.suggestedDetailTagIds ?? row.inferred?.suggestedDetailTagIds ?? [];

  if (suggestedPlaceTypeIds.length > 0 || suggestedDetailTagIds.length > 0) {
    update.place_type_ids = suggestedPlaceTypeIds;
    update.detail_tag_ids = suggestedDetailTagIds;
  }

  const [inputCategoryId, primaryIntentId] = getCategoryIntent(nextCategory);
  if (inputCategoryId !== (row.inputCategoryId ?? null)) {
    update.input_category_id = inputCategoryId;
  }
  if (primaryIntentId !== (row.primaryIntentId ?? null)) {
    update.primary_intent_id = primaryIntentId;
  }

  if (Object.keys(update).length === 0) return null;

  update.classification_status = 'auto_high_confidence';
  update.classification_source = 'codex_all_recommendation_classification_audit';
  update.classification_confidence = Math.max(...row.issues.map((item) => item.confidence), 0);
  update.classified_at = new Date().toISOString();

  return update;
};

const toIssueLine = (row) => {
  const primaryIssue = getPrimaryIssue(row);
  return [
    `| ${row.ownerType === 'user' ? '用户' : 'CMI'} `,
    `| ${row.placeName} `,
    `| ${row.userName ?? '-'} `,
    `| ${row.category} `,
    `| ${primaryIssue.type} `,
    `| ${primaryIssue.suggestedCategory ?? '-'} `,
    `| ${(primaryIssue.suggestedPlaceTypeIds ?? []).join(', ') || '-'} `,
    `| ${primaryIssue.confidence.toFixed(2)} `,
    `| ${primaryIssue.reason.replace(/\|/g, '/')} |`,
  ].join('');
};

const toMarkdown = (report) => {
  const highPriorityRows = report.audited.filter(hasHighPriorityIssue);
  const userHighPriorityRows = highPriorityRows.filter((row) => row.ownerType === 'user');
  const categoryErrorRows = report.audited.filter((row) =>
    row.issues.some((issue) => issue.type === 'source_category_error'),
  );
  const manualRows = report.audited.filter((row) => row.needsManualReview);

  return [
    '# CMI Map 全量地点分类审计',
    '',
    `- 生成时间：${report.meta.generatedAt}`,
    `- 检查总数：${report.summary.totalCount}`,
    `- 用户录入：${report.summary.userUploadedCount}`,
    `- CMI 社区导入：${report.summary.communityCuratedCount}`,
    `- 高优先级疑似问题：${highPriorityRows.length}`,
    `- 用户录入高优先级疑似问题：${userHighPriorityRows.length}`,
    `- 原始 category 疑似错误：${categoryErrorRows.length}`,
    `- 用户录入需人工复核：${manualRows.length}`,
    '',
    '## 用户录入优先处理',
    '',
    '| 来源 | 地点 | 用户 | 当前 category | 问题 | 建议 category | 建议 place_type_ids | 置信度 | 依据 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...(userHighPriorityRows.length > 0 ? userHighPriorityRows.map(toIssueLine) : ['| - | - | - | - | - | - | - | - | - |']),
    '',
    '## 全量高优先级疑似问题',
    '',
    '| 来源 | 地点 | 用户 | 当前 category | 问题 | 建议 category | 建议 place_type_ids | 置信度 | 依据 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...(highPriorityRows.length > 0 ? highPriorityRows.map(toIssueLine) : ['| - | - | - | - | - | - | - | - | - |']),
    '',
    '## 原始 category 疑似错误',
    '',
    '| 来源 | 地点 | 用户 | 当前 category | 问题 | 建议 category | 建议 place_type_ids | 置信度 | 依据 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...(categoryErrorRows.length > 0 ? categoryErrorRows.map(toIssueLine) : ['| - | - | - | - | - | - | - | - | - |']),
    '',
    '## 用户录入需人工复核',
    '',
    ...(
      manualRows.length > 0
        ? manualRows.map((row) => `- ${row.placeName} | ${row.userName ?? '-'} | category=${row.category} | ${row.reason || '-'}`)
        : ['- 无']
    ),
  ].join('\n');
};

const main = async () => {
  const [taxonomySource, correctionsSource, recommendations] = await Promise.all([
    readFile(TAXONOMY_PATH, 'utf8'),
    readFile(CORRECTIONS_PATH, 'utf8'),
    fetchRecommendations(),
  ]);

  const validPlaceTypeIds = parsePlaceTypeIds(taxonomySource);
  const validDetailTagIds = parseDetailTagIds(taxonomySource);
  const correctionCategories = parseCorrectionCategories(correctionsSource);
  const audited = recommendations.map((row) =>
    auditRow(row, correctionCategories, validPlaceTypeIds, validDetailTagIds),
  );
  const rowsWithIssues = issueRows(audited);
  const updates = audited
    .map((row) => ({ row, update: buildUpdateForRow(row) }))
    .filter((item) => Boolean(item.update));

  const appliedUpdates = [];

  if (SHOULD_APPLY && updates.length > 0) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getServiceRoleFromCli();
    if (!serviceRoleKey) throw new Error('未拿到 service_role，无法应用分类修正。');

    const supabase = createClient(SUPABASE_URL, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const backupDir = join(ROOT, 'backups', `recommendation-classification-fix-${OUTPUT_STAMP}`);
    await mkdir(backupDir, { recursive: true });
    await writeFile(
      join(backupDir, 'recommendations-before.json'),
      `${JSON.stringify(updates.map(({ row }) => row), null, 2)}\n`,
      'utf8',
    );
    await writeFile(
      join(backupDir, 'planned-updates.json'),
      `${JSON.stringify(updates.map(({ row, update }) => ({ id: row.id, placeName: row.placeName, update })), null, 2)}\n`,
      'utf8',
    );

    for (const { row, update } of updates) {
      const { data, error } = await supabase
        .from('recommendations')
        .update(update)
        .eq('id', row.id)
        .select('id, place_name, category, input_category_id, primary_intent_id, place_type_ids, detail_tag_ids, classification_status, classification_confidence')
        .maybeSingle();

      if (error) throw error;
      appliedUpdates.push({ id: row.id, placeName: row.placeName, update, updatedRow: data });
    }
  }

  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      taxonomyPath: TAXONOMY_PATH.replace(`${ROOT}/`, ''),
      correctionsPath: CORRECTIONS_PATH.replace(`${ROOT}/`, ''),
      dataSource: 'remote_supabase',
      writeApplied: SHOULD_APPLY,
    },
    summary: {
      totalCount: recommendations.length,
      userUploadedCount: recommendations.filter((row) => getOwnerType(row) === 'user').length,
      communityCuratedCount: recommendations.filter((row) => getOwnerType(row) === 'community').length,
      rowsWithIssuesCount: rowsWithIssues.length,
      highPriorityIssueCount: audited.filter(hasHighPriorityIssue).length,
      userHighPriorityIssueCount: audited.filter((row) => row.ownerType === 'user' && hasHighPriorityIssue(row)).length,
      sourceCategoryErrorCount: audited.filter((row) => row.issues.some((issue) => issue.type === 'source_category_error')).length,
      missingPlaceTypeCount: audited.filter((row) => row.issues.some((issue) => issue.type === 'missing_place_type')).length,
      placeTypeMismatchCount: audited.filter((row) => row.issues.some((issue) => issue.type === 'place_type_mismatch')).length,
      manualReviewUserCount: audited.filter((row) => row.needsManualReview).length,
      plannedUpdateCount: updates.length,
      appliedUpdateCount: appliedUpdates.length,
      byCategory: groupCounts(recommendations, (row) => row.category),
      byOwnerType: groupCounts(recommendations, getOwnerType),
    },
    audited,
    appliedUpdates,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(join(OUTPUT_DIR, `${OUTPUT_BASENAME}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
    writeFile(join(OUTPUT_DIR, `${OUTPUT_BASENAME}.md`), `${toMarkdown(report)}\n`, 'utf8'),
  ]);

  console.log(JSON.stringify(report.summary, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
