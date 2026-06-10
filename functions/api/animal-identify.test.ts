import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./animal-identify.ts', import.meta.url), 'utf8');

test('动物识别先做主体检测再分类兜底', () => {
  assert.match(source, /const DETECTION_MODEL_ID = '@cf\/facebook\/detr-resnet-50'/);
  assert.match(source, /const CLASSIFICATION_MODEL_ID = '@cf\/microsoft\/resnet-50'/);
  assert.match(source, /detectAnimalCandidates\(env\.AI, bytes, dimensions\)/);
  assert.match(source, /classifyAnimalCandidates\(env\.AI, bytes\)/);
});

test('分类兜底低置信度不再硬猜', () => {
  assert.match(source, /const MIN_CLASSIFICATION_SCORE = 0\.32/);
  assert.match(source, /score < MIN_CLASSIFICATION_SCORE/);
  assert.match(source, /status: candidates\.length > 0 \? 'ready' : 'no-match'/);
});

test('动物检测过滤过小主体框并避免关键词误伤', () => {
  assert.match(source, /const MIN_DETECTION_BOX_AREA_RATIO = 0\.015/);
  assert.match(source, /const MIN_DETECTION_BOX_SHORT_SIDE = 72/);
  assert.match(source, /labelMatchesKeyword/);
  assert.match(source, /escapeRegExp/);
  assert.doesNotMatch(source, /normalizedLabel\.includes\(keyword\)/);
});

test('检测命中后不混入分类兜底候选', () => {
  assert.match(source, /detectionResult\.candidates\.length > 0\s+\? detectionResult\.candidates\s+: classificationResult\.candidates/);
});
