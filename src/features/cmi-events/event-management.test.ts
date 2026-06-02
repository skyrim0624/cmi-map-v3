import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildCmiEventPublishState,
  buildEditableCmiEventPayload,
  getUnavailableCmiInnVenueSpaceIds,
  isCmiEventManager,
  isCmiInnVenue,
  parseCmiEventManagerEmails,
} from './event-management.ts';

test('isCmiEventManager 允许创建者、发起人 id、发起人邮箱和管理员管理活动', () => {
  const event = {
    createdBy: 'creator-user-id',
    organizerId: 'legacy-organizer-id',
    organizerEmail: 'Linke@Example.com',
    managerEmails: ['CoHost@Example.com'],
  };

  assert.equal(isCmiEventManager(event, { userId: 'creator-user-id', email: 'someone@example.com', role: 'user' }), true);
  assert.equal(isCmiEventManager(event, { userId: 'legacy-organizer-id', email: 'someone@example.com', role: 'user' }), true);
  assert.equal(isCmiEventManager(event, { userId: 'other-user-id', email: 'linke@example.com', role: 'user' }), true);
  assert.equal(isCmiEventManager(event, { userId: 'other-user-id', email: 'cohost@example.com', role: 'user' }), true);
  assert.equal(isCmiEventManager(event, { userId: 'other-user-id', email: 'nobody@example.com', role: 'admin' }), true);
});

test('isCmiEventManager 不把非发起人邮箱误判成管理者', () => {
  const event = {
    createdBy: 'creator-user-id',
    organizerId: 'legacy-organizer-id',
    organizerEmail: 'linke@example.com',
  };

  assert.equal(isCmiEventManager(event, { userId: 'other-user-id', email: 'other@example.com', role: 'user' }), false);
  assert.equal(isCmiEventManager(event, { userId: null, email: 'linke@example.com', role: 'user' }), false);
});

test('parseCmiEventManagerEmails 支持换行、逗号并统一小写去空格', () => {
  assert.deepEqual(
    parseCmiEventManagerEmails('Host@Example.com\n cohost@example.com，bad-value;SECOND@example.com '),
    ['host@example.com', 'cohost@example.com', 'second@example.com']
  );
});

test('isCmiInnVenue 识别清迈客栈和 CMI 客栈区域', () => {
  assert.equal(isCmiInnVenue({ venueName: '清迈客栈', area: 'CMI / 清迈客栈' }), true);
  assert.equal(isCmiInnVenue({ venueName: 'Paradornparp International House', area: 'CMI / 清迈客栈' }), true);
  assert.equal(isCmiInnVenue({ venueName: 'North Gate Jazz Co-Op', area: '古城北门' }), false);
});

test('getUnavailableCmiInnVenueSpaceIds 只锁定同一客栈区域的重叠时间段', () => {
  const unavailable = getUnavailableCmiInnVenueSpaceIds({
    startAt: '2026-06-02T19:30:00+07:00',
    endAt: '2026-06-02T20:30:00+07:00',
    events: [
      {
        id: 'round-table-event',
        startAt: '2026-06-02T19:00:00+07:00',
        endAt: '2026-06-02T21:00:00+07:00',
        venueName: '清迈客栈',
        area: 'CMI / 清迈客栈',
        venueSpace: 'round-table',
        verificationStatus: 'verified',
      },
      {
        id: 'rug-event',
        startAt: '2026-06-02T17:00:00+07:00',
        endAt: '2026-06-02T18:00:00+07:00',
        venueName: '清迈客栈',
        area: 'CMI / 清迈客栈',
        venueSpace: 'rug',
        verificationStatus: 'verified',
      },
      {
        id: 'rejected-event',
        startAt: '2026-06-02T19:00:00+07:00',
        endAt: '2026-06-02T21:00:00+07:00',
        venueName: '清迈客栈',
        area: 'CMI / 清迈客栈',
        venueSpace: 'office',
        verificationStatus: 'rejected',
      },
    ],
  });

  assert.deepEqual(unavailable, ['round-table']);
});

test('buildCmiEventPublishState 区分管理员直发和普通用户待审核', () => {
  assert.deepEqual(buildCmiEventPublishState('admin'), {
    isVerified: true,
    reliabilityNote: '由 CMI 管理员直接发布并核实。',
    shouldNotifyReview: false,
    verificationStatus: 'verified',
    visibilityStatus: 'published',
  });
  assert.deepEqual(buildCmiEventPublishState('user'), {
    isVerified: false,
    reliabilityNote: '由用户提交，等待 CMI 管理员审核后公开。',
    shouldNotifyReview: true,
    verificationStatus: 'needs-review',
    visibilityStatus: 'draft',
  });
});

test('buildEditableCmiEventPayload 不允许通过管理表单修改活动主题', () => {
  const payload = buildEditableCmiEventPayload({
    id: 'event-id',
    title: '不应该被写入',
    type: 'meetup',
    startAt: '2026-05-27T19:00:00+07:00',
    endAt: null,
    venueName: '清迈客栈',
    area: 'CMI / 清迈客栈',
    latitude: 18.7919,
    longitude: 98.9946,
    priceLabel: '免费参与',
    organizerName: '林可',
    organizerEmail: 'linke@example.com',
    managerEmails: ['host@example.com'],
    coverImageUrl: 'https://example.com/poster.jpg',
    capacity: null,
    attendeeVisibility: 'public',
    summary: '一起聊聊',
    detailBody: '详细说明',
    venueSpace: 'round-table',
    updatedBy: 'creator-user-id',
  });

  assert.equal('title' in payload, false);
  assert.equal(payload.venue_name, '清迈客栈');
  assert.equal(payload.organizer_email, 'linke@example.com');
  assert.equal('managerEmails' in payload, false);
  assert.equal(payload.cover_image_url, 'https://example.com/poster.jpg');
  assert.equal(payload.venue_space, 'round-table');
});
