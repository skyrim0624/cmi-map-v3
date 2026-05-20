import { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getAllRecommendations, getRecommendationsByCategory } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Recommendation, Category, PlacedSticker, Sticker } from '@/types/types';
import { CATEGORIES, getCategoryIconUrl } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, LogIn, MapPinned } from 'lucide-react';
import { getPersonMapPath, getPlacePath, getSceneMapPath } from '@/lib/paths';
import {
  getPlaceGuide,
  isCommunityCuratedRecommendation,
} from '@/data/place-guides';
import { getCmiScene, getCmiSceneRecommendations } from '@/data/cmi-scenes';
import {
  CMI_EVENT_TYPE_OPTIONS,
  CMI_EVENTS,
  getCmiEventsForSceneFromList,
  type CmiEventType,
} from '@/data/cmi-events';
import { getPublishedCmiEvents } from '@/db/cmi-events';
import { CmiEventCard } from '@/components/intent/event-card';
import { getCmiIntentSecondaryFilters, matchesCmiIntentSecondaryFilter } from '@/data/cmi-scene-tags';
import { getCmiInspirationCards } from '@/data/cmi-inspirations';
import { CmiInspirationCard } from '@/components/intent/inspiration-card';
import { getMapMarkerVisual } from '@/lib/map-marker-visual';
import { getRecommendationReasonText } from '@/lib/easter-icons';
import { getCmiPlaceTypeTag, matchesCmiPlaceTypeTag } from '@/data/cmi-taxonomy';
import {
  filterCmiNearbyWanderRecommendations,
  getCmiNearbyWanderPlaceTypeFilters,
  isCmiNearbyWanderPlaceTypeId,
} from '@/data/cmi-nearby-wander';

type UserLocation = {
  latitude: number;
  longitude: number;
};

export default function ListView() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const restoredScrollKeyRef = useRef<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedIntentFilter, setSelectedIntentFilter] = useState('all');
  const [selectedEventType, setSelectedEventType] = useState<'all' | CmiEventType>('all');
  const [events, setEvents] = useState(CMI_EVENTS);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const activeScene = getCmiScene(searchParams.get('scene'));
  const sceneFilterParam = searchParams.get('filter');
  const isNearbyScene = activeScene?.id === 'nearby' || activeScene?.id === 'nearby-wander';
  const activePlaceTypeParam = searchParams.get('placeType');
  const activePlaceTypeId =
    isNearbyScene && !isCmiNearbyWanderPlaceTypeId(activePlaceTypeParam)
      ? null
      : activePlaceTypeParam;
  const activePlaceTypeTag = getCmiPlaceTypeTag(activePlaceTypeId);
  const isEventScene = activeScene?.id === 'tomorrow-events';
  const isWeekendScene = activeScene?.id === 'weekend';
  const listScrollKey = `cmi-map:list-scroll:${location.pathname}${location.search}:category=${selectedCategory}`;
  const sceneEvents = useMemo(
    () => activeScene ? getCmiEventsForSceneFromList(events, activeScene.id) : [],
    [activeScene, events]
  );
  const eventTypeOptions = useMemo(
    () =>
      CMI_EVENT_TYPE_OPTIONS.filter(option =>
        option.id === 'all' ||
        sceneEvents.some(event =>
          event.type === option.id || event.tags.includes(option.label)
        )
      ),
    [sceneEvents]
  );
  const visibleSceneEvents = useMemo(() => {
    if (selectedEventType === 'all') return sceneEvents;
    const selectedOption = CMI_EVENT_TYPE_OPTIONS.find(option => option.id === selectedEventType);
    return sceneEvents.filter(event =>
      event.type === selectedEventType ||
      Boolean(selectedOption && event.tags.includes(selectedOption.label))
    );
  }, [sceneEvents, selectedEventType]);
  const intentFilters = activeScene ? getCmiIntentSecondaryFilters(activeScene.id) : [];
  const nearbyPlaceTypeFilters = useMemo(() => getCmiNearbyWanderPlaceTypeFilters(), []);
  const selectedIntentFilterLabel =
    intentFilters.find(filter => filter.id === selectedIntentFilter)?.label ?? null;
  const selectedFilterLabel = [
    activePlaceTypeTag?.label,
    selectedIntentFilterLabel,
  ].filter(Boolean).join(' / ') || null;
  const visibleRecommendations = useMemo(
    () =>
      activeScene
        ? recommendations.filter(recommendation =>
            matchesCmiIntentSecondaryFilter(recommendation, activeScene.id, selectedIntentFilter)
          )
        : recommendations,
    [activeScene, recommendations, selectedIntentFilter]
  );
  const inspirationCards = activeScene && !isNearbyScene
    ? getCmiInspirationCards(activeScene.id, visibleRecommendations, visibleSceneEvents)
    : [];
  const shouldShowPlaceRecommendations = !isEventScene || visibleSceneEvents.length === 0;
  const sceneEventSectionLabel = isEventScene
    ? {
      eyebrow: 'EVENTS',
      title: '今天和最近可以参加的事',
      description: '按时间排序，越近越靠前；只放已核实活动和稳定活动源。',
      loading: '正在同步活动库',
      empty: '这个分类今天还没有已核实活动。运营库补录后会自动出现在这里。',
    }
    : isWeekendScene
      ? {
        eyebrow: 'WEEKEND PLACES',
        title: '周末地点 / 市集',
        description: '这些是周末开放，或者周末更适合去的地点。点开后看地图位置和详情。',
        loading: '正在同步周末地点库',
        empty: '这个分类还没有已核实周末地点。运营库补录后会自动出现在这里。',
      }
      : {
        eyebrow: 'PLACES',
        title: '相关地点',
        description: '这些是和当前场景有关的地点线索，点开后看地图位置和详情。',
        loading: '正在同步地点库',
        empty: '这个分类还没有已核实地点。运营库补录后会自动出现在这里。',
      };
  const displayName = profile?.user_name || user?.email?.split('@')[0] || '游客';

  // 加载推荐数据
  useEffect(() => {
    loadRecommendations();
  }, [selectedCategory, activeScene?.id, activePlaceTypeId, userLocation]);

  useEffect(() => () => {
    if (scrollRafRef.current !== null) {
      window.cancelAnimationFrame(scrollRafRef.current);
    }
  }, []);

  useEffect(() => {
    if (isLoadingRecommendations || isLoadingEvents) return;
    if (restoredScrollKeyRef.current === listScrollKey) return;

    let savedScrollTop = 0;
    try {
      savedScrollTop = Number(window.sessionStorage.getItem(listScrollKey) ?? 0);
    } catch {
      savedScrollTop = 0;
    }

    restoredScrollKeyRef.current = listScrollKey;
    if (!Number.isFinite(savedScrollTop) || savedScrollTop <= 0) return;

    window.requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: savedScrollTop, behavior: 'auto' });
    });
  }, [
    isLoadingEvents,
    isLoadingRecommendations,
    listScrollKey,
    visibleRecommendations.length,
    visibleSceneEvents.length,
    inspirationCards.length,
  ]);

  useEffect(() => {
    if (!isNearbyScene || userLocation || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      position => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  }, [isNearbyScene, userLocation]);

  useEffect(() => {
    if (!activeScene || !['tomorrow-events', 'weekend', 'night'].includes(activeScene.id)) return;

    let isMounted = true;
    setIsLoadingEvents(true);
    getPublishedCmiEvents().then(data => {
      if (!isMounted) return;
      setEvents(data);
      setIsLoadingEvents(false);
    });

    return () => {
      isMounted = false;
    };
  }, [activeScene]);

  useEffect(() => {
    if (!activeScene) {
      setSelectedIntentFilter('all');
      return;
    }

    const nextFilter = intentFilters.some(filter => filter.id === sceneFilterParam)
      ? sceneFilterParam
      : 'all';
    setSelectedIntentFilter(nextFilter ?? 'all');
  }, [activeScene, sceneFilterParam, intentFilters]);

  useEffect(() => {
    if (!isEventScene) {
      setSelectedEventType('all');
      return;
    }

    if (!eventTypeOptions.some(option => option.id === selectedEventType)) {
      setSelectedEventType('all');
    }
  }, [eventTypeOptions, isEventScene, selectedEventType]);

  const handleIntentFilterSelect = (filterId: string) => {
    setSelectedIntentFilter(filterId);
    if (!activeScene) return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('scene', activeScene.id);
    if (filterId === 'all') {
      nextSearchParams.delete('filter');
    } else {
      nextSearchParams.set('filter', filterId);
    }
    navigate(`/list?${nextSearchParams.toString()}`, { replace: true });
  };

  const handleNearbyPlaceTypeSelect = (placeTypeId: string | null) => {
    if (!activeScene) return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('scene', activeScene.id);
    nextSearchParams.delete('filter');
    if (placeTypeId) {
      nextSearchParams.set('placeType', placeTypeId);
    } else {
      nextSearchParams.delete('placeType');
    }
    navigate(`/list?${nextSearchParams.toString()}`, { replace: true });
  };

  const saveListScrollPosition = () => {
    const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
    try {
      window.sessionStorage.setItem(listScrollKey, String(scrollTop));
    } catch {
      // NOTE: 无痕模式或极端隐私设置可能禁用 sessionStorage；这时只是不恢复列表位置。
    }
  };

  const handleListScroll = () => {
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      saveListScrollPosition();
    });
  };

  const handleOpenPlace = (placeName: string) => {
    saveListScrollPosition();
    navigate(getPlacePath(placeName));
  };

  const loadRecommendations = async () => {
    setIsLoadingRecommendations(true);
    setRecommendationsError(null);
    try {
      if (activeScene) {
        const data = await getAllRecommendations({ throwOnError: true });
        const baseSceneRecommendations = getCmiSceneRecommendations(data, activeScene, {
          userLocation: userLocation ?? undefined,
        });
        const sceneRecommendations = isNearbyScene
          ? filterCmiNearbyWanderRecommendations(baseSceneRecommendations)
          : baseSceneRecommendations;
        const filteredSceneRecommendations = activePlaceTypeId
          ? sceneRecommendations.filter(recommendation =>
            matchesCmiPlaceTypeTag(recommendation, activePlaceTypeId)
          )
          : sceneRecommendations;
        setRecommendations(filteredSceneRecommendations);
        return;
      }

      if (activePlaceTypeId) {
        const data = await getAllRecommendations({ throwOnError: true });
        setRecommendations(data.filter(recommendation =>
          matchesCmiPlaceTypeTag(recommendation, activePlaceTypeId)
        ));
        return;
      }

      if (selectedCategory === 'all') {
        const data = await getAllRecommendations({ throwOnError: true });
        setRecommendations(data);
      } else {
        const data = await getRecommendationsByCategory(selectedCategory, { throwOnError: true });
        setRecommendations(data);
      }
    } catch {
      setRecommendations([]);
      setRecommendationsError('地点库暂时没连上');
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const getTopStickers = (placedStickers: PlacedSticker[] | undefined, topN: number = 3) => {
    if (!placedStickers || placedStickers.length === 0) return [];
    
    // 兼容 Supabase 连表返回可能为单对象或数组的情况
    const stickersArray = Array.isArray(placedStickers) ? placedStickers : [placedStickers];
    
    const counts: Record<string, { count: number; sticker: Sticker }> = {};
    for (const ps of stickersArray) {
      if (!ps.sticker) continue;
      // 兼容某些 Supabase 连表查询把单个对象嵌套在数组或字段中的写法
      const s = Array.isArray(ps.sticker) ? ps.sticker[0] : ps.sticker;
      if (!s) continue;

      if (!counts[ps.sticker_id]) {
        counts[ps.sticker_id] = { count: 0, sticker: s };
      }
      counts[ps.sticker_id].count++;
    }
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);
  };

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background">
      {/* 顶部标题栏 */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="press-feedback"
              aria-label="返回首页"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {activeScene ? activeScene.detailTitle : activePlaceTypeTag?.label ?? 'CMI Map'}
            </h1>
          </div>
          {activeScene ? (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(getSceneMapPath(activeScene.id, {
                placeTypeId: activePlaceTypeId,
              }))}
              className="press-feedback"
              aria-label="查看地图视角"
            >
              <MapPinned className="h-5 w-5" />
            </Button>
          ) : (
            <div className="w-10" />
          )}
        </div>

        {!activeScene ? (
          <div className="w-full overflow-x-auto hide-scrollbar">
            <div className="flex gap-2 px-6 py-3 w-max">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                className="rounded-full whitespace-nowrap press-feedback relative"
                onClick={() => setSelectedCategory('all')}
                data-state={selectedCategory === 'all' ? 'on' : 'off'}
              >
                全部
              </Button>
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.name}
                  variant={selectedCategory === cat.name ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full whitespace-nowrap press-feedback relative flex items-center"
                  onClick={() => setSelectedCategory(cat.name)}
                  data-state={selectedCategory === cat.name ? 'on' : 'off'}
                >
                  <img src={cat.iconUrl} alt={cat.name} className="mr-1 h-5 w-5 object-contain" />
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        ) : !isEventScene ? (
          <div className="px-6 pb-4">
            {isNearbyScene ? (
              <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                <button
                  type="button"
                  className={`min-h-10 shrink-0 rounded-full border px-3 text-sm font-black ${
                    !activePlaceTypeId
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground'
                  }`}
                  onClick={() => handleNearbyPlaceTypeSelect(null)}
                >
                  全部
                </button>
                {nearbyPlaceTypeFilters.map(filter => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`min-h-10 shrink-0 rounded-full border px-3 text-sm font-black ${
                      activePlaceTypeId === filter.placeTypeId
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground'
                    }`}
                    onClick={() => handleNearbyPlaceTypeSelect(filter.placeTypeId ?? null)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            ) : !isEventScene && intentFilters.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                <button
                  type="button"
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black ${
                    selectedIntentFilter === 'all'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground'
                  }`}
                  onClick={() => handleIntentFilterSelect('all')}
                >
                  全部
                </button>
                {intentFilters.map(filter => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black ${
                      selectedIntentFilter === filter.id
                        ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground'
                  }`}
                    onClick={() => handleIntentFilterSelect(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* 推荐列表 */}
      <div
        ref={scrollContainerRef}
        onScroll={handleListScroll}
        className={`w-full flex-1 overflow-y-auto overflow-x-hidden ${
        isEventScene ? 'bg-[#f8f6f0]' : ''
      }`}
      >
        <div className={`w-full max-w-full space-y-4 px-4 pb-[calc(9rem+env(safe-area-inset-bottom))] ${isEventScene ? 'py-4' : 'py-6'}`}>
          {sceneEvents.length > 0 && (
            <section className="space-y-3">
              {!isEventScene && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                    {sceneEventSectionLabel.eyebrow}
                  </p>
                  <h2 className="text-xl font-black text-foreground">
                    {sceneEventSectionLabel.title}
                  </h2>
                  <p className="mt-1 text-xs font-semibold leading-snug text-muted-foreground">
                    {sceneEventSectionLabel.description}
                  </p>
                </div>
              )}
              {isEventScene && eventTypeOptions.length > 1 && (
                <div className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto border-b border-[#e7e1d6] bg-[#f8f6f0]/95 px-4 pb-3 pt-1 backdrop-blur hide-scrollbar">
                  {eventTypeOptions.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-black transition active:scale-[0.98] ${
                        selectedEventType === option.id
                          ? 'border-[#2f2c27] bg-[#2f2c27] text-[#fffaf0]'
                          : 'border-[#ded6c9] bg-[#fffefa] text-[#5e574d]'
                      }`}
                      onClick={() => setSelectedEventType(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              {isLoadingEvents && !isEventScene && (
                <p className="rounded-lg border border-dashed border-[#7b4d92]/25 bg-[#fbf0ff] p-3 text-xs font-black text-[#7b4d92]">
                  {sceneEventSectionLabel.loading}
                </p>
              )}
              {visibleSceneEvents.map(event => (
                <CmiEventCard
                  key={event.id}
                  event={event}
                  to={
                    event.mapLocation && activeScene
                      ? getSceneMapPath(activeScene.id, {
                        eventId: event.id,
                        filterId: selectedIntentFilter === 'all' ? null : selectedIntentFilter,
                        placeTypeId: activePlaceTypeId,
                      })
                      : undefined
                  }
                />
              ))}
              {visibleSceneEvents.length === 0 && (
                <p className="rounded-lg border border-dashed border-border bg-muted/35 p-4 text-sm font-semibold leading-relaxed text-muted-foreground">
                  {sceneEventSectionLabel.empty}
                </p>
              )}
            </section>
          )}

          {inspirationCards.length > 0 && (
            <section className="space-y-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                  IDEAS
                </p>
                <h2 className="text-xl font-black text-foreground">
                  先给你几个小方案
                </h2>
              </div>
              {inspirationCards.map(card => (
                <CmiInspirationCard key={card.id} card={card} />
              ))}
            </section>
          )}

          {recommendationsError ? (
            <div className="rounded-lg border border-dashed border-destructive/30 bg-destructive/5 p-4 text-sm font-semibold leading-relaxed text-destructive">
              <p>{recommendationsError}，请检查网络后重试。</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 rounded-full border-destructive/30 font-black text-destructive"
                onClick={loadRecommendations}
              >
                重新同步
              </Button>
            </div>
          ) : isLoadingRecommendations ? (
            <div className="py-12 text-center text-muted-foreground">
              正在整理推荐
            </div>
          ) : !shouldShowPlaceRecommendations ? null : visibleRecommendations.length === 0 ? (
            sceneEvents.length > 0 || inspirationCards.length > 0 ? null : (
              <div className="text-center py-12 text-muted-foreground">
                {activeScene && selectedFilterLabel
                  ? `${selectedFilterLabel}地点还在补录中`
                  : '暂无推荐'}
              </div>
            )
          ) : (
            <>
              {visibleRecommendations.map((rec) => {
              const guide = getPlaceGuide(rec.place_name, rec.category);
              const isCommunityGuide = isCommunityCuratedRecommendation(rec);
              const markerVisual = activeScene
                ? getMapMarkerVisual({
                  place_name: rec.place_name,
                  category: rec.category,
                  recommendations: [rec],
                })
                : null;
              const fallbackIconUrl = markerVisual?.iconUrl ?? getCategoryIconUrl(rec.category);
              const fallbackIconLabel = markerVisual?.label ?? rec.category;

              return (
                <div
                  key={rec.id}
                  className="app-list-card w-full max-w-full overflow-hidden bg-card p-4 border-2 border-foreground cursor-pointer"
                  onClick={() => handleOpenPlace(rec.place_name)}
                >
                  <div className="flex min-w-0 gap-4">
                    {/* 左侧图片或图标 */}
                    <div className="flex-shrink-0">
                      {rec.images.length > 0 ? (
                        <img
                          src={rec.images[0]}
                          alt={rec.place_name}
                          className="w-20 h-20 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-accent flex items-center justify-center p-4">
                          <img src={fallbackIconUrl} alt={fallbackIconLabel} className="w-full h-full object-contain opacity-60" />
                        </div>
                      )}
                    </div>

                    {/* 右侧内容 */}
                    <div className="min-w-0 flex-1 space-y-2 overflow-hidden">
                      {isCommunityGuide ? (
                        <div className="space-y-1.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-black text-primary">
                              {guide.kind}
                            </span>
                            <span className="truncate text-xs font-semibold text-muted-foreground">
                              {rec.place_name}
                            </span>
                          </div>
                          <h2 className="truncate text-lg font-black leading-tight text-foreground">
                            {guide.title}
                          </h2>
                          <p className="line-clamp-3 break-words text-sm font-medium leading-relaxed text-foreground">
                            {guide.summary}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {guide.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-base leading-relaxed text-foreground line-clamp-2 break-words">
                          "{getRecommendationReasonText(rec)}"
                        </p>
                      )}

                      {/* 地点名称、推荐人和互动计数 */}
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-muted-foreground truncate whitespace-nowrap">
                          <span className="mr-1">📍</span>
                          <span>{isCommunityGuide ? guide.title : rec.place_name}</span>
                          <span className="mx-1 text-muted-foreground/30">|</span>
                          {isCommunityGuide ? (
                            <span className="font-semibold">CMI 社区整理</span>
                          ) : (
                            <button
                              type="button"
                              className="font-semibold text-primary underline-offset-4 hover:underline"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(getPersonMapPath(rec.user_name));
                              }}
                            >
                              {rec.user_name}
                            </button>
                          )}
                        </p>
                        
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          {/* 聚合排序前3的贴纸印章 */}
                          {getTopStickers(rec.placed_stickers).map((ts) => (
                            <div key={ts.sticker.id} className="flex items-center bg-accent/40 rounded-full px-2 py-0.5 border border-border/50 backdrop-blur-sm">
                              <img src={ts.sticker.icon_url} alt="" className="w-3.5 h-3.5 object-contain mr-1 filter saturate-[0.8]" style={{ mixBlendMode: 'multiply' }} />
                              <span className="text-[10px] font-bold text-muted-foreground ml-0.5">{ts.count}</span>
                            </div>
                          ))}

                          {/* 点赞数 */}
                          {rec.upvotes && rec.upvotes.length > 0 && (
                            <div className="flex items-center text-primary text-[11px] font-medium bg-primary/10 px-2 py-0.5 rounded-full ml-1">
                              🔥 {rec.upvotes.length}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
            </>
          )}
        </div>
      </div>

      {/* 底部中央用户头像/登录按钮 */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-1/2 -translate-x-1/2 z-20">
        {user ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full p-0 press-feedback"
            onClick={() => navigate('/profile')}
            aria-label="打开个人页面"
          >
            <Avatar className="w-12 h-12">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={displayName} />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="rounded-full press-feedback"
            onClick={() => navigate('/login')}
          >
            <LogIn className="w-4 h-4 mr-2" />
            登录
          </Button>
        )}
      </div>
    </div>
  );
}
