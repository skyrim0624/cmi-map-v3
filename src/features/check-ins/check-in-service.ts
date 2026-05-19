import { createRecommendation, getRecommendationsByPlace, uploadImages } from '@/db/api';
import type { Recommendation } from '@/types/types';

export type CreatePlaceTraceResult =
  | { status: 'created'; recommendation: Recommendation }
  | { status: 'image-upload-failed' }
  | { status: 'create-failed' };

export interface CreatePlaceTraceInput {
  sourceRecommendation: Recommendation;
  reason: string;
  userId: string;
  userName: string;
  imageFile?: File | null;
}

export const loadCheckInTargetRecommendations = (placeName: string) =>
  getRecommendationsByPlace(placeName);

export async function createPlaceTrace({
  sourceRecommendation,
  reason,
  userId,
  userName,
  imageFile,
}: CreatePlaceTraceInput): Promise<CreatePlaceTraceResult> {
  let imageUrls: string[] = [];

  if (imageFile) {
    imageUrls = await uploadImages([imageFile]);
    if (imageUrls.length === 0) return { status: 'image-upload-failed' };
  }

  const recommendation = await createRecommendation({
    place_name: sourceRecommendation.place_name,
    category: sourceRecommendation.category,
    reason,
    user_name: userName,
    user_id: userId,
    latitude: sourceRecommendation.latitude,
    longitude: sourceRecommendation.longitude,
    images: imageUrls,
  });

  if (!recommendation) return { status: 'create-failed' };

  return { status: 'created', recommendation };
}
