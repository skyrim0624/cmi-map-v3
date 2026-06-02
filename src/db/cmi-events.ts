import {
  CMI_EVENTS,
  type CmiEventAttendeeVisibility,
  type CmiEvent,
  type CmiEventRecurrence,
  type CmiEventRegistrationStatus,
  type CmiEventSourceType,
  type CmiEventType,
  type CmiEventVerificationStatus,
  type CmiEventVisibilityStatus,
  normalizeCmiEventRegistration,
} from '@/data/cmi-events';
import type { Category, UserRole } from '@/types/types';
import type { EventRegistrationForSummary, EventRegistrationStatus } from '@/features/cmi-events/event-rsvp-utils';
import {
  buildCmiEventPublishState,
  buildEditableCmiEventPayload,
  isCmiInnVenue,
  normalizeCmiEventManagerEmails,
  normalizeCmiInnVenueSpaceId,
  type CmiInnVenueSpaceId,
  type CmiInnVenueSpaceReservation,
  type EditableCmiEventInput,
} from '@/features/cmi-events/event-management';
import { compressImage } from '@/utils/imageCompression';
import { supabase } from './supabase';

const CMI_EVENT_POSTER_BUCKET = 'cmi-event-posters';

interface CmiEventRow {
  id: string;
  title: string;
  event_type: string;
  start_at: string | null;
  end_at: string | null;
  latitude: number | null;
  longitude: number | null;
  recurrence: CmiEventRecurrence | null;
  stable_schedule: string | null;
  venue_name: string;
  area: string;
  price_label: string;
  registration_label: string;
  source_type: string;
  source_label: string;
  source_url: string | null;
  host_name: string;
  language: string;
  suitable_for: string[] | null;
  is_cmi_related: boolean;
  is_verified: boolean;
  verification_status: string;
  visibility_status?: string | null;
  last_checked_at: string | null;
  next_check_before: string | null;
  reliability_note: string;
  tags: string[] | null;
  summary: string;
  organizer_id?: string | null;
  organizer_name?: string | null;
  organizer_email?: string | null;
  contact_email?: string | null;
  capacity?: number | null;
  registration_enabled?: boolean | null;
  registration_status?: string | null;
  attendee_visibility?: string | null;
  cover_image_url?: string | null;
  detail_body?: string | null;
  venue_space?: string | null;
  created_by?: string | null;
}

const localEventMetadataById = new Map(CMI_EVENTS.map(event => [event.id, event]));
const localEventMetadataByTitle = new Map(CMI_EVENTS.map(event => [event.title, event]));

const CATEGORY_BY_EVENT_TYPE: Partial<Record<CmiEventType, Category>> = {
  cmi: '清迈客栈',
  market: '市集',
  wellness: '身心',
  meditation: '身心',
  sport: '运动',
};

const getEventMapCategory = (row: CmiEventRow): Category =>
  CATEGORY_BY_EVENT_TYPE[row.event_type as CmiEventType] ?? '景点';

const toCmiEvent = (row: CmiEventRow): CmiEvent => {
  const localEventMetadata =
    localEventMetadataById.get(row.id) ?? localEventMetadataByTitle.get(row.title);
  const mapLocation =
    typeof row.latitude === 'number' && typeof row.longitude === 'number'
      ? {
        latitude: row.latitude,
        longitude: row.longitude,
        category: getEventMapCategory(row),
      }
      : localEventMetadata?.mapLocation;

  return normalizeCmiEventRegistration({
    id: row.id,
    title: row.title,
    type: row.event_type as CmiEventType,
    startAt: row.start_at ?? undefined,
    endAt: row.end_at ?? undefined,
    recurrence: row.recurrence ?? undefined,
    stableSchedule: row.stable_schedule ?? undefined,
    venueName: row.venue_name,
    area: row.area,
    mapLocation,
    priceLabel: row.price_label,
    registrationLabel: row.registration_label,
    sourceType: row.source_type as CmiEventSourceType,
    sourceLabel: row.source_label,
    sourceUrl: row.source_url ?? undefined,
    hostName: row.host_name,
    language: row.language,
    suitableFor: row.suitable_for ?? [],
    isCmiRelated: row.is_cmi_related,
    isVerified: row.is_verified,
    verificationStatus: row.verification_status as CmiEventVerificationStatus,
    visibilityStatus: (row.visibility_status as CmiEventVisibilityStatus | null) ?? 'published',
    lastCheckedAt: row.last_checked_at ?? '',
    nextCheckBefore: row.next_check_before ?? undefined,
    reliabilityNote: row.reliability_note,
    tags: row.tags ?? [],
    summary: row.summary,
    organizerId: row.organizer_id ?? undefined,
    organizerName: row.organizer_name ?? undefined,
    organizerEmail: row.organizer_email ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    capacity: row.capacity ?? undefined,
    registrationEnabled: row.registration_enabled ?? false,
    registrationStatus: (row.registration_status as CmiEventRegistrationStatus | null) ?? 'closed',
    attendeeVisibility: (row.attendee_visibility as CmiEventAttendeeVisibility | null) ?? 'count-only',
    coverImageUrl: row.cover_image_url ?? undefined,
    detailBody: row.detail_body ?? undefined,
    venueSpace: normalizeCmiInnVenueSpaceId(row.venue_space) ?? undefined,
    createdBy: row.created_by ?? undefined,
  });
};

interface CmiEventRegistrationRow {
  id: string;
  event_id: string;
  user_id: string | null;
  attendee_name: string;
  attendee_email: string;
  note: string;
  status: string;
  created_at: string;
}

interface CmiEventManagerRow {
  email: string;
}

interface CmiEventPublicRegistrationRow {
  id: string;
  event_id: string;
  attendee_name: string | null;
  status: string;
  created_at: string;
}

interface CmiInnVenueSpaceReservationRow {
  event_id?: string;
  id?: string;
  title?: string;
  start_at: string | null;
  end_at: string | null;
  venue_name: string | null;
  area: string | null;
  venue_space: string | null;
  verification_status: string | null;
  visibility_status: string | null;
}

export interface CmiEventRegistration extends EventRegistrationForSummary {
  eventId: string;
  userId?: string;
  note: string;
}

export interface CmiEventPublicRegistration extends EventRegistrationForSummary {
  eventId: string;
}

export interface CreateCmiEventInput {
  title: string;
  type: CmiEventType;
  startAt: string;
  endAt?: string | null;
  venueName: string;
  area: string;
  latitude?: number | null;
  longitude?: number | null;
  priceLabel: string;
  registrationLabel: string;
  hostName: string;
  organizerName: string;
  organizerEmail: string;
  contactEmail?: string | null;
  capacity?: number | null;
  attendeeVisibility: CmiEventAttendeeVisibility;
  summary: string;
  detailBody?: string;
  venueSpace?: CmiInnVenueSpaceId | null;
  coverImageUrl?: string | null;
  tags: string[];
  userId: string;
  actorRole?: UserRole | null;
  managerEmails?: string[];
}

export interface CreateCmiEventResult {
  event: CmiEvent;
  reviewNotificationError: Error | null;
}

export interface RegisterForCmiEventInput {
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  note?: string;
  userId?: string | null;
}

export interface RegisterForCmiEventResult {
  notificationError: Error | null;
}

export interface CancelCmiEventRegistrationInput {
  eventId: string;
  userId: string;
}

const toRegistration = (row: CmiEventRegistrationRow): CmiEventRegistration => ({
  id: row.id,
  eventId: row.event_id,
  userId: row.user_id ?? undefined,
  attendeeName: row.attendee_name,
  attendeeEmail: row.attendee_email,
  note: row.note,
  status: row.status as EventRegistrationStatus,
  createdAt: row.created_at,
});

const toPublicRegistration = (row: CmiEventPublicRegistrationRow): CmiEventPublicRegistration => ({
  id: row.id,
  eventId: row.event_id,
  attendeeName: row.attendee_name ?? '匿名报名者',
  attendeeEmail: '',
  status: row.status as EventRegistrationStatus,
  createdAt: row.created_at,
});

const toCmiInnVenueSpaceReservation = (
  row: CmiInnVenueSpaceReservationRow
): CmiInnVenueSpaceReservation => ({
  id: row.event_id ?? row.id ?? '',
  startAt: row.start_at,
  endAt: row.end_at,
  venueName: row.venue_name,
  area: row.area,
  venueSpace: row.venue_space,
  verificationStatus: row.verification_status,
  visibilityStatus: row.visibility_status,
});

const isMissingOptionalManagerTable = (error: { code?: string; message: string }) => {
  const errorMessage = error.message.toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    errorMessage.includes('cmi_event_managers')
  );
};

export const getCmiEventManagerEmails = async (eventId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('cmi_event_managers')
    .select('email')
    .eq('event_id', eventId)
    .order('email', { ascending: true });

  if (error) {
    if (!isMissingOptionalManagerTable(error)) {
      console.error('获取活动管理员失败:', error);
    }
    return [];
  }

  return Array.isArray(data)
    ? normalizeCmiEventManagerEmails((data as CmiEventManagerRow[]).map(row => row.email))
    : [];
};

const replaceCmiEventManagerEmails = async ({
  eventId,
  managerEmails,
  organizerEmail,
  userId,
}: {
  eventId: string;
  managerEmails?: string[];
  organizerEmail?: string | null;
  userId: string;
}) => {
  const normalizedEmails = normalizeCmiEventManagerEmails(managerEmails ?? [], organizerEmail);

  const { error: deleteError } = await supabase
    .from('cmi_event_managers')
    .delete()
    .eq('event_id', eventId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (normalizedEmails.length === 0) return;

  const { error: insertError } = await supabase
    .from('cmi_event_managers')
    .insert(normalizedEmails.map(email => ({
      event_id: eventId,
      email,
      created_by: userId,
    })));

  if (insertError) {
    throw new Error(insertError.message);
  }
};

const normalizeSlug = (value: string) =>
  value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

export const createCmiEventId = (title: string, startAt: string) => {
  const datePart = startAt.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const titlePart = normalizeSlug(title) || 'cmi-event';
  const randomPart =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${titlePart}-${datePart}-${randomPart}`;
};

export const getPublishedCmiEvents = async (): Promise<CmiEvent[]> => {
  const { data, error } = await supabase
    .from('cmi_events')
    .select('*')
    .eq('visibility_status', 'published');

  if (error) {
    console.error('获取活动库失败，使用本地活动种子:', error);
    return CMI_EVENTS.map(event => normalizeCmiEventRegistration(event));
  }

  if (!Array.isArray(data) || data.length === 0) {
    return CMI_EVENTS.map(event => normalizeCmiEventRegistration(event));
  }

  const remoteEvents = (data as CmiEventRow[]).map(toCmiEvent);
  const remoteEventIds = new Set(remoteEvents.map(event => event.id));
  const localOnlyEvents = CMI_EVENTS
    .filter(event => !remoteEventIds.has(event.id))
    .map(event => normalizeCmiEventRegistration(event));

  return [...remoteEvents, ...localOnlyEvents];
};

export const getCmiEventForManagement = async (eventId: string): Promise<CmiEvent | null> => {
  const { data, error } = await supabase
    .from('cmi_events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const managerEmails = await getCmiEventManagerEmails(eventId);
  return {
    ...toCmiEvent(data as CmiEventRow),
    managerEmails,
  };
};

export const getCmiInnVenueSpaceReservations = async ({
  startAt,
  endAt,
}: {
  startAt: string;
  endAt?: string | null;
}): Promise<CmiInnVenueSpaceReservation[]> => {
  const { data, error } = await supabase.rpc('get_cmi_inn_space_reservations', {
    range_start: startAt,
    range_end: endAt ?? null,
  });

  if (!error && Array.isArray(data)) {
    return (data as CmiInnVenueSpaceReservationRow[]).map(toCmiInnVenueSpaceReservation);
  }

  if (error) {
    console.warn('获取清迈客栈区域预约失败，尝试公开活动兜底:', error.message);
  }

  const fallbackEndAt = endAt ?? new Date(new Date(startAt).getTime() + 2 * 60 * 60 * 1000).toISOString();
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('cmi_events')
    .select('id,title,start_at,end_at,venue_name,area,venue_space,verification_status,visibility_status')
    .not('venue_space', 'is', null)
    .neq('visibility_status', 'archived')
    .neq('verification_status', 'rejected')
    .lt('start_at', fallbackEndAt)
    .or(`end_at.is.null,end_at.gt.${startAt}`);

  if (fallbackError) {
    console.warn('公开活动区域预约兜底失败:', fallbackError.message);
    return [];
  }

  return Array.isArray(fallbackData)
    ? (fallbackData as CmiInnVenueSpaceReservationRow[]).map(toCmiInnVenueSpaceReservation)
    : [];
};

const notifyCmiEventApplication = async (eventId: string): Promise<Error | null> => {
  const { error } = await supabase.functions.invoke('notify-cmi-event-application', {
    body: { eventId },
  });

  return error ? new Error(error.message) : null;
};

export const createCmiEvent = async (input: CreateCmiEventInput): Promise<CreateCmiEventResult> => {
  const eventId = createCmiEventId(input.title, input.startAt);
  const capacity =
    typeof input.capacity === 'number' && Number.isFinite(input.capacity) && input.capacity > 0
      ? Math.floor(input.capacity)
      : null;
  const tags = Array.from(new Set(input.tags.map(tag => tag.trim()).filter(Boolean))).slice(0, 8);
  const publishState = buildCmiEventPublishState(input.actorRole);
  const venueSpace = normalizeCmiInnVenueSpaceId(input.venueSpace);
  const isCmiInnEvent = isCmiInnVenue(input);

  const { data, error } = await supabase
    .from('cmi_events')
    .insert([{
      id: eventId,
      title: input.title.trim(),
      event_type: input.type,
      start_at: input.startAt,
      end_at: input.endAt || null,
      venue_name: input.venueName.trim(),
      area: input.area.trim(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      price_label: input.priceLabel.trim() || '待确认',
      registration_label: input.registrationLabel.trim() || 'CMI Map 一键报名',
      source_type: 'community',
      source_label: input.actorRole === 'admin' ? 'CMI Map 管理员发布' : 'CMI Map 用户提交',
      host_name: input.hostName.trim() || input.organizerName.trim(),
      language: '中文',
      suitable_for: [],
      is_cmi_related: isCmiInnEvent || input.type === 'cmi',
      is_verified: publishState.isVerified,
      verification_status: publishState.verificationStatus,
      visibility_status: publishState.visibilityStatus,
      reliability_note: publishState.reliabilityNote,
      tags,
      summary: input.summary.trim(),
      organizer_id: input.userId,
      organizer_name: input.organizerName.trim(),
      organizer_email: input.organizerEmail.trim(),
      contact_email: input.contactEmail?.trim() || null,
      capacity,
      registration_enabled: true,
      registration_status: 'open',
      attendee_visibility: input.attendeeVisibility,
      cover_image_url: input.coverImageUrl?.trim() || null,
      detail_body: input.detailBody?.trim() ?? '',
      venue_space: venueSpace,
      created_by: input.userId,
      updated_by: input.userId,
    }])
    .select('*')
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? '活动发布失败');
  }

  await replaceCmiEventManagerEmails({
    eventId,
    managerEmails: input.managerEmails,
    organizerEmail: input.organizerEmail,
    userId: input.userId,
  });

  const managerEmails = await getCmiEventManagerEmails(eventId);
  const reviewNotificationError = publishState.shouldNotifyReview
    ? await notifyCmiEventApplication(eventId)
    : null;

  return {
    event: {
      ...toCmiEvent(data as CmiEventRow),
      managerEmails,
    },
    reviewNotificationError,
  };
};

export const uploadCmiEventPoster = async (file: File): Promise<string | null> => {
  try {
    const compressedFile = await compressImage(file, {
      force: true,
      maxSizeMB: 2,
      maxWidthOrHeight: 2200,
      quality: 0.9,
      outputType: 'image/jpeg',
    });
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 12);
    const fileName = `posters/${timestamp}_${random}.jpg`;

    const { data, error } = await supabase.storage
      .from(CMI_EVENT_POSTER_BUCKET)
      .upload(fileName, compressedFile, {
        contentType: compressedFile.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('活动海报上传失败:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(CMI_EVENT_POSTER_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('活动海报处理失败:', error);
    return null;
  }
};

export const updateCmiEventDetails = async (input: EditableCmiEventInput): Promise<CmiEvent> => {
  const capacity =
    typeof input.capacity === 'number' && Number.isFinite(input.capacity) && input.capacity > 0
      ? Math.floor(input.capacity)
      : null;
  const payload = buildEditableCmiEventPayload({ ...input, capacity });

  const { data, error } = await supabase
    .from('cmi_events')
    .update(payload)
    .eq('id', input.id)
    .select('*')
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? '活动更新失败');
  }

  await replaceCmiEventManagerEmails({
    eventId: input.id,
    managerEmails: input.managerEmails,
    organizerEmail: input.organizerEmail,
    userId: input.updatedBy,
  });

  const managerEmails = await getCmiEventManagerEmails(input.id);

  return {
    ...toCmiEvent(data as CmiEventRow),
    managerEmails,
  };
};

export const approveCmiEvent = async (eventId: string, userId: string): Promise<CmiEvent> => {
  const { data, error } = await supabase
    .from('cmi_events')
    .update({
      visibility_status: 'published',
      verification_status: 'verified',
      is_verified: true,
      reliability_note: '由 CMI 管理员审核后发布。',
      last_checked_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', eventId)
    .select('*')
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? '活动审核通过失败');
  }

  const managerEmails = await getCmiEventManagerEmails(eventId);

  return {
    ...toCmiEvent(data as CmiEventRow),
    managerEmails,
  };
};

export const getPublicCmiEventRegistrations = async (
  eventId: string
): Promise<CmiEventPublicRegistration[]> => {
  const { data, error } = await supabase
    .from('cmi_event_registration_public')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    const errorMessage = error.message.toLowerCase();
    const isMissingOptionalRegistrationView =
      error.code === '42P01' ||
      error.code === 'PGRST205' ||
      errorMessage.includes('cmi_event_registration_public');

    if (!isMissingOptionalRegistrationView) {
      console.error('获取公开报名信息失败:', error);
    }
    return [];
  }

  return Array.isArray(data) ? (data as CmiEventPublicRegistrationRow[]).map(toPublicRegistration) : [];
};

export const getManagedCmiEventRegistrations = async (
  eventId: string
): Promise<CmiEventRegistration[]> => {
  const { data, error } = await supabase
    .from('cmi_event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? (data as CmiEventRegistrationRow[]).map(toRegistration) : [];
};

export const getCurrentUserCmiEventRegistrations = async (
  eventIds: string[],
  userId: string
): Promise<CmiEventRegistration[]> => {
  const uniqueEventIds = Array.from(new Set(eventIds.filter(Boolean)));
  if (uniqueEventIds.length === 0 || !userId) return [];

  const { data, error } = await supabase
    .from('cmi_event_registrations')
    .select('*')
    .in('event_id', uniqueEventIds)
    .eq('user_id', userId)
    .eq('status', 'going');

  if (error) {
    console.error('获取当前用户活动报名失败:', error);
    return [];
  }

  return Array.isArray(data) ? (data as CmiEventRegistrationRow[]).map(toRegistration) : [];
};

export const registerForCmiEvent = async (
  input: RegisterForCmiEventInput
): Promise<RegisterForCmiEventResult> => {
  const { error } = await supabase
    .from('cmi_event_registrations')
    .insert([{
      event_id: input.eventId,
      user_id: input.userId ?? null,
      attendee_name: input.attendeeName.trim(),
      attendee_email: input.attendeeEmail.trim(),
      note: input.note?.trim() ?? '',
      status: 'going',
    }]);

  if (error) {
    throw new Error(error.message);
  }

  const { error: notificationError } = await supabase.functions.invoke('notify-cmi-event-registration', {
    body: {
      eventId: input.eventId,
      attendeeEmail: input.attendeeEmail.trim(),
    },
  });

  return {
    notificationError: notificationError ? new Error(notificationError.message) : null,
  };
};

export const cancelCmiEventRegistration = async (
  input: CancelCmiEventRegistrationInput
): Promise<CmiEventRegistration> => {
  const { data, error } = await supabase
    .from('cmi_event_registrations')
    .update({ status: 'cancelled' })
    .eq('event_id', input.eventId)
    .eq('user_id', input.userId)
    .eq('status', 'going')
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('没有找到可取消的报名');
  }

  return toRegistration(data as CmiEventRegistrationRow);
};

export const updateCmiEventRegistrationStatus = async (
  eventId: string,
  registrationStatus: CmiEventRegistrationStatus
) => {
  const { error } = await supabase
    .from('cmi_events')
    .update({ registration_status: registrationStatus })
    .eq('id', eventId);

  if (error) {
    throw new Error(error.message);
  }
};
