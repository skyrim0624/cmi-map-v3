import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./CmiWildChiangMaiEventGuide.tsx', import.meta.url), 'utf8');

test('神奇动物活动说明页提供醒目的返回主地图图标', () => {
  assert.match(source, /MapPinned/);
  assert.match(source, /useNavigate/);
  assert.match(source, /aria-label="返回主地图"/);
  assert.ok(source.includes("onClick={() => navigate('/')}"));
  assert.match(source, /left-3 top-\[calc\(env\(safe-area-inset-top\)\+0\.75rem\)\]/);
  assert.match(source, /bg-\[#fff7dc\] text-\[#063f27\]/);
});
