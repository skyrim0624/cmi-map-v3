import { cmiInnSection } from './cmi-inn-section';
import { directIntentSection } from './direct-intent-section';
import { inspirationIntentSection } from './inspiration-intent-section';
import { lifeServiceSection } from './life-service-section';
import type { CmiHomeSection } from './types';

export type {
  CmiHomeFeature,
  CmiHomeRotatingIdea,
  CmiHomeSection,
  CmiHomeSectionId,
  ResolvedCmiHomeSection,
} from './types';
export { cmiInnSection } from './cmi-inn-section';
export { directIntentSection } from './direct-intent-section';
export { inspirationIntentSection } from './inspiration-intent-section';
export { lifeServiceSection } from './life-service-section';

export const CMI_HOME_SECTION_DEFINITIONS: CmiHomeSection[] = [
  directIntentSection,
  inspirationIntentSection,
  lifeServiceSection,
  cmiInnSection,
];
