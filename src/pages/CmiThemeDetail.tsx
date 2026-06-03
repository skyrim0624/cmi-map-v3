import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCmiMapThemeBySlug, getCmiThemeSubmissions } from '@/db/cmi-themes';
import type { CmiMapTheme, CmiThemeSubmission } from '@/features/themes/cmi-themes';
import { getMarkPlacePath, getPlacePath } from '@/lib/paths';

function formatThemePeriod(theme: CmiMapTheme) {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Asia/Bangkok',
  });
  if (!theme.starts_at || !theme.ends_at) return '';
  return `${formatter.format(new Date(theme.starts_at))} - ${formatter.format(new Date(theme.ends_at))}`;
}

export default function CmiThemeDetail() {
  const { themeSlug = '' } = useParams();
  const [theme, setTheme] = useState<CmiMapTheme | null>(null);
  const [submissions, setSubmissions] = useState<CmiThemeSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getCmiMapThemeBySlug(themeSlug)
      .then(async nextTheme => {
        if (!isMounted) return;
        setTheme(nextTheme);
        if (!nextTheme) {
          setSubmissions([]);
          return;
        }
        const nextSubmissions = await getCmiThemeSubmissions(nextTheme.id);
        if (isMounted) setSubmissions(nextSubmissions);
      })
      .catch(error => {
        console.error('主题地图加载失败:', error);
        if (isMounted) {
          setTheme(null);
          setSubmissions([]);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [themeSlug]);

  const participantCount = useMemo(() => {
    const userKeys = new Set(
      submissions
        .map(submission => submission.user_id ?? submission.recommendation?.user_name ?? '')
        .filter(Boolean)
    );
    return userKeys.size;
  }, [submissions]);

  if (isLoading) {
    return (
      <main className="min-h-[100dvh] bg-[#f8f4e8] px-5 py-6 text-stone-900">
        <div className="text-sm font-black">主题加载中</div>
      </main>
    );
  }

  if (!theme) {
    return (
      <main className="min-h-[100dvh] bg-[#f8f4e8] px-5 py-6 text-stone-900">
        <div className="text-sm font-black">主题不存在</div>
      </main>
    );
  }

  const period = formatThemePeriod(theme);
  const visibleSubmissions = submissions.filter(submission => submission.recommendation);

  return (
    <main className="min-h-[100dvh] bg-[#f8f4e8] px-5 py-6 text-stone-900">
      <section className="space-y-3">
        <p className="text-xs font-black text-[#4f8f5b]">主题地图</p>
        <h1 className="text-3xl font-black leading-tight">{theme.title}</h1>
        {theme.summary && <p className="text-sm font-bold leading-relaxed text-stone-700">{theme.summary}</p>}
        {period && <p className="text-xs font-black text-stone-500">{period}</p>}
      </section>

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black">当前任务</h2>
          <span className="text-xs font-black text-stone-500">{participantCount} 人参与</span>
        </div>
        {theme.tasks?.map(task => (
          <div key={task.id} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-stone-900">{task.title}</p>
            {task.description && <p className="mt-1 text-xs font-bold leading-relaxed text-stone-600">{task.description}</p>}
            <Link
              className="mt-3 inline-flex h-10 items-center rounded-lg bg-stone-900 px-4 text-sm font-black text-white"
              to={getMarkPlacePath({ themeSlug: theme.slug, taskId: task.id })}
            >
              参加任务
            </Link>
          </div>
        ))}
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-base font-black">精选投稿</h2>
        <div className="grid grid-cols-2 gap-3">
          {visibleSubmissions.map(submission => {
            const recommendation = submission.recommendation;
            if (!recommendation) return null;
            const imageUrl = recommendation.images?.[0];
            return (
              <Link
                key={submission.id}
                className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
                to={getPlacePath(recommendation.place_name)}
              >
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={recommendation.place_name}
                    className="aspect-square w-full object-cover"
                  />
                )}
                <div className="space-y-1 p-3">
                  <p className="truncate text-xs font-black text-stone-900">{recommendation.place_name}</p>
                  <p className="line-clamp-2 text-xs font-bold leading-relaxed text-stone-600">{recommendation.reason}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
