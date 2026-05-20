import type { CmiSceneId } from '@/data/cmi-scenes';
import { getPlaceGuide, isCommunityCuratedRecommendation } from '@/data/place-guides';
import { getRecommendationReasonText } from '@/lib/easter-icons';
import { type Category, getCategoryIconUrl, normalizeCategory, type Recommendation } from '@/types/types';

export type CmiPrimaryIntentId =
  | 'eat'
  | 'work'
  | 'shopping'
  | 'play'
  | 'relax'
  | 'sport'
  | 'errands';

export type CmiMapFilterGroupId =
  | 'eat'
  | 'work'
  | 'market'
  | 'shopping'
  | 'play'
  | 'relax'
  | 'sport'
  | 'nightlife'
  | 'service';

export interface CmiPrimaryIntent {
  id: CmiPrimaryIntentId;
  label: string;
  description: string;
  sceneId: CmiSceneId;
  inputCategory: Category;
}

export interface CmiInputCategoryOption {
  id: string;
  label: string;
  description: string;
  storedCategory: Category;
  primaryIntentId?: CmiPrimaryIntentId;
}

export interface CmiPlaceTypeTag {
  id: string;
  label: string;
  primaryIntentIds: CmiPrimaryIntentId[];
  sceneId?: CmiSceneId;
  categoryFallback?: Category;
  keywords: string[];
  recommendationKeywords?: string[];
  iconUrl?: string;
  needsIcon?: boolean;
}

export interface CmiDetailTag {
  id: string;
  label: string;
  keywords: string[];
}

export interface CmiDirectIntentTag {
  id: string;
  label: string;
  description: string;
  iconUrl: string;
  needsIcon?: boolean;
  sceneId: CmiSceneId;
  kind: 'primary-intent' | 'place-type';
  placeTypeId?: string;
}

export interface CmiDirectIntentQueryMatch {
  sceneId: CmiSceneId;
  label: string;
  placeTypeId?: string;
}

export interface CmiMapFilterQueryMatch {
  groupId: CmiMapFilterGroupId;
  label: string;
  placeTypeId?: string;
}

export interface CmiMapFilterGroup {
  id: CmiMapFilterGroupId;
  label: string;
  iconUrl: string;
  needsIcon?: boolean;
  placeTypeIds: string[];
  categoryFallbacks?: Category[];
  keywords: string[];
}

const normalize = (value: string) => value.trim().toLocaleLowerCase();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsLatinToken = (text: string, keyword: string) => {
  const escapedKeyword = escapeRegExp(keyword).replace(/\s+/g, '\\s+');
  const tokenPattern = new RegExp(`(^|[^a-z0-9])${escapedKeyword}([^a-z0-9]|$)`, 'i');
  return tokenPattern.test(text);
};

const matchesKeyword = (text: string, keyword: string) => {
  const normalizedKeyword = normalize(keyword);
  if (!normalizedKeyword) return false;

  // NOTE: 英文短词不能用 substring 匹配，否则 brunch 会误中 run、barber 会误中 bar。
  if (/[a-z0-9]/i.test(normalizedKeyword)) {
    return containsLatinToken(text, normalizedKeyword);
  }

  return text.includes(normalizedKeyword);
};

const containsAny = (text: string, keywords: string[]) =>
  keywords.some(keyword => matchesKeyword(text, keyword));

const getPlaceTypeRecommendationKeywords = (tag: CmiPlaceTypeTag) =>
  tag.recommendationKeywords ?? tag.keywords;

const getQueryMatchScore = (text: string, label: string, keywords: string[]) => {
  const normalizedLabel = normalize(label);
  if (text === normalizedLabel) return 100;
  if (matchesKeyword(text, normalizedLabel)) return 90;
  if (keywords.some(keyword => text === normalize(keyword))) return 80;
  if (containsAny(text, keywords)) return 60;
  return 0;
};

const findBestQueryMatch = <T>(
  text: string,
  items: T[],
  getLabel: (item: T) => string,
  getKeywords: (item: T) => string[]
) => {
  let bestMatch: T | null = null;
  let bestScore = 0;

  for (const item of items) {
    const score = getQueryMatchScore(text, getLabel(item), getKeywords(item));
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
};

const CMI_FLAT_ICON_BASE = '/map-icons/cmi-flat-v2';
const cmiFlatIcon = (name: string) => `${CMI_FLAT_ICON_BASE}/${name}.png`;
export const CMI_BLANK_FILTER_ICON_URL =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3C/svg%3E';

const getRecommendationText = (recommendation: Recommendation) => {
  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  return normalize(
    [
      recommendation.place_name,
      recommendation.category,
      getRecommendationReasonText(recommendation),
      guide.title,
      guide.kind,
      guide.summary,
      guide.tip ?? '',
      ...guide.tags,
    ].join(' ')
  );
};

const getRecommendationStructuredTagText = (recommendation: Recommendation) => {
  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  const fields = [
    recommendation.place_name,
    recommendation.category,
    guide.title,
    guide.kind,
    ...guide.tags,
  ];

  if (!isCommunityCuratedRecommendation(recommendation)) {
    fields.push(getRecommendationReasonText(recommendation));
  }

  return normalize(fields.join(' '));
};

const getRecommendationDetailTagText = (recommendation: Recommendation) => {
  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);

  if (isCommunityCuratedRecommendation(recommendation)) {
    return normalize([
      recommendation.category,
      guide.title,
      guide.kind,
      ...guide.tags,
    ].join(' '));
  }

  return normalize([
    recommendation.category,
    getRecommendationReasonText(recommendation),
  ].join(' '));
};

export const CMI_PRIMARY_INTENTS: CmiPrimaryIntent[] = [
  {
    id: 'eat',
    label: '吃饭',
    description: '找一顿今天真的能吃的饭。',
    sceneId: 'eat',
    inputCategory: '吃饭',
  },
  {
    id: 'work',
    label: '办公',
    description: '咖啡馆、Coworking，或能坐下来处理事情的地方。',
    sceneId: 'coffee-work',
    inputCategory: '咖啡',
  },
  {
    id: 'shopping',
    label: '购物',
    description: '商场、市集、菜市场、超市和日用品补给。',
    sceneId: 'shopping',
    inputCategory: '市集',
  },
  {
    id: 'play',
    label: '游玩',
    description: '寺庙、公园、展览、短途和第一次来清迈会想去的地方。',
    sceneId: 'play',
    inputCategory: '户外',
  },
  {
    id: 'relax',
    label: '放松',
    description: '马杀鸡、SPA、温泉和身体调理。',
    sceneId: 'massage-relax',
    inputCategory: '马杀鸡',
  },
  {
    id: 'sport',
    label: '运动',
    description: '健身、瑜伽、球场、公园跑步和长期生活运动点。',
    sceneId: 'sport',
    inputCategory: '运动',
  },
  {
    id: 'errands',
    label: '办事',
    description: '换汇、打印、药店、诊所、租车这些实际问题。',
    sceneId: 'life-rescue',
    inputCategory: '生存指南',
  },
];

export const CMI_INPUT_CATEGORY_OPTIONS: CmiInputCategoryOption[] = [
  ...CMI_PRIMARY_INTENTS.map(intent => ({
    id: intent.id,
    label: intent.id === 'work' ? '咖啡 / 办公' : intent.label,
    description: intent.description,
    storedCategory: intent.inputCategory,
    primaryIntentId: intent.id,
  })),
  {
    id: 'landmark',
    label: '景点 / 地标',
    description: '城门、寺庙、观景点，或第一次来清迈会明确去看的地方。',
    storedCategory: '景点',
    primaryIntentId: 'play',
  },
  {
    id: 'easter',
    label: '彩蛋',
    description: '小猫、涂鸦、树、路灯、某个说不清但值得记住的城市小发现。',
    storedCategory: '彩蛋',
  },
];

export const CMI_PLACE_TYPE_TAGS: CmiPlaceTypeTag[] = [
  { id: 'restaurant', label: '餐厅', primaryIntentIds: ['eat'], categoryFallback: '吃饭', keywords: ['餐厅', '饭店', 'restaurant', 'kitchen', '泰餐', '中餐', '日料', '韩餐', '素食'], iconUrl: cmiFlatIcon('place-restaurant') },
  { id: 'snack', label: '小吃', primaryIntentIds: ['eat'], keywords: ['小吃', '船面', '牛肉粉', '芒果糯米饭', '豆浆', '油条', '路边摊', 'street food'], iconUrl: cmiFlatIcon('place-snack') },
  { id: 'breakfast', label: '早餐', primaryIntentIds: ['eat'], keywords: ['早餐', '早饭', 'brunch', '豆浆', '油条', '粥'], iconUrl: cmiFlatIcon('place-breakfast') },
  { id: 'dessert', label: '甜品', primaryIntentIds: ['eat'], keywords: ['甜品', '甜点', 'dessert', '蛋糕', '冰淇淋', '芒果糯米饭'], iconUrl: cmiFlatIcon('place-dessert') },

  { id: 'cafe', label: '咖啡馆', primaryIntentIds: ['work', 'play'], categoryFallback: '咖啡', keywords: ['咖啡', 'cafe', 'coffee', 'roastery', '手冲', '烘焙'], iconUrl: cmiFlatIcon('place-cafe') },
  { id: 'coworking', label: 'Coworking', primaryIntentIds: ['work'], keywords: ['coworking', 'co-working', '办公空间', '共享办公', 'digital nomad'], iconUrl: cmiFlatIcon('place-coworking') },
  { id: 'reading', label: '看书', primaryIntentIds: ['shopping'], keywords: ['看书', '读书', '图书馆', 'library', '自习', '安静学习', '书店', 'bookstore', '阅读'], iconUrl: cmiFlatIcon('place-book') },

  { id: 'market', label: '市集', primaryIntentIds: ['shopping', 'play'], categoryFallback: '市集', keywords: ['市集', '周末市集', '手作市集', '本地市场', 'market', 'walking street', 'bazaar', '跳蚤市场'], iconUrl: cmiFlatIcon('place-market-handmade') },
  { id: 'night-market', label: '夜市', primaryIntentIds: ['shopping', 'play'], keywords: ['夜市', 'night market', 'night bazaar', '晚上逛'], iconUrl: cmiFlatIcon('place-night-market-v2') },
  { id: 'fresh-market', label: '菜市场', primaryIntentIds: ['shopping'], keywords: ['菜市场', '生鲜', '水果', '本地菜市场'], iconUrl: cmiFlatIcon('place-fresh-market') },

  { id: 'mall', label: '商场', primaryIntentIds: ['shopping', 'play'], keywords: ['商场', 'mall', 'central', 'maya', 'one nimman', '避暑'], iconUrl: cmiFlatIcon('place-mall') },
  { id: 'daily', label: '超市 / 日用品', primaryIntentIds: ['shopping', 'errands'], keywords: ['超市', '便利店', '日用品', '补货', 'supermarket', 'grocery', 'lotus', 'big c', 'makro'], iconUrl: cmiFlatIcon('survival-daily') },
  { id: 'stationery', label: '书店 / 文具', primaryIntentIds: ['shopping'], keywords: ['书店', '文具', '学习用品', 'bookstore', 'stationery', '铅笔'], iconUrl: cmiFlatIcon('place-stationery') },

  { id: 'landmark', label: '地标打卡', primaryIntentIds: ['play'], categoryFallback: '景点', keywords: ['景点', '地标', '打卡', '拍照', '观景点', '观景台', '城门', '古城', 'landmark', 'viewpoint', 'monument'], iconUrl: cmiFlatIcon('place-landmark-camera') },
  { id: 'temple', label: '寺庙', primaryIntentIds: ['play'], keywords: ['寺庙', 'temple', 'wat', '素贴山', 'doi suthep'], iconUrl: cmiFlatIcon('place-temple') },
  { id: 'nature', label: '自然短途', primaryIntentIds: ['play'], categoryFallback: '户外', keywords: ['瀑布', 'waterfall', '上山', '短途', '湖边', '山村', '自然'], iconUrl: cmiFlatIcon('place-nature') },
  { id: 'park', label: '公园', primaryIntentIds: ['play', 'sport'], keywords: ['公园', 'park', '跑步', '散步', '慢跑'], iconUrl: cmiFlatIcon('place-park') },
  { id: 'gallery', label: '展览 / 艺术', primaryIntentIds: ['play'], keywords: ['展览', 'exhibition', 'gallery', '艺术', '设计', '手作', '工作坊'], iconUrl: cmiFlatIcon('place-gallery-palette') },
  { id: 'hot-spring', label: '温泉', primaryIntentIds: ['relax', 'play'], keywords: ['温泉', 'hot spring', '泡汤'], iconUrl: cmiFlatIcon('place-hot-spring') },

  { id: 'gym', label: '健身房', primaryIntentIds: ['sport'], keywords: ['健身', 'gym', '健身房', '训练'], iconUrl: cmiFlatIcon('place-gym') },
  { id: 'running', label: '跑步', primaryIntentIds: ['sport'], keywords: ['跑步', '慢跑', 'running', 'run', 'jogging', '跑步路线'], iconUrl: cmiFlatIcon('direct-sport') },
  { id: 'yoga', label: '瑜伽', primaryIntentIds: ['sport', 'relax'], keywords: ['瑜伽', 'yoga', '冥想'], iconUrl: cmiFlatIcon('place-yoga') },
  { id: 'tennis', label: '网球', primaryIntentIds: ['sport'], keywords: ['网球', 'tennis'], iconUrl: cmiFlatIcon('place-tennis') },
  { id: 'badminton', label: '羽毛球', primaryIntentIds: ['sport'], keywords: ['羽毛球', 'badminton'], iconUrl: cmiFlatIcon('place-badminton') },
  { id: 'basketball', label: '篮球', primaryIntentIds: ['sport'], keywords: ['篮球', 'basketball'], iconUrl: cmiFlatIcon('place-basketball') },
  { id: 'swimming', label: '游泳馆', primaryIntentIds: ['sport'], keywords: ['游泳', '游泳馆', '泳池', 'swimming', 'pool'], iconUrl: cmiFlatIcon('place-swimming') },
  { id: 'stadium', label: '体育场', primaryIntentIds: ['sport'], keywords: ['体育场', '运动场', 'stadium', '球场'], iconUrl: cmiFlatIcon('place-stadium') },
  { id: 'muay-thai', label: '泰拳', primaryIntentIds: ['sport'], keywords: ['泰拳', 'muay thai', 'boxing'], iconUrl: cmiFlatIcon('place-muay-thai') },
  { id: 'crossfit', label: 'CrossFit', primaryIntentIds: ['sport'], keywords: ['crossfit', 'cross fit', '功能训练'], iconUrl: cmiFlatIcon('place-crossfit') },
  { id: 'climbing', label: '攀岩', primaryIntentIds: ['sport'], keywords: ['攀岩', 'climbing', 'bouldering'], iconUrl: cmiFlatIcon('place-climbing-person') },

  { id: 'livehouse', label: 'Livehouse', primaryIntentIds: ['play'], sceneId: 'night', keywords: ['livehouse', 'live music', '现场音乐', '演出', '乐队'], iconUrl: cmiFlatIcon('place-livehouse-music') },
  { id: 'bar', label: '酒吧', primaryIntentIds: ['play'], sceneId: 'night', categoryFallback: '酒吧', keywords: ['酒吧', 'bar', '小酌', '喝酒', 'cocktail'], iconUrl: cmiFlatIcon('place-club') },
  {
    id: 'club',
    label: 'Club / 蹦迪',
    primaryIntentIds: ['play'],
    sceneId: 'night',
    keywords: ['club', 'nightclub', 'night club', '蹦迪', '夜店', '跳舞', 'dj'],
    recommendationKeywords: ['nightclub', 'night club', '蹦迪', '夜店', '跳舞', 'dj'],
    iconUrl: cmiFlatIcon('place-club'),
  },
  { id: 'social-dance', label: '交际舞', primaryIntentIds: ['play'], sceneId: 'night', keywords: ['交际舞', 'swing', 'salsa', '伦巴', 'bachata', '社交舞'], iconUrl: cmiFlatIcon('place-social-dance') },
  { id: 'ktv', label: 'KTV', primaryIntentIds: ['play'], sceneId: 'night', keywords: ['ktv', 'karaoke', '唱歌'], iconUrl: cmiFlatIcon('place-ktv-microphone') },

  { id: 'pharmacy', label: '药店', primaryIntentIds: ['errands'], keywords: ['药店', 'pharmacy', '买药', '药'], iconUrl: cmiFlatIcon('place-pharmacy') },
  { id: 'clinic', label: '诊所 / 医院', primaryIntentIds: ['errands'], keywords: ['医院', '诊所', 'clinic', 'hospital', '看病'], iconUrl: cmiFlatIcon('place-clinic') },
  { id: 'exchange', label: '换汇', primaryIntentIds: ['errands'], keywords: ['换汇', 'money exchange', 'exchange', '取现'], iconUrl: cmiFlatIcon('place-exchange') },
  { id: 'print', label: '打印', primaryIntentIds: ['errands'], keywords: ['打印', 'print', '复印', '文件'], iconUrl: cmiFlatIcon('place-print') },
  { id: 'rental', label: '租车', primaryIntentIds: ['errands'], keywords: ['租车', '租摩托', 'motorbike', 'car rental', '摩托'], iconUrl: cmiFlatIcon('place-rental') },
  { id: 'laundry', label: '洗衣', primaryIntentIds: ['errands'], keywords: ['洗衣', 'laundry', '洗衣店', '烘干'], iconUrl: cmiFlatIcon('survival-laundry') },
  { id: 'haircut', label: '理发', primaryIntentIds: ['errands'], keywords: ['理发', '剪头发', 'barber', 'haircut', 'hair salon'], iconUrl: cmiFlatIcon('survival-hair') },
  { id: 'visa', label: '签证', primaryIntentIds: ['errands'], keywords: ['签证', 'visa', '移民局', '续签', '文件'], iconUrl: cmiFlatIcon('survival-visa') },
  { id: 'sim', label: 'SIM 卡', primaryIntentIds: ['errands'], keywords: ['sim', '电话卡', '手机卡', '流量卡', '上网卡', 'ais', 'true', 'dtac'], iconUrl: cmiFlatIcon('survival-sim') },
  { id: 'massage', label: '按摩店', primaryIntentIds: ['relax'], categoryFallback: '马杀鸡', keywords: ['按摩', '马杀鸡', 'massage', 'spa', '身体调理'], iconUrl: cmiFlatIcon('place-massage') },
];

export const CMI_DETAIL_TAGS: CmiDetailTag[] = [
  { id: 'budget', label: '平价', keywords: ['平价', '便宜', '便宜好吃', '3 泰铢', '实惠', '市场小吃'] },
  { id: 'premium', label: '偏贵', keywords: ['偏贵', '贵一点', '价格高', '正式一点', '认真吃饭'] },
  { id: 'solo', label: '适合一个人', keywords: ['一人食', '一个人', '简单一餐', '日常饭', '热汤'] },
  { id: 'friends', label: '适合带朋友', keywords: ['朋友', '聚餐', '多人', '带朋友', '聊天', '小聚'] },
  { id: 'parents', label: '适合带爸妈', keywords: ['带爸妈', '家人', '家人朋友', '稳定选择', '游客友好'] },
  { id: 'first-time', label: '适合第一次来', keywords: ['第一次', '游客友好', '入门', '必去', '稳定选择'] },
  { id: 'quiet', label: '安静', keywords: ['安静', '读书', '自习', '坐一会', '短坐'] },
  { id: 'work-friendly', label: '可久坐', keywords: ['办公', '电脑', '插座', '久坐', '轻工作', '坐下来'] },
  { id: 'aircon', label: '有空调', keywords: ['空调', '避暑', '商场'] },
  { id: 'photo-friendly', label: '适合拍照', keywords: ['拍照', '好看', '出片', '花园氛围', '景观'] },
  { id: 'rainy-day', label: '适合雨天', keywords: ['雨天', '室内', '商场', '图书馆', '展览'] },
  { id: 'chinese-friendly', label: '中文可沟通', keywords: ['中文', '华人', '云南', '中餐'] },
  { id: 'reservation', label: '最好预约', keywords: ['预约', '提前确认', '订位'] },
  { id: 'parking', label: '停车方便', keywords: ['停车', '停车场'] },
];

const PRIMARY_INTENT_ICON_URLS: Record<CmiPrimaryIntentId, string> = {
  eat: cmiFlatIcon('direct-eat'),
  work: cmiFlatIcon('direct-work'),
  shopping: cmiFlatIcon('direct-shopping'),
  play: cmiFlatIcon('direct-play'),
  relax: cmiFlatIcon('direct-relax'),
  sport: cmiFlatIcon('direct-sport'),
  errands: cmiFlatIcon('direct-errands'),
};

const PLACE_TYPE_ICON_URLS: Partial<Record<string, string>> = {
  restaurant: cmiFlatIcon('place-restaurant'),
  snack: cmiFlatIcon('place-snack'),
  cafe: cmiFlatIcon('place-cafe'),
  coworking: cmiFlatIcon('place-coworking'),
  reading: cmiFlatIcon('place-book'),
  mall: cmiFlatIcon('place-mall'),
  'fresh-market': cmiFlatIcon('place-fresh-market'),
  temple: cmiFlatIcon('place-temple'),
  park: cmiFlatIcon('place-park'),
  nature: cmiFlatIcon('place-nature'),
  massage: cmiFlatIcon('place-massage'),
  'hot-spring': cmiFlatIcon('place-hot-spring'),
  gym: cmiFlatIcon('place-gym'),
  yoga: cmiFlatIcon('place-yoga'),
  running: cmiFlatIcon('direct-sport'),
  daily: cmiFlatIcon('survival-daily'),
  bar: cmiFlatIcon('place-club'),
  pharmacy: cmiFlatIcon('place-pharmacy'),
  clinic: cmiFlatIcon('place-clinic'),
  exchange: cmiFlatIcon('place-exchange'),
  print: cmiFlatIcon('place-print'),
  rental: cmiFlatIcon('place-rental'),
  laundry: cmiFlatIcon('survival-laundry'),
  haircut: cmiFlatIcon('survival-hair'),
  visa: cmiFlatIcon('survival-visa'),
  sim: cmiFlatIcon('survival-sim'),
};

const PRIMARY_INTENT_QUERY_KEYWORDS: Record<CmiPrimaryIntentId, string[]> = {
  eat: ['饿', '吃', '吃饭', '吃什么', '早饭', '午饭', '晚饭', '夜宵', '美食'],
  work: ['办公', '工作', '电脑', '插座', '远程', '坐下来干活', '处理事情'],
  shopping: ['购物', '买东西', '采购', '补货', '日用品', '逛街'],
  play: ['游玩', '去哪玩', '逛逛', '景点', '地标', '第一次来', '拍照', '短途'],
  relax: ['放松', '休息', '按摩', '马杀鸡', 'spa', '身体累', '泡汤'],
  sport: ['运动', '健身', '跑步', '瑜伽', '打球', '训练'],
  errands: ['办事', '救急', '买药', '看病', '换汇', '打印', '租车', '电话卡'],
};

const FEATURED_PLACE_TYPE_IDS = [
  'restaurant',
  'snack',
  'breakfast',
  'cafe',
  'coworking',
  'reading',
  'mall',
  'market',
  'night-market',
  'landmark',
  'massage',
  'gym',
  'pharmacy',
  'clinic',
  'exchange',
  'print',
  'rental',
];

export const CMI_MAP_FILTER_GROUPS: CmiMapFilterGroup[] = [
  {
    id: 'eat',
    label: '用餐',
    iconUrl: cmiFlatIcon('direct-eat'),
    placeTypeIds: ['restaurant', 'snack', 'breakfast', 'dessert'],
    categoryFallbacks: ['吃饭'],
    keywords: ['用餐', '吃饭', '吃', '餐厅', '小吃', '早餐', '甜品', '饿'],
  },
  {
    id: 'work',
    label: '咖啡办公',
    iconUrl: cmiFlatIcon('direct-work'),
    placeTypeIds: ['cafe', 'coworking'],
    categoryFallbacks: ['咖啡'],
    keywords: ['咖啡办公', '咖啡', '办公', 'coworking'],
  },
  {
    id: 'market',
    label: '市集',
    iconUrl: cmiFlatIcon('place-market-handmade'),
    placeTypeIds: ['market', 'night-market', 'fresh-market'],
    categoryFallbacks: ['市集'],
    keywords: ['市集', '夜市', '菜市场', '周末市集', '手作市集', '本地市场'],
  },
  {
    id: 'shopping',
    label: '购物',
    iconUrl: cmiFlatIcon('direct-shopping'),
    placeTypeIds: ['mall', 'daily', 'stationery', 'reading'],
    keywords: ['购物', '商场', '超市', '日用品', '文具', '书店', '买东西'],
  },
  {
    id: 'play',
    label: '游玩',
    iconUrl: cmiFlatIcon('direct-play'),
    placeTypeIds: ['landmark', 'temple', 'nature', 'park', 'gallery', 'hot-spring'],
    categoryFallbacks: ['景点', '户外'],
    keywords: ['游玩', '景点', '地标', '打卡', '寺庙', '自然', '公园', '展览', '艺术', '温泉'],
  },
  {
    id: 'relax',
    label: '放松',
    iconUrl: cmiFlatIcon('direct-relax'),
    placeTypeIds: ['massage', 'hot-spring', 'yoga'],
    categoryFallbacks: ['马杀鸡'],
    keywords: ['放松', '休息', '按摩', '马杀鸡', 'spa', '温泉', '瑜伽'],
  },
  {
    id: 'sport',
    label: '运动',
    iconUrl: cmiFlatIcon('direct-sport'),
    placeTypeIds: [
      'gym',
      'running',
      'yoga',
      'tennis',
      'badminton',
      'basketball',
      'swimming',
      'stadium',
      'muay-thai',
      'crossfit',
      'climbing',
    ],
    categoryFallbacks: ['运动'],
    keywords: ['运动', '健身', '跑步', '瑜伽', '网球', '羽毛球', '篮球', '游泳', '泰拳', 'crossfit', '攀岩'],
  },
  {
    id: 'nightlife',
    label: '夜生活',
    iconUrl: cmiFlatIcon('place-club'),
    placeTypeIds: ['livehouse', 'bar', 'club', 'social-dance', 'ktv'],
    categoryFallbacks: ['酒吧'],
    keywords: ['夜生活', '晚上', '酒吧', 'livehouse', 'club', '蹦迪', '交际舞', 'ktv', '唱歌'],
  },
  {
    id: 'service',
    label: '生活服务',
    iconUrl: cmiFlatIcon('direct-errands'),
    placeTypeIds: ['pharmacy', 'clinic', 'exchange', 'print', 'rental', 'laundry', 'haircut', 'visa', 'sim'],
    categoryFallbacks: ['生存指南'],
    keywords: ['生活服务', '办事', '药店', '诊所', '医院', '换汇', '打印', '租车', '洗衣', '理发', '签证', '电话卡', 'sim'],
  },
];

const PLACE_TYPE_ID_ALIASES: Record<string, string> = {
  bookstore: 'reading',
  library: 'reading',
  court: 'stadium',
  'weekend-market': 'market',
  'local-market': 'market',
  'handmade-market': 'market',
  'fresh-produce': 'fresh-market',
};

const toPrimaryIntentTag = (intent: CmiPrimaryIntent): CmiDirectIntentTag => ({
  id: `intent-${intent.id}`,
  label: intent.label,
  description: intent.description,
  iconUrl: PRIMARY_INTENT_ICON_URLS[intent.id],
  sceneId: intent.sceneId,
  kind: 'primary-intent',
});

const toPlaceTypeIntentTag = (tag: CmiPlaceTypeTag): CmiDirectIntentTag => {
  const primaryIntent = CMI_PRIMARY_INTENTS.find(intent => intent.id === tag.primaryIntentIds[0])
    ?? CMI_PRIMARY_INTENTS[0];

  return {
    id: `type-${tag.id}`,
    label: tag.label,
    description: `${tag.label}相关地点`,
    iconUrl: tag.needsIcon
      ? CMI_BLANK_FILTER_ICON_URL
      : tag.iconUrl ?? PLACE_TYPE_ICON_URLS[tag.id] ?? getCategoryIconUrl(tag.categoryFallback ?? primaryIntent.inputCategory),
    needsIcon: tag.needsIcon,
    sceneId: tag.sceneId ?? primaryIntent.sceneId,
    kind: 'place-type',
    placeTypeId: tag.id,
  };
};

export const getCmiPrimaryIntentSceneIds = () =>
  CMI_PRIMARY_INTENTS.map(intent => intent.sceneId);

export const getCmiInputCategoryOptions = () => CMI_INPUT_CATEGORY_OPTIONS;

export const getCmiPlaceTypeTag = (tagId: string | null | undefined) => {
  if (!tagId) return null;
  const normalizedTagId = PLACE_TYPE_ID_ALIASES[tagId] ?? tagId;
  return CMI_PLACE_TYPE_TAGS.find(tag => tag.id === normalizedTagId) ?? null;
};

export const getCmiPlaceTypeTagsByIds = (tagIds: string[]) =>
  tagIds
    .map(tagId => getCmiPlaceTypeTag(tagId))
    .filter((tag): tag is CmiPlaceTypeTag => Boolean(tag));

export const getCmiMapFilterGroups = () => CMI_MAP_FILTER_GROUPS;

export const getCmiMapFilterGroup = (groupId: CmiMapFilterGroupId | string | null | undefined) =>
  groupId ? CMI_MAP_FILTER_GROUPS.find(group => group.id === groupId) ?? null : null;

export const getCmiMapFilterGroupForPlaceType = (placeTypeId: string | null | undefined) => {
  const tag = getCmiPlaceTypeTag(placeTypeId);
  if (!tag) return null;
  return CMI_MAP_FILTER_GROUPS.find(group => group.placeTypeIds.includes(tag.id)) ?? null;
};

export const getCmiPrimaryIntentTags = (): CmiDirectIntentTag[] =>
  CMI_PRIMARY_INTENTS.map(toPrimaryIntentTag);

export const getCmiFeaturedPlaceTypeTags = (): CmiDirectIntentTag[] =>
  FEATURED_PLACE_TYPE_IDS
    .map(tagId => CMI_PLACE_TYPE_TAGS.find(tag => tag.id === tagId))
    .filter((tag): tag is CmiPlaceTypeTag => Boolean(tag))
    .map(toPlaceTypeIntentTag);

export const getCmiDirectIntentTags = (): CmiDirectIntentTag[] => [
  ...getCmiPrimaryIntentTags(),
  ...CMI_PLACE_TYPE_TAGS.map(toPlaceTypeIntentTag),
];

export const resolveCmiMapFilterQuery = (query: string): CmiMapFilterQueryMatch | null => {
  const text = normalize(query);
  if (!text) return null;

  const placeTypeMatch = findBestQueryMatch(
    text,
    CMI_PLACE_TYPE_TAGS,
    tag => tag.label,
    tag => tag.keywords
  );
  if (placeTypeMatch) {
    const group = getCmiMapFilterGroupForPlaceType(placeTypeMatch.id);
    if (group) {
      return {
        groupId: group.id,
        label: placeTypeMatch.label,
        placeTypeId: placeTypeMatch.id,
      };
    }
  }

  const groupMatch = findBestQueryMatch(
    text,
    CMI_MAP_FILTER_GROUPS,
    group => group.label,
    group => group.keywords
  );
  return groupMatch
    ? {
      groupId: groupMatch.id,
      label: groupMatch.label,
    }
    : null;
};

export const resolveCmiDirectIntentQuery = (query: string): CmiDirectIntentQueryMatch | null => {
  const text = normalize(query);
  if (!text) return null;

  const primaryMatch = findBestQueryMatch(
    text,
    CMI_PRIMARY_INTENTS,
    intent => intent.label,
    intent => [intent.description, ...PRIMARY_INTENT_QUERY_KEYWORDS[intent.id]]
  );
  const placeTypeMatch = findBestQueryMatch(
    text,
    CMI_PLACE_TYPE_TAGS,
    tag => tag.label,
    tag => tag.keywords
  );

  if (placeTypeMatch) {
    const fallbackPrimaryIntent = CMI_PRIMARY_INTENTS.find(
      intent => intent.id === placeTypeMatch.primaryIntentIds[0]
    ) ?? CMI_PRIMARY_INTENTS[0];
    const primaryIntent = primaryMatch && placeTypeMatch.primaryIntentIds.includes(primaryMatch.id)
      ? primaryMatch
      : fallbackPrimaryIntent;

    return {
      sceneId: placeTypeMatch.sceneId ?? primaryIntent.sceneId,
      label: placeTypeMatch.label,
      placeTypeId: placeTypeMatch.id,
    };
  }

  if (primaryMatch) {
    return {
      sceneId: primaryMatch.sceneId,
      label: primaryMatch.label,
    };
  }

  const detailMatch = CMI_DETAIL_TAGS.find(tag =>
    containsAny(text, [tag.label, ...tag.keywords])
  );
  if (detailMatch) {
    return {
      sceneId: 'pick-for-me',
      label: detailMatch.label,
    };
  }

  return null;
};

export const getCmiPlaceTypeTagsForRecommendation = (recommendation: Recommendation) => {
  const text = getRecommendationStructuredTagText(recommendation);
  const category = normalizeCategory(recommendation.category);
  return CMI_PLACE_TYPE_TAGS.filter(tag => (
    tag.categoryFallback === category || containsAny(text, getPlaceTypeRecommendationKeywords(tag))
  ));
};

export const matchesCmiPlaceTypeTag = (
  recommendation: Recommendation,
  placeTypeId: string | null | undefined
) => {
  const tag = getCmiPlaceTypeTag(placeTypeId);
  if (!tag) return true;
  const text = getRecommendationStructuredTagText(recommendation);
  const category = normalizeCategory(recommendation.category);

  return tag.categoryFallback === category || containsAny(text, getPlaceTypeRecommendationKeywords(tag));
};

export const matchesCmiMapFilterGroup = (
  recommendation: Recommendation,
  groupId: CmiMapFilterGroupId | string | null | undefined
) => {
  const group = getCmiMapFilterGroup(groupId);
  if (!group) return true;
  const category = normalizeCategory(recommendation.category);
  if (group.categoryFallbacks?.includes(category)) return true;
  return group.placeTypeIds.some(placeTypeId => matchesCmiPlaceTypeTag(recommendation, placeTypeId));
};

export const matchesCmiRecommendationSearchQuery = (
  recommendation: Recommendation,
  query: string
) => {
  const text = normalize(query);
  if (!text) return true;
  return getRecommendationText(recommendation).includes(text);
};

export const getCmiDetailTagsForRecommendation = (recommendation: Recommendation) => {
  const text = getRecommendationDetailTagText(recommendation);
  const tags = CMI_DETAIL_TAGS.filter(tag => containsAny(text, tag.keywords));

  if (isCommunityCuratedRecommendation(recommendation)) {
    return [{ id: 'cmi-curated', label: 'CMI 推荐', keywords: [] }, ...tags];
  }

  return tags;
};
