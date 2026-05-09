import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAllRecommendations, getRecommendationsByCategory } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Recommendation, Category, PlacedSticker, Sticker } from '@/types/types';
import { CATEGORIES, getCategoryIconUrl } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, LogIn, MapPinned } from 'lucide-react';
import { getPersonMapPath, getPlacePath, getSceneMapPath } from '@/lib/paths';
import { getPlaceGuide, isCommunityCuratedRecommendation } from '@/data/place-guides';
import { getCmiScene, getCmiSceneRecommendations } from '@/data/cmi-scenes';

export default function ListView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');

  const activeScene = getCmiScene(searchParams.get('scene'));
  const displayName = profile?.user_name || user?.email?.split('@')[0] || '游客';

  // 加载推荐数据
  useEffect(() => {
    loadRecommendations();
  }, [selectedCategory, activeScene?.id]);

  const loadRecommendations = async () => {
    if (activeScene) {
      const data = await getAllRecommendations();
      setRecommendations(
        getCmiSceneRecommendations(data, activeScene, {
          limit: activeScene.id === 'nearby' ? 36 : undefined,
        })
      );
      return;
    }

    if (selectedCategory === 'all') {
      const data = await getAllRecommendations();
      setRecommendations(data);
    } else {
      const data = await getRecommendationsByCategory(selectedCategory);
      setRecommendations(data);
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
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {activeScene ? activeScene.detailTitle : 'CMI Map'}
            </h1>
          </div>
          {activeScene ? (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(getSceneMapPath(activeScene.id))}
              className="press-feedback"
              aria-label="查看地图视角"
            >
              <MapPinned className="h-5 w-5" />
            </Button>
          ) : (
            <div className="w-10" />
          )}
        </div>

        {activeScene ? (
          <div className="px-6 pb-4">
            <div className="rounded-lg border border-border bg-muted/45 p-3">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                  CMI SCENE
                </p>
                <span className="rounded-full bg-background px-2.5 py-1 text-xs font-black text-foreground">
                  {recommendations.length} 处
                </span>
              </div>
              <p className="text-sm font-semibold leading-relaxed text-muted-foreground">
                {activeScene.description}
              </p>
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* 推荐列表 */}
      <div className="w-full flex-1 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full space-y-4 px-4 py-6 pb-28">
          {recommendations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无推荐
            </div>
          ) : (
            recommendations.map((rec) => {
              const guide = getPlaceGuide(rec.place_name, rec.category);
              const isCommunityGuide = isCommunityCuratedRecommendation(rec);

              return (
                <div
                  key={rec.id}
                  className="app-list-card w-full max-w-full overflow-hidden bg-card p-4 border-2 border-foreground cursor-pointer"
                  onClick={() => navigate(getPlacePath(rec.place_name))}
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
                          <img src={getCategoryIconUrl(rec.category)} alt={rec.category} className="w-full h-full object-contain opacity-60" />
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
                          "{rec.reason}"
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
            })
          )}
        </div>
      </div>

      {/* 底部中央用户头像/登录按钮 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        {user ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full p-0 press-feedback"
            onClick={() => navigate('/profile')}
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
