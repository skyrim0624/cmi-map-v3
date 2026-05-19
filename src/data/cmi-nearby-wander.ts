import { matchesCmiSurvivalKitRecommendation } from '@/data/cmi-survival-kit';
import {
  getCmiDirectIntentTags,
  getCmiPlaceTypeTag,
  getCmiPlaceTypeTagsForRecommendation,
  type CmiDirectIntentTag,
} from '@/data/cmi-taxonomy';
import type { Recommendation } from '@/types/types';

const NEARBY_WANDER_LIMIT = 36;

export const isCmiNearbyWanderPlaceTypeId = (placeTypeId: string | null | undefined) => {
  const tag = getCmiPlaceTypeTag(placeTypeId);
  return Boolean(tag && !tag.primaryIntentIds.includes('errands'));
};

export const getCmiNearbyWanderPlaceTypeFilters = (): CmiDirectIntentTag[] =>
  getCmiDirectIntentTags().filter(tag =>
    tag.kind === 'place-type' &&
    tag.placeTypeId &&
    isCmiNearbyWanderPlaceTypeId(tag.placeTypeId)
  );

export const isCmiNearbyWanderRecommendation = (recommendation: Recommendation) => {
  if (recommendation.category === '生存指南') return false;
  if (matchesCmiSurvivalKitRecommendation(recommendation)) return false;

  const placeTypeTags = getCmiPlaceTypeTagsForRecommendation(recommendation);
  return !placeTypeTags.some(tag => tag.primaryIntentIds.includes('errands'));
};

export const filterCmiNearbyWanderRecommendations = (
  recommendations: Recommendation[],
  limit: number = NEARBY_WANDER_LIMIT
) => recommendations.filter(isCmiNearbyWanderRecommendation).slice(0, limit);
