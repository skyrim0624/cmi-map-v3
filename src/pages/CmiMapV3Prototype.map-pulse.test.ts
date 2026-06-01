import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CmiMapV3Prototype.tsx', import.meta.url), 'utf8');

test('地图新动态和活动 marker 不展示已结束活动', () => {
  assert.match(source, /const upcomingCommunityEvents = useMemo/);
  assert.match(source, /communityEvents\.filter\(event => !isCmiEventExpired\(event, referenceDate\)\)/);
  assert.match(source, /return upcomingCommunityEvents\.slice\(0, 12\)/);
  assert.match(source, /listEvents=\{normalizedMapSearchQuery \? visibleEvents : upcomingCommunityEvents\}/);
});
