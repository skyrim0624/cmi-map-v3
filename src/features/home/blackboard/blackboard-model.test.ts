import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLACKBOARD_CATEGORY_OPTIONS,
  BLACKBOARD_ACTIVITY_TITLE_LEVELS,
  getBlackboardActivityScore,
  getBlackboardActivityTitle,
  getBlackboardFeedFilters,
  getBlackboardDateGroupLabel,
  getPublishableBlackboardCategories,
  sortBlackboardFeedPosts,
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

test('featured forum posts stay above newer regular posts', () => {
  const posts = [
    { id: 'regular-new', isFeatured: false, createdAt: '2026-05-26T11:00:00+07:00' },
    { id: 'featured-old', isFeatured: true, createdAt: '2026-05-25T10:00:00+07:00' },
    { id: 'regular-old', isFeatured: false, createdAt: '2026-05-24T09:00:00+07:00' },
    { id: 'featured-new', isFeatured: true, createdAt: '2026-05-26T08:00:00+07:00' },
  ];

  assert.deepEqual(
    sortBlackboardFeedPosts(posts).map(post => post.id),
    ['featured-new', 'featured-old', 'regular-new', 'regular-old'],
  );
});

test('blackboard activity titles use lower thresholds for short-stay users', () => {
  assert.equal(getBlackboardActivityScore({ postCount: 0, commentCount: 0 }), 0);
  assert.equal(getBlackboardActivityScore({ postCount: 2, commentCount: 4 }), 10);

  assert.deepEqual(BLACKBOARD_ACTIVITY_TITLE_LEVELS.map(level => level.title), [
    '刚落地',
    '冒泡中',
    '旅行者',
    '萨瓦迪卡',
    '老熟人',
    '“Grab”',
    '清迈土著',
    '泰北接头人',
    '清迈广播站',
    'CMI 活地图',
  ]);

  assert.deepEqual(
    BLACKBOARD_ACTIVITY_TITLE_LEVELS.map((level, index, levels) =>
      index === 0 ? 0 : level.minScore - levels[index - 1].minScore
    ),
    [0, 1, 3, 4, 7, 10, 15, 25, 35, 50],
  );

  assert.deepEqual(
    [
      getBlackboardActivityTitle({ postCount: 0, commentCount: 0 }),
      getBlackboardActivityTitle({ postCount: 1, commentCount: 0 }),
      getBlackboardActivityTitle({ postCount: 2, commentCount: 2 }),
      getBlackboardActivityTitle({ postCount: 6, commentCount: 12 }),
      getBlackboardActivityTitle({ postCount: 20, commentCount: 20 }),
    ].map(result => [result.level, result.title]),
    [
      [1, '刚落地'],
      [2, '冒泡中'],
      [4, '萨瓦迪卡'],
      [6, '“Grab”'],
      [8, '泰北接头人'],
    ],
  );
});
