import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDisplayPlaceName,
  getRecommendationMetaParts,
} from './recommendation-display.ts';

test('纯地图坐标地点名在个人记录展示里隐藏', () => {
  assert.equal(getDisplayPlaceName('地图坐标 · 18.79203, 98.99467'), null);
  assert.equal(getDisplayPlaceName(' 地图坐标 · -18.79203, -98.99467 '), null);
});

test('真实地点名和带地名的坐标说明继续保留', () => {
  assert.equal(getDisplayPlaceName('清迈客栈'), '清迈客栈');
  assert.equal(getDisplayPlaceName('清迈客栈 · 18.7932, 98.9874'), '清迈客栈 · 18.7932, 98.9874');
});

test('记录元信息没有纯坐标时只展示用户名', () => {
  assert.deepEqual(getRecommendationMetaParts('地图坐标 · 18.79203, 98.99467', '子扬'), ['子扬']);
  assert.deepEqual(getRecommendationMetaParts('清迈客栈', '子扬'), ['清迈客栈', '子扬']);
});
