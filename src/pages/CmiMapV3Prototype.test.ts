import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CmiMapV3Prototype.tsx', import.meta.url), 'utf8');

test('V3 原型不再保留内部活动详情屏', () => {
  assert.doesNotMatch(source, /eventDetail/);
  assert.doesNotMatch(source, /EventDetailMode/);
});

test('地图活动底栏主体链接到正式活动详情页', () => {
  assert.match(source, /detailHref=\{getCmiEventPath\(selectedEvent\.id\)\}/);
  assert.match(source, /onDetailOpen=\{\(\) => onOpenPath\(getCmiEventPath\(selectedEvent\.id\)\)\}/);
  assert.match(source, /onClick: \(\) => onOpenPath\(getCmiEventPath\(selectedEvent\.id\)\)/);
  assert.match(
    source,
    /className="cmi-v3-selected-note-summary cmi-v3-selected-note-summary--link"[\s\S]*href=\{detailHref\}/,
  );
  assert.match(source, /onClick=\{handleDetailLinkClick\}/);
});
