import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./cmi-theme-share-card.ts', import.meta.url), 'utf8');

test('主题分享卡只生成主题投稿外传卡片', () => {
  assert.match(source, /export const createCmiThemeShareCard/);
  assert.match(source, /CMI Map/);
  assert.match(source, /主题地图/);
  assert.match(source, /themeUrl/);
  assert.match(source, /recommendation\.images\[0\]/);
  assert.doesNotMatch(source, /reward/i);
  assert.doesNotMatch(source, /badge/i);
  assert.doesNotMatch(source, /rank/i);
});
