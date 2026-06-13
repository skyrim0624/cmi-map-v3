import { ArrowLeft, Camera, Check, KeyRound, LogOut, Pencil, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AnimalStickerAlbum from '@/components/AnimalStickerAlbum';
import BadgeUnlockOverlay from '@/components/BadgeUnlockOverlay';
import BadgeWall from '@/components/BadgeWall';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  checkUserNameAvailability,
  getAllRecommendations,
  normalizeProfileUserName,
  updateUserAvatar,
  updateUserName,
  uploadAvatar,
  USER_NAME_TAKEN_ERROR_MESSAGE,
} from '@/db/api';
import { syncAchievementProgress } from '@/features/achievements/achievement-service';
import { CMI_MAP_WILD_CHIANG_MAI_EVENT_ID } from '@/data/cmi-events';
import { getWildAnimalStickerEntries } from '@/lib/cmi-wild-animal-stickers';
import { getCmiEasterIconUrl, getRecommendationEasterIconId, getRecommendationReasonText } from '@/lib/easter-icons';
import type { Badge } from '@/types/badges';
import type { Category, PlacedSticker, Recommendation, Sticker } from '@/types/types';
import { CATEGORIES, categoryMatchesFilter, getCategoryIconUrl } from '@/types/types';

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'my_pins' | 'animals' | 'wishlist' | 'badges'>('my_pins');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [myRecommendations, setMyRecommendations] = useState<Recommendation[]>([]);
  const [myWishlists, setMyWishlists] = useState<Recommendation[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState<Badge | null>(null);
  const [loading, setLoading] = useState(true);

  // 编辑昵称
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // 头像上传
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { state: { from: '/profile' }, replace: true });
    }
  }, [authLoading, navigate, user]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const displayName = profile?.user_name || user?.email?.split('@')[0] || '游客';
  const animalStickerEntries = useMemo(
    () => getWildAnimalStickerEntries(myRecommendations),
    [myRecommendations]
  );

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allData = await getAllRecommendations();
      const mine = allData.filter(rec => rec.user_id === user.id);
      const wishlisted = allData.filter(rec =>
        rec.wishlists && rec.wishlists.some(w => w.user_id === user.id)
      );
      setMyRecommendations(mine);
      setMyWishlists(wishlisted);

      const achievementProgress = syncAchievementProgress(user.id, allData);
      setUnlockedBadges(achievementProgress.unlockedIds);
      if (achievementProgress.newlyUnlockedBadge) {
        setNewlyUnlockedBadge(achievementProgress.newlyUnlockedBadge);
      }
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

  // 昵称编辑
  const handleEditNameClick = () => {
    setNewName(displayName);
    setIsEditingName(true);
  };
  const handleCancelEdit = () => setIsEditingName(false);
  const handleSaveName = async () => {
    const normalizedName = normalizeProfileUserName(newName);
    if (!normalizedName || !user) return;
    setSavingName(true);
    const availability = await checkUserNameAvailability(normalizedName, user.id);
    if (availability.error) {
      toast.error('暂时无法确认昵称是否可用，请稍后再试');
      setSavingName(false);
      return;
    }
    if (!availability.available) {
      toast.error(USER_NAME_TAKEN_ERROR_MESSAGE);
      setSavingName(false);
      return;
    }

    const success = await updateUserName(user.id, normalizedName);
    if (success) {
      toast.success('昵称修改成功');
      if (refreshProfile) await refreshProfile();
      setIsEditingName(false);
    } else {
      toast.error('修改失败，请重试');
    }
    setSavingName(false);
  };

  // 头像上传
  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error('请选择图片文件'); return; }
    if (file.size > 1024 * 1024) { toast.error('图片大小不能超过 1MB'); return; }
    setUploading(true);
    try {
      const avatarUrl = await uploadAvatar(file, user.id);
      if (!avatarUrl) { toast.error('上传失败'); return; }
      const success = await updateUserAvatar(user.id, avatarUrl);
      if (success) {
        toast.success('头像更新成功');
        if (refreshProfile) await refreshProfile();
      } else {
        toast.error('更新失败');
      }
    } catch { toast.error('上传失败'); } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Tab 样式
  const tabClass = (tab: typeof activeTab, color: string) =>
    `flex-1 pb-3 text-center font-bold text-sm transition-colors relative whitespace-nowrap ${
      activeTab === tab ? `text-${color}` : 'text-stone-400'
    }`;

  const tabUnderline = (tab: typeof activeTab, color: string) =>
    activeTab === tab
      ? <div className={`absolute bottom-0 left-3 right-3 h-[2.5px] bg-${color} rounded-full`} />
      : null;

  const getTopStickers = (placedStickers: PlacedSticker[] | undefined, topN: number = 3) => {
    if (!placedStickers || placedStickers.length === 0) return [];
    const stickersArray = Array.isArray(placedStickers) ? placedStickers : [placedStickers];
    const counts: Record<string, { count: number; sticker: Sticker }> = {};
    for (const ps of stickersArray) {
      if (!ps.sticker) continue;
      const s = Array.isArray(ps.sticker) ? ps.sticker[0] : ps.sticker;
      if (!s) continue;
      if (!counts[ps.sticker_id]) {
        counts[ps.sticker_id] = { count: 0, sticker: s };
      }
      counts[ps.sticker_id].count++;
    }
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);
  };

  // 列表渲染
  const renderList = (items: Recommendation[], emptyMsg: string, emptyAction: string, emptyRoute: string) => {
    if (loading) {
      return <div className="text-center text-muted-foreground py-8 animate-pulse font-medium">正在翻找你的手账...</div>;
    }
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center py-12 text-center gap-4">
          <div className="text-5xl opacity-60">📝</div>
          <p className="text-muted-foreground font-medium">{emptyMsg}</p>
          <Button
            onClick={() => navigate(emptyRoute)}
            className="rounded-full border-2 border-border/60 shadow-[2px_3px_0_rgba(0,0,0,0.08)] font-bold"
          >
            {emptyAction}
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {items.map((rec) => (
          <div
            key={rec.id}
            className="flex gap-3 p-3.5 bg-card border border-border/60 rounded-2xl shadow-sm cursor-pointer transition-transform hover:translate-y-[-2px] hover:shadow-md"
            onClick={() => navigate(`/place/${encodeURIComponent(rec.place_name)}`)}
          >
            {rec.images && rec.images.length > 0 ? (
              <img src={rec.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center p-3 flex-shrink-0">
                <img
                  src={rec.category === '彩蛋' ? getCmiEasterIconUrl(getRecommendationEasterIconId(rec)) : getCategoryIconUrl(rec.category)}
                  alt=""
                  className="w-full h-full object-contain opacity-60"
                />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1.5">
              <p className="text-sm leading-relaxed line-clamp-2">"{getRecommendationReasonText(rec)}"</p>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground truncate whitespace-nowrap">
                  <span className="mr-1">📍</span>
                  <span>{rec.place_name}</span>
                  <span className="mx-0.5 opacity-50">|</span>
                  <span>{rec.user_name}</span>
                </p>
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {/* 聚合排序前3的贴纸印章 */}
                  {getTopStickers(rec.placed_stickers).map((ts) => (
                    <div key={ts.sticker.id} className="flex items-center bg-accent/40 rounded-full px-1.5 py-0.5 border border-border/50 backdrop-blur-sm">
                      <img src={ts.sticker.icon_url} alt="" className="w-3 h-3 object-contain mr-1 filter saturate-[0.8]" style={{ mixBlendMode: 'multiply' }} />
                      <span className="text-[9px] font-bold text-muted-foreground ml-0.5">{ts.count}</span>
                    </div>
                  ))}
                  {/* 点赞数 */}
                  {rec.upvotes && rec.upvotes.length > 0 && (
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-1">
                      🔥 {rec.upvotes.length}
                    </span>
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
    <div className="min-h-screen bg-background relative">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md px-4 py-3 flex justify-between items-center safe-top border-b border-border/40">
        <Button variant="ghost" size="icon" className="rounded-full press-feedback" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
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

      {/* ======== 紧凑横排头部 ======== */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* 头像 */}
        <div className="relative flex-shrink-0 group">
          <Avatar
            className="w-20 h-20 border-2 border-border/60 shadow-[2px_3px_0_rgba(0,0,0,0.08)] cursor-pointer"
            onClick={handleAvatarClick}
          >
            {profile?.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={displayName} className="object-cover" />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button
            className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full border-2 border-background shadow-sm press-feedback group-hover:scale-110 transition-transform"
            onClick={handleAvatarClick}
            disabled={uploading}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        {/* 右侧信息 */}
        <div className="flex-1 min-w-0">
          {/* 昵称 */}
          {isEditingName ? (
            <div className="flex items-center gap-1.5 mb-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-xl font-black text-foreground bg-transparent border-b-2 border-primary focus:outline-none w-32"
                autoFocus
                maxLength={24}
                disabled={savingName}
              />
              <Button size="icon" variant="ghost" className="w-7 h-7 rounded-full text-green-600" onClick={handleSaveName} disabled={savingName}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="w-7 h-7 rounded-full text-red-500" onClick={handleCancelEdit} disabled={savingName}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mb-1">
              <h1 className="text-xl font-black truncate">{displayName}</h1>
              <button className="p-0.5 text-muted-foreground hover:text-foreground transition-colors" onClick={handleEditNameClick}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mb-2">清迈数字游民 · 社区建设者</p>

          {/* 统计数据 */}
          <div className="flex gap-4">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black">{myRecommendations.length}</span>
              <span className="text-[11px] font-semibold text-muted-foreground">贡献</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black">{myWishlists.length}</span>
              <span className="text-[11px] font-semibold text-muted-foreground">想去</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black">{unlockedBadges.length}</span>
              <span className="text-[11px] font-semibold text-muted-foreground">成就</span>
            </div>
          </div>
        </div>
      </div>

      {profile?.role === 'admin' && (
        <div className="px-5 pb-4">
          <Button
            variant="outline"
            className="h-11 w-full rounded-2xl border-[#2e2a23]/12 bg-[#f8f1df] font-black text-[#2f553e]"
            onClick={() => navigate('/admin/agent-tokens')}
          >
            <KeyRound className="h-4 w-4" />
            Agent Token
          </Button>
        </div>
      )}

      {/* ======== Tab 栏 ======== */}
      <div className="sticky top-[52px] z-40 flex overflow-x-auto border-b border-border/50 bg-background px-5 hide-scrollbar">
        <button
          onClick={() => setActiveTab('my_pins')}
          className={`relative min-w-[5.4rem] flex-1 whitespace-nowrap pb-3 text-center text-sm font-bold transition-colors ${activeTab === 'my_pins' ? 'text-foreground' : 'text-stone-400'}`}
        >
          我的痕迹 ({myRecommendations.length})
          {activeTab === 'my_pins' && <div className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-foreground rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('animals')}
          className={`relative min-w-[6.6rem] flex-1 whitespace-nowrap pb-3 text-center text-sm font-bold transition-colors ${activeTab === 'animals' ? 'text-[#0b3d24]' : 'text-stone-400'}`}
        >
          神奇生物图鉴 ({animalStickerEntries.length})
          {activeTab === 'animals' && <div className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-[#0b3d24] rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`relative min-w-[5.4rem] flex-1 whitespace-nowrap pb-3 text-center text-sm font-bold transition-colors ${activeTab === 'wishlist' ? 'text-[#f43f5e]' : 'text-stone-400'}`}
        >
          我想去的 ({myWishlists.length})
          {activeTab === 'wishlist' && <div className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-[#f43f5e] rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`relative min-w-[4.8rem] flex-1 whitespace-nowrap pb-3 text-center text-sm font-bold transition-colors ${activeTab === 'badges' ? 'text-primary' : 'text-stone-400'}`}
        >
          成就 ({unlockedBadges.length})
          {activeTab === 'badges' && <div className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-primary rounded-full" />}
        </button>
      </div>

      {/* ======== 分类筛选 ======== */}
      {activeTab !== 'badges' && activeTab !== 'animals' && (
        <div className="overflow-x-auto hide-scrollbar px-5 py-3">
          <div className="flex gap-2 min-w-max">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full whitespace-nowrap press-feedback border border-border/60"
              onClick={() => setSelectedCategory('all')}
            >
              全部
            </Button>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.name}
                variant={selectedCategory === cat.name ? 'default' : 'outline'}
                size="sm"
                className="rounded-full whitespace-nowrap press-feedback border border-border/60"
                onClick={() => setSelectedCategory(cat.name)}
              >
                <img src={cat.iconUrl} alt={cat.name} className="mr-1 h-5 w-5 object-contain" />
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ======== 内容区 ======== */}
      <div className="px-5 pb-12">
        {activeTab === 'my_pins' && renderList(
          myRecommendations.filter(r => selectedCategory === 'all' || categoryMatchesFilter(r.category, selectedCategory)),
          '手账本里还没有你的清迈痕迹',
          '去留一条痕迹',
          '/mark'
        )}

        {activeTab === 'wishlist' && renderList(
          myWishlists.filter(r => selectedCategory === 'all' || categoryMatchesFilter(r.category, selectedCategory)),
          '你的愿望清单空空如也',
          '回地图上逛逛，种点草',
          '/'
        )}

        {activeTab === 'animals' && (
          <div className="pt-3">
            <AnimalStickerAlbum
              entries={animalStickerEntries}
              emptyActionLabel="去拍一只"
              onEmptyAction={() => navigate(`/mark?event=${encodeURIComponent(CMI_MAP_WILD_CHIANG_MAI_EVENT_ID)}`)}
            />
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="pt-2">
            <BadgeWall unlockedBadgeIds={unlockedBadges} />
          </div>
        )}
      </div>

      {/* 徽章解锁弹窗 */}
      {newlyUnlockedBadge && (
        <BadgeUnlockOverlay
          badge={newlyUnlockedBadge}
          onClose={() => setNewlyUnlockedBadge(null)}
        />
      )}
    </div>
  );
}
