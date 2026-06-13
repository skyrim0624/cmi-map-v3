import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPublicProfileTabs,
  getPublicProfileDisplayName,
} from './public-profile-page.ts';

test('public profile display name falls back to user content before route identity', () => {
  assert.equal(
    getPublicProfileDisplayName({
      profile: null,
      recommendations: [{ user_name: '紫妹' }],
      posts: [],
      routeIdentity: '123e4567-e89b-12d3-a456-426614174000',
    }),
    '紫妹'
  );
});

test('public profile tabs expose recommendations, animal album and dynamics', () => {
  assert.deepEqual(buildPublicProfileTabs({ recommendationCount: 15, animalCount: 4, postCount: 3 }), [
    { id: 'recommendations', label: 'TA 的痕迹', count: 15 },
    { id: 'animals', label: 'TA 的神奇生物图鉴', count: 4 },
    { id: 'posts', label: 'TA 的动态', count: 3 },
  ]);
});
