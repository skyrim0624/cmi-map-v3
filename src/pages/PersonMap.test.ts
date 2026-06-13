import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./PersonMap.tsx', import.meta.url), 'utf8');

test('公开个人主页提供 TA 的神奇动物图鉴', () => {
  assert.match(source, /AnimalStickerAlbum/);
  assert.match(source, /getWildAnimalStickerEntries/);
  assert.match(source, /activeTab === 'animals'/);
  assert.match(source, /animalStickerEntries/);
});
