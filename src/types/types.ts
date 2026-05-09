// 分类类型
export type Category = '吃饭' | '咖啡' | '户外' | '拍照' | '市集' | '马杀鸡' | '运动' | '酒吧' | '身心' | '生存指南' | '彩蛋';

// 用户角色类型
export type UserRole = 'user' | 'admin';

// 用户资料类型
export interface Profile {
  id: string;
  email: string | null;
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
  reason: string;
  user_name: string;
  user_id: string | null;
  latitude: number;
  longitude: number;
  images: string[];
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

// 分类配置列表
export const CATEGORIES: CategoryConfig[] = [
  { 
    name: '吃饭', 
    color: 'category-food', 
    icon: '🍜',
    iconUrl: '/categories/1.png'
  },
  { 
    name: '咖啡', 
    color: 'category-coffee', 
    icon: '☕',
    iconUrl: '/categories/2.png'
  },
  { 
    name: '户外', 
    color: 'category-outdoor', 
    icon: '🏔️',
    iconUrl: '/categories/3.png'
  },
  { 
    name: '拍照', 
    color: 'category-photo', 
    icon: '📸',
    iconUrl: '/categories/4.png'
  },
  { 
    name: '市集', 
    color: 'category-market', 
    icon: '🛍️',
    iconUrl: '/categories/5.png'
  },
  { 
    name: '马杀鸡', 
    color: 'category-relax', 
    icon: '💆',
    iconUrl: '/categories/6.png'
  },
  { 
    name: '运动', 
    color: 'category-sport', 
    icon: '🏃',
    iconUrl: '/categories/7.png'
  },
  { 
    name: '酒吧', 
    color: 'category-bar', 
    icon: '🍸',
    iconUrl: '/categories/9.png'
  },
  { 
    name: '身心', 
    color: 'category-wellness', 
    icon: '🧘',
    iconUrl: '/categories/10.png'
  },
  { 
    name: '生存指南', 
    color: 'category-utility', 
    icon: '🔧',
    iconUrl: '/categories/11.png'
  },
  { 
    name: '彩蛋', 
    color: 'category-treasure', 
    icon: '🥚',
    iconUrl: '/categories/8.png'
  }
];

// 获取分类配置
export const getCategoryConfig = (category: Category): CategoryConfig => {
  return CATEGORIES.find(c => c.name === category) || CATEGORIES[0];
};

// 获取分类颜色
export const getCategoryColor = (category: Category): string => {
  return getCategoryConfig(category).color;
};

// 获取分类图标
export const getCategoryIcon = (category: Category): string => {
  return getCategoryConfig(category).icon;
};

// 获取分类图标URL
export const getCategoryIconUrl = (category: Category): string => {
  return getCategoryConfig(category).iconUrl;
};
