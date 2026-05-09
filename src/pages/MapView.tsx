import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeafletMap } from '@/components/map/LeafletMap';
import { getAllRecommendations } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, Recommendation, MapMarker as MapMarkerType } from '@/types/types';
import { getCategoryIconUrl, CATEGORIES } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Compass, List, LogIn, MapPinned, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getPersonMapPath, getPlacePath } from '@/lib/paths';
import { getGuideSourceLabel, getPlaceGuide, isCommunityCuratedRecommendation } from '@/data/place-guides';

const getTodayIndex = (length: number) => {
  if (length <= 0) return 0;
  const dateKey = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  return dateKey % length;
};

type ActiveFilter = '精选' | '全部' | Category;
const FEATURED_MARKER_LIMIT = 12;

const SCENE_ENTRIES: Array<{
  label: string;
  category: Category;
}> = [
  { label: '吃饭', category: '吃饭' },
  { label: '咖啡', category: '咖啡' },
  { label: '办事', category: '生存指南' },
  { label: '闲逛', category: '户外' },
  { label: '放松', category: '马杀鸡' },
];

const isDecisionReadyRecommendation = (recommendation: Recommendation) => {
  if (!isCommunityCuratedRecommendation(recommendation)) {
    return recommendation.reason.trim().length >= 18;
  }

  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  return !guide.tags.includes('待确认') && guide.kind !== '坐标点' && guide.summary.trim().length >= 30;
};

const getRecommendationPresentation = (recommendation: Recommendation | null) => {
  if (!recommendation) return null;

  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  const isCommunityGuide = isCommunityCuratedRecommendation(recommendation);

  return {
    title: isCommunityGuide ? guide.title : recommendation.place_name,
    summary: isCommunityGuide ? guide.summary : recommendation.reason,
  };
};

export default function MapView() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [markers, setMarkers] = useState<MapMarkerType[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerType | null>(null);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Recommendation[]>([]);
  const [activeCategory, setActiveCategory] = useState<ActiveFilter>('精选');
  
  const displayName = profile?.user_name || user?.email?.split('@')[0] || '游客';

  const decisionReadyRecommendations = useMemo(
    () => recommendations.filter(isDecisionReadyRecommendation),
    [recommendations]
  );

  const todayPick = decisionReadyRecommendations.length > 0
    ? decisionReadyRecommendations[getTodayIndex(decisionReadyRecommendations.length)]
    : recommendations[0];

  const latestTrace = recommendations[0] || null;
  const sceneRecommendations = useMemo(() => {
    const picks: Recommendation[] = [];
    const seenPlaceNames = new Set<string>();
    const addPick = (recommendation: Recommendation | null | undefined) => {
      if (!recommendation || seenPlaceNames.has(recommendation.place_name)) return;
      seenPlaceNames.add(recommendation.place_name);
      picks.push(recommendation);
    };

    addPick(todayPick);
    addPick(latestTrace);

    for (const scene of SCENE_ENTRIES) {
      addPick(decisionReadyRecommendations.find(rec => rec.category === scene.category));
    }

    for (const recommendation of decisionReadyRecommendations) {
      if (picks.length >= FEATURED_MARKER_LIMIT) break;
      addPick(recommendation);
    }

    return picks;
  }, [decisionReadyRecommendations, latestTrace, todayPick]);
  const featuredPlaceNames = useMemo(
    () => new Set(sceneRecommendations.map(recommendation => recommendation.place_name)),
    [sceneRecommendations]
  );
  const todayPickPresentation = getRecommendationPresentation(todayPick || null);

  // 加载推荐数据
  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    const data = await getAllRecommendations();
    setRecommendations(data);

    // 按地点名称分组，创建标记点
    const markerMap = new Map<string, MapMarkerType>();
    data.forEach((rec) => {
      if (!markerMap.has(rec.place_name)) {
        markerMap.set(rec.place_name, {
          id: rec.id,
          place_name: rec.place_name,
          category: rec.category,
          latitude: rec.latitude,
          longitude: rec.longitude,
          recommendations: []
        });
      }
      markerMap.get(rec.place_name)!.recommendations.push(rec);
    });

    setMarkers(Array.from(markerMap.values()));
  };

  // 点击标记点
  const handleMarkerClick = (marker: MapMarkerType) => {
    setSelectedMarker(marker);
    const recs = recommendations.filter(r => r.place_name === marker.place_name);
    setSelectedRecommendations(recs);
  };

  // 点击预览卡片，进入详情页
  const handleCardClick = () => {
    if (selectedMarker) {
      navigate(getPlacePath(selectedMarker.place_name));
    }
  };

  // 点击地图空白区域，关闭预览卡片
  const handleMapClick = () => {
    setSelectedMarker(null);
    setSelectedRecommendations([]);
  };

  // 过滤当前需要显示的标记点
  const displayedMarkers = activeCategory === '精选'
    ? markers.filter(marker => featuredPlaceNames.has(marker.place_name)).slice(0, FEATURED_MARKER_LIMIT)
    : activeCategory === '全部'
      ? markers
      : markers.filter(m => m.category === activeCategory);

  const selectedRecommendation = selectedRecommendations[0] || null;
  const selectedGuide = selectedRecommendation
    ? getPlaceGuide(selectedRecommendation.place_name, selectedRecommendation.category)
    : null;
  const selectedIsCommunityGuide = selectedRecommendation
    ? isCommunityCuratedRecommendation(selectedRecommendation)
    : false;

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      {/* 地图 - 全屏显示，z-index 最低 */}
      <div className="absolute inset-0 z-0">
        <LeafletMap
          markers={displayedMarkers}
          onMarkerClick={handleMarkerClick}
          onMapClick={handleMapClick}
          mode="view"
          focusUserLocation
          className="w-full h-full"
        />
      </div>

      {/* 左上角应用名称 */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+12px)] left-4 md:left-6 z-20 flex items-center gap-3">
        <h1 className="text-xl font-black text-foreground bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-border/50">
          CMI Map
        </h1>
      </div>

      {/* 右上角列表按钮 */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+12px)] right-4 md:right-6 z-20">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/list')}
          className="press-feedback bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background border-border/50"
        >
          <List className="w-5 h-5" />
        </Button>
      </div>

      {/* 分类抽屉/标签过滤器 (Category Filtering) */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+64px)] left-0 right-0 z-20 overflow-x-auto hide-scrollbar px-4 md:px-6">
        <div className="flex items-center gap-3 pb-2 w-max">
          <Button
            size="sm"
            className={`rounded-full shadow-md font-semibold press-feedback transition-transform ${
              activeCategory === '精选' 
                ? 'bg-primary text-primary-foreground border-2 border-transparent scale-105' 
                : 'bg-background/80 hover:bg-background text-foreground backdrop-blur-sm border-2 border-border/50'
            }`}
            onClick={() => {
              setActiveCategory('精选');
              setSelectedMarker(null);
            }}
          >
            精选
          </Button>
          <Button
            size="sm"
            className={`rounded-full shadow-md font-semibold press-feedback transition-transform ${
              activeCategory === '全部' 
                ? 'bg-primary text-primary-foreground border-2 border-transparent scale-105' 
                : 'bg-background/80 hover:bg-background text-foreground backdrop-blur-sm border-2 border-border/50'
            }`}
            onClick={() => {
              setActiveCategory('全部');
              setSelectedMarker(null);
            }}
          >
            全部
          </Button>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.name}
              size="sm"
              className={`rounded-full shadow-md flex items-center gap-2 font-semibold press-feedback transition-transform ${
                activeCategory === cat.name 
                  ? 'bg-primary text-primary-foreground border-2 border-transparent scale-105' 
                  : 'bg-background/80 hover:bg-background text-foreground backdrop-blur-sm border-2 border-border/50'
              }`}
              onClick={() => {
                setActiveCategory(cat.name);
                setSelectedMarker(null);
              }}
            >
              <img src={cat.iconUrl} alt={cat.name} className="h-5 w-5 object-contain drop-shadow-sm" />
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* 决策入口：默认先给用户一个清晰选择，再进入完整地图。 */}
      {!selectedMarker && (todayPick || latestTrace) && (
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+96px)] left-3 right-3 z-30 md:left-6 md:right-auto md:w-[420px]">
          <section className="rounded-lg border-2 border-foreground bg-background/95 p-3 shadow-[4px_5px_0_rgba(0,0,0,0.18)] backdrop-blur-md">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                  CMI PICKS
                </p>
                <h2 className="text-lg font-black leading-tight text-foreground">
                  今天在清迈
                </h2>
              </div>
              <button
                type="button"
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black transition-transform active:scale-[0.97] ${
                  activeCategory === '精选'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground'
                }`}
                onClick={() => {
                  setActiveCategory('精选');
                  setSelectedMarker(null);
                }}
              >
                精选 {displayedMarkers.length}
              </button>
            </div>

            {todayPick && todayPickPresentation && (
            <button
              type="button"
                className="mb-3 w-full rounded-lg border border-border bg-card p-3 text-left transition-transform active:scale-[0.98]"
              onClick={() => navigate(getPlacePath(todayPick.place_name))}
            >
                <div className="mb-1 flex items-center gap-1.5 text-xs font-black text-primary">
                <Sparkles className="h-4 w-4 shrink-0" />
                今天去哪
              </div>
                <p className="truncate text-base font-black text-foreground">
                  {todayPickPresentation.title}
              </p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-muted-foreground">
                  {todayPickPresentation.summary}
              </p>
            </button>
          )}

            <div className="grid grid-cols-5 gap-1.5">
              {SCENE_ENTRIES.map(scene => (
                <button
                  key={scene.label}
                  type="button"
                  className={`min-w-0 rounded-lg border p-2 text-center transition-transform active:scale-[0.96] ${
                    activeCategory === scene.category
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground'
                  }`}
                  onClick={() => {
                    setActiveCategory(scene.category);
                    setSelectedMarker(null);
                  }}
                >
                  <img
                    src={getCategoryIconUrl(scene.category)}
                    alt=""
                    className="mx-auto mb-1 h-7 w-7 object-contain drop-shadow-sm"
                  />
                  <p className="truncate text-xs font-black">{scene.label}</p>
                </button>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs font-black text-foreground transition-transform active:scale-[0.97]"
                onClick={() => navigate(getPersonMapPath('CMI社区'))}
              >
                <Compass className="h-4 w-4 shrink-0 text-primary" />
                CMI 常去
              </button>
              <button
                type="button"
                className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs font-black text-foreground transition-transform active:scale-[0.97]"
                onClick={() => {
                  setActiveCategory('全部');
                  setSelectedMarker(null);
                }}
              >
                <MapPinned className="h-4 w-4 shrink-0 text-primary" />
                完整地图
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 底部中间发帖按钮 (11. FAB Hard Press) */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] left-1/2 -translate-x-1/2 z-20">
        <button
          className="app-fab flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-4 rounded-full border-2 border-foreground"
          onClick={() => {
            if (!user) {
              toast('登录后才能标记地点哦', { description: '注册只需要一个邮箱 ✉️' });
              navigate('/login', { state: { from: '/mark' } });
              return;
            }
            navigate('/mark');
          }}
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
          <span>标记新地点</span>
        </button>
      </div>

      {/* 左下角用户头像/登录按钮 - 与发帖按钮持平 */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] left-4 md:left-6 z-20">
        {user ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full p-0 press-feedback bg-background border-2 border-foreground shadow-[3px_4px_0px_rgba(0,0,0,0.25)] hover:shadow-[2px_3px_0px_rgba(0,0,0,0.25)] hover:translate-y-[1px] transition-all"
            onClick={() => navigate('/profile')}
          >
            <Avatar className="w-full h-full">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={displayName} />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="rounded-full press-feedback shadow-lg border-2 border-foreground font-bold"
            onClick={() => navigate('/login')}
          >
            <LogIn className="w-4 h-4 mr-2" />
            登录
          </Button>
        )}
      </div>

      {/* 预览卡片 - z-index 最高 */}
      {selectedMarker && selectedRecommendations.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-6 card-shadow slide-up cursor-pointer press-feedback border-t border-border/20"
          onClick={handleCardClick}
        >
          <div className="space-y-4">
            {selectedIsCommunityGuide && selectedGuide ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                    {selectedGuide.kind}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {getGuideSourceLabel(selectedRecommendation!)}
                  </span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black leading-tight text-foreground">
                    {selectedGuide.title}
                  </h2>
                  {selectedGuide.title !== selectedMarker.place_name && (
                    <p className="break-words text-sm font-semibold text-muted-foreground">
                      {selectedMarker.place_name}
                    </p>
                  )}
                </div>
                <p className="line-clamp-4 text-base font-medium leading-relaxed text-foreground">
                  {selectedGuide.summary}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedGuide.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="quote-text text-lg leading-relaxed text-foreground">
                {selectedRecommendations[0].reason}
              </p>
            )}

            {/* 地点名称和分类 */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center p-1.5 border border-border/50">
                <img src={getCategoryIconUrl(selectedMarker.category)} alt="" className="w-full h-full object-contain" />
              </div>
              <span className="text-base font-black text-foreground">
                {selectedMarker.place_name}
              </span>
            </div>

            {/* 推荐人 */}
            {selectedIsCommunityGuide ? (
              <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <span className="w-8 border-t border-muted-foreground/30"></span>
                来自 CMI 社区收藏
              </p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="w-8 border-t border-muted-foreground/30"></span> 
                <button
                  type="button"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(getPersonMapPath(selectedRecommendations[0].user_name));
                  }}
                >
                  {selectedRecommendations[0].user_name} 的清迈地图
                </button>
              </p>
            )}

            {/* 缩略图 */}
            {selectedRecommendations[0].images.length > 0 && (
              <div className="flex gap-2">
                {selectedRecommendations[0].images.slice(0, 3).map((img, idx) => (
                  <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-border shadow-sm">
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 多人推荐提示 */}
            {selectedRecommendations.length > 1 && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground/80">
                  还有 {selectedRecommendations.length - 1} 人推荐了这里
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
