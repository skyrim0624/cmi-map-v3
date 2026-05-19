import type { CmiHomeSection } from './types';

export const inspirationIntentSection: CmiHomeSection = {
  id: 'inspiration-intent',
  title: '不知道去哪？',
  description: '',
  sceneIds: ['nearby-wander', 'pick-for-me', 'weekend', 'tomorrow-events'],
  showRotatingIdeas: false,
  rotatingIdeas: [
    {
      title: '想拍点好看的',
      description: '不固定占首屏，先作为灵感位出现。',
      sceneId: 'photo',
    },
    {
      title: '想找点不游客的',
      description: '更像 CMI 的清迈生活线索。',
      sceneId: 'wander',
    },
    {
      title: '第一次来清迈先去哪',
      description: '低风险入门路线，后续可单独拆。',
      sceneId: 'pick-for-me',
    },
  ],
};
