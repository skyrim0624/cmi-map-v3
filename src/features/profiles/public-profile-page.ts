import type { PublicProfile } from '@/db/api';

export type PublicProfileTabId = 'recommendations' | 'posts';

export interface PublicProfileTab {
  id: PublicProfileTabId;
  label: string;
  count: number;
}

export const buildPublicProfileTabs = ({
  recommendationCount,
  postCount,
}: {
  recommendationCount: number;
  postCount: number;
}): PublicProfileTab[] => [
  { id: 'recommendations', label: 'TA 的痕迹', count: recommendationCount },
  { id: 'posts', label: 'TA 的动态', count: postCount },
];

export const getPublicProfileDisplayName = ({
  profile,
  recommendations,
  posts,
  routeIdentity,
}: {
  profile: Pick<PublicProfile, 'user_name'> | null;
  recommendations: Array<{ user_name?: string | null }>;
  posts: Array<{ author_name?: string | null }>;
  routeIdentity: string;
}) =>
  profile?.user_name?.trim()
  || recommendations.find(recommendation => recommendation.user_name?.trim())?.user_name?.trim()
  || posts.find(post => post.author_name?.trim())?.author_name?.trim()
  || routeIdentity;
