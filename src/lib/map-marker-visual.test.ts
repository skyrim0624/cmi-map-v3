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

test('贴纸型 marker 直接展示完整贴纸图标', () => {
  assert.match(source, /isSticker\?: boolean/);
  assert.match(source, /export const isStickerMarkerVisual/);
  assert.match(source, /isSticker: markerData\.visualOverride\.isSticker/);
  assert.match(source, /if \(visual\.isSticker\)/);
  assert.match(source, /object-fit:contain/);
  assert.match(source, /bottom:0;/);
  assert.match(source, /filter:drop-shadow\(0 6px 9px rgba\(26, 64, 39, 0\.22\)\)/);
  assert.match(source, /const stickerVisual = visuals\.find\(isStickerMarkerVisual\)/);
});

test('地图 marker 整体尺寸保持轻量', () => {
  assert.match(source, /visual\.isAvatar \? \(isHotspot \? 46 : 42\) : \(isHotspot \? 48 : 44\)/);
  assert.match(source, /width:40px/);
  assert.match(source, /height:40px/);
  assert.match(source, /width:62px; height:54px/);
});
