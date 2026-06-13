import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./AnimalStickerAlbum.tsx', import.meta.url), 'utf8');

test('神奇生物图鉴是贴画收集页而不是三列方格卡片', () => {
  assert.match(source, /ALBUM_STICKER_SLOTS/);
  assert.match(source, /cmi-wild-chiang-mai-2026-06\.png/);
  assert.match(source, /清迈神奇动物在哪里主 KV/);
  assert.match(source, /gridAutoRows: '1rem'/);
  assert.match(source, /gridColumn: `span \$\{slot\.colSpan\}`/);
  assert.match(source, /rotate\(\$\{slot\.rotation\}deg\)/);
  assert.match(source, /object-contain/);
  assert.doesNotMatch(source, /grid grid-cols-3 gap-3/);
});

test('旧动物照片在图鉴页会先转成临时贴纸预览', () => {
  assert.match(source, /createAnimalStickerFromImageUrl/);
  assert.match(source, /generatedStickerUrls/);
  assert.match(source, /generatedStickerIdsRef/);
  assert.match(source, /generatingStickerIdsRef/);
  assert.match(source, /failedStickerIdsRef/);
  assert.match(source, /entry\.needsStickerGeneration/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.doesNotMatch(source, /\}, \[entries, generatedStickerUrls\]\)/);
});
