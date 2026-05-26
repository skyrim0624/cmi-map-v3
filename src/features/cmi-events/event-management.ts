import type { CmiEventAttendeeVisibility, CmiEventType } from '@/data/cmi-events';
import type { UserRole } from '@/types/types';

export interface CmiEventManagerTarget {
  createdBy?: string | null;
  organizerId?: string | null;
  organizerEmail?: string | null;
}

export interface CmiEventManagerIdentity {
  userId?: string | null;
  email?: string | null;
  role?: UserRole | null;
}

export interface EditableCmiEventInput {
  id: string;
  title?: string;
  type: CmiEventType;
  startAt: string;
  endAt?: string | null;
  venueName: string;
  area: string;
  latitude?: number | null;
  longitude?: number | null;
  priceLabel: string;
  organizerName: string;
  organizerEmail: string;
  coverImageUrl?: string | null;
  capacity?: number | null;
  attendeeVisibility: CmiEventAttendeeVisibility;
  summary: string;
  detailBody?: string;
  updatedBy: string;
}

export interface EditableCmiEventPayload {
  event_type: CmiEventType;
  start_at: string;
  end_at: string | null;
  venue_name: string;
  area: string;
  latitude: number | null;
  longitude: number | null;
  price_label: string;
  host_name: string;
  organizer_name: string;
  organizer_email: string;
  cover_image_url: string | null;
  capacity: number | null;
  attendee_visibility: CmiEventAttendeeVisibility;
  summary: string;
  detail_body: string;
  updated_by: string;
}

const normalizeEmail = (value?: string | null) =>
  value?.trim().toLowerCase() ?? '';

export const isCmiEventManager = (
  event: CmiEventManagerTarget | null | undefined,
  identity: CmiEventManagerIdentity | null | undefined
) => {
  if (!event || !identity?.userId) return false;
  if (identity.role === 'admin') return true;
  if (event.createdBy && event.createdBy === identity.userId) return true;
  if (event.organizerId && event.organizerId === identity.userId) return true;

  const organizerEmail = normalizeEmail(event.organizerEmail);
  const userEmail = normalizeEmail(identity.email);
  return Boolean(organizerEmail && userEmail && organizerEmail === userEmail);
};

export const buildEditableCmiEventPayload = (input: EditableCmiEventInput): EditableCmiEventPayload => {
  const organizerName = input.organizerName.trim();

  return {
    event_type: input.type,
    start_at: input.startAt,
    end_at: input.endAt || null,
    venue_name: input.venueName.trim(),
    area: input.area.trim(),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    price_label: input.priceLabel.trim() || '待确认',
    host_name: organizerName || input.organizerEmail.trim(),
    organizer_name: organizerName || input.organizerEmail.trim(),
    organizer_email: input.organizerEmail.trim(),
    cover_image_url: input.coverImageUrl?.trim() || null,
    capacity: input.capacity ?? null,
    attendee_visibility: input.attendeeVisibility,
    summary: input.summary.trim(),
    detail_body: input.detailBody?.trim() ?? '',
    updated_by: input.updatedBy,
  };
};
