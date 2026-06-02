#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  buildCmiEventUpsertRow,
  getPublishMode,
  normalizeCmiEventInput,
  parseCliArgs,
  scopeGeneratedEventIdToActor,
} from './cmi-event-publish-utils.mjs';

const POSTER_BUCKET = 'cmi-event-posters';

const MIME_BY_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const printHelp = () => {
  console.log(`
CMI 活动发布 CLI

用法：
  pnpm cmi:event:publish -- --input ./event.json
  pnpm cmi:event:publish -- --input ./event.json --publish
  pnpm cmi:event:publish -- --input ./event.json --admin-publish
  pnpm cmi:event:publish -- --input ./event.json --service-role-publish

默认 dry-run，不写数据库。当前对外先开放 --admin-publish，它使用管理员 Agent Token。

必填 JSON 字段：
  title, startAt, organizerEmail, summary

常用可选字段：
  type, endAt, priceLabel, coverImagePath, coverImageUrl, detailBody, sourceLabel, sourceUrl

公开发布环境变量：
  VITE_SUPABASE_URL 或 SUPABASE_URL
  VITE_SUPABASE_ANON_KEY 或 SUPABASE_ANON_KEY 或 SUPABASE_PUBLISHABLE_KEY
  CMI_MAP_ACCESS_TOKEN

团队管理员 Agent 发布环境变量：
  VITE_SUPABASE_URL 或 SUPABASE_URL
  CMI_MAP_ADMIN_AGENT_TOKEN

机器后台发布环境变量：
  VITE_SUPABASE_URL 或 SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
};

const loadDotEnvFile = async (path) => {
  if (!existsSync(path)) return;
  const content = await readFile(path, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
};

const loadEnv = async () => {
  await loadDotEnvFile(resolve(process.cwd(), '.env.local'));
  await loadDotEnvFile(resolve(process.cwd(), '.env'));
};

const getContentType = (path) =>
  MIME_BY_EXTENSION[extname(path).toLowerCase()] ?? 'application/octet-stream';

const createAuthenticatedClient = ({ supabaseUrl, publishableKey, accessToken }) =>
  createClient(supabaseUrl, publishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

const createServiceRoleClient = ({ supabaseUrl, serviceRoleKey }) =>
  createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

const getAuthenticatedActor = async ({ supabase, accessToken }) => {
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user?.id) {
    throw new Error(`登录身份校验失败：${error?.message ?? 'access token 无效'}`);
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
  };
};

const getPublishableKey = () =>
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

const getAccessTokenForMode = (args, publishMode) => {
  if (args.accessToken) return args.accessToken;
  return process.env.CMI_MAP_ACCESS_TOKEN;
};

const getAdminAgentToken = (args) =>
  args.agentToken || process.env.CMI_MAP_ADMIN_AGENT_TOKEN;

const getFunctionsUrl = (supabaseUrl) =>
  (process.env.SUPABASE_FUNCTIONS_URL || `${supabaseUrl.replace(/\/$/, '')}/functions/v1`).replace(/\/$/, '');

const buildPosterPayload = async (coverImagePath) => {
  if (!coverImagePath) return null;
  const absolutePath = resolve(process.cwd(), coverImagePath);
  const fileBuffer = await readFile(absolutePath);

  return {
    fileName: basename(absolutePath),
    contentType: getContentType(absolutePath),
    base64: fileBuffer.toString('base64'),
  };
};

const publishViaAdminAgent = async ({
  supabaseUrl,
  publishableKey,
  agentToken,
  row,
  poster,
}) => {
  const headers = {
    'Content-Type': 'application/json',
    'x-cmi-agent-token': agentToken,
  };
  if (publishableKey) {
    headers.apikey = publishableKey;
  }

  const response = await fetch(`${getFunctionsUrl(supabaseUrl)}/cmi-admin-agent`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'publishEvent',
      row,
      poster,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? `管理员 Agent 发布失败：HTTP ${response.status}`);
  }

  return data;
};

const uploadPoster = async ({ supabase, eventId, coverImagePath }) => {
  if (!coverImagePath) return null;

  const absolutePath = resolve(process.cwd(), coverImagePath);
  const fileBuffer = await readFile(absolutePath);
  const extension = extname(absolutePath).toLowerCase() || '.jpg';
  const storagePath = `posters/${eventId}-${Date.now()}${extension}`;

  const { data, error } = await supabase.storage
    .from(POSTER_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: getContentType(absolutePath),
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw new Error(`海报上传失败：${error.message}`);

  const { data: urlData } = supabase.storage
    .from(POSTER_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
};

const main = async () => {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (!args.inputPath) {
    printHelp();
    throw new Error('缺少 --input event.json');
  }

  await loadEnv();

  const rawInput = JSON.parse(await readFile(resolve(process.cwd(), args.inputPath), 'utf8'));
  const { event, errors } = normalizeCmiEventInput(rawInput);
  const publishMode = getPublishMode(args);
  if (errors.length > 0) {
    console.error(JSON.stringify({ ok: false, errors }, null, 2));
    process.exit(1);
  }

  const row = buildCmiEventUpsertRow(event, { publishMode });

  if (args.dryRun) {
    console.log(JSON.stringify({
      ok: true,
      mode: 'dry-run',
      publishMode,
      event,
      row,
      publishCommand: `pnpm cmi:event:publish -- --input ${args.inputPath} --publish`,
      adminPublishCommand: `pnpm cmi:event:publish -- --input ${args.inputPath} --admin-publish`,
      serviceRolePublishCommand: `pnpm cmi:event:publish -- --input ${args.inputPath} --service-role-publish`,
    }, null, 2));
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('发布需要 SUPABASE_URL 或 VITE_SUPABASE_URL');
  }

  let supabase;
  let actor = null;
  if (publishMode === 'admin') {
    const agentToken = getAdminAgentToken(args);
    if (!agentToken) {
      throw new Error('团队管理员发布需要 CMI_MAP_ADMIN_AGENT_TOKEN。管理员可在 CMI Map 的 Agent Token 页面生成。');
    }
    const finalRow = buildCmiEventUpsertRow(event, { publishMode });
    const result = await publishViaAdminAgent({
      supabaseUrl,
      publishableKey: getPublishableKey(),
      agentToken,
      row: finalRow,
      poster: await buildPosterPayload(event.coverImagePath),
    });

    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (publishMode === 'service-role') {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error('机器后台发布需要 SUPABASE_SERVICE_ROLE_KEY。不要把这个密钥交给外部 Agent。');
    }
    supabase = createServiceRoleClient({ supabaseUrl, serviceRoleKey });
  } else {
    const publishableKey = getPublishableKey();
    const accessToken = getAccessTokenForMode(args, publishMode);
    if (!publishableKey || !accessToken) {
      throw new Error('公开发布需要 VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY/SUPABASE_PUBLISHABLE_KEY 和 CMI_MAP_ACCESS_TOKEN。');
    }
    supabase = createAuthenticatedClient({ supabaseUrl, publishableKey, accessToken });
    actor = await getAuthenticatedActor({ supabase, accessToken });
  }

  const finalEvent = publishMode === 'admin' || publishMode === 'service-role'
    ? event
    : scopeGeneratedEventIdToActor(event, actor?.userId);

  const uploadedPosterUrl = await uploadPoster({
    supabase,
    eventId: finalEvent.id,
    coverImagePath: finalEvent.coverImagePath,
  });
  const finalRow = {
    ...buildCmiEventUpsertRow(finalEvent, {
      publishMode,
      actorUserId: actor?.userId,
    }),
    cover_image_url: uploadedPosterUrl ?? row.cover_image_url,
  };

  const { data, error } = await supabase
    .from('cmi_events')
    .upsert(finalRow, { onConflict: 'id' })
    .select('id,title,visibility_status,cover_image_url')
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? '活动发布失败');
  }

  const siteUrl = (process.env.PUBLIC_SITE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
  console.log(JSON.stringify({
    ok: true,
    mode: publishMode === 'service-role'
      ? 'service-role-published'
      : publishMode === 'admin'
        ? 'admin-published'
        : 'published',
    actor,
    event: data,
    eventUrl: `${siteUrl}/events/${encodeURIComponent(data.id)}`,
  }, null, 2));
};

const formatFatalError = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && error.cause && typeof error.cause === 'object'
    ? error.cause
    : null;
  const causeCode = cause && 'code' in cause ? String(cause.code) : '';

  if (/fetch failed|ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT/i.test(`${message} ${causeCode}`)) {
    return [
      message,
      '诊断：发布请求没有稳定到达 Supabase Edge Function，优先检查 DNS、代理、网络权限和 Supabase Functions 可达性。',
      '建议：先运行 pnpm cmi:event:check -- --input <event.json> --admin-publish --strict，再重试真实发布。',
    ].join('\n');
  }

  return message;
};

main().catch(error => {
  console.error(formatFatalError(error));
  process.exit(1);
});
