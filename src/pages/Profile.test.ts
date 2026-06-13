import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./Profile.tsx', import.meta.url), 'utf8');

test('个人主页提供神奇生物图鉴贴纸册', () => {
  assert.match(source, /AnimalStickerAlbum/);
  assert.match(source, /getWildAnimalStickerEntries/);
  assert.match(source, /'animals'/);
  assert.match(source, /神奇生物图鉴/);
});
