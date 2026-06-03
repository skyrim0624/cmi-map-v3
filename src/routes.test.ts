import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./routes.tsx', import.meta.url), 'utf8');

test('旧清迈客栈页不再渲染独立页面，改为动态页入口', () => {
  assert.match(source, /path: '\/cmi-home'/);
  assert.match(source, /element: <Navigate to=\{getCmiFeedPath\(\)\} replace \/>/);
  assert.doesNotMatch(source, /const CmiHome = lazy/);
  assert.doesNotMatch(source, /element: <CmiHome \/>/);
});

test('主题详情页为公开路由', () => {
  assert.match(source, /const CmiThemeDetail = lazy/);
  assert.match(source, /path: '\/themes\/:themeSlug'/);
  assert.match(source, /element: <CmiThemeDetail \/>/);
  assert.match(source, /name: '主题地图'/);
  assert.match(source, /public: true/);
});

test('主题管理页为登录后路由', () => {
  assert.match(source, /const CmiThemeManage = lazy/);
  assert.match(source, /path: '\/admin\/themes\/:themeSlug'/);
  assert.match(source, /element: <CmiThemeManage \/>/);
  assert.match(source, /name: '主题管理'/);
});
