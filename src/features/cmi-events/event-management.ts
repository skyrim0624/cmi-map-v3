import type {
  CmiEventAttendeeVisibility,
  CmiEventType,
  CmiEventVerificationStatus,
  CmiEventVisibilityStatus,
} from '@/data/cmi-events';
import type { UserRole } from '@/types/types';

export const CMI_INN_VENUE_SPACES = [
  { id: 'rug', label: '地毯区' },
  { id: 'round-table', label: '圆桌区' },
  { id: 'office', label: '办公区' },
  { id: 'fourth-floor-rooftop', label: '4 楼天台区' },
  { id: 'second-floor-sofa', label: '2 楼沙发区' },
  { id: 'yard-canopy', label: '院子凉棚区' },
] as const;

export type CmiInnVenueSpaceId = typeof CMI_INN_VENUE_SPACES[number]['id'];

export interface CmiInnVenueTarget {
  venueName?: string | null;
  area?: string | null;
}

export interface CmiInnVenueSpaceReservation extends CmiInnVenueTarget {
  id: string;
  startAt?: string | null;
  endAt?: string | null;
  venueSpace?: string | null;
  verificationStatus?: CmiEventVerificationStatus | string | null;
  visibilityStatus?: CmiEventVisibilityStatus | string | null;
}

export interface CmiEventPublishState {
  verificationStatus: CmiEventVerificationStatus;
  visibilityStatus: CmiEventVisibilityStatus;
  isVerified: boolean;
  reliabilityNote: string;
  shouldNotifyReview: boolean;
}

export interface CmiEventManagerTarget {
  createdBy?: string | null;
  organizerId?: string | null;
  organizerEmail?: string | null;
  managerEmails?: string[] | null;
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
  managerEmails?: string[];
  coverImageUrl?: string | null;
  capacity?: number | null;
  attendeeVisibility: CmiEventAttendeeVisibility;
  summary: string;
  detailBody?: string;
  venueSpace?: CmiInnVenueSpaceId | null;
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
  venue_space: CmiInnVenueSpaceId | null;
  updated_by: string;
}

const normalizeEmail = (value?: string | null) =>
  value?.trim().toLowerCase() ?? '';

const DEFAULT_EVENT_DURATION_MS = 2 * 60 * 60 * 1000;
const CMI_INN_VENUE_PATTERN = /(清迈客栈|CMI)/i;

export const getCmiInnVenueSpaceLabel = (spaceId?: string | null) =>
  CMI_INN_VENUE_SPACES.find(space => space.id === spaceId)?.label ?? '';

export const normalizeCmiInnVenueSpaceId = (spaceId?: string | null): CmiInnVenueSpaceId | null =>
  CMI_INN_VENUE_SPACES.find(space => space.id === spaceId)?.id ?? null;

export const isCmiInnVenue = ({ venueName, area }: CmiInnVenueTarget) =>
  CMI_INN_VENUE_PATTERN.test(`${venueName ?? ''} ${area ?? ''}`);

const getComparableTimeRange = (startAt?: string | null, endAt?: string | null) => {
  if (!startAt) return null;

  const startTime = new Date(startAt).getTime();
  if (!Number.isFinite(startTime)) return null;

  const parsedEndTime = endAt ? new Date(endAt).getTime() : Number.NaN;
  const endTime =
    Number.isFinite(parsedEndTime) && parsedEndTime > startTime
      ? parsedEndTime
      : startTime + DEFAULT_EVENT_DURATION_MS;

  return { startTime, endTime };
};

const timeRangesOverlap = (
  left: { startTime: number; endTime: number },
  right: { startTime: number; endTime: number }
) => left.startTime < right.endTime && right.startTime < left.endTime;

export const getUnavailableCmiInnVenueSpaceIds = ({
  startAt,
  endAt,
  events,
  excludeEventId,
}: {
  startAt?: string | null;
  endAt?: string | null;
  events: CmiInnVenueSpaceReservation[];
  excludeEventId?: string | null;
}): CmiInnVenueSpaceId[] => {
  const targetRange = getComparableTimeRange(startAt, endAt);
  if (!targetRange) return [];

  const unavailableSpaceIds = new Set<CmiInnVenueSpaceId>();

  for (const event of events) {
    if (excludeEventId && event.id === excludeEventId) continue;
    if (event.visibilityStatus === 'archived' || event.verificationStatus === 'rejected') continue;
    if (!isCmiInnVenue(event)) continue;

    const venueSpace = normalizeCmiInnVenueSpaceId(event.venueSpace);
    if (!venueSpace) continue;

    const eventRange = getComparableTimeRange(event.startAt, event.endAt);
    if (!eventRange || !timeRangesOverlap(targetRange, eventRange)) continue;

    unavailableSpaceIds.add(venueSpace);
  }

  return CMI_INN_VENUE_SPACES
    .map(space => space.id)
    .filter(spaceId => unavailableSpaceIds.has(spaceId));
};

export const buildCmiEventPublishState = (role: UserRole | null | undefined): CmiEventPublishState =>
  role === 'admin'
    ? {
      verificationStatus: 'verified',
      visibilityStatus: 'published',
      isVerified: true,
      reliabilityNote: '由 CMI 管理员直接发布并核实。',
      shouldNotifyReview: false,
    }
    : {
      verificationStatus: 'needs-review',
      visibilityStatus: 'draft',
      isVerified: false,
      reliabilityNote: '由用户提交，等待 CMI 管理员审核后公开。',
      shouldNotifyReview: true,
    };

export const parseCmiEventManagerEmails = (value: string) =>
  value
    .split(/[\s,，;；]+/)
    .map(normalizeEmail)
    .filter(email => email.includes('@'));

export const normalizeCmiEventManagerEmails = (
  emails: Array<string | null | undefined>,
  organizerEmail?: string | null
) => {
  const organizer = normalizeEmail(organizerEmail);
  const uniqueEmails = new Map<string, string>();

  for (const email of emails) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes('@') || normalizedEmail === organizer) continue;
    uniqueEmails.set(normalizedEmail, normalizedEmail);
  }

  return Array.from(uniqueEmails.values());
};

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
  if (organizerEmail && userEmail && organizerEmail === userEmail) return true;

  return Boolean(
    userEmail &&
    event.managerEmails?.some(managerEmail => normalizeEmail(managerEmail) === userEmail)
  );
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
    venue_space: normalizeCmiInnVenueSpaceId(input.venueSpace),
    updated_by: input.updatedBy,
  };
};
