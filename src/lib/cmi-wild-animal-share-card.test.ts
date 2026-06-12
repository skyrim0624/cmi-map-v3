import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./cmi-wild-animal-share-card.ts', import.meta.url), 'utf8');

test('神奇动物分享卡使用 Image Gen 模板母版和真实照片叠加', () => {
  assert.match(source, /wild-chiang-mai-template-v2\.png/);
  assert.match(source, /loadImageFromFile\(photoFile\)/);
  assert.match(source, /drawImageCover\(context, photoImage/);
  assert.match(source, /const PHOTO_BOX = \{ x: 66, y: 506, width: 892, height: 478, radius: 26 \}/);
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
  assert.match(source, /drawNumberPill\(context, captureNumberLabel\)/);
});

test('神奇动物分享卡使用新模板自带二维码和口号区域', () => {
  assert.match(source, /const QR_BOX = \{ x: 734, y: 1196, size: 200 \}/);
  assert.match(source, /context\.fillRect\(QR_BOX\.x, QR_BOX\.y, QR_BOX\.size, QR_BOX\.size\)/);
  assert.doesNotMatch(source, /QR_SLOGAN_TEXT|QR_SLOGAN_BOX|drawPanelCover|PAW_STAMP_COVER|drawQuietPawMagnifier|drawQuietStampPatch|PAW_STAMP_ICON/);
});

test('神奇动物分享卡底部只叠加动物名、介绍和时间戳', () => {
  assert.match(source, /const SPECIES_NAME_BOX = \{ x: 230, y: 1130, width: 340, height: 54 \}/);
  assert.match(source, /const INTRO_BOX = \{ x: 145, y: 1232, width: 470, lineHeight: 50, maxLines: 3 \}/);
  assert.match(source, /const TIMESTAMP_BOX = \{ x: 164, y: 1432, width: 324, height: 72 \}/);
  assert.match(source, /drawWrappedText\(\s+context,\s+getIntro\(candidate\),/);
  assert.match(source, /drawCenteredText\(\s+context,\s+timestamp,/);
  assert.doesNotMatch(source, /drawInfoRow\(context, '发现者'|drawInfoRow\(context, '时间'|drawInfoRow\(context, '地点'|drawInfoRow\(context, '介绍'/);
  assert.doesNotMatch(source, /COLLECTION_PROGRESS_BOX|collectionProgress|COLLECTION_PROGRESS_FONT|PHOTO_DECORATION_PATCHES|drawTemplateDecorationPatches|BOTTOM_LEFT_COVER|BOTTOM_CENTER_COVER|BOTTOM_RIGHT_COVER/);
});

test('神奇动物分享卡不再调用系统分享面板', () => {
  assert.match(source, /downloadCmiWildAnimalShareCard/);
  assert.doesNotMatch(source, /navigatorWithShare|navigator\.share|canShare|shareOrDownloadCmiWildAnimalShareCard/);
});
