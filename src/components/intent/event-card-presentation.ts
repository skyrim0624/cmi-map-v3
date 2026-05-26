import type { CmiEvent } from '../../data/cmi-events.ts';
import {
  getCmiEventCardBackgroundUrl,
  getCmiEventPosterUrl,
} from '../../data/cmi-event-details.ts';

const FALLBACK_EVENT_CARD_IMAGE_URL = '/cmi-home/event-ai-courtyard.png';

export const getCmiEventCardImageUrl = (event: CmiEvent) =>
  event.coverImageUrl?.trim() ||
  getCmiEventPosterUrl(event.id) ||
  getCmiEventCardBackgroundUrl(event.id) ||
  FALLBACK_EVENT_CARD_IMAGE_URL;

export const getCmiEventRegistrationPreviewLabel = (event: CmiEvent) =>
  event.registrationLabel.split(/[；。;]/)[0]?.trim() || event.registrationLabel;

export const getCmiEventVisibleTags = (event: CmiEvent) =>
  Array.from(new Map(event.tags.map(tag => [tag.trim(), tag.trim()])).values())
    .filter(Boolean)
    .slice(0, 4);
