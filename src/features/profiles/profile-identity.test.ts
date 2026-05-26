import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDefaultProfileHandle,
  getStableProfileIdentity,
  normalizeProfileHandle,
} from './profile-identity.ts';

test('normalizeProfileHandle creates a URL-safe stable handle', () => {
  assert.equal(normalizeProfileHandle(' Andreas 子扬 / CMI! '), 'andreas-cmi');
  assert.equal(normalizeProfileHandle('A'), '');
  assert.equal(normalizeProfileHandle('---'), '');
});

test('createDefaultProfileHandle falls back from display name to email to user id', () => {
  assert.equal(
    createDefaultProfileHandle({
      userName: '子扬',
      email: 'Andreas+CMI@example.com',
      userId: '123e4567-e89b-12d3-a456-426614174000',
    }),
    'andreas-cmi'
  );
  assert.equal(
    createDefaultProfileHandle({
      userName: '子扬',
      email: null,
      userId: '123e4567-e89b-12d3-a456-426614174000',
    }),
    'user-123e4567'
  );
});

test('getStableProfileIdentity prefers handle and never falls back to display name', () => {
  assert.equal(
    getStableProfileIdentity({
      id: '123e4567-e89b-12d3-a456-426614174000',
      handle: 'andreas',
      user_name: '子扬',
      avatar_url: null,
    }),
    'andreas'
  );
  assert.equal(
    getStableProfileIdentity({
      id: '123e4567-e89b-12d3-a456-426614174000',
      handle: null,
      user_name: '子扬',
      avatar_url: null,
    }),
    '123e4567-e89b-12d3-a456-426614174000'
  );
});
