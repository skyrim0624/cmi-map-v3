import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CmiCommunityEntrance.tsx', import.meta.url), 'utf8');

test('社区入口主按钮跳转到独立域名', () => {
  assert.match(source, /href="https:\/\/cmimap\.com"/);
  assert.match(source, /href="https:\/\/cmiswap\.com"/);
  assert.doesNotMatch(source, /to="\/v3\?screen=map"/);
  assert.doesNotMatch(source, /to="\/swap"/);
});
