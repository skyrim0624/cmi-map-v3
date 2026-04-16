import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecommendationsByPlace, deleteRecommendation } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Recommendation } from '@/types/types';
import { getCategoryIcon, getCategoryColor } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PlaceDetail() {
  const { placeName } = useParams<{ placeName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);

  useEffect(() => {
    if (placeName) {
      loadRecommendations();
    }
  }, [placeName]);

  const loadRecommendations = async () => {
    if (!placeName) return;
    setLoading(true);
    const data = await getRecommendationsByPlace(decodeURIComponent(placeName));
    setRecommendations(data);
    setLoading(false);
  };

  const handleDeleteClick = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRecommendation) return;

    const success = await deleteRecommendation(selectedRecommendation.id);
    
    if (success) {
      toast.success('删除成功');
      // 刷新列表
      await loadRecommendations();
      // 如果删除后没有推荐了，返回上一页
      if (recommendations.length === 1) {
        navigate(-1);
      }
    } else {
      toast.error('删除失败，请重试');
    }
    
    setDeleteDialogOpen(false);
    setSelectedRecommendation(null);
  };

  const handleNavigate = () => {
    if (recommendations.length === 0) return;
    const { latitude, longitude } = recommendations[0];
    // 跳转到 Google Maps 导航
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      '_blank'
    );
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground mb-4">未找到推荐</p>
        <Button onClick={() => navigate(-1)}>返回</Button>
      </div>
    );
  }

  const firstRec = recommendations[0];
  const allImages = recommendations.flatMap(r => r.images);

  return (
    <div className="relative w-full min-h-screen bg-background">
      {/* 返回按钮 */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-background/80 backdrop-blur-sm press-feedback"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="h-screen">
        <div className="pb-24">
          {/* 照片轮播 */}
          {allImages.length > 0 ? (
            <div className="w-full aspect-[4/3] bg-muted">
              <Carousel className="w-full h-full">
                <CarouselContent>
                  {allImages.map((img, idx) => (
                    <CarouselItem key={idx}>
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {allImages.length > 1 && (
                  <>
                    <CarouselPrevious className="left-4" />
                    <CarouselNext className="right-4" />
                  </>
                )}
              </Carousel>
            </div>
          ) : (
            <div
              className="w-full aspect-[4/3] flex items-center justify-center text-6xl"
              style={{ backgroundColor: `hsl(var(--${getCategoryColor(firstRec.category)}))` }}
            >
              {getCategoryIcon(firstRec.category)}
            </div>
          )}

          {/* 内容区域 */}
          <div className="px-6 py-8 space-y-8">
            {/* 地点名称和分类 */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground">{placeName}</h1>
              <Badge variant="secondary" className="rounded-full">
                <span className="mr-1">{getCategoryIcon(firstRec.category)}</span>
                {firstRec.category}
              </Badge>
            </div>

            {/* 推荐列表 */}
            <div className="space-y-6">
              {recommendations.map((rec, idx) => (
                <div
                  key={rec.id}
                  className="bg-accent/30 rounded-xl p-5 space-y-3 relative"
                >
                  {/* 删除按钮（仅对当前用户的推荐显示） */}
                  {user && rec.user_id === user.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteClick(rec)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}

                  {/* 推荐理由 */}
                  <p className="quote-text text-lg leading-relaxed pr-10">
                    {rec.reason}
                  </p>

                  {/* 推荐人 */}
                  <p className="text-sm text-muted-foreground">
                    —— {rec.user_name}
                  </p>

                  {/* 该推荐的照片 */}
                  {rec.images.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {rec.images.map((img, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={img}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* 底部导航按钮 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background border-t border-border">
        <Button
          className="w-full h-12 text-base font-semibold press-feedback"
          onClick={handleNavigate}
        >
          导航到这里
        </Button>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除你对「{selectedRecommendation?.place_name}」的推荐吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
