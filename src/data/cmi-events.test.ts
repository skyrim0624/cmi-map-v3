import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCmiEventShareCardTime, type CmiEvent } from './cmi-events.ts';

const baseEvent = {
  id: 'cmi-mindfulness-hour-2026-05-28',
  title: '正念一小时｜一切都是最好的安排',
  type: 'meditation',
  venueName: '清迈客栈',
  area: 'CMI / 清迈客栈',
  priceLabel: '免费参与',
  registrationLabel: 'CMI Map 一键报名',
  sourceType: 'cmi',
  sourceLabel: 'CMI 活动宣传内容文件夹',
  hostName: 'CMI 社区',
  language: '中文',
  suitableFor: [],
  isCmiRelated: true,
  isVerified: true,
  verificationStatus: 'verified',
  lastCheckedAt: '2026-05-26T14:42:45+07:00',
  reliabilityNote: '已核实',
  tags: ['CMI', '正念'],
  summary: '周四晚在清迈客栈的一小时正念活动。',
} satisfies CmiEvent;

test('活动分享卡时间按清迈时区展示 Supabase UTC 时间', () => {
  assert.equal(
    formatCmiEventShareCardTime({
      ...baseEvent,
      startAt: '2026-05-28T12:00:00+00:00',
    }),
    '5/28 19:00'
  );
});

test('活动分享卡时间保留带清迈时区的活动时间', () => {
  assert.equal(
    formatCmiEventShareCardTime({
      ...baseEvent,
      startAt: '2026-05-28T19:00:00+07:00',
    }),
    '5/28 19:00'
  );
});
