import type { Recommendation } from '@/types/types';

export type CmiThemeStatus = 'draft' | 'active' | 'ended' | 'archived';

export interface CmiThemeTask {
  id: string;
  theme_id: string;
  title: string;
  description: string | null;
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
  theme_config: Record<string, unknown>;
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
  created_at: string;
  recommendation?: Recommendation | null;
  task?: CmiThemeTask | null;
}

export interface CreateCmiThemeSubmissionInput {
  themeId: string;
  taskId?: string | null;
  recommendationId: string;
  userId: string;
}

export type CmiThemeSubmissionLink = Pick<CmiThemeSubmission, 'theme_id' | 'recommendation_id'>;

export function getActiveCmiTheme(themes: CmiMapTheme[]) {
  return themes.find(theme => theme.status === 'active') ?? null;
}

export function buildCmiThemeSubmissionInsert(input: CreateCmiThemeSubmissionInput) {
  return {
    theme_id: input.themeId,
    task_id: input.taskId ?? null,
    recommendation_id: input.recommendationId,
    user_id: input.userId,
  };
}

export function getThemeSubmissionRecommendations<T extends Pick<Recommendation, 'id'>>(
  themeId: string,
  recommendations: T[],
  submissions: CmiThemeSubmissionLink[]
) {
  const recommendationIds = new Set(
    submissions
      .filter(submission => submission.theme_id === themeId)
      .map(submission => submission.recommendation_id)
  );

  return recommendations.filter(recommendation => recommendationIds.has(recommendation.id));
}
