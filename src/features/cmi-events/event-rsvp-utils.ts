export type EventAttendeeVisibility = 'public' | 'count-only';
export type EventRegistrationStatus = 'going' | 'cancelled';

export interface EventRegistrationForSummary {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  status: EventRegistrationStatus;
  createdAt: string;
}

export interface EventRegistrationSummary {
  goingCount: number;
  capacity: number | null;
  remainingSpots: number | null;
  isFull: boolean;
}

export interface VisibleEventAttendee {
  id: string;
  name: string;
  createdAt: string;
}

export const CMI_EVENT_REGISTRATION_SUCCESS_DESCRIPTION =
  '报名已记录；确认邮件会附上微信群、联系人二维码和到场指引。';

export const getGoingEventRegistrations = (
  registrations: EventRegistrationForSummary[]
) => registrations.filter(registration => registration.status === 'going');

export const summarizeEventRegistrations = (
  registrations: EventRegistrationForSummary[],
  capacity?: number | null
): EventRegistrationSummary => {
  const goingCount = getGoingEventRegistrations(registrations).length;
  const normalizedCapacity =
    typeof capacity === 'number' && Number.isFinite(capacity) && capacity > 0
      ? Math.floor(capacity)
      : null;
  const remainingSpots =
    normalizedCapacity === null ? null : Math.max(normalizedCapacity - goingCount, 0);

  return {
    goingCount,
    capacity: normalizedCapacity,
    remainingSpots,
    isFull: normalizedCapacity !== null && goingCount >= normalizedCapacity,
  };
};

export const getVisibleEventAttendees = (
  registrations: EventRegistrationForSummary[],
  attendeeVisibility: EventAttendeeVisibility
): VisibleEventAttendee[] => {
  if (attendeeVisibility !== 'public') return [];

  return getGoingEventRegistrations(registrations).map(registration => ({
    id: registration.id,
    name: registration.attendeeName,
    createdAt: registration.createdAt,
  }));
};

const normalizeEmail = (email: string | null | undefined) =>
  email?.trim().toLowerCase() ?? '';

export const buildEventRegistrationEmailRecipients = ({
  adminEmail,
  organizerEmail,
  contactEmail,
  managerEmails = [],
}: {
  adminEmail?: string | null;
  organizerEmail?: string | null;
  contactEmail?: string | null;
  managerEmails?: Array<string | null | undefined>;
}) => {
  const uniqueEmails = new Map<string, string>();

  for (const email of [adminEmail, organizerEmail, contactEmail, ...managerEmails]) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes('@')) continue;
    uniqueEmails.set(normalizedEmail, normalizedEmail);
  }

  return Array.from(uniqueEmails.values());
};
