import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./cmi-themes.ts', import.meta.url), 'utf8');
const migration = readFileSync(
  new URL('../../supabase/migrations/20260607063000_restore_cmi_theme_shortest_chain.sql', import.meta.url),
  'utf8'
);

test('主题数据层只接入当前主题、主题详情、投稿列表和投稿写入', () => {
  assert.match(source, /from\('cmi_map_themes'\)/);
  assert.match(source, /from\('cmi_theme_submissions'\)/);
  assert.match(source, /export const getActiveCmiMapTheme/);
  assert.match(source, /export const getCmiMapThemeBySlug/);
  assert.match(source, /export const getCmiThemeSubmissions/);
  assert.match(source, /export const createCmiThemeSubmission/);
  assert.doesNotMatch(source, /updateCmiThemeSubmissionReview/);
  assert.doesNotMatch(source, /includeHidden/);
});

test('恢复 migration 只重建主题最短链路数据表', () => {
  assert.match(migration, /create table if not exists public\.cmi_map_themes/);
  assert.match(migration, /create table if not exists public\.cmi_theme_tasks/);
  assert.match(migration, /create table if not exists public\.cmi_theme_submissions/);
  assert.match(migration, /insert into public\.cmi_map_themes/);
  assert.match(migration, /'wild-chiang-mai'/);
  assert.doesNotMatch(migration, /cmi_companion/);
  assert.doesNotMatch(migration, /reward/i);
  assert.doesNotMatch(migration, /badge/i);
  assert.doesNotMatch(migration, /is_featured/);
  assert.doesNotMatch(migration, /reviewed_/);
});
