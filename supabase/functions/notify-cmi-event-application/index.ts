import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const escapeHtml = (value: string | null | undefined) =>
  (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const normalizeEmail = (email: string | null | undefined) =>
  email?.trim().toLowerCase() ?? '';

const uniqueEmails = (emails: Array<string | null | undefined>) => {
  const unique = new Map<string, string>();

  for (const email of emails) {
    const normalized = normalizeEmail(email);
    if (!normalized.includes('@')) continue;
    unique.set(normalized, normalized);
  }

  return Array.from(unique.values());
};

const venueSpaceLabels: Record<string, string> = {
  rug: '地毯区',
  'round-table': '圆桌区',
  office: '办公区',
  'fourth-floor-rooftop': '4 楼天台区',
  'second-floor-sofa': '2 楼沙发区',
  'yard-canopy': '院子凉棚区',
};

interface AuthenticatedUser {
  id: string;
  email?: string | null;
}

interface SupabaseAuthClient {
  auth: {
    getUser: (jwt?: string) => Promise<{
      data: { user: AuthenticatedUser | null };
      error: { message?: string } | null;
    }>;
  };
}

const getSupabaseServiceKey = () => {
  const legacyServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacyServiceRoleKey) return legacyServiceRoleKey;

  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!secretKeys) return undefined;

  try {
    const parsed = JSON.parse(secretKeys) as Record<string, string | undefined>;
    return parsed.default ?? Object.values(parsed).find(Boolean);
  } catch {
    return undefined;
  }
};

const getBearerToken = (req: Request) => {
  const authorization = req.headers.get('authorization')?.trim() ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
};

const getAuthenticatedUser = async (
  supabase: SupabaseAuthClient,
  req: Request
) => {
  const token = getBearerToken(req);
  if (!token) return { user: null, error: 'Missing auth token' };

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { user: null, error: 'Invalid auth token' };

  return { user: data.user, error: null };
};

const formatEventTime = (startAt: string | null | undefined, endAt: string | null | undefined) => {
  if (!startAt) return '时间待确认';

  const formatter = new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
    hour12: false,
  });
  const startLabel = formatter.format(new Date(startAt));
  const endLabel = endAt
    ? new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok',
      hour12: false,
    }).format(new Date(endAt))
    : '';

  return endLabel ? `${startLabel} - ${endLabel}` : startLabel;
};

const emailShell = (content: string) => `
  <div style="margin:0;background:#f5f1ea;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#242424;">
    <div style="max-width:640px;margin:0 auto;background:#fffaf0;border:3px solid #111;border-radius:22px;overflow:hidden;">
      <div style="background:#e8f2e7;padding:22px 24px;border-bottom:3px solid #111;">
        <div style="font-size:30px;font-weight:900;letter-spacing:0;color:#050505;line-height:1;">CMI Map</div>
        <div style="margin-top:8px;font-size:15px;font-weight:800;color:#315a3f;">新的社区活动发起申请</div>
      </div>
      <div style="padding:24px;">
        ${content}
      </div>
    </div>
  </div>
`;

const sendResendEmail = async ({
  resendApiKey,
  from,
  to,
  subject,
  html,
}: {
  resendApiKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
}) => {
  if (to.length === 0) return { ok: true, skipped: true, detail: null };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  const detail = await response.json().catch(() => ({}));
  return { ok: response.ok, skipped: false, detail };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = getSupabaseServiceKey();
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase service configuration' }, 500);
  }

  const payload = await req.json().catch(() => null);
  const eventId = typeof payload?.eventId === 'string' ? payload.eventId : '';

  if (!eventId) {
    return jsonResponse({ error: 'eventId is required' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const authResult = await getAuthenticatedUser(supabase, req);
  if (!authResult.user) {
    return jsonResponse({ error: authResult.error }, 401);
  }

  const { data: event, error: eventError } = await supabase
    .from('cmi_events')
    .select('id,title,start_at,end_at,venue_name,area,venue_space,organizer_name,organizer_email,summary,detail_body,visibility_status,verification_status,created_by,organizer_id')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError || !event) {
    return jsonResponse({ error: eventError?.message ?? 'Event not found' }, 404);
  }

  const eventBelongsToCaller =
    event.created_by === authResult.user.id ||
    event.organizer_id === authResult.user.id;

  if (!eventBelongsToCaller) {
    return jsonResponse({ error: 'Event does not belong to caller' }, 403);
  }

  const adminEmail = Deno.env.get('CMI_EVENT_ADMIN_EMAIL') ?? Deno.env.get('CMI_ADMIN_EMAIL');
  const defaultCmiInnOrganizerEmail = normalizeEmail(
    Deno.env.get('CMI_INN_DEFAULT_ORGANIZER_EMAIL')
  ) || 'skyrim1179676226@gmail.com';
  const recipients = uniqueEmails([adminEmail, defaultCmiInnOrganizerEmail]);

  if (!resendApiKey) {
    return jsonResponse({ ok: true, skipped: true, reason: 'email_not_configured' });
  }

  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://cmimap.com';
  const normalizedSiteUrl = siteUrl.replace(/\/$/, '');
  const manageUrl = `${normalizedSiteUrl}/events/${encodeURIComponent(eventId)}/manage`;
  const from = Deno.env.get('CMI_EVENT_EMAIL_FROM') ?? 'CMI Map <onboarding@resend.dev>';
  const eventTime = formatEventTime(event.start_at, event.end_at);
  const venueSpaceLabel = event.venue_space ? venueSpaceLabels[event.venue_space] ?? event.venue_space : '未选择';
  const locationLabel = [event.venue_name, venueSpaceLabel, event.area].filter(Boolean).join(' · ');
  const summary = event.detail_body || event.summary || '未填写活动说明';

  const result = await sendResendEmail({
    resendApiKey,
    from,
    to: recipients,
    subject: `新的活动发起申请：${event.title}`,
    html: emailShell(`
      <h2 style="margin:0 0 14px;font-size:24px;line-height:1.25;">新的活动发起申请</h2>
      <p style="margin:0 0 8px;line-height:1.7;"><strong>活动：</strong>${escapeHtml(event.title)}</p>
      <p style="margin:0 0 8px;line-height:1.7;"><strong>时间：</strong>${escapeHtml(eventTime)}</p>
      <p style="margin:0 0 8px;line-height:1.7;"><strong>地点：</strong>${escapeHtml(locationLabel)}</p>
      <p style="margin:0 0 8px;line-height:1.7;"><strong>发起人：</strong>${escapeHtml(event.organizer_name || event.organizer_email || '未填写')}</p>
      <p style="margin:0 0 16px;line-height:1.7;"><strong>发起人邮箱：</strong>${escapeHtml(event.organizer_email || '未填写')}</p>
      <div style="border:2px solid #ddd;border-radius:16px;background:#fff;padding:14px;margin:16px 0;white-space:pre-wrap;line-height:1.7;">${escapeHtml(summary)}</div>
      <p style="margin:20px 0 0;">
        <a href="${manageUrl}" style="display:inline-block;background:#160f25;color:#fff;text-decoration:none;border:3px solid #111;border-radius:999px;padding:10px 18px;font-weight:900;">打开审核页</a>
      </p>
    `),
  });

  if (!result.ok) {
    return jsonResponse({ error: 'Email provider failed', detail: result.detail }, 502);
  }

  return jsonResponse({
    ok: true,
    skipped: false,
    recipients: recipients.length,
  });
});
