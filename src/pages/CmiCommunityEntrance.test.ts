import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CmiCommunityEntrance.tsx', import.meta.url), 'utf8');
const styleSource = readFileSync(new URL('./cmi-community-entrance.css', import.meta.url), 'utf8');

test('社区入口主按钮跳转到独立域名', () => {
  assert.match(source, /href="https:\/\/cmimap\.com"/);
  assert.match(source, /href="https:\/\/cmiswap\.com"/);
  assert.doesNotMatch(source, /to="\/v3\?screen=map"/);
  assert.doesNotMatch(source, /to="\/swap"/);
});

test('社区入口带有街机通电动效层', () => {
  assert.match(source, /cmi-prototype-effect--screen/);
  assert.match(source, /cmi-prototype-effect--top-light/);
  assert.match(source, /cmi-prototype-effect--button-glow/);
  assert.match(source, /cmi-prototype-effect--map-pixels/);
  assert.match(source, /cmi-prototype-effect--swap-pixels/);
  assert.match(styleSource, /@keyframes cmi-crt-flicker/);
  assert.match(styleSource, /@keyframes cmi-neon-tube-pulse/);
  assert.match(styleSource, /@keyframes cmi-pixel-jitter/);
  assert.match(styleSource, /@keyframes cmi-button-pixel-jitter/);
});
