import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildCmiEventUpsertRow,
  createCmiEventCliId,
  getPublishMode,
  normalizeCmiEventInput,
  parseCliArgs,
  scopeGeneratedEventIdToActor,
} from './cmi-event-publish-utils.mjs';

test('parseCliArgs 默认 dry-run，只有 --publish 才发布', () => {
  assert.deepEqual(parseCliArgs(['--input', 'event.json']), {
    inputPath: 'event.json',
    publish: false,
    adminPublish: false,
    serviceRolePublish: false,
    dryRun: true,
    accessToken: '',
    agentToken: '',
  });
  assert.equal(parseCliArgs(['-i', 'event.json', '--publish']).publish, true);
  assert.equal(parseCliArgs(['-i', 'event.json', '--admin-publish']).adminPublish, true);
  assert.equal(parseCliArgs(['-i', 'event.json', '--service-role-publish']).serviceRolePublish, true);
  assert.equal(parseCliArgs(['-i', 'event.json', '--access-token', 'token']).accessToken, 'token');
  assert.equal(parseCliArgs(['-i', 'event.json', '--agent-token', 'cmiagt_token']).agentToken, 'cmiagt_token');
  assert.equal(getPublishMode(parseCliArgs(['-i', 'event.json', '--publish'])), 'user');
  assert.equal(getPublishMode(parseCliArgs(['-i', 'event.json', '--admin-publish'])), 'admin');
  assert.equal(getPublishMode(parseCliArgs(['-i', 'event.json', '--service-role-publish'])), 'service-role');
  assert.equal(getPublishMode(parseCliArgs(['-i', 'event.json', '--admin-publish', '--dry-run'])), 'admin');
});

test('normalizeCmiEventInput 为清迈客栈活动补默认地点和一键报名', () => {
  const result = normalizeCmiEventInput({
    title: '周五晚 AI 分享',
    startAt: '2026-05-29T19:00:00+07:00',
    organizerEmail: 'Host@Example.com',
    summary: '一起聊 AI 工具',
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.event.id, createCmiEventCliId('周五晚 AI 分享', '2026-05-29T19:00:00+07:00'));
  assert.equal(result.event.venueName, '清迈客栈');
  assert.equal(result.event.area, 'CMI / 清迈客栈');
  assert.equal(result.event.registrationLabel, 'CMI Map 一键报名');
  assert.equal(result.event.organizerName, 'host@example.com');
  assert.equal(result.event.organizerEmail, 'host@example.com');
});

test('normalizeCmiEventInput 拒绝缺核心字段的发布输入', () => {
  const result = normalizeCmiEventInput({
    title: '',
    startAt: '',
    organizerEmail: 'not-email',
    type: 'unknown',
  });

  assert.equal(result.errors.length, 4);
});

test('buildCmiEventUpsertRow 默认输出公开 Agent 发布可写入字段', () => {
  const { event } = normalizeCmiEventInput({
    title: '周五晚 AI 分享',
    startAt: '2026-05-29T19:00:00+07:00',
    organizerEmail: 'host@example.com',
    summary: '一起聊 AI 工具',
    coverImageUrl: 'https://example.com/poster.jpg',
    tags: ['CMI', 'AI', 'CMI'],
  });
  const row = buildCmiEventUpsertRow(event, {
    publishMode: 'user',
    actorUserId: 'user-id',
  });

  assert.equal(row.source_type, 'community');
  assert.equal(row.is_cmi_related, false);
  assert.equal(row.is_verified, false);
  assert.equal(row.verification_status, 'needs-review');
  assert.equal(row.visibility_status, 'published');
  assert.equal(row.created_by, 'user-id');
  assert.equal(row.organizer_id, 'user-id');
  assert.equal(row.updated_by, 'user-id');
  assert.equal(row.cover_image_url, 'https://example.com/poster.jpg');
  assert.equal(row.attendee_visibility, 'public');
  assert.deepEqual(row.tags, ['CMI', 'AI']);
});

test('buildCmiEventUpsertRow 支持只显示报名人数', () => {
  const { event } = normalizeCmiEventInput({
    title: 'CMI Talk 嘉宾招募',
    startAt: '2026-06-07T16:30:00+07:00',
    organizerEmail: 'events@cmimap.com',
    summary: '邀请嘉宾报名',
    attendeeVisibility: 'count-only',
  });
  const row = buildCmiEventUpsertRow(event, { publishMode: 'service-role' });

  assert.equal(row.attendee_visibility, 'count-only');
});

test('buildCmiEventUpsertRow 团队管理员发布保留 CMI 已核实字段和操作者审计', () => {
  const { event } = normalizeCmiEventInput({
    title: '周五晚 AI 分享',
    startAt: '2026-05-29T19:00:00+07:00',
    organizerEmail: 'host@example.com',
    summary: '一起聊 AI 工具',
  });
  const row = buildCmiEventUpsertRow(event, {
    publishMode: 'admin',
    actorUserId: 'admin-user-id',
  });

  assert.equal(row.source_type, 'cmi');
  assert.equal(row.is_cmi_related, true);
  assert.equal(row.is_verified, true);
  assert.equal(row.verification_status, 'verified');
  assert.equal(row.created_by, 'admin-user-id');
  assert.equal(row.updated_by, 'admin-user-id');
});

test('buildCmiEventUpsertRow 机器后台发布不伪造操作者', () => {
  const { event } = normalizeCmiEventInput({
    title: '周五晚 AI 分享',
    startAt: '2026-05-29T19:00:00+07:00',
    organizerEmail: 'host@example.com',
    summary: '一起聊 AI 工具',
  });
  const row = buildCmiEventUpsertRow(event, { publishMode: 'service-role' });

  assert.equal(row.source_type, 'cmi');
  assert.equal(row.is_verified, true);
  assert.equal('created_by' in row, false);
});

test('scopeGeneratedEventIdToActor 只给自动生成 ID 加用户范围', () => {
  const generatedEvent = {
    id: '周五晚-ai-分享-2026-05-29',
    idProvided: false,
  };
  const explicitEvent = {
    id: 'official-event-id',
    idProvided: true,
  };

  assert.equal(
    scopeGeneratedEventIdToActor(generatedEvent, '3B69D7FA-1234-4567-9999-EXAMPLE').id,
    '周五晚-ai-分享-2026-05-29-3b69d7fa-123'
  );
  assert.equal(scopeGeneratedEventIdToActor(explicitEvent, '3b69d7fa').id, 'official-event-id');
});
