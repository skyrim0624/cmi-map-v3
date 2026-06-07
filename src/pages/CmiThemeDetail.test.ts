import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CmiThemeDetail.tsx', import.meta.url), 'utf8');

test('主题页只包含介绍、参加任务、投稿展示和分享卡', () => {
  assert.match(source, /getCmiMapThemeBySlug/);
  assert.match(source, /getCmiThemeSubmissions/);
  assert.match(source, /createCmiThemeShareCard/);
  assert.match(source, /主题介绍/);
  assert.match(source, /大家的投稿/);
  assert.match(source, /getMarkPlacePath\(\{ themeSlug: theme\.slug, taskId: task\.id \}\)/);
  assert.match(source, /分享卡/);
  assert.doesNotMatch(source, /奖励/);
  assert.doesNotMatch(source, /成就/);
  assert.doesNotMatch(source, /排行榜/);
});
