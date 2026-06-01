import {
  getRecommendationLinkedEvent,
  stripRecommendationEventMetadata,
} from '../../lib/cmi-recommendation-events.ts';
import type { Recommendation } from '../../types/types.ts';

export type EventRecapRecommendation = Pick<
  Recommendation,
  | 'id'
  | 'place_name'
  | 'user_name'
  | 'reason'
  | 'linked_event_id'
  | 'linked_event_title'
  | 'images'
  | 'created_at'
>;

export interface EventRecapImage {
  id: string;
  recommendationId: string;
  imageUrl: string;
  imageIndex: number;
  placeName: string;
  userName: string;
  reason: string;
  createdAt: string;
}

const getCreatedAtTime = (recommendation: EventRecapRecommendation) => {
  const time = Date.parse(recommendation.created_at);
  return Number.isFinite(time) ? time : 0;
};

const EASTER_ICON_META_PATTERN = /^\[\[cmi:easter-icon=([a-z0-9-]+)\]\]\s*/i;

const stripEasterIconMetadata = (reason?: string | null): string => (
  (reason ?? '').replace(EASTER_ICON_META_PATTERN, '').trim()
);

const getEventRecapReasonText = (reason: string) => {
  let cleanReason = reason;

  for (let index = 0; index < 3; index += 1) {
    const nextCleanReason = stripEasterIconMetadata(stripRecommendationEventMetadata(cleanReason));
    if (nextCleanReason === cleanReason.trim()) return nextCleanReason;
    cleanReason = nextCleanReason;
  }

  return cleanReason.trim();
};

export const getEventRecapRecommendations = <T extends EventRecapRecommendation>(
  eventId: string,
  recommendations: T[]
): T[] => recommendations
  .filter(recommendation => {
    const linkedEvent = getRecommendationLinkedEvent(recommendation);
    return linkedEvent?.id === eventId && recommendation.images.some(Boolean);
  })
  .sort((left, right) => getCreatedAtTime(right) - getCreatedAtTime(left));

export const getEventRecapImages = (
  recommendations: EventRecapRecommendation[]
): EventRecapImage[] => recommendations.flatMap(recommendation =>
  recommendation.images
    .map((imageUrl, imageIndex) => ({ imageUrl, imageIndex }))
    .filter((image): image is { imageUrl: string; imageIndex: number } => Boolean(image.imageUrl))
    .map(({ imageUrl, imageIndex }) => ({
      id: `${recommendation.id}-${imageIndex}`,
      recommendationId: recommendation.id,
      imageUrl,
      imageIndex,
      placeName: recommendation.place_name,
      userName: recommendation.user_name,
      reason: getEventRecapReasonText(recommendation.reason),
      createdAt: recommendation.created_at,
    }))
);
