import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./AnimalStickerAlbum.tsx', import.meta.url), 'utf8');

test('神奇生物图鉴是贴画收集页而不是三列方格卡片', () => {
  assert.match(source, /ALBUM_STICKER_SLOTS/);
  assert.match(source, /wild-sticker-album-board-v1\.webp/);
  assert.match(source, /按主 KV 风格重新生成的留白画板/);
  assert.match(source, /aspect-\[941\/1672\]/);
  assert.match(source, /object-fill/);
  assert.match(source, /gridTemplateRows: 'repeat\(30, minmax\(0, 1fr\)\)'/);
  assert.match(source, /gridColumn: `\$\{slot\.colStart\} \/ span \$\{slot\.colSpan\}`/);
  assert.match(source, /rotate\(\$\{slot\.rotation\}deg\)/);
  assert.match(source, /object-contain/);
  assert.doesNotMatch(source, /cmi-wild-chiang-mai-2026-06\.png/);
  assert.doesNotMatch(source, /backgroundSize: 'cover'/);
  assert.doesNotMatch(source, /grid grid-cols-3 gap-3/);
});

test('旧动物照片在图鉴页会先转成临时贴纸预览', () => {
  assert.match(source, /createAnimalStickerFromImageUrl/);
  assert.match(source, /generatedStickerUrls/);
  assert.match(source, /generatedStickerIdsRef/);
  assert.match(source, /generatingStickerIdsRef/);
  assert.match(source, /failedStickerIdsRef/);
  assert.match(source, /entry\.needsStickerGeneration/);
  assert.match(source, /displayStickerUrl: generatedStickerUrls\[entry\.id\] \|\| entry\.stickerUrl/);
  assert.match(source, /isFallbackPhotoSticker/);
  assert.match(source, /border-\[7px\] border-\[#fffef5\]/);
  assert.match(source, /STICKER_GENERATION_BATCH_SIZE = 3/);
  assert.match(source, /Promise\.all\(batch\.map/);
  assert.match(source, /URL\.revokeObjectURL/);
  assert.doesNotMatch(source, /\}, \[entries, generatedStickerUrls\]\)/);
  assert.doesNotMatch(source, /entry\.needsStickerGeneration \? undefined : entry\.stickerUrl/);
});
