import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CmiCommunityEntrance.tsx', import.meta.url), 'utf8');

test('社区入口主按钮跳转到指定独立域名入口', () => {
  assert.match(source, /href="https:\/\/cmimap\.com\/map"/);
  assert.match(source, /href="https:\/\/cmiswap\.com"/);
  assert.doesNotMatch(source, /href="https:\/\/cmimap\.com\/?"/);
  assert.doesNotMatch(source, /href="https:\/\/cmimap\.com\/v3\?screen=map"/);
  assert.doesNotMatch(source, /to="\/v3\?screen=map"/);
  assert.doesNotMatch(source, /to="\/swap"/);
});
