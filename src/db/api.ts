import { supabase } from './supabase';
import type { Recommendation, Category, Sticker, PlacedSticker } from '@/types/types';
import { compressImage } from '@/utils/imageCompression';

/**
 * 获取所有推荐
 */
export const getAllRecommendations = async (): Promise<Recommendation[]> => {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*, upvotes(user_id), wishlists(user_id), placed_stickers(*, sticker:stickers(*))')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取推荐失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
};

/**
 * 按分类获取推荐
 */
export const getRecommendationsByCategory = async (
  category: Category
): Promise<Recommendation[]> => {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*, upvotes(user_id), wishlists(user_id), placed_stickers(*, sticker:stickers(*))')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取推荐失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
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

  return Array.isArray(data) ? data : [];
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

  return Array.isArray(data) ? data : [];
};

/**
 * 按地点名称获取推荐
 */
export const getRecommendationsByPlace = async (
  placeName: string
): Promise<Recommendation[]> => {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*, upvotes(user_id), wishlists(user_id), placed_stickers(*, sticker:stickers(*))')
    .eq('place_name', placeName)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取地点推荐失败:', error);
    return [];
  }

  return Array.isArray(data) ? data : [];
};

/**
 * 上传图片到 Supabase Storage
 */
export const uploadImage = async (file: File): Promise<string | null> => {
  try {
    // 压缩图片
    const compressedFile = await compressImage(file);
    
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
  recommendation: Omit<Recommendation, 'id' | 'created_at'>
): Promise<Recommendation | null> => {
  const { data, error } = await supabase
    .from('recommendations')
    .insert([recommendation])
    .select()
    .maybeSingle();

  if (error) {
    console.error('创建推荐失败:', error);
    return null;
  }

  return data;
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
    .insert({ id: userId, user_name: fallbackName || '新用户', email: email ?? null });

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
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, user_name: userName }, { onConflict: 'id' });

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
  return data || [];
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
