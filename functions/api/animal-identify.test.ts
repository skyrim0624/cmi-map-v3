import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./animal-identify.ts', import.meta.url), 'utf8');

test('生物识别不再接入本地或 Cloudflare 开源物种模型', () => {
  assert.doesNotMatch(source, /const DETECTION_MODEL_ID = '@cf\/facebook\/detr-resnet-50'/);
  assert.doesNotMatch(source, /const CLASSIFICATION_MODEL_ID = '@cf\/microsoft\/resnet-50'/);
  assert.doesNotMatch(source, /const VISION_SPECIES_MODEL_ID = '@cf\/meta\/llama-3\.2-11b-vision-instruct'/);
  assert.match(source, /const GEMINI_SPECIES_MODEL_ID = 'gemini-2\.5-flash'/);
  assert.doesNotMatch(source, /const SELF_HOSTED_SPECIES_MODEL_ID = 'self-hosted-species-model'/);
  assert.doesNotMatch(source, /detectAnimalCandidates\(env\.AI, bytes, dimensions\)/);
  assert.doesNotMatch(source, /classifyAnimalCandidates\(env\.AI, bytes\)/);
});

test('Gemini 低置信度不再硬猜', () => {
  assert.match(source, /const MIN_VISION_SPECIES_CONFIDENCE = 0\.68/);
  assert.match(source, /vision\.confidence < MIN_VISION_SPECIES_CONFIDENCE/);
  assert.match(source, /status: candidates\.length > 0 \? 'ready' : 'no-match'/);
});

test('常见动物候选包含学名', () => {
  assert.match(source, /\['Canis lupus familiaris', '家犬'\]/);
  assert.match(source, /\['Felis catus', '家猫'\]/);
  assert.match(source, /\['Gekko gecko', '大壁虎'\]/);
  assert.match(source, /const TAXON_RANK_SPECIES = 'SPECIES'/);
  assert.match(source, /const TAXON_RANK_SUBSPECIES = 'SUBSPECIES'/);
});

test('GBIF 校验允许动植物但只返回物种级结果', () => {
  assert.match(source, /const TAXON_KINGDOM_PLANTAE = 'Plantae'/);
  assert.match(source, /const ALLOWED_GBIF_KINGDOMS = new Set\(\[TAXON_KINGDOM_ANIMALIA, TAXON_KINGDOM_PLANTAE\]\)/);
  assert.match(source, /!ALLOWED_GBIF_KINGDOMS\.has\(gbif\.kingdom \|\| ''\)/);
  assert.match(source, /!isSpeciesLevelRank\(taxonRank\)/);
  assert.match(source, /REJECTED_SCIENTIFIC_NAMES\.has\(scientificName\)/);
});

test('物种学名通过视觉模型和 GBIF 校验后才返回', () => {
  assert.match(source, /const GBIF_SPECIES_MATCH_URL = 'https:\/\/api\.gbif\.org\/v1\/species\/match'/);
  assert.match(source, /identifySpeciesCandidate\(env, imageBytes, image\.type \|\| 'image\/jpeg'\)/);
  assert.match(source, /GOOGLE_AI_STUDIO_API_KEY/);
  assert.doesNotMatch(source, /CMI_MAP_ENABLE_META_VISION_SPECIES/);
  assert.doesNotMatch(source, /CMI_MAP_SPECIES_MODEL_URL/);
  assert.doesNotMatch(source, /runSelfHostedSpeciesModel/);
  assert.match(source, /validateScientificNameWithGbif/);
  assert.match(source, /MIN_GBIF_SPECIES_CONFIDENCE/);
  assert.match(source, /!ALLOWED_GBIF_KINGDOMS\.has\(gbif\.kingdom \|\| ''\)/);
  assert.match(source, /isSpeciesLevelRank\(taxonRank\)/);
});

test('视觉模型提示词允许动植物但拒绝无主体图片', () => {
  assert.match(source, /Identify the primary visible animal or plant in this user photo/);
  assert.match(source, /"subjectBox":\{"x":0,"y":0,"width":0,"height":0\}/);
  assert.match(source, /"subjectPolygon":\[\{"x":0,"y":0\}\]/);
  assert.match(source, /introZh must be 2 concise Chinese sentences/);
  assert.match(source, /parsed\.organismPresent === true \|\| parsed\.animalPresent === true/);
  assert.match(source, /introZh: typeof parsed\.introZh === 'string' \? parsed\.introZh\.trim\(\) : ''/);
  assert.match(source, /subjectBox: normalizeSubjectBox\(parsed\.subjectBox\)/);
  assert.match(source, /subjectPolygon: normalizeSubjectPolygon\(parsed\.subjectPolygon\)/);
  assert.match(source, /set organismPresent to false/);
  assert.match(source, /If the primary visible subject is a human/);
});

test('专业物种识别只走 Gemini 2.5 Flash', () => {
  assert.match(source, /if \(!env\.GOOGLE_AI_STUDIO_API_KEY\)/);
  assert.match(source, /runGeminiSpeciesModel\(env\.GOOGLE_AI_STUDIO_API_KEY, imageBytes, mimeType\)/);
  assert.match(source, /thinkingConfig: \{\s+thinkingBudget: 0,\s+\}/);
  assert.match(source, /maxOutputTokens: 512/);
  assert.doesNotMatch(source, /runVisionSpeciesModel/);
  assert.doesNotMatch(source, /VISION_SPECIES_FALLBACK_MODEL_ID/);
  assert.doesNotMatch(source, /authorization: `Bearer \$\{token\}`/);
  assert.doesNotMatch(source, /env\.AI/);
});

test('没有 Gemini key 时接口明确不可用', () => {
  assert.match(source, /status: 'unavailable'/);
  assert.match(source, /provider: GEMINI_SPECIES_MODEL_ID/);
  assert.match(source, /message: '识别服务暂时不可用'/);
});

test('Gemini 限流或临时繁忙不会伪装成无匹配', () => {
  assert.match(source, /const GEMINI_MAX_ATTEMPTS = 2/);
  assert.match(source, /GEMINI_RETRYABLE_STATUS_CODES\.has\(response\.status\)/);
  assert.match(source, /new GeminiSpeciesModelUnavailableError/);
  assert.match(source, /status: 'unavailable'/);
  assert.match(source, /message: '识别服务繁忙，请稍后再试'/);
});

test('专业模型物种级结果优先展示', () => {
  assert.match(source, /const candidates = speciesCandidate \? \[speciesCandidate\] : \[\]/);
  assert.match(source, /introZh: vision\.introZh/);
  assert.match(source, /status: candidates\.length > 0 \? 'ready' : 'no-match'/);
  assert.match(source, /provider: GEMINI_SPECIES_MODEL_ID/);
});

test('网页截图类输入不再信任检测框硬猜动物', () => {
  assert.match(source, /If the photo is a screenshot, poster, web page, menu, document, or UI capture and does not contain a clear real animal or plant subject/);
  assert.match(source, /set organismPresent to false/);
});

test('大面积人物照片不会再交给物种模型硬猜', () => {
  assert.match(source, /If the primary visible subject is a human/);
  assert.match(source, /set organismPresent to false/);
});
