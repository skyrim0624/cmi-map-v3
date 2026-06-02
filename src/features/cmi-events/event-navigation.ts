import { CMI_INN_EVENT_LOCATION } from '@/data/cmi-event-details';
import type { CmiEvent } from '@/data/cmi-events';
import { isCmiInnVenue } from './event-management';

export interface CmiEventNavigationTarget {
  name: string;
  clipboardName: string;
  latitude: number;
  longitude: number;
}

export const getCmiEventNavigationTarget = (
  event: CmiEvent | null | undefined
): CmiEventNavigationTarget => {
  if (event && isCmiInnVenue({ venueName: event.venueName, area: event.area })) {
    return CMI_INN_EVENT_LOCATION;
  }

  if (event?.mapLocation) {
    return {
      name: event.venueName,
      clipboardName: event.venueName,
      latitude: event.mapLocation.latitude,
      longitude: event.mapLocation.longitude,
    };
  }

  return CMI_INN_EVENT_LOCATION;
};
