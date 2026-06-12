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
  assert.match(source, /NO\. \$\{String\(captureNumber\)\.padStart\(3, '0'\)\}/);
  assert.doesNotMatch(source, /CMI No/);
});

test('神奇动物分享卡右下角去掉爪印并改为二维码和口号', () => {
  assert.match(source, /const PAW_STAMP_COVER = \{ x: 616, y: 1092, width: 360, height: 292, radius: 30 \}/);
  assert.match(source, /drawPanelCover\(context\)/);
  assert.match(source, /const QR_BOX = \{ x: 734, y: 1138, size: 198 \}/);
  assert.match(source, /const QR_SLOGAN_TEXT = '扫码探索万物'/);
  assert.match(source, /QR_SLOGAN_BOX/);
  assert.doesNotMatch(source, /drawQuietPawMagnifier|drawQuietStampPatch|PAW_STAMP_ICON|context\.globalAlpha = 0\.52/);
});

test('神奇动物分享卡底部只保留介绍、时间戳和装饰贴片', () => {
  assert.match(source, /const INTRO_BOX = \{ x: 92, y: 1180, width: 492, lineHeight: 38, maxLines: 4 \}/);
  assert.match(source, /drawWrappedText\(\s+context,\s+getIntro\(candidate\),/);
  assert.match(source, /const BOTTOM_LEFT_COVER = \{ x: 104, y: 1400, width: 420, height: 62, radius: 18 \}/);
  assert.match(source, /drawCenteredText\(\s+context,\s+timestamp,/);
  assert.match(source, /drawTemplateDecorationPatches\(context, templateImage\)/);
  assert.doesNotMatch(source, /drawInfoRow\(context, '发现者'|drawInfoRow\(context, '时间'|drawInfoRow\(context, '地点'|drawInfoRow\(context, '介绍'/);
  assert.doesNotMatch(source, /COLLECTION_PROGRESS_BOX|collectionProgress|COLLECTION_PROGRESS_FONT/);
});

test('神奇动物分享卡不再调用系统分享面板', () => {
  assert.match(source, /downloadCmiWildAnimalShareCard/);
  assert.doesNotMatch(source, /navigatorWithShare|navigator\.share|canShare|shareOrDownloadCmiWildAnimalShareCard/);
});
