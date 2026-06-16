import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const apiSource = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');

test('推荐写入兼容重试会识别动物贴纸字段', () => {
  assert.match(apiSource, /animalSticker:\s*animalStickerFields\.some/);
  assert.match(apiSource, /delete payload\.animal_sticker_url/);
  assert.match(apiSource, /delete payload\.animal_common_name/);
  assert.match(apiSource, /delete payload\.animal_scientific_name/);
  assert.match(apiSource, /delete payload\.animal_subject_box/);
});

test('推荐写入重试判断包含动物贴纸字段变化', () => {
  assert.match(
    apiSource,
    /mergedUnsupportedFields\.animalSticker === unsupportedFields\.animalSticker/
  );
});
