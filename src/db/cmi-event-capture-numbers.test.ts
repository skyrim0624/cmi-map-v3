import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const apiSource = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');
const migration = readFileSync(
  new URL('../../supabase/migrations/20260609055200_cmi_event_capture_numbers.sql', import.meta.url),
  'utf8'
);

test('活动捕获编号由数据库按活动全局递增分配', () => {
  assert.match(migration, /add column if not exists linked_event_capture_number integer/);
  assert.match(migration, /create table if not exists public\.cmi_event_capture_counters/);
  assert.match(migration, /last_capture_number = last_capture_number \+ 1/);
  assert.match(migration, /for update/);
  assert.match(migration, /recommendations_linked_event_capture_number_unique_idx/);
});

test('前端发布后只调用 RPC 读取已写死的捕获编号', () => {
  assert.match(apiSource, /export const assignCmiEventCaptureNumber/);
  assert.match(apiSource, /supabase\.rpc\('assign_cmi_event_capture_number'/);
  assert.doesNotMatch(apiSource, /linked_event_capture_number:\s*Math\.random/);
});
