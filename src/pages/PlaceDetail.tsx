import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecommendationsByPlace, deleteRecommendation, toggleUpvote, toggleWishlist, getAvailableStickers, getPlacedStickers, placeSticker } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Recommendation, Sticker, PlacedSticker } from '@/types/types';
import { getCategoryIconUrl, getCategoryColor } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2, Heart, Bookmark, Sticker as StickerIcon } from 'lucide-react';
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

  // 贴纸状态
  const [availableStickers, setAvailableStickers] = useState<Sticker[]>([]);
  const [placedStickers, setPlacedStickers] = useState<Record<string, PlacedSticker[]>>({});
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null); 
  const [activeRecIdForSticker, setActiveRecIdForSticker] = useState<string | null>(null);
  const [showStickerDrawer, setShowStickerDrawer] = useState(false);

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
    
    // 加载此地点的所有贴纸
    const stickersData: Record<string, PlacedSticker[]> = {};
    await Promise.all(data.map(async (rec) => {
      stickersData[rec.id] = await getPlacedStickers(rec.id);
    }));
    setPlacedStickers(stickersData);

    setRecommendations(data);
    setLoading(false);

    // 预加载贴纸库
    if (availableStickers.length === 0) {
      const stickers = await getAvailableStickers();
      setAvailableStickers(stickers);
    }
  };

  const handleUpvote = async (recId: string) => {
    if (!user) {
      toast('登录后才能点赞哦', { description: '注册只需要一个邮箱 ✉️' });
      navigate('/login', { state: { from: `/place/${placeName}` } });
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
      toast('登录后才能收藏地点哦', { description: '注册只需要一个邮箱 ✉️' });
      navigate('/login', { state: { from: `/place/${placeName}` } });
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

  const handleCardClick = async (e: React.MouseEvent<HTMLDivElement>, recId: string) => {
    if (activeStickerId && activeRecIdForSticker === recId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const x_ratio = (x / rect.width) * 100;
      const y_ratio = (y / rect.height) * 100;
      // 轻微随机旋转，更有随意感
      const rotation = Math.random() * 40 - 20;

      const stickerToPlace = availableStickers.find(s => s.id === activeStickerId);
      if (!stickerToPlace || !user) return;

      const optimisticSticker: PlacedSticker = {
        id: Math.random().toString(),
        recommendation_id: recId,
        user_id: user.id,
        sticker_id: activeStickerId,
        x_ratio,
        y_ratio,
        rotation,
        created_at: new Date().toISOString(),
        sticker: stickerToPlace
      };

      // 乐观更新 UI
      setPlacedStickers(prev => ({
        ...prev,
        [recId]: [...(prev[recId] || []), optimisticSticker]
      }));

      // 重置交互状态
      setActiveStickerId(null);
      setActiveRecIdForSticker(null);

      // 发起请求
      const result = await placeSticker({
        recommendation_id: recId,
        user_id: user.id,
        sticker_id: activeStickerId,
        x_ratio,
        y_ratio,
        rotation
      });

      if (!result) {
        toast.error('印章可能没有盖稳，请刷新重试');
      }
    }
  };

  const handleGrab = async () => {
    if (recommendations.length === 0) return;
    const { latitude, longitude, place_name } = recommendations[0];

    // 先把地点名复制到剪贴板，方便在 Grab 里粘贴搜索
    try {
      await navigator.clipboard.writeText(place_name);
      toast.success('已复制地点名称', { description: '打开 Grab 后粘贴到搜索框即可 📋' });
    } catch {
      // 剪贴板 API 不可用时回退至不复制，仍然跳转
      toast('正在跳转 Grab…');
    }

    // 短暂延迟让用户看到提示，再跳转
    setTimeout(() => {
      const dropOffName = encodeURIComponent(place_name);
      window.open(`grab://open?screenType=RIDE&dropOffLatitude=${latitude}&dropOffLongitude=${longitude}&dropOffName=${dropOffName}`, '_self');
    }, 600);
  };

  const handleBolt = async () => {
    if (recommendations.length === 0) return;
    const { latitude, longitude, place_name } = recommendations[0];

    try {
      await navigator.clipboard.writeText(place_name);
      toast.success('已复制地点名称', { description: '打开 Bolt 后粘贴到搜索框即可 📋' });
    } catch {
      toast('正在跳转 Bolt…');
    }

    // 先尝试 deep link 拉起 Bolt App
    setTimeout(() => {
      const webFallback = `https://m.bolt.eu/ride/request?destination_lat=${latitude}&destination_lng=${longitude}`;

      // 用 visibilitychange 检测 App 是否被拉起
      let didLeave = false;
      const onVisChange = () => { didLeave = true; };
      document.addEventListener('visibilitychange', onVisChange);

      // 尝试 deep link
      window.location.href = `bolt://ride?destination_lat=${latitude}&destination_lng=${longitude}`;

      // 1.5 秒后如果页面还在前台，说明 App 没装，fallback 到网页
      setTimeout(() => {
        document.removeEventListener('visibilitychange', onVisChange);
        if (!didLeave) {
          window.open(webFallback, '_blank');
        }
      }, 1500);
    }, 600);
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
                  className={`bg-card border border-border card-shadow rounded-xl p-5 space-y-3 relative overflow-hidden transition-all duration-300 ${
                    activeStickerId && activeRecIdForSticker === rec.id 
                      ? 'ring-4 ring-primary ring-offset-2 scale-[1.02] cursor-crosshair' 
                      : ''
                  }`}
                  onClick={(e) => handleCardClick(e, rec.id)}
                >
                  {/* 已贴贴纸渲染层 */}
                  {placedStickers[rec.id]?.map((ps) => (
                    <div
                      key={ps.id}
                      className="absolute w-24 h-24 pointer-events-none z-10 animate-in zoom-in-50 duration-300 drop-shadow-sm"
                      style={{
                        left: `${ps.x_ratio}%`,
                        top: `${ps.y_ratio}%`,
                        transform: `translate(-50%, -50%) rotate(${ps.rotation}deg)`,
                        mixBlendMode: 'multiply' // 核心：实现盖章正片叠底的透底效果
                      }}
                    >
                      <img src={ps.sticker?.icon_url} alt="" className="w-full h-full object-contain filter saturate-[0.8] contrast-[1.1]" />
                    </div>
                  ))}
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

                  {/* 帖子底部操作栏：点赞、贴纸、种草 */}
                  <div className="pt-2 flex justify-end gap-2 relative z-20">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full px-3 press-feedback text-muted-foreground hover:bg-accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!user) {
                          toast('登录后才能盖戳哦', { description: '注册只需要一个邮箱 ✉️' });
                          navigate('/login', { state: { from: `/place/${placeName}` } });
                          return;
                        }
                        setActiveRecIdForSticker(rec.id);
                        setShowStickerDrawer(true);
                      }}
                    >
                      <StickerIcon className="w-4 h-4 mr-1.5" />
                      <span className="font-medium text-sm">盖戳</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-full px-3 press-feedback ${localUpvotes[rec.id]?.isUpvoted ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-accent'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpvote(rec.id);
                      }}
                    >
                      <Heart 
                        className={`w-4 h-4 mr-1.5 ${localUpvotes[rec.id]?.isUpvoted ? 'fill-primary' : ''}`} 
                      />
                      <span className="font-medium text-sm">
                        {localUpvotes[rec.id]?.count > 0 ? localUpvotes[rec.id].count : '+1'}
                      </span>
                    </Button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleWishlist(rec.id);
                      }}
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
      <div className="absolute bottom-0 left-0 right-0 z-50 px-5 py-4 bg-background/95 backdrop-blur-md border-t border-border/30">
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

      {/* 贴纸选择抽屉 */}
      {showStickerDrawer && (
        <div className="absolute inset-0 z-[100] flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => {
              setShowStickerDrawer(false);
              setActiveRecIdForSticker(null);
            }} 
          />
          <div className="bg-background w-full rounded-t-3xl p-6 pb-12 relative shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-w-md mx-auto">
            <h3 className="font-bold text-lg mb-6 text-center text-foreground font-sketch flex items-center justify-center gap-2">
              <StickerIcon className="w-5 h-5 text-primary" />
              选择一个图章，然后盖在卡片上吧
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {availableStickers.map(sticker => (
                <button
                  key={sticker.id}
                  className="flex flex-col items-center gap-2 press-feedback"
                  onClick={() => {
                    setActiveStickerId(sticker.id);
                    setShowStickerDrawer(false);
                    toast.success('图章已沾墨水 🥳', { description: '现在点击手账卡片的任意位置，把它盖上去吧！', duration: 4000 });
                  }}
                >
                  <div className="w-[4.5rem] h-[4.5rem] bg-accent/50 rounded-2xl flex items-center justify-center border-2 border-border/60 card-shadow transition-transform hover:scale-110 active:scale-95">
                    <img src={sticker.icon_url} className="w-12 h-12 object-contain filter saturate-[0.8] contrast-[1.1]" style={{ mixBlendMode: 'multiply' }} />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{sticker.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
