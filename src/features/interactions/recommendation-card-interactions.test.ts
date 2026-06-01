import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendStickerPlacement,
  applyWishlistState,
  createOptimisticStickerPlacement,
  getRecommendationStickerPlacements,
  mergeStickerPlacementMaps,
  removeStickerPlacement,
  replaceStickerPlacement,
} from './recommendation-card-interactions.ts';
import type { PlacedSticker, Recommendation, Sticker } from '@/types/types.ts';

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

test('从推荐数据回填已保存盖戳', () => {
  const placement = createOptimisticStickerPlacement({
    id: 'saved-1',
    recommendationId: 'recA',
    userId: 'user-1',
    sticker: stampSticker,
    xRatio: 20,
    yRatio: 40,
    rotation: 6,
    createdAt: '2026-05-30T12:00:00.000Z',
  });
  const recommendations = [
    {
      id: 'recA',
      placed_stickers: [placement],
    },
    {
      id: 'recB',
      placed_stickers: [],
    },
  ] as Recommendation[];

  assert.deepEqual(getRecommendationStickerPlacements(recommendations), {
    recA: [placement],
    recB: [],
  });
});

test('补拉盖戳时保留已有本地状态并按 id 去重', () => {
  const optimisticPlacement = createOptimisticStickerPlacement({
    id: 'preview-3',
    recommendationId: 'recA',
    userId: 'user-1',
    sticker: stampSticker,
    xRatio: 44,
    yRatio: 32,
    rotation: 2,
    createdAt: '2026-05-30T12:00:00.000Z',
  });
  const savedPlacement = { ...optimisticPlacement, id: 'saved-3' };

  assert.deepEqual(
    mergeStickerPlacementMaps(
      { recA: [optimisticPlacement], recB: [] },
      { recA: [savedPlacement], recC: [savedPlacement] }
    ),
    {
      recA: [optimisticPlacement, savedPlacement],
      recB: [],
      recC: [savedPlacement],
    }
  );
});

test('保存成功后替换临时盖戳，保存失败后移除临时盖戳', () => {
  const optimisticPlacement = createOptimisticStickerPlacement({
    id: 'preview-4',
    recommendationId: 'recA',
    userId: 'user-1',
    sticker: stampSticker,
    xRatio: 52,
    yRatio: 48,
    rotation: -4,
    createdAt: '2026-05-30T12:00:00.000Z',
  });
  const savedPlacement = { ...optimisticPlacement, id: 'saved-4' };

  assert.deepEqual(
    replaceStickerPlacement({ recA: [optimisticPlacement] }, 'recA', 'preview-4', savedPlacement),
    { recA: [savedPlacement] }
  );
  assert.deepEqual(
    removeStickerPlacement({ recA: [optimisticPlacement] }, 'recA', 'preview-4'),
    { recA: [] }
  );
});
