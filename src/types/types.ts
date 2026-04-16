// 分类类型
export type Category = '吃饭' | '咖啡' | '户外' | '拍照' | '市集' | '放松' | '运动' | '彩蛋';

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

// 分类配置
export interface CategoryConfig {
  name: Category;
  color: string;
  icon: string;
  iconUrl: string; // 手绘图标URL
}

// 分类配置列表
export const CATEGORIES: CategoryConfig[] = [
  { 
    name: '吃饭', 
    color: 'category-food', 
    icon: '🍜',
    iconUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_72779ef6-da24-48e9-b861-59072ca87ad3.jpg'
  },
  { 
    name: '咖啡', 
    color: 'category-coffee', 
    icon: '☕',
    iconUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_4d8a96e2-6558-4c03-90c1-3ee707258d80.jpg'
  },
  { 
    name: '户外', 
    color: 'category-outdoor', 
    icon: '🏔️',
    iconUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_69065ed5-c7b1-4107-b0ee-35e513fb15cc.jpg'
  },
  { 
    name: '拍照', 
    color: 'category-photo', 
    icon: '📸',
    iconUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_4191c531-49b0-4248-b274-66176698975e.jpg'
  },
  { 
    name: '市集', 
    color: 'category-market', 
    icon: '🛍️',
    iconUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_c77cc748-cbce-47cf-9c76-d09df2320801.jpg'
  },
  { 
    name: '放松', 
    color: 'category-relax', 
    icon: '💆',
    iconUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_d3a24b89-2797-48d8-8c3f-0faf675f7fcb.jpg'
  },
  { 
    name: '运动', 
    color: 'category-sport', 
    icon: '🏃',
    iconUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_998523c8-9c29-4a8c-bcfd-b01491f48123.jpg'
  },
  { 
    name: '彩蛋', 
    color: 'category-treasure', 
    icon: '🥚',
    iconUrl: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_42eafbe0-2007-4572-81f7-52c70425379f.jpg'
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

// 获取分类手绘图标URL
export const getCategoryIconUrl = (category: Category): string => {
  return getCategoryConfig(category).iconUrl;
};
