import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCmiBlackboardPath,
  getCmiEventAboutPath,
  getCmiEventsPath,
  getCmiFeedPath,
  getMarkPlacePath,
  getPublicCmiEventUrl,
  getSceneListPath,
} from './paths.ts';

test('活动分享链接指向生产站活动详情页', () => {
  assert.equal(
    getPublicCmiEventUrl('cmi-mindfulness-hour-2026-05-28'),
    'https://cmimap.com/events/cmi-mindfulness-hour-2026-05-28'
  );
});

test('活动说明页路径保留活动编号', () => {
  assert.equal(
    getCmiEventAboutPath('cmi-wild-chiang-mai-2026-06'),
    '/events/cmi-wild-chiang-mai-2026-06/about'
  );
});

test('旧发帖入口回到地图页并保留活动参数', () => {
  assert.equal(
    getCmiBlackboardPath({ compose: true, eventId: 'cmi-mindfulness-hour-2026-05-28' }),
    '/map?compose=1&event=cmi-mindfulness-hour-2026-05-28'
  );
});

test('动态页入口改由地图页承接旧发帖参数', () => {
  assert.equal(
    getCmiFeedPath({ placeName: '清迈客栈', locationLabel: '清迈客栈 · Nimman' }),
    '/map?place=%E6%B8%85%E8%BF%88%E5%AE%A2%E6%A0%88&location=%E6%B8%85%E8%BF%88%E5%AE%A2%E6%A0%88+%C2%B7+Nimman'
  );
});

test('活动可以生成拍照返图入口', () => {
  assert.equal(
    getMarkPlacePath({ eventId: 'cmi-mindfulness-hour-2026-05-28' }),
    '/mark?event=cmi-mindfulness-hour-2026-05-28'
  );
});

test('旧活动列表入口改到新地图活动场景', () => {
  assert.equal(getCmiEventsPath(), '/map?scene=tomorrow-events');
  assert.equal(getSceneListPath('tomorrow-events'), '/map?scene=tomorrow-events');
});
