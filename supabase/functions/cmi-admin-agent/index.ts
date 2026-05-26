import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const POSTER_BUCKET = 'cmi-event-posters';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cmi-agent-token',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const sha256Hex = async (value: string) => {
  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

const getAgentToken = (req: Request) => {
  const headerToken = normalizeText(req.headers.get('x-cmi-agent-token'));
  if (headerToken) return headerToken;

  const authorization = normalizeText(req.headers.get('authorization'));
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return normalizeText(match?.[1]);
};

const decodeBase64 = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const uploadPoster = async ({
  supabase,
  eventId,
  poster,
}: {
  supabase: ReturnType<typeof createClient<any>>;
  eventId: string;
  poster: unknown;
}) => {
  if (!poster || typeof poster !== 'object') return null;
  const input = poster as Record<string, unknown>;
  const base64 = normalizeText(input.base64);
  if (!base64) return null;

  const fileName = normalizeText(input.fileName) || 'poster.jpg';
  const contentType = normalizeText(input.contentType) || 'image/jpeg';
  const extensionMatch = fileName.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/);
  const extension = extensionMatch ? `.${extensionMatch[1]}` : '.jpg';
  const storagePath = `posters/${eventId}-${Date.now()}${extension}`;

  const { data, error } = await supabase.storage
    .from(POSTER_BUCKET)
    .upload(storagePath, decodeBase64(base64), {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw new Error(`海报上传失败：${error.message}`);

  const { data: urlData } = supabase.storage
    .from(POSTER_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
};

const buildOfficialEventRow = (
  inputRow: Record<string, unknown>,
  ownerId: string,
  existingCreatedBy: string | null,
  posterUrl: string | null
) => ({
  id: normalizeText(inputRow.id),
  title: normalizeText(inputRow.title),
  event_type: normalizeText(inputRow.event_type) || 'cmi',
  start_at: normalizeText(inputRow.start_at),
  end_at: normalizeText(inputRow.end_at) || null,
  venue_name: normalizeText(inputRow.venue_name) || '清迈客栈',
  area: normalizeText(inputRow.area) || 'CMI / 清迈客栈',
  latitude: typeof inputRow.latitude === 'number' ? inputRow.latitude : null,
  longitude: typeof inputRow.longitude === 'number' ? inputRow.longitude : null,
  price_label: normalizeText(inputRow.price_label) || '待确认',
  registration_label: normalizeText(inputRow.registration_label) || 'CMI Map 一键报名',
  source_type: 'cmi',
  source_label: normalizeText(inputRow.source_label) || 'CMI Admin Agent 发布',
  source_url: normalizeText(inputRow.source_url) || null,
  host_name: normalizeText(inputRow.host_name) || normalizeText(inputRow.organizer_name) || 'CMI 社区',
  language: normalizeText(inputRow.language) || '中文',
  suitable_for: Array.isArray(inputRow.suitable_for) ? inputRow.suitable_for : [],
  is_cmi_related: true,
  is_verified: true,
  verification_status: 'verified',
  visibility_status: normalizeText(inputRow.visibility_status) === 'draft' ? 'draft' : 'published',
  reliability_note: normalizeText(inputRow.reliability_note) || '由 CMI 管理员 Agent 发布。',
  tags: Array.isArray(inputRow.tags) ? inputRow.tags : [],
  summary: normalizeText(inputRow.summary),
  organizer_name: normalizeText(inputRow.organizer_name) || 'CMI 社区',
  organizer_email: normalizeText(inputRow.organizer_email) || null,
  contact_email: normalizeText(inputRow.contact_email) || null,
  capacity: typeof inputRow.capacity === 'number' && Number.isFinite(inputRow.capacity)
    ? Math.max(1, Math.floor(inputRow.capacity))
    : null,
  registration_enabled: true,
  registration_status: normalizeText(inputRow.registration_status) === 'closed' ? 'closed' : 'open',
  attendee_visibility: normalizeText(inputRow.attendee_visibility) === 'count-only' ? 'count-only' : 'public',
  cover_image_url: posterUrl || normalizeText(inputRow.cover_image_url) || null,
  detail_body: normalizeText(inputRow.detail_body),
  created_by: existingCreatedBy || ownerId,
  updated_by: ownerId,
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase service configuration' }, 500);
  }

  const agentToken = getAgentToken(req);
  if (!agentToken) {
    return jsonResponse({ error: 'Missing CMI agent token' }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const tokenHash = await sha256Hex(agentToken);
  const { data: token, error: tokenError } = await supabase
    .from('cmi_agent_tokens')
    .select('id,owner_id,token_prefix,scopes,expires_at,revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (tokenError || !token) {
    return jsonResponse({ error: 'Invalid CMI agent token' }, 401);
  }

  if (token.revoked_at) {
    return jsonResponse({ error: 'CMI agent token revoked' }, 401);
  }

  if (token.expires_at && new Date(token.expires_at).getTime() <= Date.now()) {
    return jsonResponse({ error: 'CMI agent token expired' }, 401);
  }

  if (!Array.isArray(token.scopes) || !token.scopes.includes('events:write')) {
    return jsonResponse({ error: 'CMI agent token missing events:write scope' }, 403);
  }

  const { data: ownerProfile, error: ownerError } = await supabase
    .from('profiles')
    .select('id,email,user_name,role')
    .eq('id', token.owner_id)
    .maybeSingle();

  if (ownerError || !ownerProfile || ownerProfile.role !== 'admin') {
    return jsonResponse({ error: 'CMI agent token owner is not an active admin' }, 403);
  }

  const payload = await req.json().catch(() => null);
  const action = normalizeText(payload?.action);
  if (action !== 'publishEvent') {
    return jsonResponse({ error: 'Unsupported action' }, 400);
  }

  const rowInput = payload?.row;
  if (!rowInput || typeof rowInput !== 'object') {
    return jsonResponse({ error: 'Missing event row' }, 400);
  }

  const eventId = normalizeText((rowInput as Record<string, unknown>).id);
  if (!eventId) {
    return jsonResponse({ error: 'Event id is required' }, 400);
  }

  const { data: existingEvent } = await supabase
    .from('cmi_events')
    .select('id,created_by')
    .eq('id', eventId)
    .maybeSingle();

  const posterUrl = await uploadPoster({
    supabase,
    eventId,
    poster: payload?.poster,
  });

  const officialRow = buildOfficialEventRow(
    rowInput as Record<string, unknown>,
    token.owner_id,
    existingEvent?.created_by ?? null,
    posterUrl
  );

  if (!officialRow.title || !officialRow.start_at || !officialRow.summary) {
    return jsonResponse({ error: 'title, start_at and summary are required' }, 400);
  }

  const { data, error } = await supabase
    .from('cmi_events')
    .upsert(officialRow, { onConflict: 'id' })
    .select('id,title,visibility_status,cover_image_url,updated_at')
    .maybeSingle();

  if (error || !data) {
    return jsonResponse({ error: error?.message ?? 'Event publish failed' }, 500);
  }

  await supabase
    .from('cmi_agent_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', token.id);

  const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') ?? 'https://cmimap.com').replace(/\/$/, '');

  return jsonResponse({
    ok: true,
    mode: 'admin-agent-published',
    actor: {
      userId: ownerProfile.id,
      email: ownerProfile.email,
      userName: ownerProfile.user_name,
      tokenPrefix: token.token_prefix,
    },
    event: data,
    eventUrl: `${siteUrl}/events/${encodeURIComponent(data.id)}`,
  });
});
