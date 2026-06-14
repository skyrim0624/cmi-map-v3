import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./cmi-wild-animal-stickers.ts', import.meta.url), 'utf8');

test('动物贴纸优先使用自动抠图 mask 再回退粗轮廓裁切', () => {
  assert.match(source, /const ANIMAL_SEGMENT_ENDPOINT = '\/api\/animal-segment'/);
  assert.match(source, /requestAnimalSubjectCutout\(photoFile, geometry\)/);
  assert.match(source, /formData\.append\('image', uploadFile, 'animal-segment\.jpg'\)/);
  assert.match(source, /formData\.append\('imageUrl', geometry\.sourceImageUrl\)/);
  assert.match(source, /formData\.append\('subjectBox', JSON\.stringify\(geometry\.subjectBox\)\)/);
  assert.match(source, /createStickerFromSegmentedCutout\(cutoutBlob, geometry\)/);
  assert.match(source, /createFallbackPolygonStickerFromPhoto\(photoFile, geometry\)/);
  assert.match(source, /catch \(error\) \{/);
  assert.match(source, /自动抠图失败，回退到粗轮廓贴纸/);
});

test('透明抠图贴纸会重新加白边和阴影而不是直接上传原始 cutout', () => {
  assert.match(source, /getAlphaBounds/);
  assert.match(source, /createTintedSilhouette/);
  assert.match(source, /drawStickerOutline/);
  assert.match(source, /shadowBlur = 22/);
  assert.match(source, /canvasToBlob\(canvas, 'image\/webp', 0\.94\)/);
  assert.doesNotMatch(source, /imglyRemoveBackground|removeBackground|Image Gen/i);
});

test('图鉴旧照片条目标记为需要现场生成贴纸', () => {
  assert.match(source, /needsStickerGeneration: !metadata\?\.stickerUrl/);
  assert.match(source, /subjectBox: metadata\?\.subjectBox \|\| null/);
  assert.match(source, /createAnimalStickerFromImageUrl/);
  assert.match(source, /sourceImageUrl: photoUrl/);
});
