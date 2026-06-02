#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { extname, resolve } from 'node:path';
import {
  buildCmiEventUpsertRow,
  getPublishMode,
  normalizeCmiEventInput,
  parseCliArgs,
} from './cmi-event-publish-utils.mjs';

const MIME_BY_EXTENSION = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const IMAGE_HEAD_TIMEOUT_MS = 8000;
const FUNCTION_HEALTH_TIMEOUT_MS = 8000;
const SUPABASE_CLI_TIMEOUT_MS = 12000;

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

const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const getPublishableKey = () =>
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

const getFunctionsUrl = (supabaseUrl) =>
  (process.env.SUPABASE_FUNCTIONS_URL || `${supabaseUrl.replace(/\/$/, '')}/functions/v1`).replace(/\/$/, '');

const createReporter = () => {
  const checks = [];

  return {
    checks,
    pass(name, details = {}) {
      checks.push({ name, ...details, status: 'passed' });
    },
    warn(name, details = {}) {
      checks.push({ name, ...details, status: 'warning' });
    },
    fail(name, details = {}) {
      checks.push({ name, ...details, status: 'failed' });
    },
  };
};

const describeNetworkError = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && error.cause && typeof error.cause === 'object'
    ? error.cause
    : null;
  const code = cause && 'code' in cause ? String(cause.code) : null;

  if (code) return `${message} (${code})`;
  return message;
};

const checkHead = async (url, timeoutMs) => {
  const response = await fetch(url, {
    method: 'HEAD',
    signal: AbortSignal.timeout(timeoutMs),
  });

  return {
    httpStatus: response.status,
    contentType: response.headers.get('content-type') || '',
  };
};

const checkSupabaseCliAuth = (reporter) => {
  if (!existsSync(resolve(process.cwd(), 'supabase/.temp/project-ref'))) {
    reporter.warn('supabase-cli-auth', {
      message: '当前仓库没有 linked Supabase project 缓存；需要推迁移时先 supabase link',
    });
    return;
  }

  const result = spawnSync('supabase', ['migration', 'list', '--linked'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: SUPABASE_CLI_TIMEOUT_MS,
    env: {
      ...process.env,
      SUPABASE_TELEMETRY_DISABLED: '1',
    },
  });

  if (result.error) {
    reporter.warn('supabase-cli-auth', {
      message: result.error.message,
    });
    return;
  }

  if (result.status === 0) {
    reporter.pass('supabase-cli-auth', {
      message: 'supabase migration list --linked 通过；db push 登录态可用',
    });
    return;
  }

  reporter.warn('supabase-cli-auth', {
    message: (result.stderr || result.stdout || 'supabase migration list --linked failed').split(/\r?\n/).slice(0, 4).join('\n'),
  });
};

const checkImageInput = async (event, reporter) => {
  if (event.coverImagePath) {
    const absolutePath = resolve(process.cwd(), event.coverImagePath);
    if (!existsSync(absolutePath)) {
      reporter.fail('cover-image-file', {
        message: 'coverImagePath 指向的图片不存在',
        path: event.coverImagePath,
      });
      return;
    }

    const extension = extname(absolutePath).toLowerCase();
    const fileStat = await stat(absolutePath);
    reporter.pass('cover-image-file', {
      path: event.coverImagePath,
      contentType: MIME_BY_EXTENSION[extension] || 'application/octet-stream',
      bytes: fileStat.size,
    });
    return;
  }

  if (event.coverImageUrl) {
    try {
      const head = await checkHead(event.coverImageUrl, IMAGE_HEAD_TIMEOUT_MS);
      if (head.httpStatus >= 200 && head.httpStatus < 400 && head.contentType.startsWith('image/')) {
        reporter.pass('cover-image-url', head);
      } else {
        reporter.fail('cover-image-url', {
          ...head,
          message: 'coverImageUrl 没有返回可用 image/* 响应',
        });
      }
    } catch (error) {
      reporter.fail('cover-image-url', {
        message: describeNetworkError(error),
      });
    }
    return;
  }

  reporter.fail('cover-image', {
    message: '公开发布必须提供 coverImagePath 或 coverImageUrl',
  });
};

const checkPublishCredentials = ({ publishMode, args, reporter }) => {
  if (publishMode === 'admin') {
    if (args.agentToken || process.env.CMI_MAP_ADMIN_AGENT_TOKEN) {
      reporter.pass('admin-agent-token', { source: args.agentToken ? 'cli-arg' : 'env' });
    } else {
      reporter.fail('admin-agent-token', {
        message: '缺少 CMI_MAP_ADMIN_AGENT_TOKEN；--admin-publish 会失败',
      });
    }
    return;
  }

  if (publishMode === 'service-role') {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      reporter.pass('service-role-key', { source: 'env' });
    } else {
      reporter.fail('service-role-key', {
        message: '缺少 SUPABASE_SERVICE_ROLE_KEY；--service-role-publish 会失败',
      });
    }
    return;
  }

  if (getPublishableKey() && (args.accessToken || process.env.CMI_MAP_ACCESS_TOKEN)) {
    reporter.pass('user-publish-token', { source: args.accessToken ? 'cli-arg' : 'env' });
  } else {
    reporter.fail('user-publish-token', {
      message: '缺少 publishable key 或 CMI_MAP_ACCESS_TOKEN；--publish 会失败',
    });
  }
};

const checkAdminFunctionReachability = async ({ supabaseUrl, reporter }) => {
  if (!supabaseUrl) return;

  try {
    const endpoint = `${getFunctionsUrl(supabaseUrl)}/cmi-admin-agent`;
    const head = await checkHead(endpoint, FUNCTION_HEALTH_TIMEOUT_MS);
    // 405/401/403 也说明请求已经到达 Edge Function；fetch failed 才是网络层阻塞。
    reporter.pass('admin-function-network', {
      endpoint,
      httpStatus: head.httpStatus,
      contentType: head.contentType,
    });
  } catch (error) {
    reporter.fail('admin-function-network', {
      message: describeNetworkError(error),
      hint: '先检查 DNS、代理、网络权限；当前状态下真实 --admin-publish 大概率会 fetch failed',
    });
  }
};

const verifyRemoteEvent = async ({ eventId, reporter, supabaseUrl }) => {
  const publishableKey = getPublishableKey();
  if (!supabaseUrl || !publishableKey) {
    reporter.fail('remote-event-read', {
      message: '远程验证需要 SUPABASE_URL/VITE_SUPABASE_URL 和 publishable key',
    });
    return;
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/cmi_events?id=eq.${encodeURIComponent(eventId)}&select=id,visibility_status,verification_status,is_cmi_related,source_type,venue_name,cover_image_url`;
  try {
    const response = await fetch(endpoint, {
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${publishableKey}`,
      },
      signal: AbortSignal.timeout(FUNCTION_HEALTH_TIMEOUT_MS),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      reporter.fail('remote-event-read', {
        status: response.status,
        message: JSON.stringify(payload),
      });
      return;
    }

    const row = Array.isArray(payload) ? payload[0] : null;
    if (!row) {
      reporter.fail('remote-event-read', {
        message: '远程 public.cmi_events 没有查到这条活动',
        eventId,
      });
      return;
    }

    reporter.pass('remote-event-read', { event: row });

    if (!row.cover_image_url) {
      reporter.fail('remote-cover-image', { message: '远程活动缺少 cover_image_url' });
      return;
    }

    try {
      const head = await checkHead(row.cover_image_url, IMAGE_HEAD_TIMEOUT_MS);
      if (head.httpStatus >= 200 && head.httpStatus < 400 && head.contentType.startsWith('image/')) {
        reporter.pass('remote-cover-image', head);
      } else {
        reporter.fail('remote-cover-image', {
          ...head,
          message: '远程 cover_image_url 没有返回 image/*',
        });
      }
    } catch (error) {
      reporter.fail('remote-cover-image', { message: describeNetworkError(error) });
    }
  } catch (error) {
    reporter.fail('remote-event-read', {
      message: describeNetworkError(error),
    });
  }
};

const main = async () => {
  const rawArgs = process.argv.slice(2);
  const args = parseCliArgs(rawArgs);
  const verifyRemote = rawArgs.includes('--verify-remote');
  const strict = rawArgs.includes('--strict');
  const reporter = createReporter();

  if (!args.inputPath) {
    console.log(JSON.stringify({
      ok: false,
      usage: 'pnpm cmi:event:check -- --input ./event.json --admin-publish [--verify-remote] [--strict]',
    }, null, 2));
    process.exit(1);
  }

  await loadEnv();

  const rawInput = JSON.parse(await readFile(resolve(process.cwd(), args.inputPath), 'utf8'));
  const { event, errors } = normalizeCmiEventInput(rawInput);
  const publishMode = getPublishMode(args);

  if (errors.length > 0) {
    reporter.fail('event-input', { errors });
  } else {
    reporter.pass('event-input', {
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      venueName: event.venueName,
    });
  }

  const supabaseUrl = getSupabaseUrl();
  if (supabaseUrl) {
    reporter.pass('supabase-url', { host: new URL(supabaseUrl).host });
  } else {
    reporter.fail('supabase-url', { message: '缺少 SUPABASE_URL 或 VITE_SUPABASE_URL' });
  }

  checkPublishCredentials({ publishMode, args, reporter });

  if (publishMode === 'admin') {
    await checkAdminFunctionReachability({ supabaseUrl, reporter });
  }

  if (!verifyRemote || rawArgs.includes('--check-migrations')) {
    checkSupabaseCliAuth(reporter);
  }

  await checkImageInput(event, reporter);

  if (errors.length === 0) {
    const row = buildCmiEventUpsertRow(event, { publishMode });
    reporter.pass('dry-run-row', {
      id: row.id,
      sourceType: row.source_type,
      visibilityStatus: row.visibility_status,
      verificationStatus: row.verification_status,
      coverImageUrl: row.cover_image_url,
    });
  }

  if (verifyRemote && errors.length === 0) {
    await verifyRemoteEvent({ eventId: event.id, reporter, supabaseUrl });
  }

  const failedCount = reporter.checks.filter((check) => check.status === 'failed').length;
  const warningCount = reporter.checks.filter((check) => check.status === 'warning').length;
  const ok = failedCount === 0 && (!strict || warningCount === 0);

  console.log(JSON.stringify({
    ok,
    mode: 'cmi-event-publish-check',
    publishMode,
    strict,
    failedCount,
    warningCount,
    checks: reporter.checks,
  }, null, 2));

  if (!ok) process.exit(1);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
