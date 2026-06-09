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

test('主地图固定活动入口打开活动说明页而不是相机', () => {
  assert.match(source, /CMI_MAP_WILD_CHIANG_MAI_EVENT_ID/);
  assert.match(source, /const primaryActivityEvent = useMemo/);
  assert.match(source, /className="cmi-v3-map-activity-entry"/);
  assert.match(source, /onClick=\{\(\) => onOpenPath\(getCmiEventPath\(primaryActivityEvent\.id\)\)\}/);
  assert.match(source, /aria-label=\{`打开\$\{primaryActivityEvent\.title\}活动说明`\}/);
  assert.doesNotMatch(source, /getMarkPlacePath\(\{ eventId: primaryActivityEvent\.id \}\)/);
});

test('底部拍照入口使用神奇动物主题放大镜而不是加号', () => {
  assert.match(source, /<WildMagnifierIcon \/>/);
  assert.match(source, /function WildMagnifierIcon\(\)/);
  assert.doesNotMatch(source, /<Plus size=\{36\}/);
});
