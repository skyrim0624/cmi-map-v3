import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./animal-identification.ts', import.meta.url), 'utf8');

test('生物识别上传前压缩到轻量图片', () => {
  assert.match(source, /maxWidthOrHeight: 768/);
  assert.match(source, /maxSizeMB: 0\.9/);
  assert.match(source, /outputType: 'image\/jpeg'/);
});

test('生物识别通过同源 Pages Function 调用', () => {
  assert.match(source, /const ANIMAL_IDENTIFICATION_ENDPOINT = '\/api\/animal-identify'/);
  assert.match(source, /formData\.append\('image'/);
});

test('生物识别文案不再输出可能式猜测', () => {
  assert.match(source, /`这是\$\{chineseName\}。\$\{intro\}`/);
  assert.match(source, /getAnimalChineseName\(candidate\)/);
  assert.match(source, /getAnimalIntro\(candidate\)/);
  assert.match(source, /isSpeciesLevelRank\(candidate\.taxonRank\)/);
  assert.match(source, /需要更近照片才能定到具体物种/);
  assert.doesNotMatch(source, /可能是/);
});

test('物种识别结果会生成基础介绍', () => {
  assert.match(source, /export const getAnimalIntro = \(candidate: AnimalIdentificationCandidate\) =>/);
  assert.match(source, /const animalIntroByScientificName: Record<string, string>/);
  assert.match(source, /'Hemidactylus frenatus': '疣尾蜥虎是城市里很常见的小型壁虎/);
  assert.match(source, /'Halcyon pileata': '蓝翡翠常见于水边/);
  assert.match(source, /'Bougainvillea spectabilis': '叶子花在清迈街边和院墙上很常见/);
  assert.match(source, /'Plumeria rubra': '红鸡蛋花常见于寺庙、庭院和街边/);
  assert.match(source, /'Canis lupus familiaris': animalIntroById\.dog/);
  assert.match(source, /return `这是\$\{chineseName\}。\$\{intro\}`/);
});

test('生物候选展示名优先使用中文名', () => {
  assert.match(source, /const fallbackChineseNames: Record<string, string>/);
  assert.match(source, /export const getAnimalChineseName = \(candidate: AnimalIdentificationCandidate\) =>/);
  assert.match(source, /export const formatAnimalCandidateLabel = \(candidate: AnimalIdentificationCandidate\) =>\s+getAnimalChineseName\(candidate\)/);
  assert.doesNotMatch(source, /清迈小狗|清迈街猫|清迈大壁虎/);
});

test('植物粗分类有中文名和基础说明', () => {
  assert.match(source, /plant: 'Plantae'/);
  assert.match(source, /flower: 'Angiosperms'/);
  assert.match(source, /orchid: 'Orchidaceae'/);
  assert.match(source, /plant: '植物'/);
  assert.match(source, /flower: '花卉植物'/);
  assert.match(source, /植物识别要看花、叶、果实、树皮和生长环境/);
});
