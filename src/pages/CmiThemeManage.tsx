import { ArrowLeft, Check, Copy, EyeOff, Loader2, RefreshCw, Star } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCmiMapThemeBySlug,
  getCmiThemeSubmissions,
  updateCmiThemeSubmissionReview,
} from '@/db/cmi-themes';
import {
  buildCmiThemeMaterialRows,
  formatCmiThemeMaterialExport,
  type CmiMapTheme,
  type CmiThemeSubmission,
} from '@/features/themes/cmi-themes';

const formatBangkokTime = (value: string | null | undefined) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Bangkok',
  }).format(new Date(value));
};

const normalizeFilterText = (value: string | null | undefined) =>
  (value ?? '').normalize('NFKC').trim().toLowerCase();

const getSubmissionCreatedAt = (submission: CmiThemeSubmission) =>
  submission.recommendation?.created_at ?? submission.created_at;

export default function CmiThemeManage() {
  const navigate = useNavigate();
  const { themeSlug = '' } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const [theme, setTheme] = useState<CmiMapTheme | null>(null);
  const [submissions, setSubmissions] = useState<CmiThemeSubmission[]>([]);
  const [dateFilter, setDateFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [placeFilter, setPlaceFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  const loadTheme = useCallback(async () => {
    if (!isAdmin || !themeSlug) return;
    setLoading(true);
    try {
      const theme = await getCmiMapThemeBySlug(themeSlug);
      setTheme(theme);
      if (!theme) {
        setSubmissions([]);
        return;
      }
      setSubmissions(await getCmiThemeSubmissions(theme.id, { includeHidden: true }));
    } catch (error) {
      console.error('主题投稿管理加载失败:', error);
      toast.error('主题投稿加载失败');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, themeSlug]);

  useEffect(() => {
    if (isAdmin) void loadTheme();
  }, [isAdmin, loadTheme]);

  const filteredSubmissions = useMemo(() => {
    const normalizedUser = normalizeFilterText(userFilter);
    const normalizedPlace = normalizeFilterText(placeFilter);

    return submissions.filter(submission => {
      const recommendation = submission.recommendation;
      const createdAt = getSubmissionCreatedAt(submission);
      if (dateFilter && !createdAt.startsWith(dateFilter)) return false;
      if (normalizedUser && !normalizeFilterText(recommendation?.user_name).includes(normalizedUser)) return false;
      if (normalizedPlace && !normalizeFilterText(recommendation?.place_name).includes(normalizedPlace)) return false;
      return true;
    });
  }, [dateFilter, placeFilter, submissions, userFilter]);

  const materialExport = useMemo(
    () => formatCmiThemeMaterialExport(buildCmiThemeMaterialRows(filteredSubmissions)),
    [filteredSubmissions]
  );

  const replaceSubmission = (nextSubmission: CmiThemeSubmission | null) => {
    if (!nextSubmission) return;
    setSubmissions(current => current.map(item => item.id === nextSubmission.id ? nextSubmission : item));
  };

  const handleCopyMaterial = async () => {
    await navigator.clipboard.writeText(materialExport);
    toast.success('素材已复制');
  };

  const handleToggleFeatured = async (submission: CmiThemeSubmission) => {
    if (!user) return;
    setUpdatingId(submission.id);
    try {
      const nextSubmission = await updateCmiThemeSubmissionReview({
        submissionId: submission.id,
        adminId: user.id,
        isFeatured: !submission.is_featured,
      });
      replaceSubmission(nextSubmission);
    } catch (error) {
      console.error('主题投稿精选更新失败:', error);
      toast.error('精选更新失败');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleHidden = async (submission: CmiThemeSubmission) => {
    if (!user) return;
    setUpdatingId(submission.id);
    try {
      const nextStatus = submission.status === 'hidden' ? 'published' : 'hidden';
      const nextSubmission = await updateCmiThemeSubmissionReview({
        submissionId: submission.id,
        adminId: user.id,
        status: nextStatus,
      });
      replaceSubmission(nextSubmission);
    } catch (error) {
      console.error('主题投稿隐藏更新失败:', error);
      toast.error('隐藏更新失败');
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading || !user || !profile) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f8f1df]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3f6e52]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] bg-[#f8f1df] px-5 py-5">
        <Button variant="outline" className="h-11 rounded-full bg-white" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <div className="mt-8 rounded-2xl border border-[#2e2a23]/10 bg-white p-5 text-sm font-black text-[#2e2a23]">
          无权限
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f8f1df] px-4 py-5 text-[#242424]">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <Button variant="outline" className="h-11 rounded-full bg-white" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <Button type="button" variant="outline" className="h-11 rounded-full bg-white" onClick={loadTheme} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          刷新
        </Button>
      </header>

      <section className="mx-auto mt-5 max-w-5xl rounded-2xl border border-[#2e2a23]/10 bg-white p-4">
        <h1 className="text-2xl font-black leading-tight">{theme?.title ?? '主题管理'}</h1>
        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <Input type="date" value={dateFilter} onChange={event => setDateFilter(event.target.value)} />
          <Input value={userFilter} onChange={event => setUserFilter(event.target.value)} placeholder="用户" />
          <Input value={placeFilter} onChange={event => setPlaceFilter(event.target.value)} placeholder="地点" />
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-5xl rounded-2xl border border-[#2e2a23]/10 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <strong className="text-sm font-black">素材</strong>
          <Button type="button" className="h-10 rounded-full bg-[#3f6e52] px-4 font-black text-white" onClick={handleCopyMaterial}>
            <Copy className="h-4 w-4" />
            复制素材
          </Button>
        </div>
        <textarea
          readOnly
          value={materialExport}
          className="min-h-44 w-full resize-y rounded-2xl border border-[#2e2a23]/12 bg-[#f8f1df] px-3 py-3 font-mono text-xs font-bold leading-relaxed text-[#2e2a23]"
        />
      </section>

      <section className="mx-auto mt-4 grid max-w-5xl gap-3">
        {filteredSubmissions.map(submission => {
          const recommendation = submission.recommendation;
          const imageUrl = recommendation?.images[0] || '/map-icons/cmi-flat-v2/place-nature.png';
          const isUpdating = updatingId === submission.id;

          return (
            <article key={submission.id} className="grid gap-3 rounded-2xl border border-[#2e2a23]/10 bg-white p-3 md:grid-cols-[112px_minmax(0,1fr)_auto]">
              <img className="h-28 w-full rounded-xl object-cover md:w-28" src={imageUrl} alt={recommendation?.place_name ?? '主题投稿'} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#6d6a62]">
                  <span>{recommendation?.user_name || 'CMI 朋友'}</span>
                  <span>{formatBangkokTime(getSubmissionCreatedAt(submission))}</span>
                  {submission.is_featured && <span className="rounded-full bg-[#fff3cf] px-2 py-1 text-[#8b5f32]">精选</span>}
                  {submission.status === 'hidden' && <span className="rounded-full bg-[#eee] px-2 py-1 text-[#666]">隐藏</span>}
                </div>
                <h2 className="mt-2 text-lg font-black leading-tight">{recommendation?.place_name || '未关联地点'}</h2>
                {recommendation?.reason && (
                  <p className="mt-2 text-sm font-bold leading-relaxed text-[#4f4a42]">{recommendation.reason}</p>
                )}
              </div>
              <div className="flex gap-2 md:flex-col">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUpdating}
                  className="h-10 rounded-full bg-white px-4 font-black"
                  onClick={() => handleToggleFeatured(submission)}
                >
                  {submission.is_featured ? <Check className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                  精选
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUpdating}
                  className="h-10 rounded-full bg-white px-4 font-black"
                  onClick={() => handleToggleHidden(submission)}
                >
                  <EyeOff className="h-4 w-4" />
                  {submission.status === 'hidden' ? '恢复' : '隐藏'}
                </Button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
