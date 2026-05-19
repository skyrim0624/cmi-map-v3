import { checkBadgesUnlocked } from '@/lib/badgeUtils';
import { BADGE_REGISTRY, type Badge } from '@/types/badges';
import type { Recommendation } from '@/types/types';

export interface AchievementProgress {
  unlockedIds: string[];
  newlyUnlockedBadge: Badge | null;
}

const getViewedBadgesStorageKey = (userId: string) => `cmi_badges_${userId}`;

export function syncAchievementProgress(
  userId: string,
  recommendations: Recommendation[]
): AchievementProgress {
  const unlockedIds = checkBadgesUnlocked(userId, recommendations);
  const storageKey = getViewedBadgesStorageKey(userId);
  const stored = localStorage.getItem(storageKey);
  const previouslyViewed: string[] = stored ? JSON.parse(stored) : [];
  const newlyUnlockedIds = unlockedIds.filter(id => !previouslyViewed.includes(id));
  const newlyUnlockedBadge = newlyUnlockedIds.length > 0
    ? BADGE_REGISTRY.find(badge => badge.id === newlyUnlockedIds[0]) ?? null
    : null;

  if (newlyUnlockedIds.length > 0 || (!stored && unlockedIds.length > 0)) {
    localStorage.setItem(storageKey, JSON.stringify(unlockedIds));
  }

  return { unlockedIds, newlyUnlockedBadge };
}
