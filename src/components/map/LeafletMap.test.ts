import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const leafletSource = readFileSync(new URL('./LeafletMap.tsx', import.meta.url), 'utf8');

test('主题地图重绘层已回滚', () => {
  assert.match(leafletSource, /old-city-moat-wall/);
  assert.doesNotMatch(leafletSource, /CHIANG_MAI_THEME_MAP_FEATURES/);
  assert.doesNotMatch(leafletSource, /getThemeMapAreaStyle/);
  assert.doesNotMatch(leafletSource, /getThemeMapLineStyle/);
  assert.doesNotMatch(leafletSource, /wild-paper-texture/);
  assert.doesNotMatch(leafletSource, /wild-chiang-mai-map/);
});
