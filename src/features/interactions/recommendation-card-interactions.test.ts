import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendStickerPlacement,
  applyWishlistState,
  createOptimisticStickerPlacement,
} from './recommendation-card-interactions.ts';
import type { PlacedSticker, Sticker } from '@/types/types.ts';

const stampSticker: Sticker = {
  id: 'stamp-cmi',
  name: 'CMI 盖戳',
  icon_url: '/stickers/stamp-cmi-selected.png',
  is_native: true,
  created_at: '2026-05-30T00:00:00.000Z',
};

test('收藏状态只更新当前推荐', () => {
  assert.deepEqual(
    applyWishlistState({ recA: false, recB: true }, 'recA', true),
    { recA: true, recB: true }
  );
});

test('盖戳乐观记录保留贴纸信息和落点', () => {
  assert.deepEqual(
    createOptimisticStickerPlacement({
      id: 'preview-1',
      recommendationId: 'recA',
      userId: 'user-1',
      sticker: stampSticker,
      xRatio: 34,
      yRatio: 62,
      rotation: -8,
      createdAt: '2026-05-30T12:00:00.000Z',
    }),
    {
      id: 'preview-1',
      recommendation_id: 'recA',
      user_id: 'user-1',
      sticker_id: 'stamp-cmi',
      x_ratio: 34,
      y_ratio: 62,
      rotation: -8,
      created_at: '2026-05-30T12:00:00.000Z',
      sticker: stampSticker,
    }
  );
});

test('追加盖戳时不影响其他推荐已有盖戳', () => {
  const existingPlacement: PlacedSticker = {
    id: 'old',
    recommendation_id: 'recB',
    user_id: 'user-2',
    sticker_id: 'stamp-old',
    x_ratio: 20,
    y_ratio: 30,
    rotation: 4,
    created_at: '2026-05-29T12:00:00.000Z',
  };
  const nextPlacement = createOptimisticStickerPlacement({
    id: 'preview-2',
    recommendationId: 'recA',
    userId: 'user-1',
    sticker: stampSticker,
    xRatio: 50,
    yRatio: 50,
    rotation: 0,
    createdAt: '2026-05-30T12:00:00.000Z',
  });

  assert.deepEqual(
    appendStickerPlacement({ recB: [existingPlacement] }, 'recA', nextPlacement),
    { recB: [existingPlacement], recA: [nextPlacement] }
  );
});
