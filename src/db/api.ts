import type { Category, PlacedSticker, Profile, Recommendation, Sticker } from '@/types/types';
import { getCategoryFilterValues } from '@/types/types';
import { compressImage } from '@/utils/imageCompression';
import { encodeEasterIconMetadata } from '@/lib/easter-icons';
import { encodeRecommendationEventMetadata } from '@/lib/cmi-recommendation-events';
import {
  applyRecommendationCorrections,
  applyRecommendationsCorrections,
  correctedRecommendationMatchesCategory,
} from '@/data/cmi-place-corrections';
import { normalizeProfileHandle } from '@/features/profiles/profile-identity';
import { supabase } from './supabase';

type ReadOptions = {
  throwOnError?: boolean;
};
type RecommendationInsertInput = Omit<Recommendation, 'id' | 'created_at'>;
type RecommendationLinkedEventUpdate = {
  linkedEventId?: string | null;
  linkedEventTitle?: string | null;
};
type UnsupportedRecommendationFields = {
  easterIcon: boolean;
  linkedEvent: boolean;
};

export type PublicProfile = Pick<Profile, 'id' | 'handle' | 'user_name' | 'avatar_url'>;
export const USER_NAME_TAKEN_ERROR_MESSAGE = '这个昵称已经被用过了，请换一个';

export const normalizeProfileUserName = (userName: string) => userName.normalize('NFKC').trim();

export interface UserNameAvailabilityResult {
  available: boolean;
  error: Error | null;
}

const handleReadError = (message: string, error: unknown, options?: ReadOptions) => {
  console.error(message, error);
  if (options?.throwOnError) throw error;
};

const isMissingPublicProfilesError = (error: { code?: string; message?: string }) => {
  const message = error.message?.toLocaleLowerCase() ?? '';
  return error.code === '42P01' || error.code === 'PGRST205' || message.includes('public_profiles');
};

const handlePublicProfileReadError = (message: string, error: unknown, options?: ReadOptions) => {
  if (typeof error === 'object' && error !== null && isMissingPublicProfilesError(error as { code?: string; message?: string })) {
    if (options?.throwOnError) throw error;
    return;
  }

  handleReadError(message, error, options);
};

const hasOwnField = <T extends object>(target: T, field: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(target, field);

const getErrorMessage = (error: unknown) => (
  typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message?: unknown }).message ?? '').toLocaleLowerCase()
    : ''
);

const getUnsupportedRecommendationFields = (
  error: unknown,
  recommendation: Partial<RecommendationInsertInput>
): UnsupportedRecommendationFields => {
  const message = getErrorMessage(error);

  return {
    easterIcon:
      hasOwnField(recommendation, 'easter_icon_id') &&
      message.includes('easter_icon_id'),
    linkedEvent:
      (hasOwnField(recommendation, 'linked_event_id') || hasOwnField(recommendation, 'linked_event_title')) &&
      (message.includes('linked_event_id') || message.includes('linked_event_title')),
  };
};

const mergeUnsupportedRecommendationFields = (
  current: UnsupportedRecommendationFields,
  next: UnsupportedRecommendationFields
): UnsupportedRecommendationFields => ({
  easterIcon: current.easterIcon || next.easterIcon,
  linkedEvent: current.linkedEvent || next.linkedEvent,
});

const hasUnsupportedRecommendationFields = (fields: UnsupportedRecommendationFields) =>
  fields.easterIcon || fields.linkedEvent;

const buildRecommendationInsertPayload = (
  recommendation: RecommendationInsertInput,
  unsupportedFields: UnsupportedRecommendationFields
) => {
  const payload: Partial<RecommendationInsertInput> = { ...recommendation };

  if (unsupportedFields.easterIcon) {
    if (payload.easter_icon_id) {
      payload.reason = encodeEasterIconMetadata(payload.reason ?? '', payload.easter_icon_id);
    }

    delete payload.easter_icon_id;
  }

  if (unsupportedFields.linkedEvent) {
    if (payload.linked_event_id) {
      payload.reason = encodeRecommendationEventMetadata(payload.reason ?? '', {
        id: payload.linked_event_id,
        title: payload.linked_event_title ?? payload.linked_event_id,
      });
    }

    delete payload.linked_event_id;
    delete payload.linked_event_title;
  }

  return payload;
};

const buildRecommendationUpdatePayload = (
  input: { reason: string } & RecommendationLinkedEventUpdate,
  unsupportedFields: UnsupportedRecommendationFields
) => {
  const payload: Partial<RecommendationInsertInput> = {
    reason: input.reason,
  };

  if (input.linkedEventId !== undefined) {
    payload.linked_event_id = input.linkedEventId;
    payload.linked_event_title = input.linkedEventTitle ?? null;
  }

  if (unsupportedFields.linkedEvent) {
    if (input.linkedEventId) {
      payload.reason = encodeRecommendationEventMetadata(input.reason, {
        id: input.linkedEventId,
        title: input.linkedEventTitle ?? input.linkedEventId,
      });
    }

    delete payload.linked_event_id;
    delete payload.linked_event_title;
  }

  return payload;
};

const activeStampIconUrls = [
  '/stickers/stamp-good-lucky.png',
  '/stickers/stamp-caution-et.png',
  '/stickers/stamp-neutral-milan.png',
  '/stickers/stamp-paw.png',
  '/stickers/stamp-cmi-selected.png',
  '/stickers/stamp-grass.png',
] as const;

const activeStampOrder = new Map(activeStampIconUrls.map((iconUrl, index) => [iconUrl, index]));

/**
 * 获取所有推荐
 */
export const getAllRecommendations = async (options?: ReadOptions): Promise<Recommendation[]> => {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*, upvotes(user_id), wishlists(user_id), placed_stickers(*, sticker:stickers(*))')
    .order('created_at', { ascending: false });

  if (error) {
    handleReadError('获取推荐失败:', error, options);
    return [];
  }

  return Array.isArray(data) ? applyRecommendationsCorrections(data) : [];
};

/**
 * 按分类获取推荐
 */
export const getRecommendationsByCategory = async (
  category: Category,
  options?: ReadOptions
): Promise<Recommendation[]> => {
  const data = await getAllRecommendations(options);
  const categoryValues = getCategoryFilterValues(category);
  return data.filter(recommendation =>
    categoryValues.some(categoryValue => correctedRecommendationMatchesCategory(recommendation, categoryValue))
  );
};

/**
 * 按用户名获取推荐
 */
export const getRecommendationsByUser = async (
  userName: string
): Promise<Recommendation[]> => {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*, upvotes(user_id), wishlists(user_id), placed_stickers(*, sticker:stickers(*))')
    .eq('user_name', userName)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取用户推荐失败:', error);
    return [];
  }

  return Array.isArray(data) ? applyRecommendationsCorrections(data) : [];
};

/**
 * 按用户 ID 获取推荐
 */
export const getRecommendationsByUserId = async (
  userId: string
): Promise<Recommendation[]> => {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*, upvotes(user_id), wishlists(user_id), placed_stickers(*, sticker:stickers(*))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取用户推荐失败:', error);
    return [];
  }

  return Array.isArray(data) ? applyRecommendationsCorrections(data) : [];
};

/**
 * 按地点名称获取推荐
 */
export const getRecommendationsByPlace = async (
  placeName: string,
  options?: ReadOptions
): Promise<Recommendation[]> => {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*, upvotes(user_id), wishlists(user_id), placed_stickers(*, sticker:stickers(*))')
    .eq('place_name', placeName)
    .order('created_at', { ascending: false });

  if (error) {
    handleReadError('获取地点推荐失败:', error, options);
    return [];
  }

  return Array.isArray(data) ? applyRecommendationsCorrections(data) : [];
};

export const getProfilesByUserNames = async (
  userNames: string[],
  options?: ReadOptions
): Promise<PublicProfile[]> => {
  const uniqueUserNames = Array.from(new Set(userNames.map(name => name.trim()).filter(Boolean)));
  if (uniqueUserNames.length === 0) return [];

  const { data, error } = await supabase
    .from('public_profiles')
    .select('id,handle,user_name,avatar_url')
    .in('user_name', uniqueUserNames);

  if (error) {
    if (isMissingPublicProfilesError(error)) {
      return getProfilesFallbackByUserNames(uniqueUserNames, options);
    }

    handlePublicProfileReadError('获取公开用户资料失败:', error, options);
    return [];
  }

  return Array.isArray(data) ? data as PublicProfile[] : [];
};

export const getProfilesByUserIds = async (
  userIds: Array<string | null | undefined>,
  options?: ReadOptions
): Promise<PublicProfile[]> => {
  const uniqueUserIds = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  if (uniqueUserIds.length === 0) return [];

  const { data, error } = await supabase
    .from('public_profiles')
    .select('id,handle,user_name,avatar_url')
    .in('id', uniqueUserIds);

  if (error) {
    if (isMissingPublicProfilesError(error)) {
      return getProfilesFallbackByUserIds(uniqueUserIds, options);
    }

    handlePublicProfileReadError('获取公开用户资料失败:', error, options);
    return [];
  }

  return Array.isArray(data) ? data as PublicProfile[] : [];
};

const isUuidLike = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const mapProfileFallbackRows = (
  rows: Array<Pick<Profile, 'id' | 'user_name' | 'avatar_url'>>
): PublicProfile[] =>
  rows.map(row => ({
    id: row.id,
    handle: null,
    user_name: row.user_name,
    avatar_url: row.avatar_url,
  }));

const getProfilesFallbackByUserIds = async (
  userIds: string[],
  options?: ReadOptions
): Promise<PublicProfile[]> => {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id,user_name,avatar_url')
    .in('id', userIds);

  if (error) {
    handleReadError('获取公开用户资料失败:', error, options);
    return [];
  }

  return Array.isArray(data)
    ? mapProfileFallbackRows(data as Array<Pick<Profile, 'id' | 'user_name' | 'avatar_url'>>)
    : [];
};

const getProfilesFallbackByUserNames = async (
  userNames: string[],
  options?: ReadOptions
): Promise<PublicProfile[]> => {
  if (userNames.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id,user_name,avatar_url')
    .in('user_name', userNames);

  if (error) {
    handleReadError('获取公开用户资料失败:', error, options);
    return [];
  }

  return Array.isArray(data)
    ? mapProfileFallbackRows(data as Array<Pick<Profile, 'id' | 'user_name' | 'avatar_url'>>)
    : [];
};

const getPublicProfileFallbackByIdentity = async (
  identity: string,
  options?: ReadOptions
): Promise<PublicProfile | null> => {
  const queries: Array<{ column: 'id' | 'user_name'; value: string }> = [];
  if (isUuidLike(identity)) queries.push({ column: 'id', value: identity });
  queries.push({ column: 'user_name', value: identity });

  for (const query of queries) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,user_name,avatar_url')
      .eq(query.column, query.value)
      .maybeSingle();

    if (error) {
      handleReadError('获取公开用户资料失败:', error, options);
      return null;
    }

    if (data) return mapProfileFallbackRows([data as Pick<Profile, 'id' | 'user_name' | 'avatar_url'>])[0];
  }

  return null;
};

export const getPublicProfileByIdentity = async (
  identity: string,
  options?: ReadOptions
): Promise<PublicProfile | null> => {
  const normalizedIdentity = identity.normalize('NFKC').trim();
  if (!normalizedIdentity) return null;

  const handle = normalizeProfileHandle(normalizedIdentity);
  const queries: Array<{ column: 'handle' | 'id' | 'user_name'; value: string }> = [];
  if (handle) queries.push({ column: 'handle', value: handle });
  if (isUuidLike(normalizedIdentity)) queries.push({ column: 'id', value: normalizedIdentity });
  queries.push({ column: 'user_name', value: normalizedIdentity });

  for (const query of queries) {
    const { data, error } = await supabase
      .from('public_profiles')
      .select('id,handle,user_name,avatar_url')
      .eq(query.column, query.value)
      .maybeSingle();

    if (error) {
      if (isMissingPublicProfilesError(error)) {
        return getPublicProfileFallbackByIdentity(normalizedIdentity, options);
      }

      handlePublicProfileReadError('获取公开用户资料失败:', error, options);
      return null;
    }

    if (data) return data as PublicProfile;
  }

  return null;
};

export const checkUserNameAvailability = async (
  userName: string,
  currentUserId?: string
): Promise<UserNameAvailabilityResult> => {
  const normalizedName = normalizeProfileUserName(userName);
  if (!normalizedName) return { available: false, error: null };

  const { data, error } = await supabase.rpc('is_user_name_available', {
    target_user_name: normalizedName,
    current_user_id: currentUserId ?? null,
  });

  if (error) {
    console.error('检查昵称是否可用失败:', error);
    return { available: false, error: new Error(error.message) };
  }

  return { available: data === true, error: null };
};

/**
 * 上传图片到 Supabase Storage
 */
export const uploadImage = async (file: File): Promise<string | null> => {
  try {
    // NOTE: 地点照片是地图内容资产，宁愿稍大一点，也不要把用户刚拍的照片压糊。
    const compressedFile = await compressImage(file, {
      force: true,
      maxSizeMB: 2.5,
      maxWidthOrHeight: 2400,
      quality: 0.9,
      outputType: 'image/jpeg',
    });
    
    // 生成文件名（使用时间戳和随机数）
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = compressedFile.name.split('.').pop() || 'webp';
    const fileName = `${timestamp}_${random}.${ext}`;
    
    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from('place-images')
      .upload(fileName, compressedFile, {
        contentType: compressedFile.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('图片上传失败:', error);
      return null;
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from('place-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('图片处理失败:', error);
    return null;
  }
};

/**
 * 批量上传图片
 */
export const uploadImages = async (files: File[]): Promise<string[]> => {
  const uploadPromises = files.map(file => uploadImage(file));
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
};

/**
 * 创建推荐
 */
export const createRecommendation = async (
  recommendation: RecommendationInsertInput
): Promise<Recommendation | null> => {
  let unsupportedFields: UnsupportedRecommendationFields = {
    easterIcon: false,
    linkedEvent: false,
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const insertPayload = buildRecommendationInsertPayload(recommendation, unsupportedFields);
    const { data, error } = await supabase
      .from('recommendations')
      .insert([insertPayload])
      .select()
      .maybeSingle();

    if (!error) {
      return data ? applyRecommendationCorrections(data) : null;
    }

    const nextUnsupportedFields = getUnsupportedRecommendationFields(error, insertPayload);
    if (!hasUnsupportedRecommendationFields(nextUnsupportedFields)) {
      console.error('创建推荐失败:', error);
      return null;
    }

    const mergedUnsupportedFields = mergeUnsupportedRecommendationFields(
      unsupportedFields,
      nextUnsupportedFields
    );

    if (
      mergedUnsupportedFields.easterIcon === unsupportedFields.easterIcon &&
      mergedUnsupportedFields.linkedEvent === unsupportedFields.linkedEvent
    ) {
      console.error('创建推荐失败:', error);
      return null;
    }

    unsupportedFields = mergedUnsupportedFields;
  }

  console.error('创建推荐失败: 推荐表缺少可选字段，兼容重试仍未成功');
  return null;
};

export const assignCmiEventCaptureNumber = async (
  recommendationId: string
): Promise<number | null> => {
  const { data, error } = await supabase.rpc('assign_cmi_event_capture_number', {
    target_recommendation_id: recommendationId,
  });

  if (error) {
    console.error('分配活动捕获编号失败:', error);
    return null;
  }

  return typeof data === 'number' ? data : null;
};

/**
 * 删除推荐
 */
export const deleteRecommendation = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('recommendations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除推荐失败:', error);
    return false;
  }

  return true;
};

/**
 * 更新当前登录用户自己的推荐内容
 */
export interface UpdateRecommendationTraceInput extends RecommendationLinkedEventUpdate {
  id: string;
  reason: string;
}

export const updateRecommendationTrace = async (
  input: UpdateRecommendationTraceInput
): Promise<Recommendation | null> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData.user?.id;

  if (authError || !userId) {
    console.error('获取当前用户失败:', authError);
    return null;
  }

  let unsupportedFields: UnsupportedRecommendationFields = {
    easterIcon: false,
    linkedEvent: false,
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const updatePayload = buildRecommendationUpdatePayload(input, unsupportedFields);
    const { data, error } = await supabase
      .from('recommendations')
      .update(updatePayload)
      .eq('id', input.id)
      .eq('user_id', userId)
      .select('*, upvotes(user_id), wishlists(user_id), placed_stickers(*, sticker:stickers(*))')
      .maybeSingle();

    if (!error) {
      return data ? applyRecommendationCorrections(data) : null;
    }

    const nextUnsupportedFields = getUnsupportedRecommendationFields(error, updatePayload);
    if (!nextUnsupportedFields.linkedEvent) {
      console.error('更新推荐失败:', error);
      return null;
    }

    const mergedUnsupportedFields = mergeUnsupportedRecommendationFields(
      unsupportedFields,
      nextUnsupportedFields
    );

    if (mergedUnsupportedFields.linkedEvent === unsupportedFields.linkedEvent) {
      console.error('更新推荐失败:', error);
      return null;
    }

    unsupportedFields = mergedUnsupportedFields;
  }

  console.error('更新推荐失败: 推荐表缺少可选字段，兼容重试仍未成功');
  return null;
};

/**
 * 更新当前登录用户自己的推荐理由
 */
export const updateRecommendationReason = async (
  id: string,
  reason: string
): Promise<Recommendation | null> => updateRecommendationTrace({ id, reason });

/**
 * 获取推荐统计
 */
export const getRecommendationStats = async (userName: string) => {
  const recommendations = await getRecommendationsByUser(userName);
  
  return {
    total: recommendations.length,
    byCategory: recommendations.reduce((acc, rec) => {
      acc[rec.category] = (acc[rec.category] || 0) + 1;
      return acc;
    }, {} as Record<Category, number>)
  };
};

/**
 * 上传用户头像
 */
export const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
  try {
    // 压缩图片
    const compressedFile = await compressImage(file);
    
    // 生成文件名：用户ID/时间戳.jpg
    const fileName = `${userId}/${Date.now()}.jpg`;
    
    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, compressedFile, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('上传头像失败:', error);
      return null;
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('上传头像失败:', error);
    return null;
  }
};

/**
 * 确保用户 profile 存在（登录时调用，不存在则自动创建）
 */
export const ensureProfile = async (userId: string, fallbackName?: string, email?: string): Promise<boolean> => {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (data) return true; // 已存在

  const { error } = await supabase
    .from('profiles')
    .insert({ id: userId, user_name: fallbackName ? normalizeProfileUserName(fallbackName) : '新用户', email: email ?? null });

  if (error) {
    console.error('创建用户 profile 失败:', error);
    return false;
  }
  return true;
};

/**
 * 更新用户头像 URL（upsert：不存在则创建）
 */
export const updateUserAvatar = async (userId: string, avatarUrl: string): Promise<boolean> => {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, avatar_url: avatarUrl }, { onConflict: 'id' });

  if (error) {
    console.error('更新用户头像失败:', error);
    return false;
  }

  return true;
};

/**
 * 更新用户名（upsert：不存在则创建）
 */
export const updateUserName = async (userId: string, userName: string): Promise<boolean> => {
  const normalizedName = normalizeProfileUserName(userName);
  if (!normalizedName) return false;

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, user_name: normalizedName }, { onConflict: 'id' });

  if (error) {
    console.error('更新用户名失败:', error);
    return false;
  }

  return true;
};

/**
 * 切换点赞状态
 */
export const toggleUpvote = async (recommendationId: string, userId: string): Promise<{ success: boolean; isUpvoted: boolean }> => {
  try {
    const { data: existingLike } = await supabase
      .from('upvotes')
      .select('*')
      .eq('recommendation_id', recommendationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingLike) {
      const { error } = await supabase
        .from('upvotes')
        .delete()
        .eq('id', existingLike.id);
        
      if (error) throw error;
      return { success: true, isUpvoted: false };
    } else {
      const { error } = await supabase
        .from('upvotes')
        .insert({ recommendation_id: recommendationId, user_id: userId });
        
      if (error) throw error;
      return { success: true, isUpvoted: true };
    }
  } catch (error) {
    console.error('切换点赞状态失败:', error);
    return { success: false, isUpvoted: false };
  }
};

export async function toggleWishlist(recommendationId: string, userId: string): Promise<boolean> {
  try {
    const { data: existingWishlist } = await supabase
      .from('wishlists')
      .select('*')
      .eq('recommendation_id', recommendationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingWishlist) {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('recommendation_id', recommendationId)
        .eq('user_id', userId);
      if (error) throw error;
      return false; // Removed
    } else {
      const { error } = await supabase
        .from('wishlists')
        .insert([{ recommendation_id: recommendationId, user_id: userId }]);
      if (error) throw error;
      return true; // Added
    }
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    throw error;
  }
}

/**
 * 获取可用贴纸库
 */
export const getAvailableStickers = async (): Promise<Sticker[]> => {
  const { data, error } = await supabase
    .from('stickers')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('获取贴纸失败:', error);
    return [];
  }

  const stickers = data || [];
  const activeStamps = stickers
    .filter((sticker) => activeStampOrder.has(sticker.icon_url))
    .sort((a, b) => activeStampOrder.get(a.icon_url)! - activeStampOrder.get(b.icon_url)!);

  // NOTE: 新戳迁移未应用时保留旧贴纸兜底，避免本地/预览环境抽屉空白。
  return activeStamps.length > 0 ? activeStamps : stickers;
};

/**
 * 获取地标被贴的贴纸
 */
export const getPlacedStickers = async (recommendationId: string): Promise<PlacedSticker[]> => {
  const { data, error } = await supabase
    .from('placed_stickers')
    .select('*, sticker:stickers(*)')
    .eq('recommendation_id', recommendationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('获取已放置贴纸失败:', error);
    return [];
  }
  return data || [];
};

/**
 * 张贴贴纸
 */
export const placeSticker = async (stickerData: Omit<PlacedSticker, 'id' | 'created_at' | 'sticker'>): Promise<PlacedSticker | null> => {
  const { data, error } = await supabase
    .from('placed_stickers')
    .insert([stickerData])
    .select('*, sticker:stickers(*)')
    .single();

  if (error) {
    console.error('放置贴纸失败:', error);
    return null;
  }
  return data;
};
