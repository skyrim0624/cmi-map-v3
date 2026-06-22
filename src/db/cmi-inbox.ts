import { supabase } from './supabase';

export type CmiInboxMessageKind = 'comment' | 'reply' | 'system';
export type CmiInboxSourceType = 'recommendation' | 'blackboard_post' | 'system';

export interface CmiInboxMessageRecord {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  sender_name: string;
  kind: CmiInboxMessageKind;
  title: string;
  body: string;
  source_type: CmiInboxSourceType;
  source_id: string | null;
  source_label: string;
  read_at: string | null;
  created_at: string;
}

export interface CreateCmiInboxMessageInput {
  recipientId: string;
  senderId: string;
  senderName: string;
  kind: Exclude<CmiInboxMessageKind, 'system'>;
  title: string;
  body: string;
  sourceType: Exclude<CmiInboxSourceType, 'system'>;
  sourceId: string;
  sourceLabel: string;
}

export const getCmiInboxMessages = async (recipientId: string): Promise<CmiInboxMessageRecord[]> => {
  if (!recipientId) return [];

  const { data, error } = await supabase
    .from('cmi_inbox_messages')
    .select('*')
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    console.warn('获取收件箱消息失败:', error);
    return [];
  }

  return Array.isArray(data) ? data as CmiInboxMessageRecord[] : [];
};

export const createCmiInboxMessage = async (input: CreateCmiInboxMessageInput): Promise<void> => {
  const body = input.body.trim();
  if (!body || !input.recipientId || input.recipientId === input.senderId) return;

  const { error } = await supabase
    .from('cmi_inbox_messages')
    .insert({
      recipient_id: input.recipientId,
      sender_id: input.senderId,
      sender_name: input.senderName.trim() || 'CMI 朋友',
      kind: input.kind,
      title: input.title.trim(),
      body,
      source_type: input.sourceType,
      source_id: input.sourceId,
      source_label: input.sourceLabel.trim(),
    });

  if (error) {
    console.error('创建收件箱消息失败:', error);
    throw error;
  }
};

export const markCmiInboxMessagesRead = async (
  recipientId: string,
  readAt = new Date().toISOString()
): Promise<void> => {
  if (!recipientId) return;

  const { error } = await supabase
    .from('cmi_inbox_messages')
    .update({ read_at: readAt })
    .eq('recipient_id', recipientId)
    .is('read_at', null);

  if (error) {
    console.warn('标记收件箱已读失败:', error);
    throw error;
  }
};
