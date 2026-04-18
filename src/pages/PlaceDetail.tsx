import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecommendationsByPlace, deleteRecommendation, toggleUpvote, toggleWishlist } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Recommendation } from '@/types/types';
import { getCategoryIconUrl, getCategoryColor } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2, Heart, Bookmark } from 'lucide-react';
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
  const [localUpvotes, setLocalUpvotes] = useState<Record<string, { count: number, isUpvoted: boolean }>>({});
  const [localWishlists, setLocalWishlists] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (placeName) {
      loadRecommendations();
    }
  }, [placeName]);

  const loadRecommendations = async () => {
    if (!placeName) return;
    setLoading(true);
    const data = await getRecommendationsByPlace(decodeURIComponent(placeName));
    
    // 初始化点赞与心愿状态
    const upvotesState: Record<string, { count: number, isUpvoted: boolean }> = {};
    const wishlistsState: Record<string, boolean> = {};
    data.forEach(rec => {
      const upvotes = rec.upvotes || [];
      upvotesState[rec.id] = {
        count: upvotes.length,
        isUpvoted: user ? upvotes.some(u => u.user_id === user.id) : false
      };
      const wishlists = rec.wishlists || [];
      wishlistsState[rec.id] = user ? wishlists.some(w => w.user_id === user.id) : false;
    });
    setLocalUpvotes(upvotesState);
    setLocalWishlists(wishlistsState);
    
    setRecommendations(data);
    setLoading(false);
  };

  const handleUpvote = async (recId: string) => {
    if (!user) {
      toast.error('请先登录后再点赞');
      navigate('/profile');
      return;
    }

    // 乐观更新（前端先变状态，再去后台请求）
    setLocalUpvotes(prev => {
      const current = prev[recId];
      if (!current) return prev;
      return {
        ...prev,
        [recId]: {
          count: current.isUpvoted ? current.count - 1 : current.count + 1,
          isUpvoted: !current.isUpvoted
        }
      };
    });

    const { success, isUpvoted } = await toggleUpvote(recId, user.id);
    
    if (!success) {
      toast.error('点赞失败');
      // 如果失败，回退状态
      setLocalUpvotes(prev => {
        const current = prev[recId];
        return {
          ...prev,
          [recId]: {
            count: current.isUpvoted ? current.count - 1 : current.count + 1,
            isUpvoted: !current.isUpvoted
          }
        };
      });
    }
  };

  const handleToggleWishlist = async (recId: string) => {
    if (!user) {
      toast.error('请先登录后标记想去');
      navigate('/login');
      return;
    }
    
    // 乐观更新
    const isWishlistedNow = localWishlists[recId];
    setLocalWishlists(prev => ({
      ...prev,
      [recId]: !isWishlistedNow
    }));
    
    try {
      await toggleWishlist(recId, user.id);
    } catch (error) {
      toast.error('标记失败');
      setLocalWishlists(prev => ({
        ...prev,
        [recId]: isWishlistedNow
      }));
      console.error("Wishlist failed", error);
    }
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

  const handleGrab = () => {
    if (recommendations.length === 0) return;
    const { latitude, longitude, place_name } = recommendations[0];
    const dropOffName = encodeURIComponent(place_name);
    window.open(`grab://open?screenType=RIDE&dropOffLatitude=${latitude}&dropOffLongitude=${longitude}&dropOffName=${dropOffName}`, '_self');
  };

  const handleBolt = () => {
    if (recommendations.length === 0) return;
    const { latitude, longitude } = recommendations[0];
    window.open(`https://m.bolt.eu/ride/request?destination_lat=${latitude}&destination_lng=${longitude}`, '_blank');
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
        <div className="pb-40">
          {/* 照片轮播 */}
          {allImages.length > 0 ? (
            <div className="w-full aspect-[4/3] bg-muted">
              <Carousel className="w-full h-full">
                <CarouselContent>
                  {allImages.map((img, idx) => (
                    <CarouselItem key={idx} className="relative aspect-[4/3]">
                      <img
                        src={img}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
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
              className="w-full aspect-[4/3] flex items-center justify-center bg-accent"
            >
              <img 
                src={getCategoryIconUrl(firstRec.category)} 
                alt={firstRec.category} 
                className="w-1/3 h-1/3 object-contain opacity-80" 
              />
            </div>
          )}

          {/* 内容区域 */}
          <div className="px-6 py-8 space-y-8">
            {/* 地点名称和分类 */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground">{placeName}</h1>
              <Badge variant="secondary" className="rounded-full">
                <img src={getCategoryIconUrl(firstRec.category)} alt="" className="w-4 h-4 mr-1 object-contain" />
                {firstRec.category}
              </Badge>
            </div>

            {/* 推荐列表 */}
            <div className="space-y-6">
              {recommendations.map((rec, idx) => (
                <div
                  key={rec.id}
                  className="bg-card border border-border card-shadow rounded-xl p-5 space-y-3 relative"
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

                  {/* 帖子底部操作栏：点赞、种草 */}
                  <div className="pt-2 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-full px-3 press-feedback ${localUpvotes[rec.id]?.isUpvoted ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                      onClick={() => handleUpvote(rec.id)}
                    >
                      <Heart 
                        className={`w-4 h-4 mr-1.5 ${localUpvotes[rec.id]?.isUpvoted ? 'fill-primary' : ''}`} 
                      />
                      <span className="font-medium text-sm">
                        {localUpvotes[rec.id]?.count > 0 ? localUpvotes[rec.id].count : '+1'}
                      </span>
                    </Button>
                    
                    <button 
                      onClick={() => handleToggleWishlist(rec.id)}
                      className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${
                        localWishlists[rec.id]
                          ? 'bg-[#ffebee] text-[#f43f5e] shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
                          : 'text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 transition-transform ${localWishlists[rec.id] ? 'fill-current scale-110' : ''}`} strokeWidth={2} />
                      {localWishlists[rec.id] && (
                        <span className="absolute inset-0 rounded-full animate-ping bg-[#ffebee] opacity-75"></span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* 底部导航按钮 */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-background/95 backdrop-blur-md border-t border-border/30">
        <div className="flex items-center gap-2">
          {/* Google Maps - 主按钮 */}
          <button
            className="flex-[2] h-11 flex items-center justify-center gap-2 rounded-full bg-foreground text-background font-bold text-sm press-feedback transition-all hover:opacity-90 active:scale-95"
            onClick={handleNavigate}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            导航
          </button>

          {/* Grab */}
          <button
            className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-full border-2 border-foreground/15 bg-card font-semibold text-sm press-feedback transition-all hover:border-[#00B14F] hover:bg-[#00B14F]/5 active:scale-95"
            onClick={handleGrab}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#00B14F] flex-shrink-0" />
            Grab
          </button>
          
          {/* Bolt */}
          <button
            className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-full border-2 border-foreground/15 bg-card font-semibold text-sm press-feedback transition-all hover:border-[#26D686] hover:bg-[#26D686]/5 active:scale-95"
            onClick={handleBolt}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#26D686] flex-shrink-0" />
            Bolt
          </button>
        </div>
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
