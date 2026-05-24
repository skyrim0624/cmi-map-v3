import {
  CMI_EVENTS,
  type CmiEvent,
  type CmiEventRecurrence,
  type CmiEventSourceType,
  type CmiEventType,
  type CmiEventVerificationStatus,
} from '@/data/cmi-events';
import { supabase } from './supabase';

interface CmiEventRow {
  id: string;
  title: string;
  event_type: string;
  start_at: string | null;
  end_at: string | null;
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
  last_checked_at: string | null;
  next_check_before: string | null;
  reliability_note: string;
  tags: string[] | null;
  summary: string;
}

const localEventMetadataById = new Map(CMI_EVENTS.map(event => [event.id, event]));
const localEventMetadataByTitle = new Map(CMI_EVENTS.map(event => [event.title, event]));

const toCmiEvent = (row: CmiEventRow): CmiEvent => {
  const localEventMetadata =
    localEventMetadataById.get(row.id) ?? localEventMetadataByTitle.get(row.title);

  return {
    id: row.id,
    title: row.title,
    type: row.event_type as CmiEventType,
    startAt: row.start_at ?? undefined,
    endAt: row.end_at ?? undefined,
    recurrence: row.recurrence ?? undefined,
    stableSchedule: row.stable_schedule ?? undefined,
    venueName: row.venue_name,
    area: row.area,
    mapLocation: localEventMetadata?.mapLocation,
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
    lastCheckedAt: row.last_checked_at ?? '',
    nextCheckBefore: row.next_check_before ?? undefined,
    reliabilityNote: row.reliability_note,
    tags: row.tags ?? [],
    summary: row.summary,
  };
};

export const getPublishedCmiEvents = async (): Promise<CmiEvent[]> => {
  const { data, error } = await supabase
    .from('cmi_events')
    .select('*')
    .eq('visibility_status', 'published');

  if (error) {
    console.error('获取活动库失败，使用本地活动种子:', error);
    return CMI_EVENTS;
  }

  if (!Array.isArray(data) || data.length === 0) return CMI_EVENTS;

  const remoteEvents = (data as CmiEventRow[]).map(toCmiEvent);
  const remoteEventIds = new Set(remoteEvents.map(event => event.id));
  const localOnlyEvents = CMI_EVENTS.filter(event => !remoteEventIds.has(event.id));

  return [...remoteEvents, ...localOnlyEvents];
};
