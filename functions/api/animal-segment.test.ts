import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./animal-segment.ts', import.meta.url), 'utf8');

test('动物抠图接口代理自托管分割模型而不是图像生成', () => {
  assert.match(source, /CMI_MAP_SEGMENT_MODEL_URL/);
  assert.match(source, /CMI_MAP_SEGMENT_MODEL_TOKEN/);
  assert.match(source, /getSegmentModelUrl\(env\)/);
  assert.match(source, /formData\.append\('image', image, image\.name \|\| 'animal-checkin\.jpg'\)/);
  assert.match(source, /formData\.append\('subjectBox', subjectBox\)/);
  assert.match(source, /headers\.set\('authorization', `Bearer \$\{token\}`\)/);
  assert.match(source, /'accept': 'image\/png'/);
  assert.match(source, /'content-type': 'image\/png'/);
  assert.doesNotMatch(source, /GEMINI|GOOGLE_AI|image generate|Image Gen/i);
});

test('动物抠图接口未配置自托管模型时走 Cloudflare 前景分割', () => {
  assert.match(source, /IMAGES\?: CloudflareImagesBinding/);
  assert.match(source, /createCloudflareForegroundCutout\(image, env\)/);
  assert.match(source, /\.transform\(\{ segment: 'foreground' \}\)/);
  assert.match(source, /\.output\(\{ format: 'image\/png' \}\)/);
  assert.match(source, /Cloudflare Images 前景分割失败/);
});

test('动物抠图接口限制输入并在模型不可用时明确失败', () => {
  assert.match(source, /const MAX_IMAGE_BYTES = 8 \* 1024 \* 1024/);
  assert.match(source, /image\.size > MAX_IMAGE_BYTES/);
  assert.match(source, /status: 'unavailable'/);
  assert.match(source, /message: '抠图服务暂时不可用'/);
  assert.match(source, /status: 'error'/);
  assert.match(source, /message: '需要上传图片'/);
});
