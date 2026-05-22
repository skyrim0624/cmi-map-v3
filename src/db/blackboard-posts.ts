import { supabase } from './supabase';

export type BlackboardPostCategory = 'companion' | 'help' | 'ride';

export interface BlackboardPostRecord {
  id: string;
  category: BlackboardPostCategory;
  title: string;
  body: string;
  time_label: string;
  location_label: string;
  people_label: string;
  linked_event_id: string | null;
  linked_event_title: string | null;
  linked_place_name: string | null;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBlackboardPostInput {
  category: BlackboardPostCategory;
  title: string;
  body: string;
  timeLabel: string;
  locationLabel: string;
  peopleLabel: string;
  linkedEventId?: string;
  linkedEventTitle?: string;
  linkedPlaceName?: string;
  authorId: string;
  authorName: string;
}

export const getBlackboardPosts = async (): Promise<BlackboardPostRecord[]> => {
  const { data, error } = await supabase
    .from('blackboard_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('获取一起出发帖子失败:', error);
    throw error;
  }

  return Array.isArray(data) ? data as BlackboardPostRecord[] : [];
};

export const createBlackboardPost = async (
  input: CreateBlackboardPostInput
): Promise<BlackboardPostRecord> => {
  const { data, error } = await supabase
    .from('blackboard_posts')
    .insert({
      category: input.category,
      title: input.title,
      body: input.body,
      time_label: input.timeLabel || '时间待定',
      location_label: input.locationLabel || '地点待定',
      people_label: input.peopleLabel || '0',
      linked_event_id: input.linkedEventId || null,
      linked_event_title: input.linkedEventTitle || null,
      linked_place_name: input.linkedPlaceName || null,
      author_id: input.authorId,
      author_name: input.authorName,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('创建一起出发帖子失败:', error);
    throw error;
  }

  if (!data) {
    throw new Error('创建一起出发帖子失败：数据库没有返回新帖子');
  }

  return data as BlackboardPostRecord;
};
