import assert from 'node:assert/strict';
import test from 'node:test';
import type { CmiEvent } from '../../data/cmi-events.ts';
import {
  getEventListRegistrationButtonState,
  isCapacityFullRegistrationError,
} from './event-list-registration-state.ts';

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

test('活动列表报名按钮默认可点击并显示报名', () => {
  assert.deepEqual(getEventListRegistrationButtonState({ event: baseEvent }), {
    label: '报名',
    ariaLabel: '报名活动',
    tone: 'active',
    disabled: false,
  });
});

test('活动列表报名按钮在当前用户已报名后显示成功状态并禁用', () => {
  assert.deepEqual(getEventListRegistrationButtonState({ event: baseEvent, hasRegistered: true }), {
    label: '已报名',
    ariaLabel: '已报名活动',
    tone: 'registered',
    disabled: true,
  });
});

test('活动列表报名按钮在名额已满时显示灰色禁用态', () => {
  assert.deepEqual(getEventListRegistrationButtonState({ event: baseEvent, isMarkedFull: true }), {
    label: '已满',
    ariaLabel: '活动名额已满',
    tone: 'closed',
    disabled: true,
  });
});

test('服务端容量满员错误会被识别为已满', () => {
  assert.equal(isCapacityFullRegistrationError('活动名额已满'), true);
  assert.equal(isCapacityFullRegistrationError('请稍后重试'), false);
});
