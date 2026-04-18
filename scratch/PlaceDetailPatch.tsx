import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecommendationsByPlaceName, toggleUpvote, toggleWishlist } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Recommendation } from '@/types/types';
import { getCategoryIconUrl } from '@/types/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Navigation, MapPin, Share2, Flame, Bookmark } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';
import dayjs from 'dayjs';

export default function PlaceDetail() {
  const { placeName } = useParams<{ placeName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [localUpvotes, setLocalUpvotes] = useState<Record<string, { count: number, isUpvoted: boolean }>>({});
  const [localWishlists, setLocalWishlists] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (placeName) {
      loadData();
    }
  }, [placeName]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getRecommendationsByPlaceName(decodeURIComponent(placeName!));
      setRecommendations(data || []);
      
      // Initialize upvote limits and wishlists
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
    } catch (error) {
      console.error('Error loading place data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUpvote = async (recId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Optimistic unvote
    const currentState = localUpvotes[recId];
    const isUpvotedNow = currentState.isUpvoted;
    
    setLocalUpvotes(prev => ({
      ...prev,
      [recId]: {
        count: isUpvotedNow ? prev[recId].count - 1 : prev[recId].count + 1,
        isUpvoted: !isUpvotedNow
      }
    }));
    
    try {
      await toggleUpvote(recId, user.id);
    } catch (error) {
      // Revert if error
      setLocalUpvotes(prev => ({
        ...prev,
        [recId]: currentState
      }));
      console.error("Upvote failed", error);
    }
  };

  const handleToggleWishlist = async (recId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const isWishlistedNow = localWishlists[recId];
    
    // Optimistic UI
    setLocalWishlists(prev => ({
      ...prev,
      [recId]: !isWishlistedNow
    }));
    
    try {
      await toggleWishlist(recId, user.id);
    } catch (error) {
      // Revert
      setLocalWishlists(prev => ({
        ...prev,
        [recId]: isWishlistedNow
      }));
      console.error("Wishlist failed", error);
    }
  };

  // Open Apple Maps/Google Maps
  const openNavigation = () => {
    if (!recommendations.length) return;
    const { latitude, longitude, place_name } = recommendations[0];
    const url = `https://maps.apple.com/?q=${encodeURIComponent(place_name)}&ll=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <LoadingSpinner />
        <p className="text-muted-foreground mt-4 font-medium animate-pulse">正在查找手账记录...</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">未找到该地点的信息</h2>
        <p className="text-muted-foreground mb-6">这里似乎是一片未知的领域</p>
        <Button onClick={() => navigate(-1)}>返回上一页</Button>
      </div>
    );
  }

  const baseInfo = recommendations[0];

  return (
    <div className="relative min-h-[100dvh] bg-stone-100 font-sans">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-stone-100/90 backdrop-blur-md border-b border-stone-200/60 p-4 flex justify-between items-center safe-top">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-600 press-feedback"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          <button 
            onClick={openNavigation}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-600 press-feedback"
          >
            <Navigation className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-600 press-feedback">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 pb-24">
        {/* 地点总览 */}
        <div className="mb-8 pl-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-white rounded-md shadow-sm border border-stone-100">
              <img src={getCategoryIconUrl(baseInfo.category)} alt={baseInfo.category} className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-stone-500 tracking-wider">
              {baseInfo.category}
            </span>
          </div>
          <h1 className="text-3xl font-black text-stone-800 leading-tight">
            {baseInfo.place_name}
          </h1>
          <div className="flex items-center gap-1.5 text-stone-500 mt-2 text-sm font-medium">
            <MapPin className="w-4 h-4" />
            <span>清迈</span>
          </div>
        </div>

        {/* 推荐卡片列表（叠被子效果） */}
        <div className="space-y-6">
          {recommendations.map((rec) => {
            const upvotesCount = localUpvotes[rec.id]?.count || 0;
            const isUpvoted = localUpvotes[rec.id]?.isUpvoted || false;
            const isWishlisted = localWishlists[rec.id] || false;

            return (
              <div 
                key={rec.id}
                className="bg-[#fdfbf7] p-5 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-stone-200/60 relative overflow-hidden"
              >
                {/* 噪点肌理 */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.02] mix-blend-multiply" 
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
                </div>

                {/* 照片展示 */}
                {rec.images && rec.images.length > 0 && (
                  <div className="w-full aspect-square md:aspect-[4/3] rounded-lg overflow-hidden mb-4 border border-stone-200 bg-stone-100">
                    <img 
                      src={rec.images[0]} 
                      alt="场所实拍" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* 用户信息 */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold overflow-hidden border border-stone-300">
                    {/* todo: fill actual user avatar when available */}
                    {rec.user_id.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-stone-700">游民向导</div>
                    <div className="text-[10px] text-stone-400 font-medium">
                      {dayjs(rec.created_at).format('YYYY年MM月DD日')}
                    </div>
                  </div>
                </div>

                {/* 推荐语 */}
                <p className="text-stone-700 text-base leading-relaxed mb-6 whitespace-pre-wrap font-medium">
                  {rec.reason}
                </p>

                {/* 底部交互区 */}
                <div className="flex items-center justify-between border-t border-stone-200/60 pt-4">
                  <button 
                    onClick={() => handleToggleUpvote(rec.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 ${
                      isUpvoted 
                        ? 'bg-[#ffeedd] text-[#ff6b00]' 
                        : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                    }`}
                  >
                    <Flame className={`w-5 h-5 ${isUpvoted ? 'fill-current animate-pulse' : ''}`} strokeWidth={isUpvoted ? 2.5 : 2} />
                    <span className="font-bold text-sm">+{upvotesCount}</span>
                  </button>

                  <button 
                    onClick={() => handleToggleWishlist(rec.id)}
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${
                      isWishlisted 
                        ? 'bg-[#ffebee] text-[#f43f5e] shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
                        : 'text-stone-400 border border-stone-200 hover:bg-stone-100 relative'
                    }`}
                  >
                    <Bookmark className={`w-5 h-5 transition-transform ${isWishlisted ? 'fill-current scale-110' : ''}`} strokeWidth={2} />
                    {isWishlisted && (
                      <span className="absolute inset-0 rounded-full animate-ping bg-[#ffebee] opacity-75"></span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
