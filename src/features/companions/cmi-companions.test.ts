import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildCmiCompanionApplicationInsert,
  buildCmiCompanionInviteInsert,
  canReviewCmiCompanionApplications,
  getApprovedCompanionContactLabel,
  getCmiCompanionJoinActionLabel,
} from './cmi-companions.ts';

test('约搭子发起必须绑定地点或活动', () => {
  assert.throws(
    () => buildCmiCompanionInviteInsert({
      creatorId: 'user-1',
      title: '今晚北门爵士',
      startsAt: '2026-06-03T12:00:00.000Z',
      contactLabel: '微信 cmi',
    }),
    /地点或活动/
  );
});

test('约搭子发起写入只包含第一部分规定字段和地图必要坐标', () => {
  const insert = buildCmiCompanionInviteInsert({
    creatorId: 'user-1',
    placeId: 'north-gate-jazz',
    placeName: 'North Gate Jazz',
    latitude: 18.793,
    longitude: 98.987,
    title: '今晚北门爵士',
    startsAt: '2026-06-03T12:00:00.000Z',
    capacity: 3,
    costNote: 'AA',
    conditionNote: '喜欢爵士',
    vibe: '音乐',
    hostNote: '一起听一会儿',
    contactLabel: '微信 cmi',
  });

  assert.deepEqual(insert, {
    creator_id: 'user-1',
    place_id: 'north-gate-jazz',
    place_name: 'North Gate Jazz',
    latitude: 18.793,
    longitude: 98.987,
    event_id: null,
    title: '今晚北门爵士',
    starts_at: '2026-06-03T12:00:00.000Z',
    capacity: 3,
    cost_note: 'AA',
    condition_note: '喜欢爵士',
    vibe: '音乐',
    host_note: '一起听一会儿',
    contact_label: '微信 cmi',
    status: 'open',
  });
});

test('好友直接通过，非好友进入申请状态', () => {
  assert.equal(
    buildCmiCompanionApplicationInsert({
      inviteId: 'invite-1',
      applicantId: 'friend-user',
      relationshipType: 'friend',
    }).status,
    'approved'
  );
  assert.equal(
    buildCmiCompanionApplicationInsert({
      inviteId: 'invite-1',
      applicantId: 'new-user',
      relationshipType: 'non_friend',
    }).status,
    'pending'
  );
});

test('联系方式只在批准后展示', () => {
  const invite = { contact_label: '微信 cmi' };

  assert.equal(getApprovedCompanionContactLabel(invite, null), null);
  assert.equal(getApprovedCompanionContactLabel(invite, { status: 'pending' }), null);
  assert.equal(getApprovedCompanionContactLabel(invite, { status: 'rejected' }), null);
  assert.equal(getApprovedCompanionContactLabel(invite, { status: 'approved' }), '微信 cmi');
});

test('Event Details 加入动作只保留一个状态入口', () => {
  const invite = { creator_id: 'creator-user' };

  assert.equal(getCmiCompanionJoinActionLabel({ invite, viewerId: null, application: null }), '申请加入');
  assert.equal(getCmiCompanionJoinActionLabel({ invite, viewerId: 'creator-user', application: null }), null);
  assert.equal(
    getCmiCompanionJoinActionLabel({ invite, viewerId: 'applicant-user', application: { status: 'pending' } }),
    '已申请'
  );
  assert.equal(
    getCmiCompanionJoinActionLabel({ invite, viewerId: 'applicant-user', application: { status: 'approved' } }),
    '已通过'
  );
  assert.equal(
    getCmiCompanionJoinActionLabel({ invite, viewerId: 'applicant-user', application: { status: 'rejected' } }),
    '已拒绝'
  );
});

test('只有发起人可以审核约搭子申请', () => {
  const invite = { creator_id: 'creator-user' };

  assert.equal(canReviewCmiCompanionApplications(invite, 'creator-user'), true);
  assert.equal(canReviewCmiCompanionApplications(invite, 'applicant-user'), false);
  assert.equal(canReviewCmiCompanionApplications(invite, null), false);
});
