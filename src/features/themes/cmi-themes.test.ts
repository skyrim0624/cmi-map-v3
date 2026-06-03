import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getActiveCmiTheme,
  getThemeSubmissionRecommendationIds,
  getThemeSubmissionRecommendations,
  isThemeSubmissionRecommendation,
  type CmiMapTheme,
  type CmiThemeSubmission,
} from './cmi-themes.ts';
import type { Recommendation } from '@/types/types';

const createTheme = (input: Partial<CmiMapTheme> & Pick<CmiMapTheme, 'id' | 'slug'>): CmiMapTheme => ({
  id: input.id,
  slug: input.slug,
  title: input.title ?? input.slug,
  summary: input.summary ?? null,
  description: input.description ?? null,
  status: input.status ?? 'active',
  starts_at: input.starts_at ?? null,
  ends_at: input.ends_at ?? null,
  cover_image_url: input.cover_image_url ?? null,
  share_template_key: input.share_template_key ?? null,
  theme_config: input.theme_config ?? {},
  created_by: input.created_by ?? null,
  created_at: input.created_at ?? '2026-06-03T00:00:00+07:00',
  updated_at: input.updated_at ?? '2026-06-03T00:00:00+07:00',
  tasks: input.tasks ?? [],
});

const createRecommendation = (input: Partial<Recommendation> & Pick<Recommendation, 'id'>): Recommendation => ({
  id: input.id,
  place_name: input.place_name ?? '清迈大学',
  category: input.category ?? '景点',
  reason: input.reason ?? '主题投稿',
  user_name: input.user_name ?? '子场',
  user_id: input.user_id ?? 'user-a',
  latitude: input.latitude ?? 18.8,
  longitude: input.longitude ?? 98.98,
  images: input.images ?? ['/photo.jpg'],
  created_at: input.created_at ?? '2026-06-03T12:00:00+07:00',
});

const createSubmission = (input: Partial<CmiThemeSubmission> & Pick<CmiThemeSubmission, 'id' | 'theme_id' | 'recommendation_id'>): CmiThemeSubmission => ({
  id: input.id,
  theme_id: input.theme_id,
  task_id: input.task_id ?? null,
  recommendation_id: input.recommendation_id,
  user_id: input.user_id ?? null,
  status: input.status ?? 'published',
  is_featured: input.is_featured ?? false,
  created_at: input.created_at ?? '2026-06-03T12:00:00+07:00',
  reviewed_at: input.reviewed_at ?? null,
  reviewed_by: input.reviewed_by ?? null,
  recommendation: input.recommendation ?? null,
  task: input.task ?? null,
});

test('当前主题只选择进行中的主题', () => {
  const active = createTheme({ id: 'theme-active', slug: 'active' });
  const ended = createTheme({ id: 'theme-ended', slug: 'ended', status: 'ended' });

  assert.equal(getActiveCmiTheme([ended, active])?.id, 'theme-active');
});

test('主题投稿仍然保留为普通动态候选', () => {
  const recommendation = createRecommendation({ id: 'rec-theme' });
  const submissions = [
    createSubmission({
      id: 'sub-theme',
      theme_id: 'theme-a',
      recommendation_id: recommendation.id,
    }),
  ];

  assert.equal(isThemeSubmissionRecommendation(recommendation, submissions), true);
  assert.equal(recommendation.user_id, 'user-a');
});

test('主题筛选只返回当前主题的公开投稿', () => {
  const current = createRecommendation({ id: 'rec-current' });
  const hidden = createRecommendation({ id: 'rec-hidden' });
  const other = createRecommendation({ id: 'rec-other' });
  const submissions = [
    createSubmission({ id: 'sub-current', theme_id: 'theme-a', recommendation_id: current.id }),
    createSubmission({ id: 'sub-hidden', theme_id: 'theme-a', recommendation_id: hidden.id, status: 'hidden' }),
    createSubmission({ id: 'sub-other', theme_id: 'theme-b', recommendation_id: other.id }),
  ];

  assert.deepEqual(getThemeSubmissionRecommendationIds('theme-a', submissions), [current.id]);
  assert.deepEqual(
    getThemeSubmissionRecommendations('theme-a', [current, hidden, other], submissions).map(item => item.id),
    [current.id]
  );
});
