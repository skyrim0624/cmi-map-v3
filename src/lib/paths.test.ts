import assert from 'node:assert/strict';
import test from 'node:test';
import { getCmiBlackboardPath, getMarkPlacePath, getPublicCmiEventUrl } from './paths.ts';

test('活动分享链接指向生产站活动详情页', () => {
  assert.equal(
    getPublicCmiEventUrl('cmi-mindfulness-hour-2026-05-28'),
    'https://cmimap.com/events/cmi-mindfulness-hour-2026-05-28'
  );
});

test('活动可以生成论坛发帖预填入口', () => {
  assert.equal(
    getCmiBlackboardPath({ compose: true, eventId: 'cmi-mindfulness-hour-2026-05-28' }),
    '/blackboard?compose=1&event=cmi-mindfulness-hour-2026-05-28'
  );
});

test('活动可以生成拍照返图入口', () => {
  assert.equal(
    getMarkPlacePath({ eventId: 'cmi-mindfulness-hour-2026-05-28' }),
    '/mark?event=cmi-mindfulness-hour-2026-05-28'
  );
});
