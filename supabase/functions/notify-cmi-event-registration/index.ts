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

const absoluteAssetUrl = (siteUrl: string, path: string) =>
  `${siteUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

const formatEventTime = (startAt: string | null | undefined) =>
  startAt
    ? new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Bangkok',
      hour12: false,
    }).format(new Date(startAt))
    : '时间待确认';

const emailShell = (content: string) => `
  <div style="margin:0;background:#f5f1ea;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#242424;">
    <div style="max-width:640px;margin:0 auto;background:#fffaf0;border:3px solid #111;border-radius:22px;overflow:hidden;">
      <div style="background:#8b61ee;padding:22px 24px;border-bottom:3px solid #111;">
        <div style="font-size:34px;font-weight:900;letter-spacing:0;color:#050505;line-height:1;">CMI Map</div>
        <div style="margin-top:8px;font-size:16px;font-weight:800;color:#2b184a;">清迈活动和好去处，都在这里</div>
      </div>
      <div style="padding:24px;">
        ${content}
      </div>
    </div>
  </div>
`;

const imageBlock = (src: string, alt: string) => `
  <img src="${src}" alt="${escapeHtml(alt)}" style="display:block;width:100%;max-width:560px;border:3px solid #111;border-radius:18px;margin:12px 0;background:#eee;" />
`;

const qrBlock = (src: string, title: string, description: string) => `
  <td style="width:50%;padding:8px;vertical-align:top;text-align:center;">
    <img src="${src}" alt="${escapeHtml(title)}" style="display:block;width:132px;height:132px;object-fit:cover;border:3px solid #111;border-radius:16px;margin:0 auto;background:#fff;" />
    <div style="margin-top:8px;font-size:15px;font-weight:900;color:#111;">${escapeHtml(title)}</div>
    <div style="margin-top:3px;font-size:12px;font-weight:700;line-height:1.5;color:#5d5548;">${escapeHtml(description)}</div>
  </td>
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
  const attendeeEmail = normalizeEmail(
    typeof payload?.attendeeEmail === 'string' ? payload.attendeeEmail : ''
  );

  if (!eventId || !attendeeEmail) {
    return jsonResponse({ error: 'eventId and attendeeEmail are required' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: event, error: eventError } = await supabase
    .from('cmi_events')
    .select('id,title,start_at,venue_name,area,source_type,is_cmi_related,organizer_name,organizer_email,contact_email,created_by')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError || !event) {
    return jsonResponse({ error: eventError?.message ?? 'Event not found' }, 404);
  }

  const { data: registrations, error: registrationError } = await supabase
    .from('cmi_event_registrations')
    .select('attendee_name,attendee_email,note,created_at')
    .eq('event_id', eventId)
    .eq('status', 'going')
    .order('created_at', { ascending: false })
    .limit(20);

  if (registrationError) {
    return jsonResponse({ error: registrationError.message }, 500);
  }

  const registration = Array.isArray(registrations)
    ? registrations.find(candidate => normalizeEmail(candidate.attendee_email) === attendeeEmail)
    : null;

  if (!registration) {
    return jsonResponse({ error: 'Registration not found' }, 404);
  }

  const { data: managers, error: managersError } = await supabase
    .from('cmi_event_managers')
    .select('email')
    .eq('event_id', eventId);

  if (managersError) {
    return jsonResponse({ error: managersError.message }, 500);
  }

  const defaultCmiInnOrganizerEmail = normalizeEmail(
    Deno.env.get('CMI_INN_DEFAULT_ORGANIZER_EMAIL')
  ) || 'skyrim1179676226@gmail.com';
  const isCmiInnEvent = Boolean(
    event.is_cmi_related ||
    event.source_type === 'cmi' ||
    event.venue_name?.includes('清迈客栈') ||
    event.area?.includes('清迈客栈') ||
    event.area?.toUpperCase().includes('CMI')
  );
  const adminEmail = Deno.env.get('CMI_EVENT_ADMIN_EMAIL') ?? Deno.env.get('CMI_ADMIN_EMAIL');
  const managerEmails = Array.isArray(managers)
    ? managers.map(manager => normalizeEmail(manager.email))
    : [];
  const organizerRecipients = uniqueEmails([
    adminEmail,
    isCmiInnEvent ? defaultCmiInnOrganizerEmail : null,
    event.organizer_email,
    event.contact_email,
    ...managerEmails,
  ]);

  if (!resendApiKey) {
    return jsonResponse({ ok: true, skipped: true, reason: 'email_not_configured' });
  }

  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://cmimap.com';
  const normalizedSiteUrl = siteUrl.replace(/\/$/, '');
  const manageUrl = `${siteUrl.replace(/\/$/, '')}/events/${encodeURIComponent(eventId)}/manage`;
  const eventUrl = `${normalizedSiteUrl}/events/${encodeURIComponent(eventId)}`;
  const eventTime = formatEventTime(event.start_at);
  const eventLocation = `${event.venue_name}${event.area ? ` · ${event.area}` : ''}`;
  const note = registration.note ? `<p><strong>备注：</strong>${escapeHtml(registration.note)}</p>` : '';
  const from = Deno.env.get('CMI_EVENT_EMAIL_FROM') ?? 'CMI Map <onboarding@resend.dev>';

  const organizerEmailResult = await sendResendEmail({
    resendApiKey,
    from,
    to: organizerRecipients,
    subject: `新的活动报名：${event.title}`,
    html: emailShell(`
      <h2 style="margin:0 0 14px;font-size:24px;line-height:1.25;">新的活动报名</h2>
      <p style="margin:0 0 8px;line-height:1.7;"><strong>活动：</strong>${escapeHtml(event.title)}</p>
      <p style="margin:0 0 8px;line-height:1.7;"><strong>时间：</strong>${escapeHtml(eventTime)}</p>
      <p style="margin:0 0 8px;line-height:1.7;"><strong>地点：</strong>${escapeHtml(eventLocation)}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;" />
      <p style="margin:0 0 8px;line-height:1.7;"><strong>报名人：</strong>${escapeHtml(registration.attendee_name)}</p>
      <p style="margin:0 0 8px;line-height:1.7;"><strong>邮箱：</strong>${escapeHtml(registration.attendee_email)}</p>
      ${note}
      <p style="margin:20px 0 0;">
        <a href="${manageUrl}" style="display:inline-block;background:#160f25;color:#fff;text-decoration:none;border:3px solid #111;border-radius:999px;padding:10px 18px;font-weight:900;">查看报名名单</a>
      </p>
    `),
  });

  const entranceImage = absoluteAssetUrl(normalizedSiteUrl, '/cmi-home/checkin-entrance.jpg');
  const doorwayImage = absoluteAssetUrl(normalizedSiteUrl, '/cmi-home/checkin-doorway.jpg');
  const yardImage = absoluteAssetUrl(normalizedSiteUrl, '/cmi-home/yard-front.jpg');
  const parkingGuideCardImage = absoluteAssetUrl(normalizedSiteUrl, '/cmi-home/cmi-inn-parking-guide-card.png');
  const parkingMapQr = absoluteAssetUrl(normalizedSiteUrl, '/cmi-home/qr-blue-coffee-parking-map.png');
  const officialQr = absoluteAssetUrl(normalizedSiteUrl, '/cmi-home/qr-cmi-official.jpg');
  const groupQr = absoluteAssetUrl(normalizedSiteUrl, '/cmi-home/qr-community-group-5.jpg');
  const linkeQr = absoluteAssetUrl(normalizedSiteUrl, '/cmi-home/qr-linke.jpg');
  const andreasQr = absoluteAssetUrl(normalizedSiteUrl, '/cmi-home/qr-andreas.jpg');

  const attendeeEmailResult = await sendResendEmail({
    resendApiKey,
    from,
    to: uniqueEmails([registration.attendee_email]),
    subject: `报名成功：${event.title}`,
    html: emailShell(`
      <h2 style="margin:0 0 12px;font-size:24px;line-height:1.25;">报名成功，活动见</h2>
      <p style="margin:0 0 8px;line-height:1.7;"><strong>活动：</strong>${escapeHtml(event.title)}</p>
      <p style="margin:0 0 8px;line-height:1.7;"><strong>时间：</strong>${escapeHtml(eventTime)}</p>
      <p style="margin:0 0 16px;line-height:1.7;"><strong>地点：</strong>${escapeHtml(eventLocation)}</p>

      <div style="border:3px solid #111;border-radius:18px;background:#160f25;color:#fff;padding:16px;margin:18px 0;">
        <h3 style="margin:0 0 10px;font-size:20px;line-height:1.3;color:#fff;">清迈客栈路线指引</h3>
        <p style="margin:0;line-height:1.8;font-weight:700;color:#fff;">
          清迈客栈在巷子里，导航快到的时候请放慢一点，看门口和院子的标识。第一次来的人比较容易在巷口错过，建议直接打车或骑摩托到附近，再按下面照片找入口。
        </p>
      </div>

      ${imageBlock(entranceImage, '清迈客栈巷口和入口参考')}
      ${imageBlock(doorwayImage, '清迈客栈门口参考')}
      ${imageBlock(yardImage, '清迈客栈院子参考')}

      <div style="border:3px solid #111;border-radius:18px;background:#fff;padding:16px;margin:18px 0;">
        <h3 style="margin:0 0 10px;font-size:20px;line-height:1.3;">停车提醒</h3>
        <p style="margin:0;line-height:1.8;font-weight:700;">
          清迈客栈门口不能停车。开车来的话，推荐停在 Blue Coffee at Somphet Market 旁边的停车场，再步行约 3 分钟到清迈客栈；不要停在巷口、邻居门口或客栈门口，容易影响通行。下面这张图可以直接保存到相册，右下角二维码可以打开 Google 地图导航。
        </p>
      </div>
      ${imageBlock(parkingGuideCardImage, '清迈客栈停车指引卡')}
      <p style="margin:8px 0 16px;line-height:1.7;font-weight:700;">
        停车定位：
        <a href="https://maps.app.goo.gl/Yp6eQcaRng1FBtaK6" style="color:#160f25;font-weight:900;">Blue Coffee at Somphet Market 旁边停车场</a>
      </p>

      <div style="border:3px solid #111;border-radius:18px;background:#f2e8ff;padding:16px;margin:18px 0;">
        <h3 style="margin:0 0 10px;font-size:20px;line-height:1.3;">导航和活动联系二维码</h3>
        <p style="margin:0 0 12px;line-height:1.7;font-weight:700;">开车先扫 Google 地图导航到停车点；到场前可以加公众号、微信群、林可或子扬。如果微信群二维码过期，直接加微信 ID：skyrim0216，备注活动名。</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            ${qrBlock(parkingMapQr, 'Google 地图导航', '停车点导航')}
            ${qrBlock(officialQr, '清迈客栈公众号', '活动更新')}
          </tr>
          <tr>
            ${qrBlock(groupQr, '清迈客栈微信群', '问路和活动通知')}
            ${qrBlock(linkeQr, '林可微信', '订房和到店沟通')}
          </tr>
          <tr>
            ${qrBlock(andreasQr, '子扬微信', '找不到路时联系')}
            <td style="width:50%;padding:8px;vertical-align:top;text-align:center;"></td>
          </tr>
        </table>
      </div>

      <p style="margin:20px 0 0;">
        <a href="${eventUrl}" style="display:inline-block;background:#160f25;color:#fff;text-decoration:none;border:3px solid #111;border-radius:999px;padding:10px 18px;font-weight:900;">打开活动页</a>
      </p>
    `),
  });

  const failures = [
    organizerEmailResult.ok ? null : { target: 'organizers', detail: organizerEmailResult.detail },
    attendeeEmailResult.ok ? null : { target: 'attendee', detail: attendeeEmailResult.detail },
  ].filter(Boolean);

  if (failures.length > 0) {
    return jsonResponse({ error: 'Email provider failed', detail: failures }, 502);
  }

  return jsonResponse({
    ok: true,
    skipped: false,
    organizerRecipients: organizerRecipients.length,
    attendeeRecipients: 1,
  });
});
