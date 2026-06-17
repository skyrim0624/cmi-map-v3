import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./AnimalStickerAlbum.tsx', import.meta.url), 'utf8');

test('神奇生物图鉴是可向下延伸的贴画收集页', () => {
  assert.match(source, /ALBUM_STICKER_SLOTS/);
  assert.match(source, /wild-sticker-album-board-v1\.webp/);
  assert.match(source, /ALBUM_BOARD_ASPECT_HEIGHT \* albumPageCount/);
  assert.match(source, /getAlbumPageCount/);
  assert.match(source, /ALBUM_STICKERS_PER_PAGE = ALBUM_STICKER_SLOTS\.length/);
  assert.match(source, /backgroundRepeat: 'repeat-y'/);
  assert.match(source, /backgroundSize: '100% auto'/);
  assert.match(source, /背景图按页重复，贴纸位按每页 8 个继续往下排/);
  assert.match(source, /gridTemplateRows: `repeat\(\$\{ALBUM_STICKER_ROW_COUNT\}, minmax\(0, 1fr\)\)`/);
  assert.match(source, /gridColumn: `\$\{slot\.colStart\} \/ span \$\{slot\.colSpan\}`/);
  assert.match(source, /rotate\(\$\{slot\.rotation\}deg\)/);
  assert.doesNotMatch(source, /cmi-wild-chiang-mai-2026-06\.png/);
  assert.doesNotMatch(source, /backgroundSize: 'cover'/);
  assert.doesNotMatch(source, /aspect-\[941\/1672\]/);
  assert.doesNotMatch(source, /object-fill/);
  assert.doesNotMatch(source, /grid grid-cols-3 gap-3/);
});

test('图鉴贴纸直接使用圆形照片，不再展示轮廓抠图', () => {
  assert.match(source, /getAnimalStickerPhotoUrl/);
  assert.match(source, /entry\.photoUrl\?\.trim\(\) \|\| entry\.stickerUrl/);
  assert.match(source, /getAnimalStickerObjectPosition/);
  assert.match(source, /rounded-full/);
  assert.match(source, /border-\[7px\] border-\[#fffef5\]/);
  assert.match(source, /object-cover/);
  assert.match(source, /objectPosition: getAnimalStickerObjectPosition\(entry\.subjectBox\)/);
  assert.doesNotMatch(source, /createAnimalStickerFromImageUrl/);
  assert.doesNotMatch(source, /generatedStickerUrls/);
  assert.doesNotMatch(source, /isFallbackPhotoSticker/);
  assert.doesNotMatch(source, /entry\.needsStickerGeneration \? undefined : entry\.stickerUrl/);
});
