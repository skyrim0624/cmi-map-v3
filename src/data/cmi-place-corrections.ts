import { CMI_INN_CATEGORY, type Category, type Recommendation, normalizeCategory } from '@/types/types';

type PlaceCorrection = {
  category?: Category;
  latitude?: number;
  longitude?: number;
};

const normalizePlaceCorrectionKey = (value: string) =>
  value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();

const PLACE_CORRECTION_ENTRIES: Array<[string, PlaceCorrection]> = [
    [
      '泰国最高峰',
      {
        category: '户外',
        latitude: 18.5882437146647,
        longitude: 98.486462377389,
      },
    ],
    [
      'Suriwong Book Center',
      {
        category: '购物',
      },
    ],
    [
      '各种外文书',
      {
        category: '购物',
      },
    ],
    [
      'Win Cosmetics',
      {
        category: '购物',
      },
    ],
    [
      'Win Cosmetics Warorot Market',
      {
        category: '购物',
      },
    ],
    [
      'Central Chiangmai',
      {
        category: '购物',
      },
    ],
    [
      '孟买市场',
      {
        category: '市集',
      },
    ],
    [
      'Jarus Print Shop',
      {
        category: '生存指南',
      },
    ],
    [
      'Hair Duu beauty & salon',
      {
        category: '生存指南',
      },
    ],
    [
      'VICTORIA HAIR DESIGN',
      {
        category: '生存指南',
      },
    ],
    [
      'Super Money Exchange',
      {
        category: '生存指南',
      },
    ],
    [
      'สากลการค้า SK Exchange',
      {
        category: '生存指南',
      },
    ],
    [
      'mr.pierre money exchange',
      {
        category: '生存指南',
      },
    ],
    [
      'สนามเทนนิสนวรัฐ',
      {
        category: '运动',
      },
    ],
    [
      'Nawarath Tennis Club',
      {
        category: '运动',
      },
    ],
    [
      'Bar Fine - บ่าฟาย',
      {
        category: '酒吧',
      },
    ],
    [
      '6ixcret show',
      {
        category: '酒吧',
      },
    ],
    [
      'Chiang Mai OriginaLive - The First Indie Livehouse in Chiang Mai',
      {
        category: '酒吧',
      },
    ],
    [
      'Thai Traditional and Complementary Medicine Center',
      {
        category: '马杀鸡',
      },
    ],
    [
      'TCDC',
      {
        category: '景点',
      },
    ],
    [
      'Baan Kang Wat',
      {
        category: '景点',
      },
    ],
    [
      'MARS.cnx',
      {
        category: '咖啡',
      },
    ],
    [
      'เฟบริคช้าง',
      {
        category: '市集',
      },
    ],
    [
      'Mae Kampong Village',
      {
        category: '户外',
      },
    ],
    [
      'Wat Kanthaprueksa (Mae Kampong)',
      {
        category: '景点',
      },
    ],
    [
      'FFparking',
      {
        category: '生存指南',
      },
    ],
    [
      'Sang Ga Dee Space',
      {
        category: '景点',
      },
    ],
    [
      '清迈客栈',
      {
        category: CMI_INN_CATEGORY,
      },
    ],
    [
      'cool小猫路过',
      {
        category: '彩蛋',
      },
    ],
    [
      '一个很棒的房间里面有一个帅哥',
      {
        category: '彩蛋',
      },
    ],
  ];

const PLACE_CORRECTIONS = new Map<string, PlaceCorrection>(
  PLACE_CORRECTION_ENTRIES.map(([placeName, correction]) => [normalizePlaceCorrectionKey(placeName), correction])
);

export const applyRecommendationCorrections = (recommendation: Recommendation): Recommendation => {
  const correction = PLACE_CORRECTIONS.get(normalizePlaceCorrectionKey(recommendation.place_name));
  if (!correction) return recommendation;

  return {
    ...recommendation,
    category: normalizeCategory(recommendation.category) === CMI_INN_CATEGORY
      ? recommendation.category
      : correction.category ?? recommendation.category,
    latitude: correction.latitude ?? recommendation.latitude,
    longitude: correction.longitude ?? recommendation.longitude,
  };
};

export const applyRecommendationsCorrections = (recommendations: Recommendation[]): Recommendation[] =>
  recommendations.map(applyRecommendationCorrections);

export const correctedRecommendationMatchesCategory = (
  recommendation: Recommendation,
  category: Category | string
) => normalizeCategory(applyRecommendationCorrections(recommendation).category) === normalizeCategory(category);
