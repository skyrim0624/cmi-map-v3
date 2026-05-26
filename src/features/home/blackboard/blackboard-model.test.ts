import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLACKBOARD_CATEGORY_OPTIONS,
  getBlackboardFeedFilters,
  getBlackboardDateGroupLabel,
  getPublishableBlackboardCategories,
} from './blackboard-model.ts';

test('publishable forum categories are companion, help, and share only', () => {
  assert.deepEqual(getPublishableBlackboardCategories(), ['companion', 'help', 'share']);
  assert.equal(BLACKBOARD_CATEGORY_OPTIONS.some(option => option.id === 'ride'), false);
});

test('featured is a feed filter, not a publishable category', () => {
  assert.deepEqual(getBlackboardFeedFilters().map(filter => filter.id), [
    'all',
    'featured',
    'companion',
    'help',
    'share',
  ]);
  assert.equal(getPublishableBlackboardCategories().includes('featured' as never), false);
});

test('forum posts group by recent calendar date instead of expiring', () => {
  const referenceDate = new Date('2026-05-25T12:00:00+07:00');

  assert.equal(getBlackboardDateGroupLabel('2026-05-25T01:20:00+07:00', referenceDate), '今天');
  assert.equal(getBlackboardDateGroupLabel('2026-05-24T23:20:00+07:00', referenceDate), '昨天');
  assert.equal(getBlackboardDateGroupLabel('2026-05-23T09:20:00+07:00', referenceDate), '前天');
});
