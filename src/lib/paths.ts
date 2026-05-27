import type { CmiScene } from '@/data/cmi-scenes';

export interface PlacePathOptions {
  sceneId?: string | null;
  filterId?: string | null;
  placeTypeId?: string | null;
}

export const getPlacePath = (placeName: string, input?: PlacePathOptions) => {
  const searchParams = new URLSearchParams();
  if (input?.sceneId) searchParams.set('scene', input.sceneId);
  if (input?.filterId) searchParams.set('filter', input.filterId);
  if (input?.placeTypeId) searchParams.set('placeType', input.placeTypeId);

  const query = searchParams.toString();
  const basePath = `/place/${encodeURIComponent(placeName)}`;
  return query ? `${basePath}?${query}` : basePath;
};

export const getAddTracePath = (placeName: string) =>
  `/place/${encodeURIComponent(placeName)}/add-trace`;

export const getPlaceMapPath = (placeName: string) =>
  `/map?place=${encodeURIComponent(placeName)}`;

export const getProfilePath = () => '/profile';

export const getPersonMapPath = (profileIdentity: string) =>
  `/people/${encodeURIComponent(profileIdentity)}`;

export const getCmiHomePath = () => '/cmi-home';

export const getCmiEventPath = (eventId: string) =>
  `/events/${encodeURIComponent(eventId)}`;

export const getCmiEventCreatePath = (input?: {
  placeName?: string | null;
  area?: string | null;
  category?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) => {
  const searchParams = new URLSearchParams();
  if (input?.placeName) searchParams.set('place', input.placeName);
  if (input?.area) searchParams.set('area', input.area);
  if (input?.category) searchParams.set('category', input.category);
  if (typeof input?.latitude === 'number') searchParams.set('lat', String(input.latitude));
  if (typeof input?.longitude === 'number') searchParams.set('lng', String(input.longitude));

  const query = searchParams.toString();
  return query ? `/events/new?${query}` : '/events/new';
};

export const getCmiEventManagePath = (eventId: string) =>
  `/events/${encodeURIComponent(eventId)}/manage`;

export const getCmiBlackboardPath = (input?: {
  compose?: boolean;
  eventId?: string | null;
  placeName?: string | null;
  locationLabel?: string | null;
}) => {
  const searchParams = new URLSearchParams();
  if (input?.compose) searchParams.set('compose', '1');
  if (input?.eventId) searchParams.set('event', input.eventId);
  if (input?.placeName) searchParams.set('place', input.placeName);
  if (input?.locationLabel) searchParams.set('location', input.locationLabel);

  const query = searchParams.toString();
  return query ? `/blackboard?${query}` : '/blackboard';
};

export const getAiRouteLabPath = () => '/ai-route-lab';

export interface ScenePathOptions {
  filterId?: string | null;
  placeTypeId?: string | null;
  eventId?: string | null;
}

type ScenePathInput = string | ScenePathOptions | null | undefined;

const getScenePathParams = (sceneId: string, input?: ScenePathInput) => {
  const searchParams = new URLSearchParams({ scene: sceneId });

  if (typeof input === 'string') {
    searchParams.set('filter', input);
    return searchParams;
  }

  if (input?.filterId) searchParams.set('filter', input.filterId);
  if (input?.placeTypeId) searchParams.set('placeType', input.placeTypeId);
  if (input?.eventId) searchParams.set('event', input.eventId);

  return searchParams;
};

export const getSceneListPath = (sceneId: string, input?: ScenePathInput) => {
  const searchParams = getScenePathParams(sceneId, input);
  return `/list?${searchParams.toString()}`;
};

export const getSceneMapPath = (sceneId: string, input?: ScenePathInput) => {
  if (sceneId === 'easter') return '/map?easter=1';

  const searchParams = getScenePathParams(sceneId, input);
  return `/map?${searchParams.toString()}`;
};

export const getSceneEntryPath = (scene: CmiScene) =>
  scene.defaultView === 'map' ? getSceneMapPath(scene.id) : getSceneListPath(scene.id);
