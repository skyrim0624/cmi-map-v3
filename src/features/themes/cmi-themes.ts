import type { Recommendation } from '@/types/types';

export type CmiThemeStatus = 'draft' | 'active' | 'ended' | 'archived';
export type CmiThemeSubmissionStatus = 'published' | 'hidden' | 'removed';

export interface CmiThemeTask {
  id: string;
  theme_id: string;
  title: string;
  description: string | null;
  target_count: number | null;
  requires_image: boolean;
  reward_badge_id: string | null;
  sort_order: number;
  created_at?: string;
}

export interface CmiMapTheme {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  status: CmiThemeStatus;
  starts_at: string | null;
  ends_at: string | null;
  cover_image_url: string | null;
  share_template_key: string | null;
  theme_config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tasks?: CmiThemeTask[];
}

export interface CmiThemeSubmission {
  id: string;
  theme_id: string;
  task_id: string | null;
  recommendation_id: string;
  user_id: string | null;
  status: CmiThemeSubmissionStatus;
  is_featured: boolean;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  recommendation?: Recommendation | null;
  task?: CmiThemeTask | null;
}

export interface CreateCmiThemeSubmissionInput {
  themeId: string;
  taskId?: string | null;
  recommendationId: string;
  userId: string;
}

const isPublishedSubmission = (submission: CmiThemeSubmission) =>
  submission.status === 'published';

export function buildCmiThemeSubmissionInsert(input: CreateCmiThemeSubmissionInput) {
  return {
    theme_id: input.themeId,
    task_id: input.taskId ?? null,
    recommendation_id: input.recommendationId,
    user_id: input.userId,
    status: 'published' as const,
  };
}

export function getActiveCmiTheme(themes: CmiMapTheme[]) {
  return themes.find(theme => theme.status === 'active') ?? null;
}

export function getThemeSubmissionRecommendationIds(
  themeId: string,
  submissions: CmiThemeSubmission[]
) {
  return submissions
    .filter(submission => submission.theme_id === themeId && isPublishedSubmission(submission))
    .map(submission => submission.recommendation_id);
}

export function isThemeSubmissionRecommendation(
  recommendation: Pick<Recommendation, 'id'>,
  submissions: CmiThemeSubmission[]
) {
  return submissions.some(submission =>
    submission.recommendation_id === recommendation.id && isPublishedSubmission(submission)
  );
}

export function getThemeSubmissionRecommendations<T extends Pick<Recommendation, 'id'>>(
  themeId: string,
  recommendations: T[],
  submissions: CmiThemeSubmission[]
) {
  const recommendationIds = new Set(getThemeSubmissionRecommendationIds(themeId, submissions));
  return recommendations.filter(recommendation => recommendationIds.has(recommendation.id));
}
