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
  assert.match(source, /const imageSize = visual\.isPoster \? 42 : 36/);
  assert.match(source, /overflow:hidden/);
});
