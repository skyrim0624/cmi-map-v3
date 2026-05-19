import { getCmiPrimaryIntentSceneIds } from '@/data/cmi-taxonomy';
import type { CmiHomeSection } from './types';

export const directIntentSection: CmiHomeSection = {
  id: 'direct-intent',
  title: '我现在想做什么',
  description: '',
  sceneIds: getCmiPrimaryIntentSceneIds(),
};
