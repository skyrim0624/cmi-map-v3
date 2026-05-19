import { ArrowLeft, Compass, MapPinned, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getPlaceGuide, isCommunityCuratedRecommendation } from '@/data/place-guides';
import { getRecommendationsByUser } from '@/db/api';
import { getPlacePath } from '@/lib/paths';
import type { Category, Recommendation } from '@/types/types';
import { categoryMatchesFilter, getCategoryIconUrl, normalizeCategory } from '@/types/types';

type CategoryCount = {
  name: Category;
  count: number;
};

const getTopCategories = (items: Recommendation[]): CategoryCount[] => {
  const counts = new Map<Category, number>();
  for (const item of items) {
    const category = normalizeCategory(item.category);
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
};

const getLongestReason = (items: Recommendation[]) =>
  [...items].sort((a, b) => b.reason.length - a.reason.length)[0];

export default function PersonMap() {
  const navigate = useNavigate();
  const { userName } = useParams<{ userName: string }>();
  const decodedName = decodeURIComponent(userName || '');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');

  useEffect(() => {
    const loadRecommendations = async () => {
      setLoading(true);
      const data = decodedName ? await getRecommendationsByUser(decodedName) : [];
      setRecommendations(data);
      setLoading(false);
    };

    loadRecommendations();
  }, [decodedName]);

  const topCategories = useMemo(() => getTopCategories(recommendations), [recommendations]);
  const signatureRecommendation = useMemo(() => getLongestReason(recommendations), [recommendations]);
  const filteredRecommendations = selectedCategory === 'all'
    ? recommendations
    : recommendations.filter(item => categoryMatchesFilter(item.category, selectedCategory));

  const uniquePlaceCount = new Set(recommendations.map(item => item.place_name)).size;
  const signatureCategory = topCategories[0]?.name || '清迈';
  const isCommunityMap = decodedName === 'CMI社区';
  const signatureGuide = signatureRecommendation
    ? getPlaceGuide(signatureRecommendation.place_name, signatureRecommendation.category)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b border-border/50 bg-background/85 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full press-feedback"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-bold text-primary">{isCommunityMap ? '社区生活底库' : 'TA 的清迈地图'}</p>
            <h1 className="truncate text-xl font-black text-foreground">{decodedName || '无名旅人'}</h1>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-4 py-5">
        <section className="rounded-3xl border-2 border-foreground bg-card p-5 shadow-[5px_6px_0_rgba(0,0,0,0.16)]">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-foreground bg-primary text-2xl font-black text-primary-foreground shadow-[3px_4px_0_rgba(0,0,0,0.14)]">
              {(decodedName || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-muted-foreground">
                {isCommunityMap
                  ? '这不是某个人的私人口味，而是 CMI 先整理出来的清迈生活底库：吃饭、咖啡、市场、理发、换汇、打印，先帮后来的人知道这些地方存在。'
                  : '如果你喜欢 TA 留下的点，可以跟着这张地图逛清迈。'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-accent px-3 py-1 text-accent-foreground">{uniquePlaceCount} 个地点</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">偏爱 {signatureCategory}</span>
              </div>
            </div>
          </div>

          {signatureRecommendation && (
            <button
              type="button"
              className="w-full rounded-2xl bg-muted/70 p-4 text-left transition-transform active:scale-[0.99]"
              onClick={() => navigate(getPlacePath(signatureRecommendation.place_name))}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-black text-primary">
                <Sparkles className="h-4 w-4" />
                {isCommunityMap ? '社区收藏样例' : '代表性一笔'}
              </div>
              <p className="line-clamp-3 text-base font-semibold leading-relaxed text-foreground">
                {signatureRecommendation && isCommunityCuratedRecommendation(signatureRecommendation) && signatureGuide
                  ? signatureGuide.summary
                  : `“${signatureRecommendation.reason}”`}
              </p>
              <p className="mt-2 truncate text-xs font-medium text-muted-foreground">
                📍 {signatureGuide && isCommunityMap ? signatureGuide.title : signatureRecommendation.place_name}
              </p>
            </button>
          )}
        </section>

        <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <h2 className="font-black">品味轨迹</h2>
          </div>
          {topCategories.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">TA 还没有留下公开推荐。</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => setSelectedCategory('all')}
              >
                全部
              </Button>
              {topCategories.map(item => (
                <Button
                  key={item.name}
                  size="sm"
                  variant={selectedCategory === item.name ? 'default' : 'outline'}
                  className="rounded-full"
                  onClick={() => setSelectedCategory(item.name)}
                >
                  <img src={getCategoryIconUrl(item.name)} alt="" className="mr-1 h-5 w-5 object-contain" />
                  {item.name} {item.count}
                </Button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 pb-8">
          <div className="flex items-center gap-2 px-1">
            <MapPinned className="h-5 w-5 text-primary" />
            <h2 className="font-black">跟着 TA 逛</h2>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm font-medium text-muted-foreground">正在翻 TA 的清迈手账...</div>
          ) : filteredRecommendations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              这一类暂时没有推荐。
            </div>
          ) : (
            filteredRecommendations.map(item => (
              <button
                key={item.id}
                type="button"
                className="flex w-full gap-3 rounded-2xl border border-border/70 bg-card p-3 text-left shadow-sm transition-transform active:scale-[0.99]"
                onClick={() => navigate(getPlacePath(item.place_name))}
              >
                {item.images.length > 0 ? (
                  <img src={item.images[0]} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-accent p-3">
                    <img src={getCategoryIconUrl(item.category)} alt="" className="h-full w-full object-contain opacity-70" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {isCommunityCuratedRecommendation(item) ? (
                    <>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                          {getPlaceGuide(item.place_name, item.category).kind}
                        </span>
                        <span className="truncate text-[11px] font-semibold text-muted-foreground">
                          {item.place_name}
                        </span>
                      </div>
                      <p className="truncate text-sm font-black leading-tight">
                        {getPlaceGuide(item.place_name, item.category).title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-muted-foreground">
                        {getPlaceGuide(item.place_name, item.category).summary}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="line-clamp-2 text-sm font-semibold leading-relaxed">“{item.reason}”</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">📍 {item.place_name}</p>
                    </>
                  )}
                </div>
              </button>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
