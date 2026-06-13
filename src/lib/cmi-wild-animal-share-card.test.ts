import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./cmi-wild-animal-share-card.ts', import.meta.url), 'utf8');

test('神奇动物分享卡使用 Image Gen 模板母版和真实照片叠加', () => {
  assert.match(source, /wild-chiang-mai-template-v4\.png/);
  assert.match(source, /loadImageFromFile\(photoFile\)/);
  assert.match(source, /drawImageCover\(context, photoImage/);
  assert.match(source, /const PHOTO_BOX = \{ x: 50, y: 470, width: 924, height: 618, radius: 30 \}/);
  assert.match(source, /drawImageCover\(context, photoImage, PHOTO_BOX\.x, PHOTO_BOX\.y, PHOTO_BOX\.width, PHOTO_BOX\.height\);\n  context\.drawImage\(templateImage/);
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
  assert.match(source, /const NUMBER_BOX = \{ x: 735, y: 51, width: 232, height: 78, radius: 39 \}/);
  assert.doesNotMatch(source, /CMI No/);
  assert.match(source, /drawNumberPill\(context, captureNumberLabel\)/);
});

test('神奇动物分享卡动态文字使用偏手写圆体且加重', () => {
  assert.match(source, /"Hannotate SC", "HanziPen SC", "Wawati SC", "Yuanti SC"/);
  assert.match(source, /const INTRO_FONT = `900 29px \$\{FONT_FAMILY\}`/);
  assert.match(source, /const NUMBER_FONT = `900 38px \$\{FONT_FAMILY\}`/);
  assert.match(source, /const TIMESTAMP_FONT = `900 30px \$\{FONT_FAMILY\}`/);
  assert.match(source, /SPECIES_NAME_BOX\.width - 28,\n    42,/);
});

test('神奇动物分享卡使用干净二维码区域', () => {
  assert.match(source, /const QR_BOX = \{ x: 736, y: 1179, size: 196 \}/);
  assert.match(source, /const QR_BACKGROUND_BOX = \{ x: 724, y: 1167, size: 220, radius: 8 \}/);
  assert.match(source, /context\.drawImage\(qrImage, QR_BOX\.x, QR_BOX\.y, QR_BOX\.size, QR_BOX\.size\)/);
  assert.doesNotMatch(source, /QR_SLOGAN_TEXT|QR_SLOGAN_BOX|drawPanelCover|PAW_STAMP_COVER|drawQuietPawMagnifier|drawQuietStampPatch|PAW_STAMP_ICON/);
});

test('神奇动物分享卡底部只叠加动物名、介绍和时间戳', () => {
  assert.match(source, /const SPECIES_NAME_BOX = \{ x: 250, y: 1116, width: 340, height: 54 \}/);
  assert.match(source, /const INTRO_BOX = \{ x: 145, y: 1210, width: 480, lineHeight: 52, maxLines: 3 \}/);
  assert.match(source, /const TIMESTAMP_BOX = \{ x: 162, y: 1418, width: 345, height: 78 \}/);
  assert.match(source, /candidate\.introZh\?\.trim\(\) \|\|/);
  assert.match(source, /speciesIntroById\[candidate\.id\] \|\|/);
  assert.match(source, /getAnimalIntro\(candidate\) \|\|/);
  assert.match(source, /drawWrappedText\(\s+context,\s+getIntro\(candidate\),/);
  assert.match(source, /drawCenteredText\(\s+context,\s+timestamp,/);
  assert.doesNotMatch(source, /drawInfoRow\(context, '发现者'|drawInfoRow\(context, '时间'|drawInfoRow\(context, '地点'|drawInfoRow\(context, '介绍'/);
  assert.doesNotMatch(source, /COLLECTION_PROGRESS_BOX|collectionProgress|COLLECTION_PROGRESS_FONT|PHOTO_DECORATION_PATCHES|drawTemplateDecorationPatches|BOTTOM_LEFT_COVER|BOTTOM_CENTER_COVER|BOTTOM_RIGHT_COVER/);
});

test('神奇动物分享卡不再调用系统分享面板', () => {
  assert.match(source, /downloadCmiWildAnimalShareCard/);
  assert.doesNotMatch(source, /navigatorWithShare|navigator\.share|canShare|shareOrDownloadCmiWildAnimalShareCard/);
});
