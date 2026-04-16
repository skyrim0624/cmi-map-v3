import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllRecommendations, getRecommendationsByCategory } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Recommendation, Category } from '@/types/types';
import { CATEGORIES, getCategoryIcon } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
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
        <ScrollArea className="w-full">
          <div className="flex gap-2 px-6 py-3 overflow-x-auto">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full whitespace-nowrap press-feedback"
              onClick={() => setSelectedCategory('all')}
            >
              全部
            </Button>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.name}
                variant={selectedCategory === cat.name ? 'default' : 'outline'}
                size="sm"
                className="rounded-full whitespace-nowrap press-feedback"
                onClick={() => setSelectedCategory(cat.name)}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
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
                className="bg-card rounded-xl p-4 card-shadow cursor-pointer press-feedback"
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
                      <div className="w-20 h-20 rounded-xl bg-accent flex items-center justify-center text-3xl">
                        {getCategoryIcon(rec.category)}
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
                    <p className="text-sm text-muted-foreground">
                      📍 {rec.place_name} —— {rec.user_name}
                    </p>
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
