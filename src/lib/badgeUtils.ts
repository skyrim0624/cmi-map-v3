import { categoryMatchesFilter, Recommendation } from '../types/types';

export interface UnlockedBadgeState {
  unlockedIds: string[];
  isNew: Record<string, boolean>; // badges that where just unlocked this session
  stats: any;
}

const normalizeSearchText = (value: string) =>
  value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase();

const includesAny = (text: string, keywords: string[]) =>
  keywords.some(keyword => text.includes(normalizeSearchText(keyword)));

const getRecommendationSearchText = (recommendation: Recommendation) =>
  normalizeSearchText(
    [
      recommendation.place_name,
      recommendation.category,
      recommendation.reason,
    ].join(' ')
  );

const matchesRecommendationText = (recommendation: Recommendation, keywords: string[]) =>
  includesAny(getRecommendationSearchText(recommendation), keywords);

export function checkBadgesUnlocked(userId: string, allData: Recommendation[]): string[] {
  if (!userId) return [];
  
  const mine = allData.filter(rec => rec.user_id === userId);
  const myUpvotesReceived = mine.reduce((acc, curr) => acc + (curr.upvotes?.length || 0), 0);
  const usersWhoEngagedMine = new Set<string>();
  let totalWishlistsGiven = 0;

  mine.forEach(rec => {
    rec.upvotes?.forEach(upvote => {
      if (upvote.user_id !== userId) usersWhoEngagedMine.add(upvote.user_id);
    });
    rec.wishlists?.forEach(wishlist => {
      if (wishlist.user_id !== userId) usersWhoEngagedMine.add(wishlist.user_id);
    });
  });
  
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

    if (rec.user_id !== userId && rec.wishlists?.some(w => w.user_id === userId)) {
      totalWishlistsGiven++;
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
  const catCount = (category: Recommendation['category']) =>
    mine.filter(m => categoryMatchesFilter(m.category, category)).length >= 2;
  check('coffee_addict', catCount('咖啡'));
  check('food_expert', catCount('吃饭'));
  check('outdoor_explorer', catCount('户外'));
  check('photo', catCount('景点'));
  check('market', catCount('市集'));
  check('relax', catCount('马杀鸡'));
  check('sports', catCount('运动'));
  check('bar', catCount('酒吧'));
  check('mind_body', catCount('身心'));
  check('survival', catCount('生存指南'));
  check('treasure', catCount('彩蛋'));
  check(
    'budget_food',
    mine.some(m =>
      (m.category === '吃饭' || matchesRecommendationText(m, ['餐厅', '小吃', '夜市', '饭', '面', '粉']))
      && matchesRecommendationText(m, ['平价', '便宜', '实惠', '划算', '人均', '泰铢', 'baht', '฿'])
    )
  );
  check('rainy_shelter', mine.some(m => matchesRecommendationText(m, ['雨天', '下雨', '雨季', '避雨', '室内', 'rainy', 'rain'])));
  check('bookstore_lurker', mine.some(m => matchesRecommendationText(m, ['书店', '图书馆', '读书', '阅读', '自习', 'library', 'bookstore'])));
  check('chinese_radar', mine.some(m => matchesRecommendationText(m, ['中文', '华人', '中文菜单', '中文沟通', '中国胃', '云南', 'chinese'])));

  // --- 地图考古学家 ---
  check('photos_truth', postsWithImages >= 3);
  check('chronicler', postsWithImages >= 15);
  check('living_map', categoriesPosted.size >= 4);
  check('writer', longPosts >= 1);
  check('price_assassin', mine.some(m => matchesRecommendationText(m, ['价格', '价钱', '人均', '泰铢', 'baht', '฿', '便宜', '平价', '划算', '贵'])));
  check('parking_detective', mine.some(m => matchesRecommendationText(m, ['停车', '车位', '停车场', 'parking', 'park'])));
  check('hours_keeper', mine.some(m => matchesRecommendationText(m, ['营业', '开门', '关门', '几点', '开到', '早上', '晚上', '24小时', 'open', 'close'])));
  check('booking_master', mine.some(m => matchesRecommendationText(m, ['预约', '预定', '订位', '提前订', '提前约', 'booking', 'reserve'])));
  check('pitfall_patch', mine.some(m => matchesRecommendationText(m, ['避坑', '小心', '注意', '踩雷', '别去', '不建议', '提醒', '记得'])));

  // --- 手账创作者补充 ---
  check('weekend_collector', mine.some(m => {
    const day = new Date(m.created_at).getDay();
    return day === 0 || day === 6;
  }));
  check('old_city_record', mine.some(m => matchesRecommendationText(m, ['老城', '古城', '塔佩', '塔佩门', '护城河', 'old city', 'tha pae', 'thapae'])));
  check('nimman_observer', mine.some(m => matchesRecommendationText(m, ['宁曼', '尼曼', 'nimman', 'maya', 'one nimman'])));

  // --- 互动行者 ---
  check('first_like', totalLikesGiven >= 1);
  check('reader', totalLikesGiven >= 10);
  check('warmer', totalLikesGiven >= 30);
  check('hypeleader', totalLikesGiven >= 60);
  check('perpetual_like', totalLikesGiven >= 150);
  check('watering', likesGivenToAuth.size >= 10);
  check(
    'lucky_rescue',
    allData.some(rec =>
      rec.user_id !== userId
      && rec.upvotes?.some(u => u.user_id === userId)
      && (rec.upvotes?.length || 0) <= 2
    )
  );
  check('lucky_wishlist', totalWishlistsGiven >= 3);

  // --- 社区之光 ---
  check('like_received', myUpvotesReceived >= 1);
  check('fame', myUpvotesReceived >= 15);
  check('reputation', myUpvotesReceived >= 50);
  check('kol', myUpvotesReceived >= 150);
  check('hot_maker', mine.some(m => (m.upvotes?.length || 0) >= 10));
  check('lucky_word_of_mouth', usersWhoEngagedMine.size >= 3);

  // --- 隐藏彩蛋 (Mock logic for easter eggs) ---
  // Nightowl: any post created between 00:00 and 04:59
  const isNightowl = mine.some(m => {
    const hr = new Date(m.created_at).getHours();
    return hr >= 0 && hr < 5;
  });
  check('nightowl', isNightowl);

  const isMorningScooter = mine.some(m => {
    const hr = new Date(m.created_at).getHours();
    return hr >= 5 && hr < 9;
  });
  check('morning_scooter', isMorningScooter);

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
