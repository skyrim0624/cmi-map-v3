import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./Profile.tsx', import.meta.url), 'utf8');

test('个人主页提供主题版神奇生物照片图鉴', () => {
  assert.match(source, /AnimalStickerAlbum/);
  assert.match(source, /WildAnimalPhotoAlbum/);
  assert.match(source, /WILD_CHIANG_MAI_PROFILE_THEME_ENABLED/);
  assert.match(source, /profile-theme-wild-chiang-mai/);
  assert.match(source, /getWildAnimalStickerEntries/);
  assert.match(source, /'animals'/);
  assert.match(source, /神奇生物图鉴/);
});

test('个人主页记录不直接展示纯经纬度地点名', () => {
  assert.match(source, /getRecommendationMetaParts/);
  assert.doesNotMatch(source, /<span>\{rec\.place_name\}<\/span>/);
  assert.doesNotMatch(source, /<span className="mx-0\.5 opacity-50">\|<\/span>[\s\S]*<span>\{rec\.user_name\}<\/span>/);
});

test('个人主页手机端 tab 使用紧凑横滑样式', () => {
  assert.match(source, /sticky top-\[52px\][\s\S]*overflow-x-auto/);
  assert.match(source, /shrink-0/);
  assert.match(source, /text-\[13px\]/);
  assert.doesNotMatch(source, /min-w-\[6\.6rem\] flex-1/);
});
