import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeRecommendationEventMetadata,
  extractRecommendationEventMetadata,
  getRecommendationLinkedEvent,
  stripRecommendationEventMetadata,
} from './cmi-recommendation-events.ts';

test('动态正文可以编码并还原活动关联元数据', () => {
  const encodedReason = encodeRecommendationEventMetadata('现场很多人，很热闹', {
    id: 'cmi-open-mic-2026-06-01',
    title: 'CMI Open Mic',
  });

  assert.equal(
    encodedReason,
    '[[cmi:event=cmi-open-mic-2026-06-01;title=CMI%20Open%20Mic]]\n现场很多人，很热闹'
  );
  assert.deepEqual(extractRecommendationEventMetadata(encodedReason), {
    id: 'cmi-open-mic-2026-06-01',
    title: 'CMI Open Mic',
  });
  assert.equal(stripRecommendationEventMetadata(encodedReason), '现场很多人，很热闹');
});

test('活动关联优先读取推荐表字段，旧数据从正文元数据回退', () => {
  assert.deepEqual(
    getRecommendationLinkedEvent({
      linked_event_id: 'event-from-column',
      linked_event_title: '字段里的活动',
      reason: '普通正文',
    }),
    {
      id: 'event-from-column',
      title: '字段里的活动',
    }
  );

  assert.deepEqual(
    getRecommendationLinkedEvent({
      linked_event_id: null,
      linked_event_title: null,
      reason: '[[cmi:easter-icon=egg-v2-01-question]]\n[[cmi:event=event-from-meta;title=%E6%97%A7%E6%B4%BB%E5%8A%A8]]\n旧帖子正文',
    }),
    {
      id: 'event-from-meta',
      title: '旧活动',
    }
  );
});
