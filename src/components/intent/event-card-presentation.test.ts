import assert from 'node:assert/strict';
import test from 'node:test';
import type { CmiEvent } from '../../data/cmi-events.ts';
import {
  getCmiEventCardImageUrl,
  getCmiEventRegistrationPreviewLabel,
  getCmiEventVisibleTags,
} from './event-card-presentation.ts';

const baseEvent = {
  id: 'cmi-financial-literacy-sharing-2026-05-29',
  title: '穷姐姐财商分享大会',
  type: 'cmi',
  venueName: '清迈客栈',
  area: 'CMI / 清迈客栈',
  priceLabel: '免费参与，可随喜支持',
  registrationLabel: '无需报名，直接空降即可；Luma 链接待补充',
  sourceType: 'cmi',
  sourceLabel: 'CMI 活动宣传内容文件夹',
  hostName: '清迈客栈',
  language: '中文',
  suitableFor: [],
  isCmiRelated: true,
  isVerified: true,
  verificationStatus: 'verified',
  lastCheckedAt: '2026-05-26T10:00:00+07:00',
  reliabilityNote: '已核实',
  tags: ['CMI', '财商', '理财', '数字游民'],
  summary: '一场面向清迈旅居者和数字游民的财商分享。',
} satisfies CmiEvent;

test('event card presentation uses CMI poster artwork before generic fallback', () => {
  assert.equal(
    getCmiEventCardImageUrl(baseEvent),
    '/cmi-home/event-posters/cmi-financial-literacy-sharing-2026-05-29.png',
  );
});

test('event card presentation uses user uploaded cover first', () => {
  assert.equal(
    getCmiEventCardImageUrl({
      ...baseEvent,
      id: 'community-event',
      coverImageUrl: 'https://example.com/custom-cover.jpg',
    }),
    'https://example.com/custom-cover.jpg',
  );
});

test('event card presentation keeps registration preview short', () => {
  assert.equal(getCmiEventRegistrationPreviewLabel(baseEvent), '无需报名，直接空降即可');
});

test('event card presentation keeps unique readable tags', () => {
  assert.deepEqual(getCmiEventVisibleTags(baseEvent), ['CMI', '财商', '理财', '数字游民']);
});
