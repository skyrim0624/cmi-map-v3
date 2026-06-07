import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCmiThemeSubmissionInsert,
  getActiveCmiTheme,
  getThemeSubmissionRecommendations,
  type CmiMapTheme,
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
  theme_config: input.theme_config ?? {},
  created_at: input.created_at ?? '2026-06-07T12:30:00+07:00',
  updated_at: input.updated_at ?? '2026-06-07T12:30:00+07:00',
  tasks: input.tasks ?? [],
});

const createRecommendation = (input: Partial<Recommendation> & Pick<Recommendation, 'id'>): Recommendation => ({
  id: input.id,
  place_name: input.place_name ?? '清迈动物角落',
  category: input.category ?? '彩蛋',
  reason: input.reason ?? '看到一只很淡定的小动物',
  user_name: input.user_name ?? 'CMI 朋友',
  user_id: input.user_id ?? 'user-a',
  latitude: input.latitude ?? 18.8,
  longitude: input.longitude ?? 98.98,
  images: input.images ?? ['/animal.jpg'],
  created_at: input.created_at ?? '2026-06-07T12:30:00+07:00',
});

test('当前主题只选择 active 主题', () => {
  const active = createTheme({ id: 'theme-active', slug: 'wild-chiang-mai' });
  const ended = createTheme({ id: 'theme-ended', slug: 'ended', status: 'ended' });

  assert.equal(getActiveCmiTheme([ended, active])?.id, 'theme-active');
});

test('主题投稿写入只包含主题、任务、动态和用户关系', () => {
  assert.deepEqual(
    buildCmiThemeSubmissionInsert({
      themeId: 'theme-a',
      taskId: 'task-a',
      recommendationId: 'rec-a',
      userId: 'user-a',
    }),
    {
      theme_id: 'theme-a',
      task_id: 'task-a',
      recommendation_id: 'rec-a',
      user_id: 'user-a',
    }
  );
});

test('主题投稿关系只筛当前主题绑定的动态', () => {
  const current = createRecommendation({ id: 'rec-current' });
  const other = createRecommendation({ id: 'rec-other' });

  assert.deepEqual(
    getThemeSubmissionRecommendations('theme-a', [current, other], [
      { theme_id: 'theme-a', recommendation_id: current.id },
      { theme_id: 'theme-b', recommendation_id: other.id },
    ]).map(item => item.id),
    [current.id]
  );
});
