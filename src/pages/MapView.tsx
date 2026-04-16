import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeafletMap } from '@/components/map/LeafletMap';
import { getAllRecommendations } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Recommendation, MapMarker as MapMarkerType } from '@/types/types';
import { getCategoryIcon } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { List, Edit, LogIn } from 'lucide-react';

export default function MapView() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [markers, setMarkers] = useState<MapMarkerType[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerType | null>(null);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Recommendation[]>([]);
  
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

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 地图 - 全屏显示，z-index 最低 */}
      <div className="absolute inset-0 z-0">
        <LeafletMap
          markers={markers}
          onMarkerClick={handleMarkerClick}
          mode="view"
          className="w-full h-full"
        />
      </div>

      {/* 左上角应用名称 */}
      <div className="absolute top-6 left-6 z-20">
        <h1 className="text-2xl font-bold text-foreground bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
          CMI Map
        </h1>
      </div>

      {/* 右上角列表按钮 */}
      <div className="absolute top-6 right-6 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/list')}
          className="press-feedback bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
        >
          <List className="w-5 h-5" />
        </Button>
      </div>

      {/* 左下角切换按钮 */}
      <div className="absolute bottom-40 left-6 z-20">
        <Button
          size="icon"
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg press-feedback"
          onClick={() => navigate('/mark')}
        >
          <Edit className="w-6 h-6" />
        </Button>
      </div>

      {/* 左下角用户头像/登录按钮 - 在编辑按钮下方 */}
      <div className="absolute bottom-22 left-6 z-20">
        {user ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full p-0 press-feedback bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
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
            className="rounded-full press-feedback shadow-lg"
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
          className="absolute bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-6 card-shadow slide-up cursor-pointer press-feedback"
          onClick={handleCardClick}
        >
          <div className="space-y-3">
            {/* 推荐理由 */}
            <p className="quote-text text-lg leading-relaxed">
              {selectedRecommendations[0].reason}
            </p>

            {/* 地点名称和分类 */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getCategoryIcon(selectedMarker.category)}</span>
              <span className="text-base font-semibold text-foreground">
                {selectedMarker.place_name}
              </span>
            </div>

            {/* 推荐人 */}
            <p className="text-sm text-muted-foreground">
              —— {selectedRecommendations[0].user_name}
            </p>

            {/* 缩略图 */}
            {selectedRecommendations[0].images.length > 0 && (
              <div className="flex gap-2 mt-3">
                {selectedRecommendations[0].images.slice(0, 3).map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ))}
              </div>
            )}

            {/* 多人推荐提示 */}
            {selectedRecommendations.length > 1 && (
              <p className="text-xs text-muted-foreground">
                还有 {selectedRecommendations.length - 1} 人推荐了这里
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
