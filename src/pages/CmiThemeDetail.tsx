import { Loader2, Share2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getCmiMapThemeBySlug, getCmiThemeSubmissions } from '@/db/cmi-themes';
import type { CmiMapTheme, CmiThemeSubmission } from '@/features/themes/cmi-themes';
import { createCmiThemeShareCard } from '@/lib/cmi-theme-share-card';
import { getMarkPlacePath, getThemePath } from '@/lib/paths';
import type { Recommendation } from '@/types/types';

type FileShareData = {
  files?: File[];
  title?: string;
  text?: string;
};

type NavigatorWithFileShare = Navigator & {
  canShare?: (data: FileShareData) => boolean;
  share?: (data: FileShareData) => Promise<void>;
};

const formatThemePeriod = (theme: CmiMapTheme) => {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Asia/Bangkok',
  });
  if (!theme.starts_at || !theme.ends_at) return '';
  return `${formatter.format(new Date(theme.starts_at))} - ${formatter.format(new Date(theme.ends_at))}`;
};

const downloadCmiThemeShareCard = (card: { blob: Blob; fileName: string }) => {
  const downloadUrl = URL.createObjectURL(card.blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = card.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
};

export default function CmiThemeDetail() {
  const { themeSlug = '' } = useParams();
  const [theme, setTheme] = useState<CmiMapTheme | null>(null);
  const [submissions, setSubmissions] = useState<CmiThemeSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sharingRecommendationId, setSharingRecommendationId] = useState<string | null>(null);

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

  const visibleSubmissions = useMemo(
    () => submissions.filter(submission => submission.recommendation),
    [submissions]
  );

  const handleShareSubmission = async (recommendation: Recommendation) => {
    if (!theme) return;
    setSharingRecommendationId(recommendation.id);

    try {
      const themeUrl = new URL(getThemePath(theme.slug), window.location.origin).toString();
      const card = await createCmiThemeShareCard({
        theme,
        recommendation,
        authorName: recommendation.user_name || 'CMI 朋友',
        themeUrl,
      });
      const file = new File([card.blob], card.fileName, { type: 'image/png' });
      const shareData: FileShareData = {
        files: [file],
        title: `CMI Map · ${theme.title}`,
        text: `${theme.title}｜${recommendation.place_name}`,
      };
      const navigatorWithFileShare = navigator as NavigatorWithFileShare;

      if (navigatorWithFileShare.share && (!navigatorWithFileShare.canShare || navigatorWithFileShare.canShare(shareData))) {
        try {
          await navigatorWithFileShare.share(shareData);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          console.error('主题分享卡系统分享失败:', error);
        }
      }

      downloadCmiThemeShareCard(card);
      toast.success('已生成主题分享卡');
    } catch (error) {
      console.error('主题分享卡生成失败:', error);
      toast.error('主题分享卡生成失败，请稍后再试');
    } finally {
      setSharingRecommendationId(null);
    }
  };

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

  return (
    <main className="min-h-[100dvh] bg-[#f8f4e8] px-5 py-6 text-stone-900">
      <section className="space-y-3">
        <p className="text-xs font-black text-[#4f8f5b]">主题地图</p>
        <h1 className="text-3xl font-black leading-tight">{theme.title}</h1>
        {theme.summary && <p className="text-sm font-bold leading-relaxed text-stone-700">{theme.summary}</p>}
        {period && <p className="text-xs font-black text-stone-500">{period}</p>}
      </section>

      {theme.description && (
        <section className="mt-6 space-y-2">
          <h2 className="text-base font-black">主题介绍</h2>
          <p className="text-sm font-bold leading-relaxed text-stone-700">{theme.description}</p>
        </section>
      )}

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
        <h2 className="text-base font-black">大家的投稿</h2>
        {visibleSubmissions.length === 0 ? (
          <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm font-bold text-stone-600 shadow-sm">
            还没有主题投稿。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visibleSubmissions.map(submission => {
              const recommendation = submission.recommendation;
              if (!recommendation) return null;
              const imageUrl = recommendation.images?.[0];
              const isSharing = sharingRecommendationId === recommendation.id;
              return (
                <article
                  key={submission.id}
                  className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
                >
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={recommendation.place_name}
                      className="aspect-square w-full object-cover"
                    />
                  )}
                  <div className="space-y-2 p-3">
                    <p className="truncate text-xs font-black text-stone-900">{recommendation.place_name}</p>
                    <p className="line-clamp-2 text-xs font-bold leading-relaxed text-stone-600">{recommendation.reason}</p>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#4f8f5b] px-3 text-xs font-black text-white disabled:opacity-60"
                      disabled={isSharing}
                      onClick={() => void handleShareSubmission(recommendation)}
                    >
                      {isSharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
                      分享卡
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
