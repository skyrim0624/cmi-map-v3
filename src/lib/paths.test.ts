import assert from 'node:assert/strict';
import test from 'node:test';
import { getPublicCmiEventUrl } from './paths.ts';

test('活动分享链接指向生产站活动详情页', () => {
  assert.equal(
    getPublicCmiEventUrl('cmi-mindfulness-hour-2026-05-28'),
    'https://cmimap.com/events/cmi-mindfulness-hour-2026-05-28'
  );
});
