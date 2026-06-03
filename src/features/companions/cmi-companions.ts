export type CmiCompanionInviteStatus = 'open';
export type CmiCompanionApplicationRelationshipType = 'friend' | 'non_friend';
export type CmiCompanionApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface CreateCmiCompanionInviteInput {
  creatorId: string;
  placeId?: string | null;
  placeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  eventId?: string | null;
  title: string;
  startsAt: string;
  capacity?: number | null;
  costNote?: string | null;
  conditionNote?: string | null;
  vibe?: string | null;
  hostNote?: string | null;
  contactLabel: string;
}

export interface CreateCmiCompanionApplicationInput {
  inviteId: string;
  applicantId: string;
  relationshipType: CmiCompanionApplicationRelationshipType;
}

export interface CmiCompanionInvite {
  id: string;
  creator_id: string;
  place_id: string | null;
  place_name: string | null;
  latitude: number | null;
  longitude: number | null;
  event_id: string | null;
  title: string;
  starts_at: string;
  capacity: number | null;
  cost_note: string | null;
  condition_note: string | null;
  vibe: string | null;
  host_note: string | null;
  contact_label: string | null;
  status: CmiCompanionInviteStatus;
  created_at: string;
  updated_at: string;
}

export type CmiCompanionInviteCard = Omit<CmiCompanionInvite, 'contact_label'>;

export interface CmiCompanionApplication {
  id: string;
  invite_id: string;
  applicant_id: string;
  relationship_type: CmiCompanionApplicationRelationshipType;
  status: CmiCompanionApplicationStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

const cleanText = (value: string | null | undefined) => value?.trim() || null;

export function buildCmiCompanionInviteInsert(input: CreateCmiCompanionInviteInput) {
  const placeId = cleanText(input.placeId);
  const eventId = cleanText(input.eventId);

  if (!placeId && !eventId) {
    throw new Error('约搭子必须绑定地点或活动');
  }

  return {
    creator_id: input.creatorId,
    place_id: placeId,
    place_name: cleanText(input.placeName),
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    event_id: eventId,
    title: input.title.trim(),
    starts_at: input.startsAt,
    capacity: input.capacity ?? null,
    cost_note: cleanText(input.costNote),
    condition_note: cleanText(input.conditionNote),
    vibe: cleanText(input.vibe),
    host_note: cleanText(input.hostNote),
    contact_label: input.contactLabel.trim(),
    status: 'open' as const,
  };
}

export function buildCmiCompanionApplicationInsert(input: CreateCmiCompanionApplicationInput) {
  return {
    invite_id: input.inviteId,
    applicant_id: input.applicantId,
    relationship_type: input.relationshipType,
    status: input.relationshipType === 'friend' ? 'approved' as const : 'pending' as const,
  };
}

export function getApprovedCompanionContactLabel(
  invite: Pick<CmiCompanionInvite, 'contact_label'>,
  application: Pick<CmiCompanionApplication, 'status'> | null
) {
  if (application?.status !== 'approved') return null;
  return invite.contact_label?.trim() || null;
}
