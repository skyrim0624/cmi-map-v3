import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const leafletSource = readFileSync(new URL('./LeafletMap.tsx', import.meta.url), 'utf8');
const themeFeatureSource = readFileSync(new URL('../../data/chiang-mai-theme-map-features.ts', import.meta.url), 'utf8');

test('主题地图使用真实分层绘制，不再使用整张地图贴图', () => {
  assert.match(leafletSource, /CHIANG_MAI_THEME_MAP_FEATURES/);
  assert.match(leafletSource, /getThemeMapAreaStyle/);
  assert.match(leafletSource, /getThemeMapLineStyle/);
  assert.doesNotMatch(leafletSource, /wild-chiang-mai-map/);
  assert.doesNotMatch(leafletSource, /imageOverlay/);
});

test('主题地图数据至少包含道路、水系和区域三类真实 geometry', () => {
  assert.match(themeFeatureSource, /roadMajor/);
  assert.match(themeFeatureSource, /roadLocal/);
  assert.match(themeFeatureSource, /waterLine/);
  assert.match(themeFeatureSource, /greenArea/);
  assert.match(themeFeatureSource, /cityArea/);
});
