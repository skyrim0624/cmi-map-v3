import type { PlacedSticker, Recommendation, Sticker } from '@/types/types';

export type PlacedStickerMap = Record<string, PlacedSticker[]>;
export type WishlistStateMap = Record<string, boolean>;

interface OptimisticStickerPlacementInput {
  id: string;
  recommendationId: string;
  userId: string;
  sticker: Sticker;
  xRatio: number;
  yRatio: number;
  rotation: number;
  createdAt: string;
}

export function applyWishlistState(
  currentState: WishlistStateMap,
  recommendationId: string,
  isWishlisted: boolean
): WishlistStateMap {
  return {
    ...currentState,
    [recommendationId]: isWishlisted,
  };
}

export function createOptimisticStickerPlacement({
  id,
  recommendationId,
  userId,
  sticker,
  xRatio,
  yRatio,
  rotation,
  createdAt,
}: OptimisticStickerPlacementInput): PlacedSticker {
  return {
    id,
    recommendation_id: recommendationId,
    user_id: userId,
    sticker_id: sticker.id,
    x_ratio: xRatio,
    y_ratio: yRatio,
    rotation,
    created_at: createdAt,
    sticker,
  };
}

export function appendStickerPlacement(
  currentPlacements: PlacedStickerMap,
  recommendationId: string,
  placement: PlacedSticker
): PlacedStickerMap {
  return {
    ...currentPlacements,
    [recommendationId]: [...(currentPlacements[recommendationId] ?? []), placement],
  };
}

export function getRecommendationStickerPlacements(
  recommendations: Recommendation[]
): PlacedStickerMap {
  return recommendations.reduce<PlacedStickerMap>((placementsByRecommendation, recommendation) => {
    const placements = Array.isArray(recommendation.placed_stickers)
      ? recommendation.placed_stickers
      : [];

    placementsByRecommendation[recommendation.id] = placements;
    return placementsByRecommendation;
  }, {});
}

export function mergeStickerPlacementMaps(
  currentPlacements: PlacedStickerMap,
  nextPlacements: PlacedStickerMap
): PlacedStickerMap {
  const mergedPlacements: PlacedStickerMap = { ...currentPlacements };

  Object.entries(nextPlacements).forEach(([recommendationId, placements]) => {
    const placementsById = new Map(
      (mergedPlacements[recommendationId] ?? []).map(placement => [placement.id, placement])
    );
    placements.forEach(placement => {
      placementsById.set(placement.id, placement);
    });
    mergedPlacements[recommendationId] = Array.from(placementsById.values());
  });

  return mergedPlacements;
}

export function replaceStickerPlacement(
  currentPlacements: PlacedStickerMap,
  recommendationId: string,
  previousPlacementId: string,
  nextPlacement: PlacedSticker
): PlacedStickerMap {
  let didReplace = false;
  const placements = (currentPlacements[recommendationId] ?? []).map(placement => {
    if (placement.id !== previousPlacementId) return placement;
    didReplace = true;
    return nextPlacement;
  });

  return {
    ...currentPlacements,
    [recommendationId]: didReplace ? placements : [...placements, nextPlacement],
  };
}

export function removeStickerPlacement(
  currentPlacements: PlacedStickerMap,
  recommendationId: string,
  placementId: string
): PlacedStickerMap {
  return {
    ...currentPlacements,
    [recommendationId]: (currentPlacements[recommendationId] ?? []).filter(
      placement => placement.id !== placementId
    ),
  };
}
