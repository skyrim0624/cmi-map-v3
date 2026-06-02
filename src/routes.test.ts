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
