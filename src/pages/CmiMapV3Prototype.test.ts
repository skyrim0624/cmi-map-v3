import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CmiMapV3Prototype.tsx', import.meta.url), 'utf8');

test('V3 原型不再保留内部活动详情屏', () => {
  assert.doesNotMatch(source, /eventDetail/);
  assert.doesNotMatch(source, /EventDetailMode/);
});
