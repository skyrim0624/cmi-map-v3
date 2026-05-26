import { supabase } from './supabase';
import { uploadImages } from './api';
import {
  coerceBlackboardAchievementTitleId,
  getBlackboardActivityScore,
  type BlackboardAchievementTitleId,
  type BlackboardPostCategory,
} from '@/features/home/blackboard/blackboard-model';

export type { BlackboardPostCategory };

export interface BlackboardCommentRecord {
  id: string;
  post_id: string;
  body: string;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface BlackboardPostRecord {
  id: string;
  category: BlackboardPostCategory;
  title: string;
  body: string;
  time_label: string;
  location_label: string;
  people_label: string;
  contact_label: string | null;
  image_urls: string[] | null;
  linked_event_id: string | null;
  linked_event_title: string | null;
  linked_place_name: string | null;
  is_featured: boolean | null;
  featured_at: string | null;
  featured_by: string | null;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  comments: BlackboardCommentRecord[];
}

export interface BlackboardAnnouncementRecord {
  id: string;
  title: string;
  body: string;
  link_label: string | null;
  link_url: string | null;
  status: 'active' | 'hidden';
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface BlackboardActivityStatsRecord {
  author_id: string;
  post_count: number;
  comment_count: number;
  activity_score: number;
}

export interface BlackboardTitlePreferenceRecord {
  user_id: string;
  achievement_title_id: BlackboardAchievementTitleId;
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
  contactLabel?: string;
  imageUrls?: string[];
  linkedEventId?: string;
  linkedEventTitle?: string;
  linkedPlaceName?: string;
  authorId: string;
  authorName: string;
}

export interface UpdateBlackboardPostInput {
  id: string;
  category: BlackboardPostCategory;
  title: string;
  body: string;
  timeLabel: string;
  locationLabel: string;
  peopleLabel: string;
  contactLabel?: string;
  imageUrls?: string[];
  authorId: string;
}

export interface CreateBlackboardCommentInput {
  postId: string;
  body: string;
  authorId: string;
  authorName: string;
}

export interface CreateBlackboardAnnouncementInput {
  title: string;
  body: string;
  linkLabel?: string;
  linkUrl?: string;
  authorId: string;
  authorName: string;
}

const withEmptyComments = (record: Omit<BlackboardPostRecord, 'comments'>): BlackboardPostRecord => ({
  ...record,
  comments: [],
});

const attachComments = (
  posts: Array<Omit<BlackboardPostRecord, 'comments'>>,
  comments: BlackboardCommentRecord[]
): BlackboardPostRecord[] => {
  const commentsByPostId = comments.reduce<Record<string, BlackboardCommentRecord[]>>(
    (groupedComments, comment) => {
      groupedComments[comment.post_id] = [...(groupedComments[comment.post_id] || []), comment];
      return groupedComments;
    },
    {}
  );

  return posts.map(post => ({
    ...post,
    comments: commentsByPostId[post.id] || [],
  }));
};

const getCommentsForPosts = async (postIds: string[]): Promise<BlackboardCommentRecord[]> => {
  if (postIds.length === 0) return [];

  const { data, error } = await supabase
    .from('blackboard_comments')
    .select('*')
    .in('post_id', postIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('获取论坛评论失败，可能是迁移尚未应用:', error);
    return [];
  }

  return Array.isArray(data) ? data as BlackboardCommentRecord[] : [];
};

const isMissingBlackboardTitlePreferencesError = (error: { code?: string; message?: string }) => {
  const message = error.message?.toLocaleLowerCase() ?? '';
  return error.code === '42P01' || error.code === 'PGRST205' || message.includes('blackboard_title_preferences');
};

const mapBlackboardTitlePreferenceRecord = (record: {
  user_id?: string | null;
  achievement_title_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}): BlackboardTitlePreferenceRecord | null => {
  const titleId = coerceBlackboardAchievementTitleId(record.achievement_title_id);
  if (!record.user_id || !titleId) return null;

  return {
    user_id: record.user_id,
    achievement_title_id: titleId,
    created_at: record.created_at || '',
    updated_at: record.updated_at || '',
  };
};

export const getBlackboardTitlePreferences = async (
  userIds: string[]
): Promise<BlackboardTitlePreferenceRecord[]> => {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return [];

  const { data, error } = await supabase
    .from('blackboard_title_preferences')
    .select('user_id,achievement_title_id,created_at,updated_at')
    .in('user_id', uniqueUserIds);

  if (error) {
    if (!isMissingBlackboardTitlePreferencesError(error)) {
      console.warn('获取论坛成就称号失败:', error);
    }
    return [];
  }

  return Array.isArray(data)
    ? data.flatMap(record => {
        const preference = mapBlackboardTitlePreferenceRecord(record);
        return preference ? [preference] : [];
      })
    : [];
};

export const setBlackboardAchievementTitlePreference = async (
  userId: string,
  titleId: string | null
): Promise<BlackboardTitlePreferenceRecord | null> => {
  const safeTitleId = coerceBlackboardAchievementTitleId(titleId);

  if (!safeTitleId) {
    const { error } = await supabase
      .from('blackboard_title_preferences')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('清除论坛成就称号失败:', error);
      throw error;
    }

    return null;
  }

  const { data, error } = await supabase
    .from('blackboard_title_preferences')
    .upsert(
      {
        user_id: userId,
        achievement_title_id: safeTitleId,
      },
      { onConflict: 'user_id' }
    )
    .select('user_id,achievement_title_id,created_at,updated_at')
    .maybeSingle();

  if (error) {
    console.error('更新论坛成就称号失败:', error);
    throw error;
  }

  const preference = data ? mapBlackboardTitlePreferenceRecord(data) : null;
  if (!preference) {
    throw new Error('更新论坛成就称号失败：数据库没有返回有效称号');
  }

  return preference;
};

const countRowsByAuthorId = (rows: Array<{ author_id: string | null }>) =>
  rows.reduce<Record<string, number>>((countsByAuthorId, row) => {
    if (!row.author_id) return countsByAuthorId;
    countsByAuthorId[row.author_id] = (countsByAuthorId[row.author_id] || 0) + 1;
    return countsByAuthorId;
  }, {});

const getBlackboardActivityStatsFallback = async (
  authorIds: string[]
): Promise<BlackboardActivityStatsRecord[]> => {
  const [postsResult, commentsResult] = await Promise.all([
    supabase
      .from('blackboard_posts')
      .select('author_id')
      .in('author_id', authorIds),
    supabase
      .from('blackboard_comments')
      .select('author_id')
      .in('author_id', authorIds),
  ]);

  if (postsResult.error || commentsResult.error) {
    console.warn('获取论坛活跃称号统计失败:', postsResult.error || commentsResult.error);
    return [];
  }

  const postCounts = countRowsByAuthorId((postsResult.data || []) as Array<{ author_id: string | null }>);
  const commentCounts = countRowsByAuthorId((commentsResult.data || []) as Array<{ author_id: string | null }>);

  return authorIds.map(authorId => {
    const postCount = postCounts[authorId] || 0;
    const commentCount = commentCounts[authorId] || 0;

    return {
      author_id: authorId,
      post_count: postCount,
      comment_count: commentCount,
      activity_score: getBlackboardActivityScore({ postCount, commentCount }),
    };
  });
};

export const getBlackboardActivityStats = async (
  authorIds: string[]
): Promise<BlackboardActivityStatsRecord[]> => {
  const uniqueAuthorIds = Array.from(new Set(authorIds.filter(Boolean)));
  if (uniqueAuthorIds.length === 0) return [];

  const { data, error } = await supabase.rpc('get_blackboard_activity_stats', {
    target_author_ids: uniqueAuthorIds,
  });

  if (error) {
    return getBlackboardActivityStatsFallback(uniqueAuthorIds);
  }

  if (!Array.isArray(data)) return [];

  return data.map(record => {
    const postCount = Number(record.post_count || 0);
    const commentCount = Number(record.comment_count || 0);

    return {
      author_id: String(record.author_id),
      post_count: postCount,
      comment_count: commentCount,
      activity_score: Number(record.activity_score || getBlackboardActivityScore({ postCount, commentCount })),
    };
  });
};

export const getBlackboardPosts = async (): Promise<BlackboardPostRecord[]> => {
  const { data, error } = await supabase
    .from('blackboard_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('获取论坛帖子失败:', error);
    throw error;
  }

  if (!Array.isArray(data)) return [];

  const posts = data as Array<Omit<BlackboardPostRecord, 'comments'>>;
  const comments = await getCommentsForPosts(posts.map(post => post.id));
  return attachComments(posts, comments);
};

export const getBlackboardPostsByAuthorId = async (authorId: string): Promise<BlackboardPostRecord[]> => {
  if (!authorId) return [];

  const { data, error } = await supabase
    .from('blackboard_posts')
    .select('*')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('获取用户论坛动态失败，可能是迁移尚未应用:', error);
    return [];
  }

  if (!Array.isArray(data)) return [];

  const posts = data as Array<Omit<BlackboardPostRecord, 'comments'>>;
  const comments = await getCommentsForPosts(posts.map(post => post.id));
  return attachComments(posts, comments);
};

export const getBlackboardAnnouncements = async (): Promise<BlackboardAnnouncementRecord[]> => {
  const { data, error } = await supabase
    .from('blackboard_announcements')
    .select('*')
    .eq('status', 'active')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.warn('获取论坛公告失败，可能是迁移尚未应用:', error);
    return [];
  }

  return Array.isArray(data) ? data as BlackboardAnnouncementRecord[] : [];
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
      time_label: input.timeLabel || '',
      location_label: input.locationLabel || '',
      people_label: input.peopleLabel || '',
      contact_label: input.contactLabel || '',
      image_urls: input.imageUrls || [],
      linked_event_id: input.linkedEventId || null,
      linked_event_title: input.linkedEventTitle || null,
      linked_place_name: input.linkedPlaceName || null,
      author_id: input.authorId,
      author_name: input.authorName,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('创建论坛帖子失败:', error);
    throw error;
  }

  if (!data) {
    throw new Error('创建论坛帖子失败：数据库没有返回新帖子');
  }

  return withEmptyComments(data as Omit<BlackboardPostRecord, 'comments'>);
};

export const updateBlackboardPost = async (
  input: UpdateBlackboardPostInput
): Promise<BlackboardPostRecord> => {
  const { data, error } = await supabase
    .from('blackboard_posts')
    .update({
      category: input.category,
      title: input.title,
      body: input.body,
      time_label: input.timeLabel || '',
      location_label: input.locationLabel || '',
      people_label: input.peopleLabel || '',
      contact_label: input.contactLabel || '',
      image_urls: input.imageUrls || [],
    })
    .eq('id', input.id)
    .eq('author_id', input.authorId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('更新论坛帖子失败:', error);
    throw error;
  }

  if (!data) {
    throw new Error('更新论坛帖子失败：数据库没有返回帖子');
  }

  const comments = await getCommentsForPosts([input.id]);
  return attachComments([data as Omit<BlackboardPostRecord, 'comments'>], comments)[0];
};

export const setBlackboardPostFeatured = async (
  postId: string,
  featured: boolean,
  adminId: string
): Promise<BlackboardPostRecord> => {
  const { data, error } = await supabase
    .from('blackboard_posts')
    .update({
      is_featured: featured,
      featured_at: featured ? new Date().toISOString() : null,
      featured_by: featured ? adminId : null,
    })
    .eq('id', postId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('更新论坛精选状态失败:', error);
    throw error;
  }

  if (!data) {
    throw new Error('更新论坛精选状态失败：数据库没有返回帖子');
  }

  const comments = await getCommentsForPosts([postId]);
  return attachComments([data as Omit<BlackboardPostRecord, 'comments'>], comments)[0];
};

export const deleteBlackboardPost = async (
  postId: string,
  authorId: string
): Promise<void> => {
  const { error } = await supabase
    .from('blackboard_posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', authorId);

  if (error) {
    console.error('删除论坛帖子失败:', error);
    throw error;
  }
};

export const createBlackboardComment = async (
  input: CreateBlackboardCommentInput
): Promise<BlackboardCommentRecord> => {
  const { data, error } = await supabase
    .from('blackboard_comments')
    .insert({
      post_id: input.postId,
      body: input.body,
      author_id: input.authorId,
      author_name: input.authorName,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('创建论坛评论失败:', error);
    throw error;
  }

  if (!data) {
    throw new Error('创建论坛评论失败：数据库没有返回新评论');
  }

  return data as BlackboardCommentRecord;
};

export const createBlackboardAnnouncement = async (
  input: CreateBlackboardAnnouncementInput
): Promise<BlackboardAnnouncementRecord> => {
  const { data, error } = await supabase
    .from('blackboard_announcements')
    .insert({
      title: input.title,
      body: input.body,
      link_label: input.linkLabel || null,
      link_url: input.linkUrl || null,
      author_id: input.authorId,
      author_name: input.authorName,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('创建论坛公告失败:', error);
    throw error;
  }

  if (!data) {
    throw new Error('创建论坛公告失败：数据库没有返回新公告');
  }

  return data as BlackboardAnnouncementRecord;
};

export const hideBlackboardAnnouncement = async (
  announcementId: string
): Promise<void> => {
  const { error } = await supabase
    .from('blackboard_announcements')
    .update({ status: 'hidden' })
    .eq('id', announcementId);

  if (error) {
    console.error('隐藏论坛公告失败:', error);
    throw error;
  }
};

export const uploadBlackboardImages = uploadImages;
