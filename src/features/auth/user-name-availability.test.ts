import assert from 'node:assert/strict';
import test from 'node:test';
import { checkUserNameAvailability } from './user-name-availability.ts';

test('checks display name availability through the authorized RPC', async () => {
  const calls: Array<{ functionName: string; params: Record<string, unknown> }> = [];
  const client = {
    rpc: async (functionName: string, params: Record<string, unknown>) => {
      calls.push({ functionName, params });
      return { data: true, error: null };
    },
  };

  const result = await checkUserNameAvailability(client, ' 子扬 ');

  assert.deepEqual(result, { available: true, error: null });
  assert.deepEqual(calls, [
    {
      functionName: 'is_user_name_available',
      params: { target_user_name: '子扬' },
    },
  ]);
});

test('treats a taken display name as unavailable', async () => {
  const client = {
    rpc: async () => ({ data: false, error: null }),
  };

  const result = await checkUserNameAvailability(client, 'andreas');

  assert.deepEqual(result, { available: false, error: null });
});

test('returns an error when the availability RPC fails', async () => {
  const client = {
    rpc: async () => ({ data: null, error: { message: 'permission denied' } }),
  };

  const result = await checkUserNameAvailability(client, 'andreas');

  assert.equal(result.available, false);
  assert.equal(result.error?.message, 'permission denied');
});
