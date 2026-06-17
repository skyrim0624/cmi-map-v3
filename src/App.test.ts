import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');

test('正式地图入口在桌面也使用手机宽度壳层', () => {
  assert.match(source, /const isMobileMapRoute = location\.pathname === '\/' \|\| location\.pathname === '\/map'/);
  assert.match(source, /isMobileMapRoute[\s\S]*?max-w-\[430px\]/);
  assert.doesNotMatch(source, /location\.pathname === '\/' \|\| location\.pathname === '\/map' \|\| location\.pathname === '\/swap'/);
});
