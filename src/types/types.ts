export const CMI_INN_PLACE_NAME = '清迈客栈';
export const CMI_INN_CATEGORY = '清迈客栈';
export const CMI_INN_LOGO_ICON_URL = '/brand/cmi-inn-logo-icon.png';
export const CMI_INN_COORDINATES = {
  latitude: 18.7932,
  longitude: 98.9874,
} as const;

// 分类类型
export type Category = '吃饭' | '咖啡' | '户外' | '景点' | '拍照' | '购物' | '市集' | '马杀鸡' | '运动' | '酒吧' | '身心' | '生存指南' | '彩蛋' | typeof CMI_INN_CATEGORY;

// 用户角色类型
export type UserRole = 'user' | 'admin';

// 用户资料类型
export interface Profile {
  id: string;
  email: string | null;
  handle: string | null;
  user_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// 推荐数据类型
export interface Recommendation {
  id: string;
  place_name: string;
  category: Category;
  input_category_id?: string | null;
  primary_intent_id?: string | null;
  place_type_ids?: string[];
  detail_tag_ids?: string[];
  classification_status?: string | null;
  classification_source?: string | null;
  classification_confidence?: number | null;
  classified_at?: string | null;
  reason: string;
  user_name: string;
  user_id: string | null;
  latitude: number;
  longitude: number;
  images: string[];
  easter_icon_id?: string | null;
  linked_event_id?: string | null;
  linked_event_title?: string | null;
  linked_event_capture_number?: number | null;
  animal_sticker_url?: string | null;
  animal_common_name?: string | null;
  animal_scientific_name?: string | null;
  animal_subject_box?: unknown;
  created_at: string;
  upvotes?: { user_id: string }[];
  wishlists?: { user_id: string }[];
  placed_stickers?: PlacedSticker[];
}

// 地图标记点类型
export interface MapMarker {
  id: string;
  place_name: string;
  category: Category;
  latitude: number;
  longitude: number;
  recommendations: Recommendation[];
  visualOverride?: {
    label: string;
    iconUrl: string;
    isAvatar?: boolean;
    isPoster?: boolean;
    isSticker?: boolean;
  };
}

// 贴纸数据类型
export interface Sticker {
  id: string;
  name: string;
  icon_url: string;
  is_native: boolean;
  created_at: string;
}

// 已放置贴纸类型
export interface PlacedSticker {
  id: string;
  recommendation_id: string;
  user_id: string;
  sticker_id: string;
  x_ratio: number;
  y_ratio: number;
  rotation: number;
  created_at: string;
  sticker?: Sticker; // Joined relation from stickers table
}

// 分类配置
export interface CategoryConfig {
  name: Category;
  color: string;
  icon: string;
  iconUrl: string; // 分类图标URL
}

const CMI_FLAT_ICON_BASE = '/map-icons/cmi-flat-v2';
const cmiFlatIcon = (name: string) => `${CMI_FLAT_ICON_BASE}/${name}.png`;

// 分类配置列表
export const CATEGORIES: CategoryConfig[] = [
  { 
    name: '吃饭', 
    color: 'category-food', 
    icon: '🍜',
    iconUrl: cmiFlatIcon('direct-eat')
  },
  { 
    name: '咖啡', 
    color: 'category-coffee',
    icon: '☕',
    iconUrl: cmiFlatIcon('place-cafe')
  },
  {
    name: '户外',
    color: 'category-outdoor',
    icon: '🏔️',
    iconUrl: cmiFlatIcon('direct-play')
  },
  {
    name: '景点',
    color: 'category-landmark',
    icon: '📍',
    iconUrl: cmiFlatIcon('place-landmark')
  },
  {
    name: '购物',
    color: 'category-shopping',
    icon: '🛍️',
    iconUrl: cmiFlatIcon('direct-shopping')
  },
  {
    name: '市集',
    color: 'category-market', 
    icon: '🛍️',
    iconUrl: cmiFlatIcon('place-market')
  },
  { 
    name: '马杀鸡', 
    color: 'category-relax', 
    icon: '💆',
    iconUrl: cmiFlatIcon('place-massage')
  },
  { 
    name: '运动', 
    color: 'category-sport', 
    icon: '🏃',
    iconUrl: cmiFlatIcon('direct-sport')
  },
  { 
    name: '酒吧', 
    color: 'category-bar', 
    icon: '🍸',
    iconUrl: cmiFlatIcon('place-club')
  },
  { 
    name: '身心', 
    color: 'category-wellness', 
    icon: '🧘',
    iconUrl: cmiFlatIcon('place-yoga')
  },
  { 
    name: '生存指南', 
    color: 'category-utility', 
    icon: '🔧',
    iconUrl: cmiFlatIcon('direct-errands')
  },
  { 
    name: '彩蛋', 
    color: 'category-treasure', 
    icon: '🥚',
    iconUrl: '/map-icons/cmi-easter-v2/egg-v2-02-star.png'
  }
];

const SPECIAL_CATEGORIES: CategoryConfig[] = [
  {
    name: CMI_INN_CATEGORY,
    color: 'category-cmi-inn',
    icon: 'CMI',
    iconUrl: CMI_INN_LOGO_ICON_URL,
  },
];

const ALL_CATEGORY_CONFIGS = [...CATEGORIES, ...SPECIAL_CATEGORIES];

// 获取分类配置
export const getCategoryConfig = (category: Category | string): CategoryConfig => {
  const normalizedCategory = normalizeCategory(category);
  return ALL_CATEGORY_CONFIGS.find(c => c.name === normalizedCategory) || CATEGORIES.find(c => c.name === '彩蛋') || CATEGORIES[0];
};

export const normalizeCategory = (category: Category | string): Category => {
  if (category === '拍照') return '景点';
  if (category === '放松') return '马杀鸡';
  if (ALL_CATEGORY_CONFIGS.some(item => item.name === category)) return category as Category;
  return '彩蛋';
};

export const isCmiInnCheckInRecommendation = (
  recommendation: Pick<Recommendation, 'category'>
) => normalizeCategory(recommendation.category) === CMI_INN_CATEGORY;

export const isEasterEggRecommendation = (
  recommendation: Pick<Recommendation, 'category'>
) => normalizeCategory(recommendation.category) === '彩蛋';

export const isPublicMapRecommendation = (
  recommendation: Pick<Recommendation, 'category'>
) => Boolean(normalizeCategory(recommendation.category));

export const categoryMatchesFilter = (category: Category | string, filter: Category | string): boolean => (
  normalizeCategory(category) === normalizeCategory(filter)
);

export const getCategoryFilterValues = (category: Category | string): Category[] => {
  if (category === '景点' || category === '拍照') return ['景点', '拍照'];
  return [normalizeCategory(category)];
};

// 获取分类颜色
export const getCategoryColor = (category: Category | string): string => {
  return getCategoryConfig(category).color;
};

// 获取分类图标
export const getCategoryIcon = (category: Category | string): string => {
  return getCategoryConfig(category).icon;
};

// 获取分类图标URL
export const getCategoryIconUrl = (category: Category | string): string => {
  return getCategoryConfig(category).iconUrl;
};
