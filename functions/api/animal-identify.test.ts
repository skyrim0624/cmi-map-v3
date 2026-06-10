import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./animal-identify.ts', import.meta.url), 'utf8');

test('动物识别先做主体检测再分类兜底', () => {
  assert.match(source, /const DETECTION_MODEL_ID = '@cf\/facebook\/detr-resnet-50'/);
  assert.match(source, /const CLASSIFICATION_MODEL_ID = '@cf\/microsoft\/resnet-50'/);
  assert.match(source, /const VISION_SPECIES_MODEL_ID = '@cf\/meta\/llama-3\.2-11b-vision-instruct'/);
  assert.match(source, /const GEMINI_SPECIES_MODEL_ID = 'gemini-2\.5-flash'/);
  assert.match(source, /const SELF_HOSTED_SPECIES_MODEL_ID = 'self-hosted-species-model'/);
  assert.match(source, /detectAnimalCandidates\(env\.AI, bytes, dimensions\)/);
  assert.match(source, /classifyAnimalCandidates\(env\.AI, bytes\)/);
});

test('分类兜底低置信度不再硬猜', () => {
  assert.match(source, /const MIN_CLASSIFICATION_SCORE = 0\.32/);
  assert.match(source, /score < MIN_CLASSIFICATION_SCORE/);
  assert.match(source, /status: candidates\.length > 0 \? 'ready' : 'no-match'/);
});

test('常见动物候选包含学名', () => {
  assert.match(source, /scientificName: 'Canis lupus familiaris'/);
  assert.match(source, /nameZh: '家犬'/);
  assert.match(source, /scientificName: 'Felis catus'/);
  assert.match(source, /nameZh: '家猫'/);
  assert.match(source, /scientificName: 'Gekko gecko'/);
  assert.match(source, /taxonRank: TAXON_RANK_SPECIES/);
  assert.match(source, /taxonRank: TAXON_RANK_SUBSPECIES/);
});

test('物种学名通过视觉模型和 GBIF 校验后才返回', () => {
  assert.match(source, /const GBIF_SPECIES_MATCH_URL = 'https:\/\/api\.gbif\.org\/v1\/species\/match'/);
  assert.match(source, /identifySpeciesCandidate\(env, bytes, image\.type \|\| 'image\/jpeg', coarseCandidates\)/);
  assert.match(source, /GOOGLE_AI_STUDIO_API_KEY/);
  assert.match(source, /CMI_MAP_ENABLE_META_VISION_SPECIES/);
  assert.match(source, /CMI_MAP_SPECIES_MODEL_URL/);
  assert.match(source, /runSelfHostedSpeciesModel/);
  assert.match(source, /validateScientificNameWithGbif/);
  assert.match(source, /MIN_GBIF_SPECIES_CONFIDENCE/);
  assert.match(source, /gbif\.kingdom !== 'Animalia'/);
  assert.match(source, /isSpeciesLevelRank\(taxonRank\)/);
});

test('自托管专业模型优先于付费视觉大模型', () => {
  assert.match(source, /if \(env\.CMI_MAP_SPECIES_MODEL_URL\)/);
  assert.ok(source.indexOf('env.CMI_MAP_SPECIES_MODEL_URL') < source.indexOf('env.GOOGLE_AI_STUDIO_API_KEY'));
  assert.match(source, /authorization: `Bearer \$\{token\}`/);
  assert.match(source, /toVisionSpeciesResultFromRecord/);
});

test('已有物种级结果走快速路径', () => {
  assert.match(source, /needsVisionSpeciesLookup\(coarseCandidates\)/);
  assert.match(source, /bestSpeciesLevelCandidate\(coarseCandidates\)/);
});

test('动物检测过滤过小主体框并避免关键词误伤', () => {
  assert.match(source, /const MIN_DETECTION_BOX_AREA_RATIO = 0\.015/);
  assert.match(source, /const MIN_DETECTION_BOX_SHORT_SIDE = 72/);
  assert.match(source, /labelMatchesKeyword/);
  assert.match(source, /escapeRegExp/);
  assert.doesNotMatch(source, /normalizedLabel\.includes\(keyword\)/);
});

test('网页截图类输入不再信任检测框硬猜动物', () => {
  assert.match(source, /const MIN_NON_FIELD_PHOTO_SCORE = 0\.55/);
  assert.match(source, /const nonFieldPhotoLabels = new Set/);
  assert.match(source, /'web site'/);
  assert.match(source, /hasStrongNonFieldPhotoSignal\(classificationResult\.rawLabels\)/);
  assert.match(source, /const hasSpeciesLevelDetection = Boolean\(bestSpeciesLevelCandidate\(detectionResult\.candidates\)\)/);
  assert.match(source, /const shouldSuppressCoarseDetection = isNonFieldPhoto && !hasSpeciesLevelDetection/);
  assert.match(source, /shouldSuppressCoarseDetection\s+\?\s+\[\]/);
});

test('检测命中后不混入分类兜底候选', () => {
  assert.match(source, /!shouldSuppressCoarseDetection && detectionResult\.candidates\.length > 0\s+\? detectionResult\.candidates/);
});
