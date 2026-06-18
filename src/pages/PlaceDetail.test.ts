import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('./PlaceDetail.tsx', import.meta.url), 'utf8');

test('地点详情页不直接展示纯坐标地点名和分类标签', () => {
  assert.match(source, /import \{ getDisplayPlaceName \} from '@\/lib\/recommendation-display';/);
  assert.match(source, /const displayPlaceName = getDisplayPlaceName\(safelyDecodePathParam\(placeName\)\);/);
  assert.doesNotMatch(source, /<h1[^>]*>\{placeName\}<\/h1>/);
  assert.doesNotMatch(source, /import \{ Badge \} from '@\/components\/ui\/badge';/);
  assert.doesNotMatch(source, /inlineDetailTags/);
});

test('地点详情页顶部照片完整等比展示，不再裁切主体', () => {
  assert.match(source, /CarouselContent className="items-center"/);
  assert.match(source, /className="block h-auto max-h-\[72dvh\] w-auto max-w-full object-contain"/);
  assert.doesNotMatch(source, /className="absolute inset-0 w-full h-full object-cover"/);
});
