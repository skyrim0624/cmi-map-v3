import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CmiThemeManage.tsx', import.meta.url), 'utf8');

test('主题管理页只包含投稿查看、筛选、精选隐藏和素材提取', () => {
  assert.match(source, /getCmiThemeSubmissions\(theme\.id, \{ includeHidden: true \}\)/);
  assert.match(source, /updateCmiThemeSubmissionReview/);
  assert.match(source, /buildCmiThemeMaterialRows/);
  assert.match(source, /formatCmiThemeMaterialExport/);
  assert.match(source, /dateFilter/);
  assert.match(source, /userFilter/);
  assert.match(source, /placeFilter/);
  assert.match(source, /复制素材/);
  assert.match(source, /精选/);
  assert.match(source, /隐藏/);
});
