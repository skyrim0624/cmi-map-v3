import assert from 'node:assert/strict';
import test from 'node:test';
import { applyRecommendationCorrections } from './cmi-place-corrections.ts';
import { CMI_INN_CATEGORY, CMI_INN_COORDINATES, type Recommendation } from '@/types/types';

const createRecommendation = (input: Partial<Recommendation>): Recommendation => ({
  id: 'rec-cmi-inn-drifted',
  place_name: '清迈客栈',
  category: '景点',
  reason: '刚在清迈客栈发了一条动态',
  user_name: '李',
  user_id: 'user-li',
  latitude: 18.7919513784612,
  longitude: 98.9946296215124,
  images: [],
  created_at: '2026-06-10T10:00:00+07:00',
  ...input,
});

test('清迈客栈动态读取时归一到固定坐标', () => {
  const corrected = applyRecommendationCorrections(createRecommendation({}));

  assert.equal(corrected.category, CMI_INN_CATEGORY);
  assert.equal(corrected.latitude, CMI_INN_COORDINATES.latitude);
  assert.equal(corrected.longitude, CMI_INN_COORDINATES.longitude);
});
