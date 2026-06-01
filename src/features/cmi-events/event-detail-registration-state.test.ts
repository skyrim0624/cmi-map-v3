import assert from 'node:assert/strict';
import test from 'node:test';
import type { CmiEvent } from '../../data/cmi-events.ts';
import { getEventDetailRegistrationButtonState } from './event-detail-registration-state.ts';

const baseEvent = {
  id: 'cmi-test-event',
  title: 'CMI 测试活动',
  type: 'cmi',
  startAt: '2026-06-02T19:00:00+07:00',
  venueName: '清迈客栈',
  area: 'CMI / 清迈客栈',
  priceLabel: '免费参与',
  registrationLabel: 'CMI Map 一键报名',
  sourceType: 'cmi',
  sourceLabel: 'CMI',
  hostName: 'CMI 社区',
  language: '中文',
  suitableFor: [],
  isCmiRelated: true,
  isVerified: true,
  verificationStatus: 'verified',
  reliabilityNote: '测试活动',
  tags: ['CMI'],
  summary: '测试活动说明。',
  registrationEnabled: true,
  registrationStatus: 'open',
  attendeeVisibility: 'count-only',
} satisfies CmiEvent;

test('详情页内部报名按钮默认可以点击', () => {
  assert.deepEqual(getEventDetailRegistrationButtonState({ event: baseEvent }), {
    label: '报名',
    ariaLabel: '报名活动',
    tone: 'active',
    disabled: false,
    action: 'internal',
  });
});

test('详情页内部报名按钮在满员时禁用并显示已满', () => {
  assert.deepEqual(getEventDetailRegistrationButtonState({
    event: baseEvent,
    isFull: true,
  }), {
    label: '已满',
    ariaLabel: '活动名额已满',
    tone: 'closed',
    disabled: true,
    action: 'none',
  });
});

test('详情页活动开始后不能继续报名', () => {
  assert.deepEqual(getEventDetailRegistrationButtonState({
    event: baseEvent,
    referenceDate: new Date('2026-06-02T19:00:00+07:00'),
  }), {
    label: '已结束',
    ariaLabel: '活动已经开始或结束',
    tone: 'closed',
    disabled: true,
    action: 'none',
  });
});

test('详情页外部报名活动仍显示可点击报名入口', () => {
  assert.deepEqual(getEventDetailRegistrationButtonState({
    event: {
      ...baseEvent,
      registrationEnabled: false,
      registrationLabel: '添加微信 skyrim0216 报名',
    },
  }), {
    label: '报名',
    ariaLabel: '复制活动报名方式',
    tone: 'external',
    disabled: false,
    action: 'external',
  });
});

test('详情页已报名状态禁用并显示成功状态', () => {
  assert.deepEqual(getEventDetailRegistrationButtonState({
    event: baseEvent,
    hasRegistered: true,
  }), {
    label: '已报名',
    ariaLabel: '已报名活动',
    tone: 'registered',
    disabled: true,
    action: 'none',
  });
});
