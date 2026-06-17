import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./cmi-wild-animal-stickers.ts', import.meta.url), 'utf8');

test('动物贴纸生成圆形照片贴纸，不再沿主体边缘抠图', () => {
  assert.match(source, /const STICKER_FRAME_RADIUS = 322/);
  assert.match(source, /const STICKER_PHOTO_RADIUS = 282/);
  assert.match(source, /const addCirclePath = \(context: CanvasRenderingContext2D, radius: number\) =>/);
  assert.match(source, /createCircularPhotoStickerFromPhoto\(photoFile, geometry\)/);
  assert.match(source, /getExpandedCrop\(image, geometry\.subjectBox\)/);
  assert.match(source, /addCirclePath\(context, STICKER_PHOTO_RADIUS\)/);
  assert.match(source, /context\.clip\(\)/);
  assert.match(source, /canvasToBlob\(canvas, 'image\/webp', 0\.92\)/);
  assert.doesNotMatch(source, /ANIMAL_SEGMENT_ENDPOINT/);
  assert.doesNotMatch(source, /requestAnimalSubjectCutout/);
  assert.doesNotMatch(source, /createFallbackPolygonStickerFromPhoto/);
});

test('圆形照片贴纸保留白边和阴影，不再保留旧轮廓路径', () => {
  assert.match(source, /shadowBlur = 24/);
  assert.match(source, /shadowOffsetX = 12/);
  assert.match(source, /shadowOffsetY = 18/);
  assert.match(source, /context\.fillStyle = '#fffef5'/);
  assert.match(source, /context\.strokeStyle = '#fffef5'/);
  assert.doesNotMatch(source, /getAlphaBounds/);
  assert.doesNotMatch(source, /createTintedSilhouette/);
  assert.doesNotMatch(source, /drawStickerOutline/);
  assert.doesNotMatch(source, /自动抠图失败|粗轮廓贴纸/);
  assert.doesNotMatch(source, /imglyRemoveBackground|removeBackground|Image Gen/i);
});

test('图鉴旧照片条目标记为需要现场生成贴纸', () => {
  assert.match(source, /needsStickerGeneration: !metadata\?\.stickerUrl/);
  assert.match(source, /subjectBox: metadata\?\.subjectBox \|\| null/);
  assert.match(source, /createAnimalStickerFromImageUrl/);
  assert.match(source, /createAnimalStickerFromPhoto\(sourceFile, geometry\)/);
});

test('图鉴照片条目保留识别出的动物名称字段', () => {
  assert.match(source, /const commonName = recommendation\.animal_common_name\?\.trim\(\) \|\| metadata\?\.commonName \|\| ''/);
  assert.match(source, /const scientificName = recommendation\.animal_scientific_name\?\.trim\(\) \|\| metadata\?\.scientificName \|\| ''/);
  assert.match(source, /!commonName && !scientificName && !subjectBox/);
  assert.match(source, /commonName,\n    scientificName,\n    subjectBox,/);
});
