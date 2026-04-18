import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeafletMap } from '@/components/map/LeafletMap';
import { getAllRecommendations } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Recommendation, MapMarker as MapMarkerType } from '@/types/types';
import { getCategoryIconUrl, CATEGORIES } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { List, LogIn, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function MapView() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [markers, setMarkers] = useState<MapMarkerType[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerType | null>(null);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Recommendation[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  
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
  const displayedMarkers = activeCategory === '全部' 
    ? markers 
    : markers.filter(m => m.category === activeCategory);

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
            {/* 推荐理由 */}
            <p className="quote-text text-lg leading-relaxed text-foreground">
              {selectedRecommendations[0].reason}
            </p>

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
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="w-8 border-t border-muted-foreground/30"></span> 
              {selectedRecommendations[0].user_name}
            </p>

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

