import type { Recommendation } from '@/types/types';

export interface RecommendationLinkedEventMetadata {
  id: string;
  title?: string | null;
}

const EVENT_META_PATTERN = /\[\[cmi:event=([^;\]\n]+)(?:;title=([^\]\n]*))?\]\]\s*/i;

const encodeMetaValue = (value: string) => encodeURIComponent(value);

const decodeMetaValue = (value: string | undefined) => {
  if (!value) return '';

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const stripRecommendationEventMetadata = (reason?: string | null): string => (
  (reason ?? '').replace(EVENT_META_PATTERN, '').trim()
);

export const encodeRecommendationEventMetadata = (
  reason: string,
  event: RecommendationLinkedEventMetadata
): string => {
  const cleanReason = stripRecommendationEventMetadata(reason);
  const titleMeta = event.title ? `;title=${encodeMetaValue(event.title)}` : '';

  return `[[cmi:event=${encodeMetaValue(event.id)}${titleMeta}]]\n${cleanReason}`;
};

export const extractRecommendationEventMetadata = (
  reason?: string | null
): RecommendationLinkedEventMetadata | null => {
  const match = reason?.match(EVENT_META_PATTERN);
  const id = decodeMetaValue(match?.[1]).trim();

  if (!id) return null;

  const title = decodeMetaValue(match?.[2]).trim();
  return {
    id,
    title: title || null,
  };
};

export const getRecommendationLinkedEvent = (
  recommendation: Pick<Recommendation, 'reason' | 'linked_event_id' | 'linked_event_title'>
): RecommendationLinkedEventMetadata | null => {
  const linkedEventId = recommendation.linked_event_id?.trim();

  if (linkedEventId) {
    return {
      id: linkedEventId,
      title: recommendation.linked_event_title?.trim() || null,
    };
  }

  return extractRecommendationEventMetadata(recommendation.reason);
};
