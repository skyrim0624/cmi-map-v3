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

test('地图动态 marker 只显示最近一周，历史动态仍可搜索打开', () => {
  assert.match(source, /const MAP_MARKER_VISIBLE_DAYS = 7/);
  assert.match(source, /function isRecentMapMarkerRecommendation/);
  assert.match(source, /referenceDate\.getTime\(\) - createdAt <= MAP_MARKER_VISIBLE_WINDOW_MS/);
  assert.match(source, /const mapMarkerRecommendations = useMemo/);
  assert.match(source, /getUserShareMarkers\(mapMarkerRecommendations, profilesByAuthorKey/);
  assert.match(source, /listRecommendations=\{filteredMapRecommendations\}/);
  assert.match(source, /onRecommendationSelect=\{handleMapRecommendationSelect\}/);
  assert.match(source, /if \(matchedMarker\) \{[\s\S]*onMarkerSelect\(matchedMarker\);[\s\S]*return;[\s\S]*\}[\s\S]*onRecommendationSelect\(recommendation\);/);
});

test('地图活动 marker 使用海报封面视觉', () => {
  assert.match(source, /visualOverride: \{[\s\S]*label: '活动'[\s\S]*iconUrl: getCmiEventCardImageUrl\(event\)[\s\S]*isPoster: true[\s\S]*\}/);
});

test('主题投稿保留在默认动态层并支持主题筛选', () => {
  assert.match(source, /type MapFilterId = 'all' \| 'food' \| 'play' \| 'events' \| 'easter' \| 'theme'/);
  assert.match(source, /\{ id: 'theme', label: '主题' \}/);
  assert.match(source, /getActiveCmiMapTheme/);
  assert.match(source, /getCmiThemeSubmissions/);
  assert.match(source, /getThemeSubmissionRecommendations\(activeTheme\.id, userSharedRecommendations, themeSubmissions\)/);
  assert.match(source, /activeFilter === 'theme'/);
  assert.match(source, /getUserShareMarkers\(mapMarkerRecommendations, profilesByAuthorKey, themeSubmissionIds, activeTheme\)/);
  assert.match(source, /onOpenPath\(getThemePath\(activeTheme\.slug\)\)/);
  assert.match(source, /themeSubmissionIds\.has\(selectedRecommendation\.id\)/);
});

test('主题投稿详情提供主题分享卡入口', () => {
  assert.match(source, /createCmiThemeShareCard/);
  assert.match(source, /themeShareInput/);
  assert.match(source, /themeUrl: new URL\(getThemePath\(activeTheme\.slug\), window\.location\.origin\)\.toString\(\)/);
  assert.match(source, /downloadCmiThemeShareCard/);
});

test('约搭子地图层遵守头像 marker 到轻卡片再到详情', () => {
  assert.match(source, /getOpenCmiCompanionInvites/);
  assert.match(source, /getCmiCompanionCreatePath/);
  assert.match(source, /getCompanionInviteMarker/);
  assert.match(source, /isCompanion: true/);
  assert.match(source, /selectedCompanionCardInviteId/);
  assert.match(source, /selectedCompanionDetailsInviteId/);
  assert.match(source, /<CompanionMapCard/);
  assert.match(source, /<CompanionEventDetails/);
  assert.match(source, /setSelectedCompanionCardInviteId\(marker\.companionInviteId\)/);
  assert.match(source, /setSelectedCompanionDetailsInviteId\(invite\.id\)/);
});

test('地图地点和活动详情提供约搭子发起入口', () => {
  assert.match(source, /companionCreateHref=\{getCmiCompanionCreatePath\(\{[\s\S]*placeId: selectedRecommendation\.id[\s\S]*placeName: selectedRecommendation\.place_name[\s\S]*latitude: selectedRecommendation\.latitude[\s\S]*longitude: selectedRecommendation\.longitude[\s\S]*\}\)\}/);
  assert.match(source, /secondaryAction=\{\{[\s\S]*label: '约搭子'[\s\S]*href: getCmiCompanionCreatePath\(\{[\s\S]*eventId: selectedEvent\.id[\s\S]*placeName: selectedEvent\.venueName[\s\S]*latitude: selectedEvent\.mapLocation\?\.latitude[\s\S]*longitude: selectedEvent\.mapLocation\?\.longitude[\s\S]*\}\)[\s\S]*\}\}/);
});
