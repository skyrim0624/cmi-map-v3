import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./cmi-companions.ts', import.meta.url), 'utf8');

test('约搭子数据层只接入发起、列表、单条、申请和审核', () => {
  assert.match(source, /from\('cmi_companion_invites'\)/);
  assert.match(source, /from\('cmi_companion_applications'\)/);
  assert.match(source, /rpc\('get_cmi_companion_contact_label'/);
  assert.match(source, /export const createCmiCompanionInvite/);
  assert.match(source, /export const getOpenCmiCompanionInvites/);
  assert.match(source, /export const getCmiCompanionInviteById/);
  assert.match(source, /export const getCmiCompanionApplicationsForInvite/);
  assert.match(source, /export const getApprovedCmiCompanionContactLabel/);
  assert.match(source, /export const createCmiCompanionApplication/);
  assert.match(source, /export const reviewCmiCompanionApplication/);
});
