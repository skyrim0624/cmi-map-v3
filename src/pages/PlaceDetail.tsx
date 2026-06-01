import { ArrowLeft, Bookmark, CalendarPlus, Download, Heart, Loader2, MapPinned, PencilLine, Share2, Sticker as StickerIcon, Trash2 } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCmiDetailTagsForRecommendation,
  getCmiPlaceTypeTagsForRecommendation,
  getCmiRecommendationDisplayTag,
  getCmiSceneMapFilterGroupId,
  matchesCmiMapFilterGroup,
  matchesCmiPlaceTypeTag,
  type CmiRecommendationDisplayContext,
} from '@/data/cmi-taxonomy';
import { getPlaceGuide, isCommunityCuratedRecommendation } from '@/data/place-guides';
import {
  deleteRecommendation,
  getProfilesByUserIds,
  getProfilesByUserNames,
  getRecommendationsByPlace,
  type PublicProfile,
  updateRecommendationReason,
} from '@/db/api';
import {
  createRecommendationInteractionState,
  loadAvailableStickers,
  loadRecommendationStickerPlacements,
  placeRecommendationSticker,
  toggleRecommendationUpvote,
  toggleRecommendationWishlist,
} from '@/features/interactions/interaction-service';
import {
  appendStickerPlacement,
  createOptimisticStickerPlacement,
  removeStickerPlacement,
  replaceStickerPlacement,
} from '@/features/interactions/recommendation-card-interactions';
import { getCmiEasterIconUrl, getRecommendationEasterIconId, getRecommendationReasonText } from '@/lib/easter-icons';
import { getAddTracePath, getCmiEventCreatePath, getPersonMapPath, getPlaceMapPath, getPlacePath } from '@/lib/paths';
import { getStableProfileIdentity } from '@/features/profiles/profile-identity';
import { createPlaceShareCard, type PlaceShareCardResult } from '@/lib/place-share-card';
import type { PlacedSticker, Recommendation, Sticker } from '@/types/types';
import { getCategoryIconUrl, normalizeCategory } from '@/types/types';

type FileShareData = {
  files?: File[];
  title?: string;
  text?: string;
  url?: string;
};

type NavigatorWithFileShare = Navigator & {
  canShare?: (data: FileShareData) => boolean;
  share?: (data: FileShareData) => Promise<void>;
};

type LocationState = {
  newTraceId?: string;
};

const getRecommendationIconUrl = (
  recommendation: Recommendation,
  displayTag?: { iconUrl?: string } | null
) => (
  displayTag?.iconUrl ??
  (recommendation.category === '彩蛋'
    ? getCmiEasterIconUrl(getRecommendationEasterIconId(recommendation))
    : getCategoryIconUrl(recommendation.category))
);

const getPrimaryBadgeForRecommendation = (
  recommendation: Recommendation,
  context: CmiRecommendationDisplayContext = {}
) => {
  const displayTag = getCmiRecommendationDisplayTag(recommendation, context);
  if (displayTag) {
    return {
      label: displayTag.label,
      iconUrl: getRecommendationIconUrl(recommendation, displayTag),
      isPlaceType: displayTag.kind === 'place-type',
    };
  }

  const placeTypeTag = getCmiPlaceTypeTagsForRecommendation(recommendation)[0];
  if (placeTypeTag) {
    return {
      label: placeTypeTag.label,
      iconUrl: placeTypeTag.iconUrl ?? getRecommendationIconUrl(recommendation),
      isPlaceType: true,
    };
  }

  return {
    label: normalizeCategory(recommendation.category),
    iconUrl: getRecommendationIconUrl(recommendation),
    isPlaceType: false,
  };
};

const getProfileInitial = (displayName: string) => displayName.trim().charAt(0).toUpperCase() || '?';

export default function PlaceDetail() {
  const { placeName } = useParams<{ placeName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [profilesByUserId, setProfilesByUserId] = useState<Record<string, PublicProfile>>({});
  const [profilesByUserName, setProfilesByUserName] = useState<Record<string, PublicProfile>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [localUpvotes, setLocalUpvotes] = useState<Record<string, { count: number, isUpvoted: boolean }>>({});
  const [localWishlists, setLocalWishlists] = useState<Record<string, boolean>>({});
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareCard, setShareCard] = useState<PlaceShareCardResult | null>(null);
  const [shareCardLoading, setShareCardLoading] = useState(false);
  const [rideDialogOpen, setRideDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecommendation, setEditingRecommendation] = useState<Recommendation | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  // 贴纸状态
  const [availableStickers, setAvailableStickers] = useState<Sticker[]>([]);
  const [placedStickers, setPlacedStickers] = useState<Record<string, PlacedSticker[]>>({});
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null); 
  const [activeRecIdForSticker, setActiveRecIdForSticker] = useState<string | null>(null);
  const [showStickerDrawer, setShowStickerDrawer] = useState(false);
  const locationState = location.state as LocationState | null;

  useEffect(() => {
    if (placeName) {
      setShareCard(null);
      loadRecommendations();
    }
  }, [placeName]);

  const loadRecommendations = async () => {
    if (!placeName) return;
    setLoading(true);
    setLoadError(null);

    try {
      const data = await getRecommendationsByPlace(decodeURIComponent(placeName), { throwOnError: true });

      const interactionState = createRecommendationInteractionState(data, user?.id);
      setLocalUpvotes(interactionState.upvotes);
      setLocalWishlists(interactionState.wishlists);

      const stickersData = await loadRecommendationStickerPlacements(data);
      setPlacedStickers(stickersData);

      setRecommendations(data);
      void syncRecommendationProfiles(data);

      // 预加载贴纸库
      if (availableStickers.length === 0) {
        const stickers = await loadAvailableStickers();
        setAvailableStickers(stickers);
      }
    } catch {
      setRecommendations([]);
      setProfilesByUserId({});
      setProfilesByUserName({});
      setLoadError('地点详情暂时没连上');
    } finally {
      setLoading(false);
    }
  };

  const syncRecommendationProfiles = async (nextRecommendations: Recommendation[]) => {
    if (nextRecommendations.length === 0) {
      setProfilesByUserId({});
      setProfilesByUserName({});
      return;
    }

    const [profilesById, profilesByLegacyName] = await Promise.all([
      getProfilesByUserIds(nextRecommendations.map(rec => rec.user_id)),
      getProfilesByUserNames(nextRecommendations.filter(rec => !rec.user_id).map(rec => rec.user_name)),
    ]);
    const nextProfilesByUserId = profilesById.reduce<Record<string, PublicProfile>>((profilesByIdMap, profile) => {
      profilesByIdMap[profile.id] = profile;
      return profilesByIdMap;
    }, {});
    const profiles = [...profilesById, ...profilesByLegacyName];
    const nextProfilesByUserName = profiles.reduce<Record<string, PublicProfile>>((profilesByName, profile) => {
      if (!profile.user_name) return profilesByName;
      profilesByName[profile.user_name] = profile;
      return profilesByName;
    }, {});

    setProfilesByUserId(nextProfilesByUserId);
    setProfilesByUserName(nextProfilesByUserName);
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

    const { success } = await toggleRecommendationUpvote(recId, user.id);
    
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
      toast('登录后才能标记想去哦', { description: '注册只需要一个邮箱 ✉️' });
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
      await toggleRecommendationWishlist(recId, user.id);
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

  const handleEditClick = (recommendation: Recommendation) => {
    setEditingRecommendation(recommendation);
    setEditReason(getRecommendationReasonText(recommendation));
    setEditDialogOpen(true);
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    if (editSubmitting) return;
    setEditDialogOpen(open);
    if (!open) {
      setEditingRecommendation(null);
      setEditReason('');
    }
  };

  const handleEditSubmit = async () => {
    if (!editingRecommendation) return;

    const nextReason = editReason.trim();
    if (nextReason.length < 4) {
      toast.error('至少写 4 个字，别人才能看懂');
      return;
    }

    if (nextReason === getRecommendationReasonText(editingRecommendation)) {
      handleEditDialogOpenChange(false);
      return;
    }

    setEditSubmitting(true);
    try {
      const updatedRecommendation = await updateRecommendationReason(
        editingRecommendation.id,
        nextReason
      );

      if (!updatedRecommendation) {
        toast.error('没有改成功，可能不是你本人写的这一条');
        return;
      }

      setRecommendations(prev =>
        prev.map(rec => rec.id === updatedRecommendation.id ? updatedRecommendation : rec)
      );
      toast.success('推荐内容已更新');
      setEditDialogOpen(false);
      setEditingRecommendation(null);
      setEditReason('');
    } finally {
      setEditSubmitting(false);
    }
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

  const handleOpenCmiMap = () => {
    if (recommendations.length === 0) return;
    navigate(getPlaceMapPath(recommendations[0].place_name));
  };

  const handleDetailTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget.querySelector('[data-radix-scroll-area-viewport]');
    const scrollTop = viewport instanceof HTMLElement ? viewport.scrollTop : window.scrollY;
    if (scrollTop > 4) {
      swipeStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const navigateBackToMapFromSwipe = () => {
    if (recommendations.length === 0) return;
    navigate(getPlaceMapPath(recommendations[0].place_name));
  };

  const handleDetailTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || recommendations.length === 0) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isIntentionalDownSwipe = deltaY > 120 && Math.abs(deltaY) > Math.abs(deltaX) * 1.35;
    if (!isIntentionalDownSwipe) return;

    navigateBackToMapFromSwipe();
  };

  const handleDetailPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;

    const viewport = event.currentTarget.querySelector('[data-radix-scroll-area-viewport]');
    const scrollTop = viewport instanceof HTMLElement ? viewport.scrollTop : window.scrollY;
    if (scrollTop > 4) {
      swipeStartRef.current = null;
      return;
    }

    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleDetailPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;

    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || recommendations.length === 0) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const isIntentionalDownSwipe = deltaY > 120 && Math.abs(deltaY) > Math.abs(deltaX) * 1.35;
    if (!isIntentionalDownSwipe) return;

    navigateBackToMapFromSwipe();
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

      const optimisticSticker = createOptimisticStickerPlacement({
        id: `preview-${recId}-${Date.now()}`,
        recommendationId: recId,
        userId: user.id,
        sticker: stickerToPlace,
        xRatio: x_ratio,
        yRatio: y_ratio,
        rotation,
        createdAt: new Date().toISOString(),
      });

      // 乐观更新 UI
      setPlacedStickers(prev => appendStickerPlacement(prev, recId, optimisticSticker));

      // 重置交互状态
      setActiveStickerId(null);
      setActiveRecIdForSticker(null);

      // 发起请求
      try {
        const result = await placeRecommendationSticker({
          recommendation_id: recId,
          user_id: user.id,
          sticker_id: activeStickerId,
          x_ratio,
          y_ratio,
          rotation
        });

        if (!result) throw new Error('盖戳没有保存到数据库');

        setPlacedStickers(prev => replaceStickerPlacement(prev, recId, optimisticSticker.id, result));
      } catch (error) {
        console.error('地点详情盖戳保存失败:', error);
        setPlacedStickers(prev => removeStickerPlacement(prev, recId, optimisticSticker.id));
        toast.error('盖戳没有保存成功，请稍后再试');
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

  const getShareCardInput = () => {
    const recommendation = recommendations[0];
    if (!recommendation) return null;

    const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
    const isCommunityGuide = isCommunityCuratedRecommendation(recommendation);

    return {
      recommendation,
      title: isCommunityGuide ? guide.title : recommendation.place_name,
      kind: isCommunityGuide ? guide.kind : recommendation.category,
      summary: isCommunityGuide ? guide.summary : getRecommendationReasonText(recommendation),
      tags: isCommunityGuide
        ? guide.tags
        : [recommendation.category, `${recommendation.user_name} 推荐`],
      sourceLabel: isCommunityGuide ? 'CMI 社区' : recommendation.user_name,
      placeUrl: `${window.location.origin}${getPlacePath(recommendation.place_name)}`,
    };
  };

  const ensureShareCard = async () => {
    if (shareCard) return shareCard;
    if (shareCardLoading) return null;

    const shareCardInput = getShareCardInput();
    if (!shareCardInput) return null;

    setShareCardLoading(true);
    try {
      const generatedCard = await createPlaceShareCard(shareCardInput);
      setShareCard(generatedCard);
      return generatedCard;
    } catch (error) {
      console.error('Failed to create place share card:', error);
      toast.error('分享卡片生成失败，请稍后再试');
      return null;
    } finally {
      setShareCardLoading(false);
    }
  };

  const handleOpenShareCard = () => {
    setShareDialogOpen(true);
    void ensureShareCard();
  };

  const downloadShareCard = (card: PlaceShareCardResult) => {
    const downloadUrl = URL.createObjectURL(card.blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = card.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleDownloadShareCard = async () => {
    const card = await ensureShareCard();
    if (!card) return;
    downloadShareCard(card);
    toast.success('分享卡片已生成');
  };

  const handleSystemShareCard = async () => {
    const card = await ensureShareCard();
    if (!card) return;

    const shareInput = getShareCardInput();
    const file = new File([card.blob], card.fileName, { type: 'image/png' });
    const navigatorWithFileShare = navigator as NavigatorWithFileShare;
    const shareData: FileShareData = {
      files: [file],
      title: shareInput?.title ? `CMI Map · ${shareInput.title}` : 'CMI Map 地点卡片',
      text: '来自 CMI Map 的清迈地点推荐',
    };

    if (navigatorWithFileShare.share && (!navigatorWithFileShare.canShare || navigatorWithFileShare.canShare(shareData))) {
      try {
        await navigatorWithFileShare.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Failed to share place card:', error);
      }
    }

    downloadShareCard(card);
    toast.success('当前浏览器不支持直接分享，已改为下载图片');
  };

  const handleAddTrace = () => {
    if (!placeName) return;
    const addTracePath = getAddTracePath(decodeURIComponent(placeName));

    if (!user) {
      toast('登录后才能补一句推荐', { description: '注册只需要一个邮箱 ✉️' });
      navigate('/login', { state: { from: addTracePath } });
      return;
    }

    navigate(addTracePath);
  };

  const handleCreateEventHere = () => {
    const recommendation = recommendations[0];
    if (!recommendation) return;

    const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
    const isCommunityGuide = isCommunityCuratedRecommendation(recommendation);
    navigate(getCmiEventCreatePath({
      placeName: recommendation.place_name,
      area: isCommunityGuide ? guide.kind : normalizeCategory(recommendation.category),
      category: recommendation.category,
      latitude: recommendation.latitude,
      longitude: recommendation.longitude,
    }));
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col gap-5 bg-background p-6 pt-20">
        <div className="aspect-[4/3] w-full animate-pulse rounded-3xl bg-muted" />
        <div className="space-y-3">
          <div className="h-7 w-2/3 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-6 text-center">
        <p className="mb-2 text-lg font-black text-foreground">{loadError}</p>
        <p className="mb-5 text-sm font-semibold leading-relaxed text-muted-foreground">
          这不是地点不存在，可能只是网络或数据同步失败。
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>返回</Button>
          <Button onClick={loadRecommendations}>重新加载</Button>
        </div>
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

  const entrySceneId = searchParams.get('scene');
  const entryPlaceTypeId = searchParams.get('placeType');
  const entryFilterId = searchParams.get('filter');
  const detailMapFilterGroupId = entryFilterId ?? getCmiSceneMapFilterGroupId(entrySceneId, entryPlaceTypeId);
  const firstRec = recommendations.find(recommendation =>
    entryPlaceTypeId
      ? matchesCmiPlaceTypeTag(recommendation, entryPlaceTypeId)
      : Boolean(detailMapFilterGroupId && matchesCmiMapFilterGroup(recommendation, detailMapFilterGroupId))
  ) ?? recommendations[0];
  const allImages = recommendations.flatMap(r => r.images);
  const firstGuide = getPlaceGuide(firstRec.place_name, firstRec.category);
  const firstIsCommunityGuide = isCommunityCuratedRecommendation(firstRec);
  const detailDisplayContext = {
    mapFilterGroupId: detailMapFilterGroupId,
    placeTypeId: entryPlaceTypeId,
  };
  const firstPlaceTypeTags = getCmiPlaceTypeTagsForRecommendation(firstRec);
  const firstDetailTags = getCmiDetailTagsForRecommendation(firstRec);
  const firstPrimaryBadge = getPrimaryBadgeForRecommendation(firstRec, detailDisplayContext);
  const inlineDetailTags = [
    ...firstPlaceTypeTags
      .filter(tag => !(firstPrimaryBadge.isPlaceType && tag.label === firstPrimaryBadge.label))
      .map(tag => ({ id: `place-${tag.id}`, label: tag.label })),
    ...firstDetailTags.map(tag => ({ id: `detail-${tag.id}`, label: tag.label })),
  ];
  return (
    <div
      className="relative w-full min-h-screen bg-background"
      onTouchStart={handleDetailTouchStart}
      onTouchEnd={handleDetailTouchEnd}
      onPointerDown={handleDetailPointerDown}
      onPointerUp={handleDetailPointerUp}
    >
      {/* 返回按钮 */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-background/80 backdrop-blur-sm press-feedback"
          onClick={() => navigate(-1)}
          aria-label="返回上一页"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <div className="absolute top-6 right-6 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-background/90 backdrop-blur-sm press-feedback shadow-sm"
          onClick={handleOpenShareCard}
          aria-label="生成分享卡片"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="h-screen">
        <div className="pb-32">
          {/* 照片轮播 */}
          {allImages.length > 0 ? (
            <div className="h-[32dvh] min-h-[230px] max-h-[310px] w-full bg-muted">
              <Carousel className="w-full h-full">
                <CarouselContent>
                  {allImages.map((img, idx) => (
                    <CarouselItem key={idx} className="relative h-[32dvh] min-h-[230px] max-h-[310px]">
                      <img
                        src={img}
                        alt=""
                        loading={idx === 0 ? 'eager' : 'lazy'}
                        decoding="async"
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
              className="flex h-[32dvh] min-h-[230px] max-h-[310px] w-full items-center justify-center bg-accent"
            >
              <img
                src={firstPrimaryBadge.iconUrl}
                alt={firstPrimaryBadge.label}
                className="w-1/3 h-1/3 object-contain opacity-80"
              />
            </div>
          )}

          {/* 内容区域 */}
          <div className="space-y-5 px-6 pb-8 pt-7">
            {/* 地点名称和分类 */}
            <div className="space-y-3">
              {firstIsCommunityGuide ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <h1 className="break-words text-4xl font-black leading-tight text-foreground">{firstGuide.title}</h1>
                      {firstGuide.title !== placeName && (
                        <p className="break-words text-sm font-semibold text-muted-foreground">{placeName}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-center text-xs font-black text-emerald-700">
                      社区整理
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full border-border/70 bg-background/90 px-2.5 py-1 text-muted-foreground shadow-sm"
                    >
                      <img src={firstPrimaryBadge.iconUrl} alt="" className="mr-1 h-5 w-5 object-contain" />
                      {firstPrimaryBadge.label}
                    </Badge>
                    {inlineDetailTags.map(tag => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-xs font-black text-primary/80"
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="break-words text-4xl font-black leading-tight text-foreground">{placeName}</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full border-border/70 bg-background/90 px-2.5 py-1 text-muted-foreground shadow-sm"
                    >
                      <img src={firstPrimaryBadge.iconUrl} alt="" className="mr-1 h-5 w-5 object-contain" />
                      {firstPrimaryBadge.label}
                    </Badge>
                    {inlineDetailTags.map(tag => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-xs font-black text-primary/80"
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 推荐列表 */}
            <div className="space-y-6">
              {recommendations.map((rec, idx) => {
                const guide = getPlaceGuide(rec.place_name, rec.category);
                const isCommunityGuide = isCommunityCuratedRecommendation(rec);
                const canEditRecommendation = Boolean(user && rec.user_id === user.id);
                const profile = (rec.user_id && profilesByUserId[rec.user_id]) || profilesByUserName[rec.user_name];
                const displayName = isCommunityGuide ? 'CMI 社区整理' : rec.user_name;
                const profileIdentity = profile ? getStableProfileIdentity(profile) : rec.user_id || rec.user_name;
                const recommendationImages = rec.images.filter(Boolean);
                const primaryRecommendationImage = recommendationImages[0];
                const renderRecommendationActions = (className = 'justify-end pt-2') => (
                  <div className={`relative z-20 flex gap-2 ${className}`}>
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
                      className={`relative flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-all duration-300 active:scale-90 ${
                        localWishlists[rec.id]
                          ? 'bg-[#ffebee] text-[#f43f5e] shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                          : 'text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 transition-transform ${localWishlists[rec.id] ? 'fill-current scale-110' : ''}`} strokeWidth={2} />
                      <span>{localWishlists[rec.id] ? '已想去' : '想去'}</span>
                      {localWishlists[rec.id] && (
                        <span className="absolute inset-0 rounded-full animate-ping bg-[#ffebee] opacity-75"></span>
                      )}
                    </button>
                  </div>
                );

                return (
                  <Fragment key={rec.id}>
                    {idx === 1 && (
                      <div className="pt-2">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
                          更多补充
                        </p>
                      </div>
                    )}
                  <div
                    className={`relative overflow-hidden transition-all duration-300 ${
                      idx === 0
                        ? 'space-y-3 rounded-[1.35rem] border border-border bg-card p-4 shadow-[0_10px_28px_rgba(45,45,47,0.07)]'
                        : 'space-y-3 rounded-[1.15rem] border border-border bg-card p-3.5 shadow-[0_8px_22px_rgba(45,45,47,0.06)]'
                    } ${
                      activeStickerId && activeRecIdForSticker === rec.id 
                        ? 'ring-4 ring-primary ring-offset-2 scale-[1.02] cursor-crosshair' 
                        : ''
                    } ${
                      locationState?.newTraceId === rec.id
                        ? 'ring-4 ring-primary ring-offset-2'
                        : ''
                    }`}
                    onClick={(e) => handleCardClick(e, rec.id)}
                  >
                  {locationState?.newTraceId === rec.id && (
                    <div className={`absolute right-3 z-20 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground ${canEditRecommendation ? 'top-14' : 'top-3'}`}>
                      刚补充
                    </div>
                  )}
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
                  {/* 编辑 / 删除按钮（仅对当前用户的推荐显示） */}
                  {canEditRecommendation && (
                    <div className="absolute right-3 top-3 z-30 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background/90 text-foreground hover:bg-accent"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditClick(rec);
                        }}
                        aria-label="编辑这条推荐"
                      >
                        <PencilLine className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background/90 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteClick(rec);
                        }}
                        aria-label="删除这条推荐"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* 推荐人头像 */}
                  <div className={`relative z-20 flex items-center gap-2 ${canEditRecommendation ? 'pr-20' : 'pr-10'}`}>
                    <Avatar className="h-10 w-10 border border-border bg-background shadow-sm">
                      {profile?.avatar_url && (
                        <AvatarImage src={profile.avatar_url} alt={`${displayName} 的头像`} className="object-cover" />
                      )}
                      <AvatarFallback className="bg-primary/10 text-sm font-black text-primary">
                        {getProfileInitial(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    {isCommunityGuide ? (
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-foreground">{displayName}</p>
                        <p className="truncate text-xs font-bold text-muted-foreground">整理了这条推荐</p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="min-w-0 text-left active:scale-[0.98]"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(getPersonMapPath(profileIdentity));
                        }}
                        aria-label={`查看 ${displayName} 的清迈地图`}
                      >
                        <span className="block truncate text-sm font-black text-foreground">{displayName}</span>
                        <span className="block truncate text-xs font-bold text-muted-foreground">的清迈地图</span>
                      </button>
                    )}
                  </div>

                  {idx > 0 && primaryRecommendationImage ? (
                    <div className="relative z-20 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
                      <div className="overflow-hidden rounded-[0.95rem] border border-border bg-muted">
                        <img
                          src={primaryRecommendationImage}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="aspect-[4/5] h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className={`quote-text text-[1rem] leading-relaxed ${canEditRecommendation ? 'pr-16' : ''}`}>
                          {isCommunityGuide ? guide.summary : getRecommendationReasonText(rec)}
                        </p>
                        {recommendationImages.length > 1 && (
                          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {recommendationImages.slice(1, 4).map((img, imgIdx) => (
                              <img
                                key={`${img}-${imgIdx}`}
                                src={img}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover"
                              />
                            ))}
                          </div>
                        )}
                        {renderRecommendationActions('mt-2 justify-start flex-wrap')}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className={`${idx === 0 ? 'text-lg font-bold leading-relaxed text-foreground' : 'quote-text text-base leading-relaxed'} ${canEditRecommendation ? 'pr-20' : 'pr-10'}`}>
                        {isCommunityGuide ? guide.summary : getRecommendationReasonText(rec)}
                      </p>
                      {renderRecommendationActions()}
                    </>
                  )}
                </div>
                    {idx === 0 && (
                      <div className="grid gap-2">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-[1.35rem] border border-border bg-card p-4 text-left shadow-[0_7px_20px_rgba(45,45,47,0.06)] transition-transform active:scale-[0.99]"
                          onClick={handleAddTrace}
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                            <PencilLine className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-lg font-black leading-tight text-foreground">我也来补一句</p>
                            <p className="mt-1 text-sm font-semibold leading-snug text-muted-foreground">
                              去过这里，再补充路况、拍照点或坑点。
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-[1.35rem] border border-[#3f6e52]/18 bg-[#edf6ee] p-4 text-left shadow-[0_7px_20px_rgba(45,45,47,0.05)] transition-transform active:scale-[0.99]"
                          onClick={handleCreateEventHere}
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#3f6e52]">
                            <CalendarPlus className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-lg font-black leading-tight text-foreground">在这里发活动</p>
                            <p className="mt-1 text-sm font-semibold leading-snug text-muted-foreground">
                              发布页会自动绑定这个地点和地图坐标。
                            </p>
                          </div>
                        </button>
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* 底部导航按钮 */}
      <div className="absolute bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/90 px-5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="grid grid-cols-[1fr_1.15fr_0.8fr] gap-2">
          {/* CMI Map 内部定位 */}
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-border bg-card text-sm font-black text-foreground shadow-sm transition-all hover:bg-accent active:scale-95"
            onClick={handleOpenCmiMap}
          >
            <MapPinned className="h-4 w-4" />
            CMI地图
          </button>

          {/* Google Maps */}
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-black text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
            onClick={handleNavigate}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            导航
          </button>

          {/* 叫车 */}
          <button
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-full border-2 border-border bg-card text-sm font-black text-foreground shadow-sm transition-all hover:bg-accent active:scale-95"
            onClick={() => setRideDialogOpen(true)}
          >
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#15bf63]" />
            叫车
          </button>
        </div>
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-[430px] rounded-3xl border-2 border-foreground p-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-black">地点分享卡片</DialogTitle>
            <DialogDescription className="font-semibold leading-relaxed">
              生成一张适合发朋友圈、小红书和群聊的 4:5 图片卡片。
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 rounded-2xl border border-border bg-muted/40 p-3">
            {shareCardLoading || !shareCard ? (
              <div className="flex aspect-[4/5] w-full items-center justify-center rounded-xl bg-background">
                <p className="text-sm font-bold text-muted-foreground">正在生成卡片...</p>
              </div>
            ) : (
              <img
                src={shareCard.dataUrl}
                alt="CMI Map 地点分享卡片预览"
                className="aspect-[4/5] w-full rounded-xl object-cover shadow-sm"
              />
            )}
          </div>

          <DialogFooter className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:space-x-0">
            <Button
              variant="outline"
              className="h-12 rounded-full border-2 font-black"
              onClick={handleDownloadShareCard}
              disabled={shareCardLoading}
            >
              <Download className="mr-2 h-4 w-4" />
              下载图片
            </Button>
            <Button
              className="h-12 rounded-full font-black"
              onClick={handleSystemShareCard}
              disabled={shareCardLoading}
            >
              <Share2 className="mr-2 h-4 w-4" />
              直接分享
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rideDialogOpen} onOpenChange={setRideDialogOpen}>
        <DialogContent className="max-w-[430px] rounded-3xl border-2 border-foreground p-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-black">叫车去这里</DialogTitle>
            <DialogDescription className="font-semibold leading-relaxed">
              会先复制地点名，打开 App 后直接粘贴搜索更稳。
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-12 rounded-full border-2 font-black"
              onClick={() => {
                setRideDialogOpen(false);
                void handleGrab();
              }}
            >
              <span className="mr-2 h-2.5 w-2.5 rounded-full bg-[#00B14F]" />
              Grab
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-full border-2 font-black"
              onClick={() => {
                setRideDialogOpen(false);
                void handleBolt();
              }}
            >
              <span className="mr-2 h-2.5 w-2.5 rounded-full bg-[#26D686]" />
              Bolt
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent className="max-w-[430px] rounded-3xl border-2 border-foreground p-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-black">编辑这条推荐</DialogTitle>
            <DialogDescription className="font-semibold leading-relaxed">
              只改你写过的这句话；地点、分类和照片先保持不变。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea
              value={editReason}
              onChange={(event) => setEditReason(event.target.value)}
              maxLength={180}
              className="min-h-36 resize-none rounded-2xl border-2 bg-card px-4 py-4 text-base leading-relaxed"
              placeholder="补充 Wi-Fi、价格、适合工作时段、坑点等具体体验。"
            />
            <div className="flex justify-end text-xs font-bold text-muted-foreground">
              {editReason.trim().length}/180
            </div>
          </div>

          <DialogFooter className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:space-x-0">
            <Button
              variant="outline"
              className="h-12 rounded-full border-2 font-black"
              onClick={() => handleEditDialogOpenChange(false)}
              disabled={editSubmitting}
            >
              取消
            </Button>
            <Button
              className="h-12 rounded-full font-black"
              onClick={handleEditSubmit}
              disabled={editSubmitting || editReason.trim().length < 4}
            >
              {editSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中
                </>
              ) : (
                '保存修改'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
