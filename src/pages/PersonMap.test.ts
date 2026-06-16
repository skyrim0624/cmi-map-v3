import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./PersonMap.tsx', import.meta.url), 'utf8');

test('公开个人主页提供 TA 的神奇生物图鉴', () => {
  assert.match(source, /AnimalStickerAlbum/);
  assert.match(source, /getWildAnimalStickerEntries/);
  assert.match(source, /activeTab === 'animals'/);
  assert.match(source, /animalStickerEntries/);
  assert.match(source, /TA 还没有神奇生物贴纸/);
});

test('公开个人主页记录不直接展示纯经纬度地点名', () => {
  assert.match(source, /getRecommendationMetaParts/);
  assert.doesNotMatch(source, /\{recommendation\.place_name\}\s*<span className="mx-0\.5 opacity-50">\|<\/span>/);
});
