const VALID_EVENT_TYPES = new Set([
  'cmi',
  'workshop',
  'exhibition',
  'market',
  'music',
  'meetup',
  'festival',
  'wellness',
  'meditation',
  'sport',
  'tech',
]);

const VALID_VISIBILITY_STATUSES = new Set(['draft', 'published']);
const VALID_ATTENDEE_VISIBILITIES = new Set(['public', 'count-only']);

export const CMI_INN_DEFAULTS = {
  venueName: '清迈客栈',
  area: 'CMI / 清迈客栈',
  latitude: 18.7919513784612,
  longitude: 98.9946296215124,
  organizerName: 'CMI 社区',
  hostName: 'CMI 社区',
  priceLabel: '免费参与',
  registrationLabel: 'CMI Map 一键报名',
  language: '中文',
};

export const parseCliArgs = (args) => {
  const parsed = {
    inputPath: '',
    publish: false,
    adminPublish: false,
    serviceRolePublish: false,
    dryRun: true,
    accessToken: '',
    agentToken: '',
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--input' || arg === '-i') {
      parsed.inputPath = args[index + 1] ?? '';
      index += 1;
    } else if (arg === '--publish') {
      parsed.publish = true;
      parsed.dryRun = false;
    } else if (arg === '--admin-publish') {
      parsed.publish = true;
      parsed.adminPublish = true;
      parsed.dryRun = false;
    } else if (arg === '--service-role-publish') {
      parsed.publish = true;
      parsed.serviceRolePublish = true;
      parsed.dryRun = false;
    } else if (arg === '--access-token') {
      parsed.accessToken = args[index + 1] ?? '';
      index += 1;
    } else if (arg === '--agent-token') {
      parsed.agentToken = args[index + 1] ?? '';
      index += 1;
    } else if (arg === '--dry-run') {
      parsed.publish = false;
      parsed.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    }
  }

  return parsed;
};

const normalizeText = (value) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeStringArray = (value) =>
  Array.isArray(value)
    ? Array.from(new Set(value.map(normalizeText).filter(Boolean)))
    : [];

const isFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeOptionalNumber = (value, fallback = null) => {
  if (isFiniteNumber(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }
  return fallback;
};

const normalizeEmail = (value) => normalizeText(value).toLowerCase();

const normalizeSlug = (value) =>
  normalizeText(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

export const createCmiEventCliId = (title, startAt) => {
  const datePart = normalizeText(startAt).slice(0, 10) || new Date().toISOString().slice(0, 10);
  return `${normalizeSlug(title) || 'cmi-event'}-${datePart}`;
};

export const scopeGeneratedEventIdToActor = (event, actorUserId) => {
  const normalizedActorId = normalizeSlug(actorUserId).slice(0, 12);
  if (event.idProvided || !normalizedActorId) return event;

  return {
    ...event,
    id: `${event.id}-${normalizedActorId}`,
  };
};

export const normalizeCmiEventInput = (rawInput) => {
  const input = rawInput && typeof rawInput === 'object' ? rawInput : {};
  const title = normalizeText(input.title);
  const startAt = normalizeText(input.startAt);
  const type = normalizeText(input.type) || 'cmi';
  const organizerEmail = normalizeEmail(input.organizerEmail);
  const organizerName = normalizeText(input.organizerName) || organizerEmail || '活动发起人';
  const hostName = normalizeText(input.hostName) || organizerName;
  const inputId = normalizeText(input.id);
  const visibilityStatus = normalizeText(input.visibilityStatus) || 'published';
  const attendeeVisibility = normalizeText(input.attendeeVisibility) || 'public';
  const errors = [];

  if (!title) errors.push('title 必填');
  if (!startAt) errors.push('startAt 必填，格式建议为 2026-05-29T19:00:00+07:00');
  if (!organizerEmail || !organizerEmail.includes('@')) errors.push('organizerEmail 必须是有效邮箱');
  if (!VALID_EVENT_TYPES.has(type)) errors.push(`type 必须是 ${Array.from(VALID_EVENT_TYPES).join(', ')} 之一`);
  if (!VALID_VISIBILITY_STATUSES.has(visibilityStatus)) errors.push('visibilityStatus 只能是 draft 或 published');
  if (!VALID_ATTENDEE_VISIBILITIES.has(attendeeVisibility)) {
    errors.push('attendeeVisibility 只能是 public 或 count-only');
  }

  return {
    errors,
    event: {
      id: inputId || createCmiEventCliId(title, startAt),
      idProvided: Boolean(inputId),
      title,
      type,
      startAt,
      endAt: normalizeText(input.endAt) || null,
      venueName: normalizeText(input.venueName) || CMI_INN_DEFAULTS.venueName,
      area: normalizeText(input.area) || CMI_INN_DEFAULTS.area,
      latitude: normalizeOptionalNumber(input.latitude, CMI_INN_DEFAULTS.latitude),
      longitude: normalizeOptionalNumber(input.longitude, CMI_INN_DEFAULTS.longitude),
      priceLabel: normalizeText(input.priceLabel) || CMI_INN_DEFAULTS.priceLabel,
      registrationLabel: normalizeText(input.registrationLabel) || CMI_INN_DEFAULTS.registrationLabel,
      hostName,
      organizerName,
      organizerEmail,
      coverImageUrl: normalizeText(input.coverImageUrl) || null,
      coverImagePath: normalizeText(input.coverImagePath) || null,
      sourceLabel: normalizeText(input.sourceLabel) || 'CMI Map Agent 发布',
      sourceUrl: normalizeText(input.sourceUrl) || null,
      language: normalizeText(input.language) || CMI_INN_DEFAULTS.language,
      suitableFor: normalizeStringArray(input.suitableFor),
      tags: normalizeStringArray(input.tags),
      summary: normalizeText(input.summary),
      detailBody: normalizeText(input.detailBody),
      visibilityStatus,
      attendeeVisibility,
    },
  };
};

export const getPublishMode = (args) => {
  if (args.serviceRolePublish) return 'service-role';
  if (args.adminPublish) return 'admin';
  return 'user';
};

export const buildCmiEventUpsertRow = (event, options = {}) => {
  const publishMode =
    options.publishMode === 'admin' || options.publishMode === 'service-role'
      ? options.publishMode
      : 'user';
  const isOfficialPublish = publishMode === 'admin' || publishMode === 'service-role';
  const actorUserId = normalizeText(options.actorUserId);

  const row = {
    id: event.id,
    title: event.title,
    event_type: event.type,
    start_at: event.startAt,
    end_at: event.endAt,
    venue_name: event.venueName,
    area: event.area,
    latitude: event.latitude,
    longitude: event.longitude,
    price_label: event.priceLabel,
    registration_label: event.registrationLabel,
    source_type: isOfficialPublish ? 'cmi' : 'community',
    source_label: event.sourceLabel,
    source_url: event.sourceUrl,
    host_name: event.hostName,
    language: event.language,
    suitable_for: event.suitableFor,
    is_cmi_related: isOfficialPublish,
    is_verified: isOfficialPublish,
    verification_status: isOfficialPublish ? 'verified' : 'needs-review',
    visibility_status: isOfficialPublish && options.forceDraft ? 'draft' : 'published',
    reliability_note: options.reliabilityNote || (
      isOfficialPublish
        ? '由 CMI Agent 结构化发布，来源为活动海报或推文，已走运营发布通道。'
        : '由登录用户通过 Agent 发布，尚未经过 CMI 人工核实。'
    ),
    tags: event.tags,
    summary: event.summary,
    organizer_name: event.organizerName,
    organizer_email: event.organizerEmail,
    contact_email: null,
    capacity: null,
    registration_enabled: true,
    registration_status: 'open',
    attendee_visibility: event.attendeeVisibility,
    cover_image_url: event.coverImageUrl,
    detail_body: event.detailBody,
  };

  if (actorUserId) {
    row.organizer_id = actorUserId;
    row.created_by = actorUserId;
    row.updated_by = actorUserId;
  }

  return row;
};
