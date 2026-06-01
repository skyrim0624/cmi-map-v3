import type { PlacedSticker, Sticker } from '@/types/types';

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
