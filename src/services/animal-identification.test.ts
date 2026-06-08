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
