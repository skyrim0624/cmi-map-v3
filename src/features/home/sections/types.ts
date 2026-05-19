import type { CmiScene, CmiSceneId } from '@/data/cmi-scenes';

export type CmiHomeSectionId =
  | 'direct-intent'
  | 'inspiration-intent'
  | 'life-service'
  | 'cmi-inn';

export interface CmiHomeFeature {
  title: string;
  description: string;
  path: string;
  highlights: string[];
}

export interface CmiHomeRotatingIdea {
  title: string;
  description: string;
  sceneId: CmiSceneId;
}

export interface CmiHomeSection {
  id: CmiHomeSectionId;
  title: string;
  description: string;
  sceneIds: CmiSceneId[];
  supportingIntents?: string[];
  rotatingIdeas?: CmiHomeRotatingIdea[];
  showRotatingIdeas?: boolean;
  feature?: CmiHomeFeature;
}

export interface ResolvedCmiHomeSection extends CmiHomeSection {
  scenes: CmiScene[];
}
