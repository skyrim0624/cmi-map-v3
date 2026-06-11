import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CmiEventDetail.tsx', import.meta.url), 'utf8');

test('打卡型活动详情页不显示报名按钮', () => {
  assert.match(source, /isCmiMapCheckinActivityEvent/);
  assert.match(source, /const isCheckinActivityEvent = event \? isCmiMapCheckinActivityEvent\(event\) : false/);
  assert.match(source, /<WildChiangMaiEventHome/);
  assert.match(source, /isCheckinActivityEvent \? 'grid-cols-2' : 'grid-cols-3'/);
  assert.match(source, /!\s*isCheckinActivityEvent && \(/);
});

test('神奇动物活动主页接入推荐动态互动状态', () => {
  assert.match(source, /loadRecommendationStickerPlacements\(recapRecommendations\)/);
  assert.match(source, /toggleRecommendationWishlist\(recommendation\.id, user\.id\)/);
  assert.match(source, /placeRecommendationSticker\(\{/);
  assert.match(source, /onOpenComment=\{\(recommendation\) => navigate\(getAddTracePath\(recommendation\.place_name\)\)\}/);
  assert.match(source, /wishlistStateByRecommendationId=\{wishlistStateByRecommendationId\}/);
  assert.match(source, /onStartStamp=\{handleStartStamp\}/);
  assert.match(source, /onToggleWishlist=\{handleToggleWishlist\}/);
});
