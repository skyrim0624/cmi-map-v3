import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, ArrowLeft, Camera, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAllRecommendations } from '@/db/api';
import type { Recommendation, Category } from '@/types/types';
import { getCategoryIconUrl, CATEGORIES } from '@/types/types';

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'my_pins' | 'wishlist'>('my_pins');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [myRecommendations, setMyRecommendations] = useState<Recommendation[]>([]);
  const [myWishlists, setMyWishlists] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  if (!user) {
    navigate('/login');
    return null;
  }

  const displayName = profile?.user_name || user?.email?.split('@')[0] || '游客';

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allData = await getAllRecommendations();
      
      // Filter my own pins
      const mine = allData.filter(rec => rec.user_id === user.id);
      
      // Filter my wishlists
      const wishlisted = allData.filter(rec => 
        rec.wishlists && rec.wishlists.some(w => w.user_id === user.id)
      );
      
      setMyRecommendations(mine);
      setMyWishlists(wishlisted);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderList = (items: Recommendation[], emptyMsg: string, emptyActionText: string, emptyActionRoute: string) => {
    if (loading) {
      return <div className="text-center text-muted-foreground py-8 animate-pulse font-medium">正在翻找你的手账...</div>;
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-12 flex flex-col items-center">
          <p className="text-muted-foreground mb-4 font-medium">{emptyMsg}</p>
          <Button onClick={() => navigate(emptyActionRoute)} className="rounded-full tracking-wide">
            {emptyActionText}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((rec) => (
          <div 
            key={rec.id} 
            className="app-list-card bg-card p-4 border-2 border-foreground cursor-pointer"
            onClick={() => navigate(`/place/${encodeURIComponent(rec.place_name)}`)}
          >
             <div className="flex gap-4">
               {rec.images && rec.images.length > 0 ? (
                  <div className="flex-shrink-0">
                    <img src={rec.images[0]} alt="thumbnail" className="w-20 h-20 object-cover rounded-xl" />
                  </div>
               ) : (
                  <div className="flex-shrink-0 w-20 h-20 bg-accent rounded-xl flex items-center justify-center p-4">
                    <img src={getCategoryIconUrl(rec.category)} alt="cat" className="w-full h-full object-contain opacity-60" />
                  </div>
               )}
               
               <div className="flex-1 min-w-0 space-y-2">
                 <p className="text-base leading-relaxed text-foreground line-clamp-2">
                   "{rec.reason}"
                 </p>
                 <div className="flex justify-between items-center mt-2">
                   <p className="text-sm text-muted-foreground line-clamp-1">
                     📍 {rec.place_name} —— {rec.user_name}
                   </p>
                   {rec.upvotes && rec.upvotes.length > 0 && (
                     <div className="flex items-center gap-1 text-primary text-sm font-medium bg-primary/10 px-2 py-0.5 rounded-full shrink-0 ml-2">
                       🔥 {rec.upvotes.length}
                     </div>
                   )}
                 </div>
               </div>
             </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background relative selection-none">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md p-4 flex justify-between items-center safe-top border-b border-border/50">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full press-feedback"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full text-muted-foreground hover:text-destructive press-feedback"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* 头像区域 */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group mb-4">
            <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={displayName} className="object-cover" />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg press-feedback group-hover:scale-110 transition-transform">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black">{displayName}</h1>
            <button className="p-1 text-muted-foreground hover:text-foreground transition-colors mix-blend-multiply">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 核心改动：Tab 切换栏 */}
        <div className="flex border-b border-stone-200 mb-6">
          <button 
             onClick={() => setActiveTab('my_pins')}
             className={`flex-1 pb-3 text-center font-bold text-sm transition-colors relative ${activeTab === 'my_pins' ? 'text-stone-800' : 'text-stone-400'}`}
          >
            我贡献的 ({myRecommendations.length})
            {activeTab === 'my_pins' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-800" />}
          </button>
          <button 
             onClick={() => setActiveTab('wishlist')}
             className={`flex-1 pb-3 text-center font-bold text-sm transition-colors relative ${activeTab === 'wishlist' ? 'text-[#f43f5e]' : 'text-stone-400'}`}
          >
            我想去的 ({myWishlists.length})
            {activeTab === 'wishlist' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f43f5e]" />}
          </button>
        </div>

        {/* 分类筛选 */}
        <div className="mb-6 -mx-4 px-4 overflow-x-auto hide-scrollbar">
          <div className="flex gap-2 min-w-max pb-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              className="app-tag rounded-full whitespace-nowrap press-feedback relative"
              onClick={() => setSelectedCategory('all')}
              data-state={selectedCategory === 'all' ? 'on' : 'off'}
            >
              全部
              <svg className="app-tag-circle absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{pointerEvents: 'none'}}>
                <path d="M5,50 a45,45 0 1,0 90,0 a45,45 0 1,0 -90,0" vectorEffect="non-scaling-stroke" />
              </svg>
            </Button>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.name}
                variant={selectedCategory === cat.name ? 'default' : 'outline'}
                size="sm"
                className="app-tag rounded-full whitespace-nowrap press-feedback relative"
                onClick={() => setSelectedCategory(cat.name)}
                data-state={selectedCategory === cat.name ? 'on' : 'off'}
              >
                <img src={cat.iconUrl} alt={cat.name} className="w-4 h-4 mr-1 object-contain" />
                {cat.name}
                <svg className="app-tag-circle absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{pointerEvents: 'none'}}>
                  <path d="M5,50 a45,45 0 1,0 90,0 a45,45 0 1,0 -90,0" vectorEffect="non-scaling-stroke" />
                </svg>
              </Button>
            ))}
          </div>
        </div>

        {/* 贴纸簿容器 */}
        <div className="pb-12">
          {activeTab === 'my_pins' && renderList(
            myRecommendations.filter(r => selectedCategory === 'all' || r.category === selectedCategory), 
            "手账本里还没有你的专属印记", 
            "去标记一个心动坐标", 
            "/mark"
          )}
          
          {activeTab === 'wishlist' && renderList(
            myWishlists.filter(r => selectedCategory === 'all' || r.category === selectedCategory),
            "你的愿望清单空空如也",
            "回地图上逛逛，种点草",
            "/"
          )}
        </div>

      </div>
    </div>
  );
}
