import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CmiCompanionCreate.tsx', import.meta.url), 'utf8');

test('约搭子发起页只保留第一部分计划字段', () => {
  assert.match(source, /createCmiCompanionInvite/);
  assert.match(source, /一句话标题/);
  assert.match(source, /时间/);
  assert.match(source, /人数/);
  assert.match(source, /费用/);
  assert.match(source, /条件/);
  assert.match(source, /氛围/);
  assert.match(source, /Host note/);
  assert.match(source, /联系方式/);
  assert.match(source, /发送/);
  assert.doesNotMatch(source, /Maybe|不参加|我来了|公开可见|通知好友/);
});

test('约搭子发起页使用地点或活动上下文提交', () => {
  assert.match(source, /searchParams\.get\('placeId'\)/);
  assert.match(source, /searchParams\.get\('place'\)/);
  assert.match(source, /searchParams\.get\('event'\)/);
  assert.match(source, /creatorId: user\.id/);
  assert.match(source, /placeId: companionContext\.placeId/);
  assert.match(source, /eventId: companionContext\.eventId/);
});
