import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildEditableCmiEventPayload, isCmiEventManager } from './event-management';

test('isCmiEventManager 允许创建者、发起人 id、发起人邮箱和管理员管理活动', () => {
  const event = {
    createdBy: 'creator-user-id',
    organizerId: 'legacy-organizer-id',
    organizerEmail: 'Linke@Example.com',
  };

  assert.equal(isCmiEventManager(event, { userId: 'creator-user-id', email: 'someone@example.com', role: 'user' }), true);
  assert.equal(isCmiEventManager(event, { userId: 'legacy-organizer-id', email: 'someone@example.com', role: 'user' }), true);
  assert.equal(isCmiEventManager(event, { userId: 'other-user-id', email: 'linke@example.com', role: 'user' }), true);
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
    coverImageUrl: 'https://example.com/poster.jpg',
    capacity: null,
    attendeeVisibility: 'public',
    summary: '一起聊聊',
    detailBody: '详细说明',
    updatedBy: 'creator-user-id',
  });

  assert.equal('title' in payload, false);
  assert.equal(payload.venue_name, '清迈客栈');
  assert.equal(payload.organizer_email, 'linke@example.com');
  assert.equal(payload.cover_image_url, 'https://example.com/poster.jpg');
});
