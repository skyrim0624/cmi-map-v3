import assert from 'node:assert/strict';
import test from 'node:test';
import { getCmiEventDetailContent } from './cmi-event-details.ts';

test('Radiohead 活动详情提供完整推文内容', () => {
  const content = getCmiEventDetailContent('cmi-five-minute-music-kid-a-2026-06-02');

  assert.ok(content);
  assert.equal(content.postTitle, '“五分钟”音乐会｜一起听 Radiohead 的《Kid A》');
  assert.ok(content.postBlocks.length >= 6);
  assert.match(JSON.stringify(content.postBlocks), /Kid A/);
  assert.match(JSON.stringify(content.postBlocks), /skyrim0216/);
});
