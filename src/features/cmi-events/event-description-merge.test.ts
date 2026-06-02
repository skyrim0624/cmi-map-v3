import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildCmiEventDescriptionDraft,
  buildCmiEventSummaryFromDescription,
} from './event-description.ts';

test('buildCmiEventSummaryFromDescription 从合并说明第一行生成卡片简介', () => {
  assert.equal(
    buildCmiEventSummaryFromDescription('适合想认识新朋友的人来。\n\n流程：先集合，再一起吃饭。'),
    '适合想认识新朋友的人来。'
  );
});

test('buildCmiEventDescriptionDraft 合并旧简介和旧详情，避免编辑时丢内容', () => {
  assert.equal(buildCmiEventDescriptionDraft('旧简介', '详细说明正文'), '旧简介\n\n详细说明正文');
  assert.equal(buildCmiEventDescriptionDraft('旧简介', ''), '旧简介');
  assert.equal(buildCmiEventDescriptionDraft('旧简介', '旧简介\n\n详细说明正文'), '旧简介\n\n详细说明正文');
});
