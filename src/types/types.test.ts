import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CMI_INN_CATEGORY,
  isCmiInnCheckInRecommendation,
  isPublicMapRecommendation,
} from './types.ts';

test('清迈客栈打卡仍识别为客栈标签，但属于公开动态和地图 marker', () => {
  const recommendation = { category: CMI_INN_CATEGORY };

  assert.equal(isCmiInnCheckInRecommendation(recommendation), true);
  assert.equal(isPublicMapRecommendation(recommendation), true);
});
