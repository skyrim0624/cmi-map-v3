import { supabase } from './supabase';

const EVENT_STAMP_DEVICE_ID_KEY = 'cmi-map:event-stamp-device-id';

interface CmiEventStampRow {
  id: string;
  event_id: string;
  user_id: string | null;
  device_id: string;
  x_ratio: number;
  y_ratio: number;
  rotation: number;
  stamp_label: string;
  created_at: string;
}

export interface CmiEventStamp {
  id: string;
  eventId: string;
  userId: string | null;
  deviceId: string;
  xRatio: number;
  yRatio: number;
  rotation: number;
  stampLabel: string;
  createdAt: string;
}

const toCmiEventStamp = (row: CmiEventStampRow): CmiEventStamp => ({
  id: row.id,
  eventId: row.event_id,
  userId: row.user_id,
  deviceId: row.device_id,
  xRatio: row.x_ratio,
  yRatio: row.y_ratio,
  rotation: row.rotation,
  stampLabel: row.stamp_label,
  createdAt: row.created_at,
});

const createFallbackDeviceId = () =>
  `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export const getCmiEventStampDeviceId = () => {
  const existingDeviceId = window.localStorage.getItem(EVENT_STAMP_DEVICE_ID_KEY);
  if (existingDeviceId) return existingDeviceId;

  const nextDeviceId = window.crypto?.randomUUID?.() ?? createFallbackDeviceId();
  window.localStorage.setItem(EVENT_STAMP_DEVICE_ID_KEY, nextDeviceId);
  return nextDeviceId;
};

export const getCmiEventStamps = async (eventIds: string[]): Promise<CmiEventStamp[]> => {
  if (eventIds.length === 0) return [];

  const { data, error } = await supabase
    .from('cmi_event_stamps')
    .select('*')
    .in('event_id', eventIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('获取活动盖戳失败:', error);
    return [];
  }

  return Array.isArray(data) ? (data as CmiEventStampRow[]).map(toCmiEventStamp) : [];
};

export const placeCmiEventStamp = async (
  eventId: string,
  options: { stampLabel?: string } = {}
): Promise<CmiEventStamp | null> => {
  const deviceId = getCmiEventStampDeviceId();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? null;

  const xRatio = 12 + Math.random() * 76;
  const yRatio = 18 + Math.random() * 62;
  const rotation = Math.random() * 28 - 14;

  const { data, error } = await supabase
    .from('cmi_event_stamps')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        device_id: deviceId,
        x_ratio: xRatio,
        y_ratio: yRatio,
        rotation,
        stamp_label: options.stampLabel ?? '盖戳',
      },
      {
        onConflict: 'event_id,device_id',
        ignoreDuplicates: true,
      }
    )
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('活动盖戳失败:', error);
    return null;
  }

  return data ? toCmiEventStamp(data as CmiEventStampRow) : null;
};
