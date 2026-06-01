import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getEventRecapImages,
  getEventRecapRecommendations,
  type EventRecapRecommendation,
} from './event-recaps.ts';

const createRecommendation = (
  input: Partial<EventRecapRecommendation> & Pick<EventRecapRecommendation, 'id'>
): EventRecapRecommendation => ({
  id: input.id,
  place_name: input.place_name ?? '清迈客栈',
  user_name: input.user_name ?? '子场',
  reason: input.reason ?? '现场记录',
  linked_event_id: input.linked_event_id ?? null,
  linked_event_title: input.linked_event_title ?? null,
  images: input.images ?? ['/photo-a.jpg'],
  created_at: input.created_at ?? '2026-06-01T10:00:00+07:00',
});

test('活动返图只汇总关联到当前活动且带照片的动态', () => {
  const recaps = getEventRecapRecommendations('event-a', [
    createRecommendation({
      id: 'newer',
      linked_event_id: 'event-a',
      images: ['/newer.jpg'],
      created_at: '2026-06-01T12:00:00+07:00',
    }),
    createRecommendation({
      id: 'old-meta',
      reason: '[[cmi:event=event-a;title=%E6%B4%BB%E5%8A%A8A]]\n返图',
      images: ['/old.jpg'],
      created_at: '2026-06-01T09:00:00+07:00',
    }),
    createRecommendation({
      id: 'no-image',
      linked_event_id: 'event-a',
      images: [],
    }),
    createRecommendation({
      id: 'other-event',
      linked_event_id: 'event-b',
      images: ['/other.jpg'],
    }),
  ]);

  assert.deepEqual(recaps.map(recommendation => recommendation.id), ['newer', 'old-meta']);
});

test('活动返图图片会保留来源地点、作者和清理后的正文', () => {
  const images = getEventRecapImages([
    createRecommendation({
      id: 'rec-1',
      place_name: '清迈大学艺术中心',
      user_name: '林可',
      reason: '[[cmi:event=event-a]]\n演出结束后大家还在聊天',
      images: ['/a.jpg', '', '/b.jpg'],
    }),
  ]);

  assert.deepEqual(images, [
    {
      id: 'rec-1-0',
      recommendationId: 'rec-1',
      imageUrl: '/a.jpg',
      imageIndex: 0,
      placeName: '清迈大学艺术中心',
      userName: '林可',
      reason: '演出结束后大家还在聊天',
      createdAt: '2026-06-01T10:00:00+07:00',
    },
    {
      id: 'rec-1-2',
      recommendationId: 'rec-1',
      imageUrl: '/b.jpg',
      imageIndex: 2,
      placeName: '清迈大学艺术中心',
      userName: '林可',
      reason: '演出结束后大家还在聊天',
      createdAt: '2026-06-01T10:00:00+07:00',
    },
  ]);
});
