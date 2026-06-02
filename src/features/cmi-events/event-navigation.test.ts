import assert from 'node:assert/strict';
import test from 'node:test';
import { getCmiEventNavigationTarget } from './event-navigation.ts';
import type { CmiEvent } from '@/data/cmi-events';

const baseEvent = {
  id: 'cmi-five-minute-music-kid-a-2026-06-02',
  title: '“五分钟”音乐会｜一起听 Radiohead 的《Kid A》',
  type: 'music',
  startAt: '2026-06-02T19:00:00+07:00',
  venueName: '清迈客栈',
  area: 'CMI / 清迈客栈',
  priceLabel: '免费参与',
  registrationLabel: 'CMI Map 一键报名',
  sourceType: 'cmi',
  sourceLabel: 'CMI 活动公告',
  hostName: 'CMI 社区',
  language: '中文',
  suitableFor: [],
  isCmiRelated: true,
  isVerified: true,
  verificationStatus: 'verified',
  lastCheckedAt: '2026-06-02T12:00:00+07:00',
  reliabilityNote: '已核实',
  tags: ['CMI', '清迈客栈'],
  summary: '在清迈客栈一起听专辑。',
} satisfies CmiEvent;

test('清迈客栈活动详情导航无视错误 mapLocation，统一指向清迈客栈', () => {
  const target = getCmiEventNavigationTarget({
    ...baseEvent,
    mapLocation: {
      latitude: 18.7919513784612,
      longitude: 98.9946296215124,
      category: '清迈客栈',
    },
  });

  assert.equal(target.name, '清迈客栈');
  assert.equal(target.latitude, 18.7932);
  assert.equal(target.longitude, 98.9874);
});

test('非清迈客栈活动详情导航保留活动自己的地图坐标', () => {
  const target = getCmiEventNavigationTarget({
    ...baseEvent,
    id: 'jing-jai-weekend-market',
    title: 'Jing Jai 周末市集',
    venueName: 'Jing Jai Market',
    area: 'Atsadathon Road',
    isCmiRelated: false,
    sourceType: 'community',
    mapLocation: {
      latitude: 18.8119,
      longitude: 98.9937,
      category: '市集',
    },
  });

  assert.equal(target.name, 'Jing Jai Market');
  assert.equal(target.latitude, 18.8119);
  assert.equal(target.longitude, 98.9937);
});
