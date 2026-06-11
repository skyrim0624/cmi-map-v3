import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./wild-chiang-mai-event-home.tsx', import.meta.url), 'utf8');

test('神奇动物捕获卡保留动态帖同款互动动作', () => {
  assert.match(source, /function WildCaptureActions/);
  assert.match(source, /aria-label="盖戳"/);
  assert.match(source, /aria-label=\{isWishlisted \? '取消收藏' : '收藏'\}/);
  assert.match(source, /aria-label="评论"/);
  assert.match(source, /onStamp=\{\(\) => onStartStamp\(recommendation\.id\)\}/);
  assert.match(source, /onWishlist=\{\(\) => onToggleWishlist\(recommendation\)\}/);
  assert.match(source, /onComment=\{\(\) => onOpenComment\(recommendation\)\}/);
});

test('神奇动物捕获卡支持把图章盖到卡片上', () => {
  assert.match(source, /function WildPlacedStickerLayer/);
  assert.match(source, /activeRecIdForSticker === recommendation\.id/);
  assert.match(source, /onPlaceStamp\(event, recommendation\.id\)/);
  assert.match(source, /function WildStickerDrawer/);
  assert.match(source, /onSelectSticker\(sticker\.id\)/);
});
