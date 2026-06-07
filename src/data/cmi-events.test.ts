import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CMI_EVENTS,
  CMI_MAP_CHECKIN_ACTIVITY_LABEL,
  CMI_MAP_WILD_CHIANG_MAI_EVENT_ID,
  CMI_MAP_EVENT_REGISTRATION_DETAIL_LINE,
  formatCmiEventShareCardTime,
  isCmiMapCheckinActivityEvent,
  isCmiInnEvent,
  normalizeCmiEventRegistration,
  type CmiEvent,
} from './cmi-events.ts';

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

test('清迈客栈活动筛选排除外部社区友推活动', () => {
  assert.equal(
    isCmiInnEvent({
      ...baseEvent,
      id: 'tong-tung-weekend-market',
      title: 'Tong Tung 周末市集',
      type: 'market',
      venueName: 'Tong Tung Market at Baan Rim Nam',
      area: 'Nong Chom / Meechok 附近',
      sourceType: 'community',
      sourceLabel: 'Citylife 核查',
      hostName: 'Tong Tung Market',
      isCmiRelated: false,
      tags: ['市集', '周末'],
    }),
    false
  );

  assert.equal(
    isCmiInnEvent({
      ...baseEvent,
      id: 'waytoagi-codex-maker-lab-2026-05-31',
      title: 'WaytoAGI Codex 轻造物局 · 清迈站',
      type: 'tech',
      venueName: '清迈客栈',
      area: 'CMI / 清迈客栈',
      hostName: 'WaytoAGI × 清迈客栈',
    }),
    true
  );
});

test('清迈客栈未来活动统一归一为 CMI Map 一键报名', () => {
  const normalizedEvent = normalizeCmiEventRegistration({
    ...baseEvent,
    id: 'cmi-five-minute-music-kid-a-2026-06-02',
    title: '“五分钟”音乐会',
    startAt: '2026-06-02T19:00:00+07:00',
    registrationLabel: '添加微信 skyrim0216 报名',
    registrationEnabled: false,
    registrationStatus: 'closed',
  }, new Date('2026-06-01T12:00:00+07:00'));

  assert.equal(normalizedEvent.registrationLabel, 'CMI Map 一键报名');
  assert.equal(normalizedEvent.registrationEnabled, true);
  assert.equal(normalizedEvent.registrationStatus, 'open');
});

test('神奇动物在哪里是普通打卡活动，不归一为报名活动', () => {
  const event = CMI_EVENTS.find(candidate => candidate.id === CMI_MAP_WILD_CHIANG_MAI_EVENT_ID);

  assert.ok(event);
  assert.equal(event.title, '神奇动物在哪里');
  assert.equal(event.registrationLabel, CMI_MAP_CHECKIN_ACTIVITY_LABEL);
  assert.equal(event.registrationEnabled, false);
  assert.equal(isCmiMapCheckinActivityEvent(event), true);
  assert.equal(isCmiInnEvent(event), false);
  assert.equal(normalizeCmiEventRegistration(event).registrationLabel, CMI_MAP_CHECKIN_ACTIVITY_LABEL);
});

test('清迈客栈活动开始后归一为已关闭报名', () => {
  const normalizedEvent = normalizeCmiEventRegistration({
    ...baseEvent,
    startAt: '2026-06-02T19:00:00+07:00',
    registrationEnabled: true,
    registrationStatus: 'open',
  }, new Date('2026-06-02T19:00:00+07:00'));

  assert.equal(normalizedEvent.registrationStatus, 'closed');
});

test('清迈客栈活动详情正文里的外部报名方式也统一归一', () => {
  const normalizedEvent = normalizeCmiEventRegistration({
    ...baseEvent,
    startAt: '2026-06-02T19:00:00+07:00',
    detailBody: [
      '活动信息',
      '参与方式：请尽量在 Luma 报名：https://luma.com/example',
      '到场后一起围坐交流。',
    ].join('\n'),
  }, new Date('2026-06-01T12:00:00+07:00'));

  assert.equal(
    normalizedEvent.detailBody,
    ['活动信息', CMI_MAP_EVENT_REGISTRATION_DETAIL_LINE, '到场后一起围坐交流。'].join('\n')
  );
});
