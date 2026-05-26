import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEventRegistrationEmailRecipients,
  getVisibleEventAttendees,
  summarizeEventRegistrations,
  type EventRegistrationForSummary,
} from './event-rsvp-utils';

const registrations: EventRegistrationForSummary[] = [
  {
    id: 'going-1',
    attendeeName: '子扬',
    attendeeEmail: 'andreas@example.com',
    status: 'going',
    createdAt: '2026-05-25T09:00:00+07:00',
  },
  {
    id: 'cancelled-1',
    attendeeName: '取消的人',
    attendeeEmail: 'cancelled@example.com',
    status: 'cancelled',
    createdAt: '2026-05-25T09:05:00+07:00',
  },
  {
    id: 'going-2',
    attendeeName: 'Nicole',
    attendeeEmail: 'nicole@example.com',
    status: 'going',
    createdAt: '2026-05-25T09:10:00+07:00',
  },
];

test('summarizeEventRegistrations 只统计 going 状态并计算剩余名额', () => {
  assert.deepEqual(summarizeEventRegistrations(registrations, 3), {
    goingCount: 2,
    capacity: 3,
    remainingSpots: 1,
    isFull: false,
  });
});

test('getVisibleEventAttendees 在名单公开时只返回有效报名昵称', () => {
  assert.deepEqual(getVisibleEventAttendees(registrations, 'public'), [
    { id: 'going-1', name: '子扬', createdAt: '2026-05-25T09:00:00+07:00' },
    { id: 'going-2', name: 'Nicole', createdAt: '2026-05-25T09:10:00+07:00' },
  ]);
});

test('getVisibleEventAttendees 在 count-only 时不泄露报名者', () => {
  assert.deepEqual(getVisibleEventAttendees(registrations, 'count-only'), []);
});

test('buildEventRegistrationEmailRecipients 去掉空值并按邮箱去重', () => {
  assert.deepEqual(
    buildEventRegistrationEmailRecipients({
      adminEmail: 'events@cmimap.com',
      organizerEmail: 'Events@CMIMap.com ',
      contactEmail: ' host@example.com ',
    }),
    ['events@cmimap.com', 'host@example.com']
  );
});
