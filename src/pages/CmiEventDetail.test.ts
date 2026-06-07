import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CmiEventDetail.tsx', import.meta.url), 'utf8');

test('打卡型活动详情页不显示报名按钮', () => {
  assert.match(source, /isCmiMapCheckinActivityEvent/);
  assert.match(source, /const isCheckinActivityEvent = event \? isCmiMapCheckinActivityEvent\(event\) : false/);
  assert.match(source, /isCheckinActivityEvent \? 'grid-cols-2' : 'grid-cols-3'/);
  assert.match(source, /!\s*isCheckinActivityEvent && \(/);
});
