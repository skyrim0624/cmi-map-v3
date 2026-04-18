import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllRecommendations, getRecommendationsByCategory } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Recommendation, Category, PlacedSticker, Sticker } from '@/types/types';
import { CATEGORIES, getCategoryIconUrl } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, LogIn } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ListView() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  
  const displayName = profile?.user_name || user?.email?.split('@')[0] || '游客';

  // 加载推荐数据
  useEffect(() => {
    loadRecommendations();
  }, [selectedCategory]);

  const loadRecommendations = async () => {
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
    <div className="relative w-full h-full overflow-hidden bg-background">
      {/* 顶部标题栏 */}
      <div className="border-b border-border bg-background">
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
            <h1 className="text-2xl font-bold text-foreground">CMI Map</h1>
          </div>
          <div className="w-10" /> {/* 占位，保持标题居中 */}
        </div>

        {/* 分类筛选 */}
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
                <img src={cat.iconUrl} alt={cat.name} className="w-4 h-4 mr-1 object-contain" />
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 推荐列表 */}
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-6 space-y-4">
          {recommendations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无推荐
            </div>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.id}
                className="app-list-card bg-card p-4 border-2 border-foreground cursor-pointer"
                onClick={() => navigate(`/place/${encodeURIComponent(rec.place_name)}`)}
              >
                <div className="flex gap-4">
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
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* 推荐理由 */}
                    <p className="text-base leading-relaxed text-foreground line-clamp-2">
                      "{rec.reason}"
                    </p>

                    {/* 地点名称和推荐人 */}
                    <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                      <p className="text-sm text-muted-foreground line-clamp-1 flex-1 min-w-0 flex items-center pr-2">
                        📍 {rec.place_name} 
                        <span className="mx-1 text-muted-foreground/30">|</span> 
                        <span className="truncate">{rec.user_name}</span>
                      </p>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 聚合排序前3的贴纸印章 */}
                        {getTopStickers(rec.placed_stickers).map((ts) => (
                          <div key={ts.sticker.id} className="flex items-center bg-accent/40 rounded-full px-1.5 py-0.5 border border-border/50 backdrop-blur-sm px-2">
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
            ))
          )}
        </div>
      </ScrollArea>

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
