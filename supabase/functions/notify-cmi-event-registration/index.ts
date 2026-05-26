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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
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
    .select('id,title,start_at,venue_name,area,organizer_email,contact_email,created_by')
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

  const adminEmail = Deno.env.get('CMI_EVENT_ADMIN_EMAIL') ?? Deno.env.get('CMI_ADMIN_EMAIL');
  const recipients = uniqueEmails([adminEmail, event.organizer_email, event.contact_email]);

  if (!resendApiKey || recipients.length === 0) {
    return jsonResponse({ ok: true, skipped: true, reason: 'email_not_configured' });
  }

  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://cmimap.com';
  const manageUrl = `${siteUrl.replace(/\/$/, '')}/events/${encodeURIComponent(eventId)}/manage`;
  const eventTime = event.start_at
    ? new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Bangkok',
      hour12: false,
    }).format(new Date(event.start_at))
    : '时间待确认';
  const note = registration.note ? `<p><strong>备注：</strong>${escapeHtml(registration.note)}</p>` : '';

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('CMI_EVENT_EMAIL_FROM') ?? 'CMI Map <onboarding@resend.dev>',
      to: recipients,
      subject: `新的活动报名：${event.title}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.7; color: #242424;">
          <h2>新的活动报名</h2>
          <p><strong>活动：</strong>${escapeHtml(event.title)}</p>
          <p><strong>时间：</strong>${escapeHtml(eventTime)}</p>
          <p><strong>地点：</strong>${escapeHtml(event.venue_name)}${event.area ? ` · ${escapeHtml(event.area)}` : ''}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>报名人：</strong>${escapeHtml(registration.attendee_name)}</p>
          <p><strong>邮箱：</strong>${escapeHtml(registration.attendee_email)}</p>
          ${note}
          <p><a href="${manageUrl}">查看活动报名名单</a></p>
        </div>
      `,
    }),
  });

  const emailData = await emailResponse.json().catch(() => ({}));

  if (!emailResponse.ok) {
    return jsonResponse({ error: 'Email provider failed', detail: emailData }, 502);
  }

  return jsonResponse({ ok: true, skipped: false });
});
