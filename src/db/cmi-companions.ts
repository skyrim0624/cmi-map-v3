import {
  buildCmiCompanionApplicationInsert,
  buildCmiCompanionInviteInsert,
  type CmiCompanionApplication,
  type CmiCompanionApplicationStatus,
  type CmiCompanionInviteCard,
  type CreateCmiCompanionApplicationInput,
  type CreateCmiCompanionInviteInput,
} from '@/features/companions/cmi-companions';
import { supabase } from './supabase';

const COMPANION_INVITE_CARD_COLUMNS = [
  'id',
  'creator_id',
  'place_id',
  'place_name',
  'latitude',
  'longitude',
  'event_id',
  'title',
  'starts_at',
  'capacity',
  'cost_note',
  'condition_note',
  'vibe',
  'host_note',
  'status',
  'created_at',
  'updated_at',
].join(',');

const handleCompanionReadError = (label: string, error: unknown) => {
  console.warn(label, error);
};

export const createCmiCompanionInvite = async (
  input: CreateCmiCompanionInviteInput
): Promise<CmiCompanionInviteCard | null> => {
  const { data, error } = await supabase
    .from('cmi_companion_invites')
    .insert(buildCmiCompanionInviteInsert(input))
    .select(COMPANION_INVITE_CARD_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? data as unknown as CmiCompanionInviteCard : null;
};

export const getOpenCmiCompanionInvites = async (): Promise<CmiCompanionInviteCard[]> => {
  const { data, error } = await supabase
    .from('cmi_companion_invites')
    .select(COMPANION_INVITE_CARD_COLUMNS)
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) {
    handleCompanionReadError('获取约搭子列表失败:', error);
    return [];
  }

  return Array.isArray(data) ? data as unknown as CmiCompanionInviteCard[] : [];
};

export const getCmiCompanionInviteById = async (
  inviteId: string
): Promise<CmiCompanionInviteCard | null> => {
  const { data, error } = await supabase
    .from('cmi_companion_invites')
    .select(COMPANION_INVITE_CARD_COLUMNS)
    .eq('id', inviteId)
    .maybeSingle();

  if (error) {
    handleCompanionReadError('获取约搭子详情失败:', error);
    return null;
  }

  return data ? data as unknown as CmiCompanionInviteCard : null;
};

export const createCmiCompanionApplication = async (
  input: CreateCmiCompanionApplicationInput
): Promise<CmiCompanionApplication | null> => {
  const { data, error } = await supabase
    .from('cmi_companion_applications')
    .upsert(buildCmiCompanionApplicationInsert(input), {
      onConflict: 'invite_id,applicant_id',
    })
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? data as CmiCompanionApplication : null;
};

export const reviewCmiCompanionApplication = async ({
  applicationId,
  reviewerId,
  status,
}: {
  applicationId: string;
  reviewerId: string;
  status: Extract<CmiCompanionApplicationStatus, 'approved' | 'rejected'>;
}): Promise<CmiCompanionApplication | null> => {
  const { data, error } = await supabase
    .from('cmi_companion_applications')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq('id', applicationId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? data as CmiCompanionApplication : null;
};
