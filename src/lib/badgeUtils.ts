import { Recommendation } from '../types/types';
import { BADGE_REGISTRY } from '../types/badges';

export interface UnlockedBadgeState {
  unlockedIds: string[];
  isNew: Record<string, boolean>; // badges that where just unlocked this session
  stats: any;
}

export function checkBadgesUnlocked(userId: string, allData: Recommendation[]): string[] {
  if (!userId) return [];
  
  const mine = allData.filter(rec => rec.user_id === userId);
  const myUpvotesReceived = mine.reduce((acc, curr) => acc + (curr.upvotes?.length || 0), 0);
  
  // 1. Calculate categories posted
  const categoriesPosted = new Set(mine.map(m => m.category));
  
  // 2. Count posts with images
  const postsWithImages = mine.filter(m => m.images && m.images.length > 0).length;
  
  // 3. Count posts with long content (approx 50 words)
  const longPosts = mine.filter(m => m.reason && m.reason.length > 50).length;

  // 4. Calculate total likes given (look at allData and find user in upvotes)
  let likesGivenToAuth = new Set<string>();
  let totalLikesGiven = 0;
  
  allData.forEach(rec => {
    if (rec.upvotes && rec.upvotes.some(u => u.user_id === userId)) {
      totalLikesGiven++;
      if (rec.user_id) likesGivenToAuth.add(rec.user_id);
    }
  });

  const unlocked = new Set<string>();

  const check = (id: string, condition: boolean) => {
    if (condition) unlocked.add(id);
  };

  // --- 手账创作者 ---
  check('first_pin', mine.length >= 1);
  check('three_pages', mine.length >= 3);
  check('painter', mine.length >= 10);
  check('encyclopedia', mine.length >= 25);
  check('map_soul', mine.length >= 50);

  // --- 品类鉴赏家 ---
  const catCount = (category: string) => mine.filter(m => m.category === category).length >= 2;
  check('coffee_addict', catCount('咖啡'));
  check('food_expert', catCount('吃饭'));
  check('outdoor_explorer', catCount('户外'));
  check('photo', catCount('拍照'));
  check('market', catCount('市集'));
  check('relax', catCount('马杀鸡'));
  check('sports', catCount('运动'));
  check('bar', catCount('酒吧'));
  check('mind_body', catCount('身心'));
  check('survival', catCount('生存指南'));
  check('treasure', catCount('彩蛋'));

  // --- 地图考古学家 ---
  check('photos_truth', postsWithImages >= 3);
  check('chronicler', postsWithImages >= 15);
  check('living_map', categoriesPosted.size >= 4);
  check('writer', longPosts >= 1);

  // --- 互动行者 ---
  check('first_like', totalLikesGiven >= 1);
  check('reader', totalLikesGiven >= 10);
  check('warmer', totalLikesGiven >= 30);
  check('hypeleader', totalLikesGiven >= 60);
  check('perpetual_like', totalLikesGiven >= 150);
  check('watering', likesGivenToAuth.size >= 10);

  // --- 社区之光 ---
  check('like_received', myUpvotesReceived >= 1);
  check('fame', myUpvotesReceived >= 15);
  check('reputation', myUpvotesReceived >= 50);
  check('kol', myUpvotesReceived >= 150);
  check('hot_maker', mine.some(m => (m.upvotes?.length || 0) >= 10));

  // --- 隐藏彩蛋 (Mock logic for easter eggs) ---
  // Nightowl: any post created between 00:00 and 04:59
  const isNightowl = mine.some(m => {
    const hr = new Date(m.created_at).getHours();
    return hr >= 0 && hr < 5;
  });
  check('nightowl', isNightowl);

  // Loner: Post has 0 upvotes and is older than 3 days
  const now = new Date().getTime();
  const isLoner = mine.some(m => {
    const isOld = now - new Date(m.created_at).getTime() > 3 * 24 * 60 * 60 * 1000;
    return isOld && (!m.upvotes || m.upvotes.length === 0);
  });
  check('loner', isLoner);

  // Veteran: check if first post was created long ago
  check('veteran', mine.length > 5); // simplified logic

  // Leftbehind: active in 3 different months
  const activeMonths = new Set(mine.map(m => {
    const d = new Date(m.created_at);
    return `${d.getFullYear()}-${d.getMonth()}`;
  }));
  check('leftbehind', activeMonths.size >= 3);

  return Array.from(unlocked);
}
