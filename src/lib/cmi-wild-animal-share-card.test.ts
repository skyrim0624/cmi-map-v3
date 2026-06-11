import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./cmi-wild-animal-share-card.ts', import.meta.url), 'utf8');

test('神奇动物分享卡使用 Image Gen 模板母版和真实照片叠加', () => {
  assert.match(source, /wild-chiang-mai-template-v1\.png/);
  assert.match(source, /loadImageFromFile\(photoFile\)/);
  assert.match(source, /drawImageCover\(context, photoImage/);
  assert.doesNotMatch(source, /清迈小狗/);
  assert.doesNotMatch(source, /清迈街猫/);
  assert.doesNotMatch(source, /清迈大壁虎/);
});

test('神奇动物分享卡主展示中文名和真实活动二维码', () => {
  assert.match(source, /getAnimalChineseName\(candidate\)/);
  assert.match(source, /drawFittedText\(\s+context,\s+chineseName,/);
  assert.doesNotMatch(source, /getAnimalScientificName\(candidate\)/);
  assert.doesNotMatch(source, /candidate\.rawLabel \|\| candidate\.nameEn/);
  assert.match(source, /getPublicCmiEventUrl\(CMI_MAP_WILD_CHIANG_MAI_EVENT_ID\)/);
  assert.match(source, /CMI No\.\$\{captureNumber\}/);
});

test('神奇动物分享卡弱化右下角爪印并放大二维码', () => {
  assert.match(source, /const PAW_STAMP_COVER = \{ x: 704, y: 1146, width: 226, height: 216, radius: 58 \}/);
  assert.match(source, /const PAW_STAMP_ICON = \{ x: 816, y: 1237, radius: 34 \}/);
  assert.match(source, /drawQuietStampPatch\(context\)/);
  assert.match(source, /context\.globalAlpha = 0\.78/);
  assert.match(source, /const QR_BOX = \{ x: 806, y: 1350, size: 150 \}/);
  assert.match(source, /const QR_BACKING_BOX = \{ x: 794, y: 1338, size: 174, radius: 12 \}/);
});

test('神奇动物分享卡底部进度号使用独立胶囊对齐', () => {
  assert.match(source, /const COLLECTION_PROGRESS_BOX = \{ x: 618, y: 1414, width: 178, height: 54, radius: 27 \}/);
  assert.match(source, /COLLECTION_PROGRESS_FONT/);
  assert.match(source, /drawCenteredText\(\s+context,\s+collectionProgress,\s+COLLECTION_PROGRESS_BOX\.x,/);
  assert.doesNotMatch(source, /drawCenteredText\(context, collectionProgress, 630, 1432, 160, 44/);
});

test('神奇动物分享卡不再调用系统分享面板', () => {
  assert.match(source, /downloadCmiWildAnimalShareCard/);
  assert.doesNotMatch(source, /navigatorWithShare|navigator\.share|canShare|shareOrDownloadCmiWildAnimalShareCard/);
});
