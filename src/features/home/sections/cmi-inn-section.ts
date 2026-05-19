import { getCmiHomePath } from '@/lib/paths';
import type { CmiHomeSection } from './types';

export const cmiInnSection: CmiHomeSection = {
  id: 'cmi-inn',
  title: 'CMI / 清迈客栈',
  description: '先让来清迈的人知道这里有一个真实的社区据点。',
  sceneIds: ['community'],
  feature: {
    title: '清迈客栈',
    description: '活动、打卡墙、社区入口和订房渠道会在这里汇总。',
    path: getCmiHomePath(),
    highlights: ['未来活动', '活动回顾', '打卡墙', '订房入口'],
  },
};
