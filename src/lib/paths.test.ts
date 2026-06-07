import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCmiBlackboardPath,
  getCmiEventsPath,
  getCmiFeedPath,
  getMarkPlacePath,
  getPublicCmiEventUrl,
  getSceneListPath,
  getThemePath,
} from './paths.ts';

test('活动分享链接指向生产站活动详情页', () => {
  assert.equal(
    getPublicCmiEventUrl('cmi-mindfulness-hour-2026-05-28'),
    'https://cmimap.com/events/cmi-mindfulness-hour-2026-05-28'
  );
});

test('旧发帖入口回到动态页并保留活动参数', () => {
  assert.equal(
    getCmiBlackboardPath({ compose: true, eventId: 'cmi-mindfulness-hour-2026-05-28' }),
    '/?screen=feed&compose=1&event=cmi-mindfulness-hour-2026-05-28'
  );
});

test('动态页入口承接旧发帖参数', () => {
  assert.equal(
    getCmiFeedPath({ placeName: '清迈客栈', locationLabel: '清迈客栈 · Nimman' }),
    '/?screen=feed&place=%E6%B8%85%E8%BF%88%E5%AE%A2%E6%A0%88&location=%E6%B8%85%E8%BF%88%E5%AE%A2%E6%A0%88+%C2%B7+Nimman'
  );
});

test('活动可以生成拍照返图入口', () => {
  assert.equal(
    getMarkPlacePath({ eventId: 'cmi-mindfulness-hour-2026-05-28' }),
    '/mark?event=cmi-mindfulness-hour-2026-05-28'
  );
});

test('主题任务可以进入发布页', () => {
  assert.equal(getThemePath('wild-chiang-mai'), '/themes/wild-chiang-mai');
  assert.equal(
    getMarkPlacePath({ themeSlug: 'wild-chiang-mai', taskId: 'task-a' }),
    '/mark?theme=wild-chiang-mai&task=task-a'
  );
});

test('旧活动列表入口改到 CMI Map 3.0 活动页', () => {
  assert.equal(getCmiEventsPath(), '/?screen=events');
  assert.equal(getSceneListPath('tomorrow-events'), '/?screen=events');
});
