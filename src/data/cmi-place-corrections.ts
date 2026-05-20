import type { Category, Recommendation } from '@/types/types';
import { normalizeCategory } from '@/types/types';

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
        category: '生存指南',
      },
    ],
    [
      'Win Cosmetics',
      {
        category: '生存指南',
      },
    ],
    [
      'Win Cosmetics Warorot Market',
      {
        category: '生存指南',
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
    category: correction.category ?? recommendation.category,
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
