import {
  getAvailableStickers,
  getPlacedStickers,
  placeSticker,
  toggleUpvote,
  toggleWishlist,
} from '@/db/api';
import type { PlacedSticker, Recommendation } from '@/types/types';

export type LocalUpvoteState = Record<string, { count: number; isUpvoted: boolean }>;
export type LocalWishlistState = Record<string, boolean>;

export interface RecommendationInteractionState {
  upvotes: LocalUpvoteState;
  wishlists: LocalWishlistState;
}

export function createRecommendationInteractionState(
  recommendations: Recommendation[],
  userId?: string | null
): RecommendationInteractionState {
  const upvotes: LocalUpvoteState = {};
  const wishlists: LocalWishlistState = {};

  recommendations.forEach(recommendation => {
    const recommendationUpvotes = recommendation.upvotes || [];
    upvotes[recommendation.id] = {
      count: recommendationUpvotes.length,
      isUpvoted: userId
        ? recommendationUpvotes.some(upvote => upvote.user_id === userId)
        : false,
    };

    const recommendationWishlists = recommendation.wishlists || [];
    wishlists[recommendation.id] = userId
      ? recommendationWishlists.some(wishlist => wishlist.user_id === userId)
      : false;
  });

  return { upvotes, wishlists };
}

export async function loadRecommendationStickerPlacements(
  recommendations: Recommendation[]
): Promise<Record<string, PlacedSticker[]>> {
  const stickersData: Record<string, PlacedSticker[]> = {};

  await Promise.all(recommendations.map(async recommendation => {
    stickersData[recommendation.id] = await getPlacedStickers(recommendation.id);
  }));

  return stickersData;
}

export const loadAvailableStickers = getAvailableStickers;
export const toggleRecommendationUpvote = toggleUpvote;
export const toggleRecommendationWishlist = toggleWishlist;
export const placeRecommendationSticker = placeSticker;
