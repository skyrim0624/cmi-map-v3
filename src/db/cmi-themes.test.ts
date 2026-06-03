import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./cmi-themes.ts', import.meta.url), 'utf8');

test('主题数据层只接入当前主题、主题详情、投稿列表和投稿写入', () => {
  assert.match(source, /from\('cmi_map_themes'\)/);
  assert.match(source, /from\('cmi_theme_submissions'\)/);
  assert.match(source, /export const getActiveCmiMapTheme/);
  assert.match(source, /export const getCmiMapThemeBySlug/);
  assert.match(source, /export const getCmiThemeSubmissions/);
  assert.match(source, /export const createCmiThemeSubmission/);
});
