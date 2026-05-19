import { getCmiScene, type CmiScene } from '@/data/cmi-scenes';
import {
  CMI_HOME_SECTION_DEFINITIONS,
  type CmiHomeFeature,
  type CmiHomeRotatingIdea,
  type CmiHomeSection,
  type CmiHomeSectionId,
  type ResolvedCmiHomeSection,
} from '@/features/home/sections';

export type {
  CmiHomeFeature,
  CmiHomeRotatingIdea,
  CmiHomeSection,
  CmiHomeSectionId,
  ResolvedCmiHomeSection,
};

export const CMI_HOME_SECTIONS: CmiHomeSection[] = CMI_HOME_SECTION_DEFINITIONS;

export const getCmiHomeSections = (): ResolvedCmiHomeSection[] =>
  CMI_HOME_SECTIONS.map(section => ({
    ...section,
    scenes: section.sceneIds
      .map(sceneId => getCmiScene(sceneId))
      .filter((scene): scene is CmiScene => Boolean(scene)),
  }));

export const getCmiHomeQuickScenes = () =>
  getCmiHomeSections().find(section => section.id === 'direct-intent')?.scenes.slice(0, 4) ?? [];
