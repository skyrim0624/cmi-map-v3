import type { CmiSceneId } from '@/data/cmi-scenes';
import { getPlaceGuide, isCommunityCuratedRecommendation } from '@/data/place-guides';
import { type Category, getCategoryIconUrl, normalizeCategory, type Recommendation } from '@/types/types';

export type CmiPrimaryIntentId =
  | 'eat'
  | 'work'
  | 'study'
  | 'shopping'
  | 'play'
  | 'relax'
  | 'sport'
  | 'errands';

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
  categoryFallback?: Category;
  keywords: string[];
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
  sceneId: CmiSceneId;
  kind: 'primary-intent' | 'place-type';
  placeTypeId?: string;
}

export interface CmiDirectIntentQueryMatch {
  sceneId: CmiSceneId;
  label: string;
  placeTypeId?: string;
}

const normalize = (value: string) => value.trim().toLocaleLowerCase();

const containsAny = (text: string, keywords: string[]) =>
  keywords.some(keyword => text.includes(normalize(keyword)));

const CMI_FLAT_ICON_BASE = '/map-icons/cmi-flat-v2';
const cmiFlatIcon = (name: string) => `${CMI_FLAT_ICON_BASE}/${name}.png`;

const getRecommendationText = (recommendation: Recommendation) => {
  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  return normalize(
    [
      recommendation.place_name,
      recommendation.category,
      recommendation.reason,
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
    fields.push(recommendation.reason);
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
    recommendation.reason,
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
    id: 'study',
    label: '学习',
    description: '图书馆、书店、课程空间和适合读书的地方。',
    sceneId: 'study',
    inputCategory: '生存指南',
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
    id: 'uncertain',
    label: '其他 / 不确定',
    description: '选不准也可以先留下，后面再整理。',
    storedCategory: '彩蛋',
  },
];

export const CMI_PLACE_TYPE_TAGS: CmiPlaceTypeTag[] = [
  { id: 'restaurant', label: '餐厅', primaryIntentIds: ['eat'], categoryFallback: '吃饭', keywords: ['餐厅', '饭店', 'restaurant', 'kitchen', '泰餐', '中餐', '日料', '韩餐', '素食'] },
  { id: 'cafe', label: '咖啡馆', primaryIntentIds: ['work', 'study', 'play'], categoryFallback: '咖啡', keywords: ['咖啡', 'cafe', 'coffee', 'roastery', '手冲', '烘焙'] },
  { id: 'snack', label: '小吃', primaryIntentIds: ['eat'], keywords: ['小吃', '早餐', '夜宵', '甜品', '船面', '牛肉粉', '芒果糯米饭', '豆浆', '油条'] },
  { id: 'coworking', label: 'Coworking', primaryIntentIds: ['work'], keywords: ['coworking', 'co-working', '办公空间', '共享办公', 'digital nomad'] },
  { id: 'massage', label: '按摩店', primaryIntentIds: ['relax'], categoryFallback: '马杀鸡', keywords: ['按摩', '马杀鸡', 'massage', 'spa', '身体调理'] },
  { id: 'market', label: '市集', primaryIntentIds: ['shopping', 'play'], categoryFallback: '市集', keywords: ['市集', 'market', 'walking street', 'bazaar', '跳蚤市场'] },
  { id: 'mall', label: '商场', primaryIntentIds: ['shopping', 'play'], keywords: ['商场', 'mall', 'central', 'maya', 'one nimman', '避暑'] },
  { id: 'night-market', label: '夜市', primaryIntentIds: ['shopping', 'play'], keywords: ['夜市', 'night market', 'night bazaar', '晚上逛'] },
  { id: 'fresh-market', label: '菜市场', primaryIntentIds: ['shopping'], keywords: ['菜市场', '生鲜', '水果', '本地市场', '采购'] },
  { id: 'pharmacy', label: '药店', primaryIntentIds: ['errands'], keywords: ['药店', 'pharmacy', '买药', '药'] },
  { id: 'landmark', label: '景点 / 地标', primaryIntentIds: ['play'], categoryFallback: '景点', keywords: ['景点', '地标', '观景点', '观景台', '城门', '古城', '寺庙', 'temple', 'wat', 'landmark', 'viewpoint', 'monument'] },
  { id: 'nature', label: '自然短途', primaryIntentIds: ['play'], categoryFallback: '户外', keywords: ['瀑布', 'waterfall', '温泉', 'hot spring', '上山', '短途', '湖边', '山村', '自然'] },
  { id: 'park', label: '公园', primaryIntentIds: ['play', 'sport'], keywords: ['公园', 'park', '跑步', '散步', '慢跑'] },
  { id: 'bookstore', label: '书店', primaryIntentIds: ['study', 'shopping'], keywords: ['书店', 'bookstore', '文具', '学习用品'] },
  { id: 'library', label: '图书馆', primaryIntentIds: ['study', 'work'], keywords: ['图书馆', 'library', '自习', '读书', '安静学习'] },
  { id: 'gallery', label: '展览 / 艺术', primaryIntentIds: ['play', 'study'], keywords: ['展览', 'exhibition', 'gallery', '艺术', '设计', '手作', '工作坊'] },
  { id: 'temple', label: '寺庙', primaryIntentIds: ['play'], keywords: ['寺庙', 'temple', 'wat', '素贴山', 'doi suthep'] },
  { id: 'hot-spring', label: '温泉', primaryIntentIds: ['relax', 'play'], keywords: ['温泉', 'hot spring', '泡汤'] },
  { id: 'gym', label: '健身房', primaryIntentIds: ['sport'], categoryFallback: '运动', keywords: ['健身', 'gym', '健身房', '训练'] },
  { id: 'yoga', label: '瑜伽', primaryIntentIds: ['sport', 'relax'], categoryFallback: '身心', keywords: ['瑜伽', 'yoga', '冥想', '身心'] },
  { id: 'court', label: '球场', primaryIntentIds: ['sport'], keywords: ['球场', '网球', 'tennis', 'stadium', '运动场'] },
  { id: 'clinic', label: '诊所 / 医院', primaryIntentIds: ['errands'], keywords: ['医院', '诊所', 'clinic', 'hospital', '看病'] },
  { id: 'exchange', label: '换汇点', primaryIntentIds: ['errands'], keywords: ['换汇', 'money exchange', 'exchange', '取现'] },
  { id: 'print', label: '打印店', primaryIntentIds: ['errands'], keywords: ['打印', 'print', '复印', '文件'] },
  { id: 'rental', label: '租车行', primaryIntentIds: ['errands'], keywords: ['租车', '租摩托', 'motorbike', 'car rental', '摩托'] },
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
  study: cmiFlatIcon('direct-study'),
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
  library: cmiFlatIcon('place-library'),
  bookstore: cmiFlatIcon('place-bookstore'),
  mall: cmiFlatIcon('place-mall'),
  market: cmiFlatIcon('place-market'),
  'fresh-market': cmiFlatIcon('place-fresh-market'),
  'night-market': cmiFlatIcon('place-night-market'),
  temple: cmiFlatIcon('place-temple'),
  park: cmiFlatIcon('place-park'),
  nature: cmiFlatIcon('place-nature'),
  gallery: cmiFlatIcon('place-gallery'),
  landmark: cmiFlatIcon('place-landmark'),
  massage: cmiFlatIcon('place-massage'),
  'hot-spring': cmiFlatIcon('place-hot-spring'),
  gym: cmiFlatIcon('place-gym'),
  yoga: cmiFlatIcon('place-yoga'),
  court: cmiFlatIcon('place-court'),
  pharmacy: cmiFlatIcon('place-pharmacy'),
  clinic: cmiFlatIcon('place-clinic'),
  exchange: cmiFlatIcon('place-exchange'),
  print: cmiFlatIcon('place-print'),
  rental: cmiFlatIcon('place-rental'),
};

const PRIMARY_INTENT_QUERY_KEYWORDS: Record<CmiPrimaryIntentId, string[]> = {
  eat: ['饿', '吃', '吃饭', '吃什么', '早饭', '午饭', '晚饭', '夜宵', '美食'],
  work: ['办公', '工作', '电脑', '插座', '远程', '坐下来干活', '处理事情'],
  study: ['学习', '读书', '自习', '课程', '上课', '看书', '工作坊'],
  shopping: ['购物', '买东西', '采购', '补货', '日用品', '逛街'],
  play: ['游玩', '去哪玩', '逛逛', '景点', '地标', '第一次来', '拍照', '短途'],
  relax: ['放松', '休息', '按摩', '马杀鸡', 'spa', '身体累', '泡汤'],
  sport: ['运动', '健身', '跑步', '瑜伽', '打球', '训练'],
  errands: ['办事', '救急', '买药', '看病', '换汇', '打印', '租车', '电话卡'],
};

const FEATURED_PLACE_TYPE_IDS = [
  'restaurant',
  'snack',
  'cafe',
  'coworking',
  'library',
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
    iconUrl: PLACE_TYPE_ICON_URLS[tag.id] ?? getCategoryIconUrl(tag.categoryFallback ?? primaryIntent.inputCategory),
    sceneId: primaryIntent.sceneId,
    kind: 'place-type',
    placeTypeId: tag.id,
  };
};

export const getCmiPrimaryIntentSceneIds = () =>
  CMI_PRIMARY_INTENTS.map(intent => intent.sceneId);

export const getCmiInputCategoryOptions = () => CMI_INPUT_CATEGORY_OPTIONS;

export const getCmiPlaceTypeTag = (tagId: string | null | undefined) =>
  tagId ? CMI_PLACE_TYPE_TAGS.find(tag => tag.id === tagId) ?? null : null;

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

export const resolveCmiDirectIntentQuery = (query: string): CmiDirectIntentQueryMatch | null => {
  const text = normalize(query);
  if (!text) return null;

  const primaryMatch = CMI_PRIMARY_INTENTS.find(intent =>
    containsAny(text, [
      intent.label,
      intent.description,
      ...PRIMARY_INTENT_QUERY_KEYWORDS[intent.id],
    ])
  );
  const placeTypeMatch = CMI_PLACE_TYPE_TAGS.find(tag =>
    containsAny(text, [tag.label, ...tag.keywords])
  );

  if (placeTypeMatch) {
    const fallbackPrimaryIntent = CMI_PRIMARY_INTENTS.find(
      intent => intent.id === placeTypeMatch.primaryIntentIds[0]
    ) ?? CMI_PRIMARY_INTENTS[0];
    const primaryIntent = primaryMatch && placeTypeMatch.primaryIntentIds.includes(primaryMatch.id)
      ? primaryMatch
      : fallbackPrimaryIntent;

    return {
      sceneId: primaryIntent.sceneId,
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
    tag.categoryFallback === category || containsAny(text, tag.keywords)
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

  return tag.categoryFallback === category || containsAny(text, tag.keywords);
};

export const getCmiDetailTagsForRecommendation = (recommendation: Recommendation) => {
  const text = getRecommendationDetailTagText(recommendation);
  const tags = CMI_DETAIL_TAGS.filter(tag => containsAny(text, tag.keywords));

  if (isCommunityCuratedRecommendation(recommendation)) {
    return [{ id: 'cmi-curated', label: 'CMI 推荐', keywords: [] }, ...tags];
  }

  return tags;
};
