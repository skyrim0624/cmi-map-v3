import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEventPlaceCandidates,
  createEventPlaceCandidateFromExternalPlace,
  createEventPlaceCandidateFromMapPick,
  createEventPlaceCandidateFromQuery,
  findExactEventPlaceCandidate,
  inferEventPlaceCandidatesFromText,
  searchEventPlaceCandidates,
} from './event-place-binding';
import type { Recommendation } from '@/types/types';

const recommendation = (
  input: Pick<Recommendation, 'place_name' | 'category' | 'latitude' | 'longitude'> & Partial<Recommendation>
): Recommendation => ({
  id: input.id ?? input.place_name,
  place_name: input.place_name,
  category: input.category,
  latitude: input.latitude,
  longitude: input.longitude,
  reason: input.reason ?? '本地测试推荐',
  user_name: input.user_name ?? 'tester',
  user_id: input.user_id ?? null,
  images: input.images ?? [],
  created_at: input.created_at ?? '2026-05-25T10:00:00+07:00',
  upvotes: [],
  wishlists: [],
  placed_stickers: [],
});

test('buildEventPlaceCandidates 聚合地点并固定保留清迈客栈候选', () => {
  const candidates = buildEventPlaceCandidates([
    recommendation({
      place_name: '北门音乐厅',
      category: '景点',
      latitude: 18.792,
      longitude: 98.993,
    }),
    recommendation({
      place_name: '北门音乐厅',
      category: '景点',
      latitude: 18.7921,
      longitude: 98.9931,
    }),
  ]);

  assert.equal(candidates[0].placeName, '清迈客栈');
  assert.equal(candidates.find(candidate => candidate.placeName === '北门音乐厅')?.recommendationCount, 2);
});

test('searchEventPlaceCandidates 输入清迈客栈时返回绑定坐标', () => {
  const candidates = buildEventPlaceCandidates([]);
  const [candidate] = searchEventPlaceCandidates(candidates, 'CMI Inn');

  assert.equal(candidate.placeName, '清迈客栈');
  assert.equal(candidate.latitude, 18.7932);
  assert.equal(candidate.longitude, 98.9874);
});

test('inferEventPlaceCandidatesFromText 从自然语言里识别地点', () => {
  const candidates = buildEventPlaceCandidates([
    recommendation({
      place_name: '北门音乐厅',
      category: '景点',
      latitude: 18.792,
      longitude: 98.993,
    }),
  ]);

  assert.deepEqual(
    inferEventPlaceCandidatesFromText(candidates, '今晚有人一起去北门音乐厅听爵士吗？').map(candidate => candidate.placeName),
    ['北门音乐厅']
  );
});

test('createEventPlaceCandidateFromQuery 支持地点页反向带入发布页', () => {
  const candidate = createEventPlaceCandidateFromQuery({
    placeName: '清迈客栈',
    category: '清迈客栈',
    latitude: '18.7932',
    longitude: '98.9874',
  });

  assert.equal(candidate?.placeName, '清迈客栈');
  assert.equal(candidate?.bindingSource, 'prefill');
});

test('findExactEventPlaceCandidate 能用别名命中清迈客栈', () => {
  const candidates = buildEventPlaceCandidates([]);

  assert.equal(findExactEventPlaceCandidate(candidates, 'cmi')?.placeName, '清迈客栈');
});

test('searchEventPlaceCandidates 支持清迈常用地点俗称', () => {
  const candidates = buildEventPlaceCandidates([]);
  const [candidate] = searchEventPlaceCandidates(candidates, '北门');

  assert.equal(candidate.placeName, 'North Gate Jazz Co-Op');
  assert.equal(candidate.category, '酒吧');
});

test('createEventPlaceCandidateFromMapPick 把地图拖拽点转成活动地点候选', () => {
  const candidate = createEventPlaceCandidateFromMapPick({
    placeName: '古城北门附近',
    latitude: 18.79356,
    longitude: 98.98772,
  });

  assert.equal(candidate.placeName, '古城北门附近');
  assert.equal(candidate.areaLabel, '地图选点 · 18.79356, 98.98772');
  assert.equal(candidate.bindingSource, 'manual');
  assert.equal(candidate.latitude, 18.79356);
  assert.equal(candidate.longitude, 98.98772);
});

test('createEventPlaceCandidateFromExternalPlace 把外部地点转成活动可绑定候选', () => {
  const candidate = createEventPlaceCandidateFromExternalPlace({
    placeName: 'North Gate Jazz Co-Op',
    areaLabel: 'Si Phum · Chiang Mai',
    latitude: 18.7935,
    longitude: 98.9877,
    externalPlaceId: 'photon:N:123',
    provider: 'photon',
    providerLabel: 'OpenStreetMap',
    attributionLabel: 'OpenStreetMap / Photon',
  });

  assert.equal(candidate.placeName, 'North Gate Jazz Co-Op');
  assert.equal(candidate.bindingSource, 'external');
  assert.equal(candidate.recommendationCount, 0);
  assert.equal(candidate.externalPlaceId, 'photon:N:123');
});
