import { supabase } from './supabase';

export async function toggleWishlist(recommendationId: string, userId: string): Promise<boolean> {
  try {
    const { data: existingWishlist } = await supabase
      .from('wishlists')
      .select('*')
      .eq('recommendation_id', recommendationId)
      .eq('user_id', userId)
      .single();

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
