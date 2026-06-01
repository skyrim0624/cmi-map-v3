import assert from 'node:assert/strict';
import test from 'node:test';
import { getCmiEventDetailContent } from './cmi-event-details.ts';

test('Radiohead 活动详情提供完整推文内容', () => {
  const content = getCmiEventDetailContent('cmi-five-minute-music-kid-a-2026-06-02');

  assert.ok(content);
  assert.equal(content.postTitle, '🎧 “五分钟”音乐会：一起听 Radiohead 的《Kid A》');
  assert.ok(content.postBlocks.length >= 18);
  assert.match(JSON.stringify(content.postBlocks), /Kid A/);
  assert.match(JSON.stringify(content.postBlocks), /认真听完一首歌/);
  assert.match(JSON.stringify(content.postBlocks), /像在“把玩”一件作品/);
  assert.match(JSON.stringify(content.postBlocks), /脆弱的专注力/);
  assert.doesNotMatch(JSON.stringify(content.postBlocks), /活动信息/);
  assert.doesNotMatch(JSON.stringify(content.postBlocks), /skyrim0216/);
  assert.doesNotMatch(JSON.stringify(content.postBlocks), /适合谁来/);
});
