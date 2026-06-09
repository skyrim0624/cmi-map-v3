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

test('旧意图首页彻底移出正式路由', () => {
  assert.doesNotMatch(source, /const SceneHome = lazy/);
  assert.doesNotMatch(source, /path: '\/legacy-home'/);
  assert.doesNotMatch(source, /element: <SceneHome \/>/);
  assert.doesNotMatch(source, /name: '旧版意图首页'/);
});

test('社区统一入口和 Swap 栏目为公开路由', () => {
  assert.match(source, /const CmiCommunityEntrance = lazy/);
  assert.match(source, /const CmiSwapPage = lazy/);
  assert.match(source, /path: '\/community'/);
  assert.match(source, /element: <CmiCommunityEntrance \/>/);
  assert.match(source, /name: 'CMI 社区入口'/);
  assert.match(source, /path: '\/swap'/);
  assert.match(source, /element: <CmiSwapPage \/>/);
  assert.match(source, /name: 'CMI Swap'/);
});

test('主题地图不再提供独立主题页路由', () => {
  assert.doesNotMatch(source, /const CmiThemeDetail = lazy/);
  assert.doesNotMatch(source, /path: '\/themes\/:themeSlug'/);
  assert.doesNotMatch(source, /element: <CmiThemeDetail \/>/);
  assert.doesNotMatch(source, /name: '主题地图'/);
});
