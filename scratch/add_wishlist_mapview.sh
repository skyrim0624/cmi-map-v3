# Modify MapView to support wishlist filtering
cat << 'INNER_EOF' > scratch/MapViewPatch.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeafletMap } from '@/components/map/LeafletMap';
import { getAllRecommendations } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Recommendation, MapMarker as MapMarkerType } from '@/types/types';
import { getCategoryIconUrl, CATEGORIES } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { List, LogIn, Plus, Bookmark } from 'lucide-react';

export default function MapView() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [markers, setMarkers] = useState<MapMarkerType[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerType | null>(null);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Recommendation[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [showWishlistOnly, setShowWishlistOnly] = useState<boolean>(false);
  
  const displayName = profile?.user_name || user?.email?.split('@')[0] || '游客';

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
      navigate(`/place/${encodeURIComponent(selectedMarker.place_name)}`);
    }
  };

  // 点击地图空白区域，关闭预览卡片
  const handleMapClick = () => {
    setSelectedMarker(null);
    setSelectedRecommendations([]);
  };

  // 过滤当前需要显示的标记点
  const displayedMarkers = markers.filter(m => {
    // 类别过滤
    const categoryMatch = activeCategory === '全部' || m.category === activeCategory;
    
    // 心愿过滤
    let wishlistMatch = true;
    if (showWishlistOnly && user) {
      wishlistMatch = m.recommendations.some(rec => 
        rec.wishlists && rec.wishlists.some(w => w.user_id === user.id)
      );
    }
    
    return categoryMatch && wishlistMatch;
  });

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      {/* 地图 - 全屏显示，z-index 最低 */}
      <div className="absolute inset-0 z-0">
        <LeafletMap
          markers={displayedMarkers}
          onMarkerClick={handleMarkerClick}
          onMapClick={handleMapClick}
          mode="view"
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
              activeCategory === '全部' 
                ? 'bg-primary text-primary-foreground border-2 border-transparent scale-105' 
                : 'bg-background/80 hover:bg-background text-foreground backdrop-blur-sm border-2 border-border/50'
            }`}
            onClick={() => {
              setActiveCategory('全部');
              setSelectedMarker(null);
            }}
          >
            全 部
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
              <img src={cat.iconUrl} alt={cat.name} className="w-4 h-4 object-contain drop-shadow-sm" />
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* 底部中间发帖按钮 (11. FAB Hard Press) */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] left-1/2 -translate-x-1/2 z-20">
        <button
          className="app-fab flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-4 rounded-full border-2 border-foreground"
          onClick={() => navigate('/mark')}
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
          <span>标记新地点</span>
        </button>
      </div>

      {/* 左下角用户空间：头像与心愿单合一 */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] left-4 md:left-6 z-20 flex flex-col gap-3">
        {user && (
          <button
            onClick={() => {
              setShowWishlistOnly(!showWishlistOnly);
              setSelectedMarker(null);
            }}
            className={`w-12 h-12 flex items-center justify-center rounded-full press-feedback transition-all shadow-[3px_4px_0px_rgba(0,0,0,0.25)] hover:shadow-[2px_3px_0px_rgba(0,0,0,0.25)] hover:translate-y-[1px] border-2 border-foreground ${
              showWishlistOnly ? 'bg-[#ffebee] text-[#f43f5e]' : 'bg-background text-stone-600'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${showWishlistOnly ? 'fill-current' : ''}`} strokeWidth={2} />
          </button>
        )}
        
        {user ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full p-0 press-feedback bg-background border-2 border-foreground shadow-[3px_4px_0px_rgba(0,0,0,0.25)] hover:shadow-[2px_3px_0px_rgba(0,0,0,0.25)] hover:translate-y-[1px] transition-all"
            onClick={() => navigate('/profile')}
          >
            <Avatar className="w-full h-full">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={displayName} className="object-cover" />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="rounded-full press-feedback shadow-lg h-12 px-6"
            onClick={() => navigate('/login')}
          >
            <LogIn className="w-4 h-4 mr-2" />
            登录
          </Button>
        )}
      </div>

      {/* 底部信息预览卡片 */}
      {selectedMarker && (
        <div 
          className="absolute bottom-[calc(env(safe-area-inset-bottom)+100px)] left-4 right-4 md:left-auto md:right-6 md:w-96 z-20 card-shadow cursor-pointer slide-up"
          onClick={handleCardClick}
        >
          <div className="bg-card rounded-2xl p-4 overflow-hidden relative">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
                {selectedRecommendations[0]?.images?.[0] ? (
                  <img
                    src={selectedRecommendations[0].images[0]}
                    alt={selectedMarker.place_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                    <img
                      src={getCategoryIconUrl(selectedMarker.category)}
                      alt={selectedMarker.category}
                      className="w-8 h-8 opacity-50"
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 py-1">
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src={getCategoryIconUrl(selectedMarker.category)}
                    alt={selectedMarker.category}
                    className="w-4 h-4"
                  />
                  <h3 className="font-bold text-base truncate pr-2">
                    {selectedMarker.place_name}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 pr-2 mb-2">
                  {selectedRecommendations[0]?.reason}
                </p>
                
                {/* 社交信息行 */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {selectedRecommendations.length}
                    </span>
                    <span>条推荐</span>
                  </div>
                  
                  {user && selectedRecommendations.some(r => r.wishlists?.some(w => w.user_id === user.id)) && (
                    <div className="flex items-center gap-1 bg-[#ffebee]/50 text-[#f43f5e] px-1.5 py-0.5 rounded text-xs font-medium border border-[#ffebee]">
                      <Bookmark className="w-3 h-3 fill-current" /> 想去
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
INNER_EOF
cp scratch/MapViewPatch.tsx src/pages/MapView.tsx
