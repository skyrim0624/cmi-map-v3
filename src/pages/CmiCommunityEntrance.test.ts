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

test('社区入口显示屏支持箭头和左右滑动切换精选内容', () => {
  assert.match(source, /featuredEventIds/);
  assert.match(source, /cmi-secondhand-auction-2026-06-06/);
  assert.match(source, /cmi-my-octopus-teacher-screening-2026-06-06/);
  assert.match(source, /cmi-reference-arrow--previous/);
  assert.match(source, /cmi-reference-arrow--next/);
  assert.match(source, /onPointerDown=\{handleScreenPointerDown\}/);
  assert.match(source, /onPointerUp=\{handleScreenPointerUp\}/);
  assert.match(source, /onTouchStart=\{handleScreenTouchStart\}/);
  assert.match(source, /onTouchEnd=\{handleScreenTouchEnd\}/);
  assert.match(source, /carouselIntervalMs = 5000/);
  assert.match(source, /window\.setInterval/);
});
