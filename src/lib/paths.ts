import type { CmiScene } from '@/data/cmi-scenes';

export const getPlacePath = (placeName: string) =>
  `/place/${encodeURIComponent(placeName)}`;

export const getPersonMapPath = (userName: string) =>
  `/people/${encodeURIComponent(userName)}`;

export const getSceneListPath = (sceneId: string) =>
  `/list?scene=${encodeURIComponent(sceneId)}`;

export const getSceneMapPath = (sceneId: string) =>
  `/map?scene=${encodeURIComponent(sceneId)}`;

export const getSceneEntryPath = (scene: CmiScene) =>
  scene.defaultView === 'map' ? getSceneMapPath(scene.id) : getSceneListPath(scene.id);
