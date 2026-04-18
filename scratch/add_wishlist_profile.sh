cat << 'INNER_EOF' > scratch/ProfilePatch.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, ArrowLeft, Camera, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAllRecommendations } from '@/db/api';
import type { Recommendation } from '@/types/types';
import { getCategoryIconUrl } from '@/types/types';

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'my_pins' | 'wishlist'>('my_pins');
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
            className="bg-[#fdfbf7] p-4 rounded-xl border border-stone-200/50 shadow-sm flex items-start gap-4 active:scale-[0.98] transition-transform cursor-pointer"
            onClick={() => navigate(`/place/${encodeURIComponent(rec.place_name)}`)}
          >
             {rec.images && rec.images.length > 0 ? (
                <img src={rec.images[0]} alt="thumbnail" className="w-16 h-16 object-cover rounded-lg border border-stone-100" />
             ) : (
                <div className="w-16 h-16 bg-stone-100 rounded-lg flex items-center justify-center border border-stone-200/50">
                  <img src={getCategoryIconUrl(rec.category)} alt="cat" className="w-6 h-6 opacity-60" />
                </div>
             )}
             
             <div className="flex-1 min-w-0">
               <div className="flex items-center gap-1.5 mb-1">
                 <h3 className="font-bold text-stone-800 truncate">{rec.place_name}</h3>
                 <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">
                   {rec.category}
                 </span>
               </div>
               <p className="text-sm text-stone-500 line-clamp-2 leading-snug">{rec.reason}</p>
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

        {/* 贴纸簿容器 */}
        <div className="pb-12">
          {activeTab === 'my_pins' && renderList(
            myRecommendations, 
            "手账本里还没有你的专属印记", 
            "去标记一个心动坐标", 
            "/mark"
          )}
          
          {activeTab === 'wishlist' && renderList(
            myWishlists,
            "你的愿望清单空空如也",
            "回地图上逛逛，种点草",
            "/"
          )}
        </div>

      </div>
    </div>
  );
}
INNER_EOF
cp scratch/ProfilePatch.tsx src/pages/Profile.tsx
