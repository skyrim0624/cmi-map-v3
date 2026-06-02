import { getCmiFeedPath } from '@/lib/paths';
import type { CmiHomeSection } from './types';

export const cmiInnSection: CmiHomeSection = {
  id: 'cmi-inn',
  title: 'CMI / 清迈客栈',
  description: '先让来清迈的人知道这里有一个真实的社区据点。',
  sceneIds: ['community'],
  feature: {
    title: '清迈客栈',
    description: '客栈现场打卡统一回到动态页，地图上也能看到。',
    path: getCmiFeedPath(),
    highlights: ['客栈动态', '地图可见', '活动返图', '社区入口'],
  },
};
