import type { CmiScene } from '@/data/cmi-scenes';

export const getPlacePath = (placeName: string) =>
  `/place/${encodeURIComponent(placeName)}`;

export const getAddTracePath = (placeName: string) =>
  `/place/${encodeURIComponent(placeName)}/add-trace`;

export const getPlaceMapPath = (placeName: string) =>
  `/map?place=${encodeURIComponent(placeName)}`;

export const getPersonMapPath = (userName: string) =>
  `/people/${encodeURIComponent(userName)}`;

export const getCmiHomePath = () => '/cmi-home';

export const getCmiEventPath = (eventId: string) =>
  `/events/${encodeURIComponent(eventId)}`;

export const getCmiBlackboardPath = (input?: { compose?: boolean; eventId?: string | null }) => {
  const searchParams = new URLSearchParams();
  if (input?.compose) searchParams.set('compose', '1');
  if (input?.eventId) searchParams.set('event', input.eventId);

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
