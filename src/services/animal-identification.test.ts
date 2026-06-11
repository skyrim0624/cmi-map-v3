import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./animal-identification.ts', import.meta.url), 'utf8');

test('动物识别上传前压缩到轻量图片', () => {
  assert.match(source, /maxWidthOrHeight: 768/);
  assert.match(source, /maxSizeMB: 0\.9/);
  assert.match(source, /outputType: 'image\/jpeg'/);
});

test('动物识别通过同源 Pages Function 调用', () => {
  assert.match(source, /const ANIMAL_IDENTIFICATION_ENDPOINT = '\/api\/animal-identify'/);
  assert.match(source, /formData\.append\('image'/);
});

test('动物识别文案不再输出可能式猜测', () => {
  assert.match(source, /`这是\$\{chineseName\}。`/);
  assert.match(source, /getAnimalChineseName\(candidate\)/);
  assert.match(source, /isSpeciesLevelRank\(candidate\.taxonRank\)/);
  assert.match(source, /需要更近照片才能定到具体物种/);
  assert.doesNotMatch(source, /可能是/);
});

test('动物候选展示名优先使用中文名', () => {
  assert.match(source, /const fallbackChineseNames: Record<string, string>/);
  assert.match(source, /export const getAnimalChineseName = \(candidate: AnimalIdentificationCandidate\) =>/);
  assert.match(source, /export const formatAnimalCandidateLabel = \(candidate: AnimalIdentificationCandidate\) =>\s+getAnimalChineseName\(candidate\)/);
  assert.doesNotMatch(source, /清迈小狗|清迈街猫|清迈大壁虎/);
});
