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

test('地图动态 marker 展示当前筛选下的所有用户打卡', () => {
  assert.doesNotMatch(source, /MAP_MARKER_VISIBLE_DAYS/);
  assert.doesNotMatch(source, /MAP_MARKER_VISIBLE_WINDOW_MS/);
  assert.doesNotMatch(source, /function isRecentMapMarkerRecommendation/);
  assert.doesNotMatch(source, /const mapMarkerRecommendations = useMemo/);
  assert.match(source, /getUserShareMarkers\(filteredMapRecommendations, profilesByAuthorKey\)/);
  assert.match(source, /listRecommendations=\{filteredMapRecommendations\}/);
  assert.match(source, /onRecommendationSelect=\{handleMapRecommendationSelect\}/);
  assert.match(source, /if \(matchedMarker\) \{[\s\S]*onMarkerSelect\(matchedMarker\);[\s\S]*return;[\s\S]*\}[\s\S]*onRecommendationSelect\(recommendation\);/);
});

test('地图活动 marker 使用海报封面视觉', () => {
  assert.match(source, /visualOverride: \{[\s\S]*label: '活动'[\s\S]*iconUrl: getCmiEventCardImageUrl\(event\)[\s\S]*isPoster: true[\s\S]*\}/);
});
