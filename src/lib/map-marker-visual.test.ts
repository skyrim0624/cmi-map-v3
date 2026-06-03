import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./map-marker-visual.ts', import.meta.url), 'utf8');

test('活动海报 marker 用圆形封面裁切而不是完整缩图', () => {
  assert.match(source, /isPoster\?: boolean/);
  assert.match(source, /isPoster: markerData\.visualOverride\.isPoster/);
  assert.match(source, /const shouldCoverImage = Boolean\(visual\.isAvatar \|\| visual\.isPoster\)/);
  assert.match(source, /visual\.isPoster[\s\S]*\? iconSize - 6/);
  assert.match(source, /const imageFit = shouldCoverImage \? 'cover' : 'contain'/);
  assert.match(source, /const imageRadius = shouldCoverImage \? '999px' : '0'/);
  assert.match(source, /const imageSize = visual\.isPoster \? 36 : 30/);
  assert.match(source, /overflow:hidden/);
});

test('地图 marker 整体尺寸保持轻量', () => {
  assert.match(source, /visual\.isAvatar \? \(isHotspot \? 46 : 42\) : \(isHotspot \? 48 : 44\)/);
  assert.match(source, /width:40px/);
  assert.match(source, /height:40px/);
  assert.match(source, /width:62px; height:54px/);
});

test('约搭子头像 marker 带雷达波纹', () => {
  assert.match(source, /isCompanion\?: boolean/);
  assert.match(source, /isCompanion: markerData\.visualOverride\.isCompanion/);
  assert.match(source, /visual\.isCompanion[\s\S]*cmi-marker-radar-ring/);
  assert.match(source, /cmi-marker-radar-ring--outer/);
});
