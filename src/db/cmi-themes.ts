import {
  buildCmiThemeSubmissionInsert,
  type CmiMapTheme,
  type CmiThemeSubmission,
  type CmiThemeTask,
  type CreateCmiThemeSubmissionInput,
} from '@/features/themes/cmi-themes';
import type { Recommendation } from '@/types/types';
import { supabase } from './supabase';

type CmiMapThemeRow = Omit<CmiMapTheme, 'tasks'> & {
  tasks?: CmiThemeTask[] | null;
};

type CmiThemeSubmissionRow = Omit<CmiThemeSubmission, 'recommendation' | 'task'> & {
  recommendation?: Recommendation | Recommendation[] | null;
  task?: CmiThemeTask | CmiThemeTask[] | null;
};

const toSingleRelation = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const toTheme = (row: CmiMapThemeRow): CmiMapTheme => ({
  ...row,
  tasks: [...(row.tasks ?? [])].sort((left, right) => left.sort_order - right.sort_order),
});

const toSubmission = (row: CmiThemeSubmissionRow): CmiThemeSubmission => ({
  ...row,
  recommendation: toSingleRelation(row.recommendation),
  task: toSingleRelation(row.task),
});

const handleThemeReadError = (label: string, error: unknown) => {
  console.warn(label, error);
};

export const getActiveCmiMapTheme = async (): Promise<CmiMapTheme | null> => {
  const { data, error } = await supabase
    .from('cmi_map_themes')
    .select('*, tasks:cmi_theme_tasks(*)')
    .eq('status', 'active')
    .order('starts_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    handleThemeReadError('获取当前主题失败:', error);
    return null;
  }

  return data ? toTheme(data as CmiMapThemeRow) : null;
};

export const getCmiMapThemeBySlug = async (slug: string): Promise<CmiMapTheme | null> => {
  const { data, error } = await supabase
    .from('cmi_map_themes')
    .select('*, tasks:cmi_theme_tasks(*)')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    handleThemeReadError('获取主题详情失败:', error);
    return null;
  }

  return data ? toTheme(data as CmiMapThemeRow) : null;
};

export const getCmiThemeSubmissions = async (themeId: string): Promise<CmiThemeSubmission[]> => {
  const { data, error } = await supabase
    .from('cmi_theme_submissions')
    .select('*, recommendation:recommendations(*), task:cmi_theme_tasks(*)')
    .eq('theme_id', themeId)
    .order('created_at', { ascending: false });

  if (error) {
    handleThemeReadError('获取主题投稿失败:', error);
    return [];
  }

  return Array.isArray(data) ? (data as CmiThemeSubmissionRow[]).map(toSubmission) : [];
};

export const createCmiThemeSubmission = async (
  input: CreateCmiThemeSubmissionInput
): Promise<CmiThemeSubmission | null> => {
  const { data, error } = await supabase
    .from('cmi_theme_submissions')
    .upsert(buildCmiThemeSubmissionInsert(input), {
      onConflict: 'theme_id,recommendation_id',
    })
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toSubmission(data as CmiThemeSubmissionRow) : null;
};
