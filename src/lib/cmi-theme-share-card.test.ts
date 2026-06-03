import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./cmi-theme-share-card.ts', import.meta.url), 'utf8');

test('主题分享卡生成器包含主题投稿分享所需字段', () => {
  assert.match(source, /export interface CmiThemeShareCardInput/);
  assert.match(source, /theme: CmiMapTheme/);
  assert.match(source, /recommendation: Recommendation/);
  assert.match(source, /authorName: string/);
  assert.match(source, /themeUrl: string/);
  assert.match(source, /QRCode\.toDataURL\(themeUrl/);
  assert.match(source, /recommendation\.images\[0\]/);
  assert.match(source, /theme\.title/);
  assert.match(source, /recommendation\.place_name/);
  assert.match(source, /authorName/);
  assert.match(source, /CMI Map/);
  assert.match(source, /theme_config/);
});
