import {
  Bookmark,
  Calendar,
  CalendarPlus,
  Camera,
  List,
  Map as MapIcon,
  MapPin,
  Megaphone,
  Menu,
  MessageCircle,
  Navigation,
  Search,
  Send,
  Share2,
  Sticker as StickerIcon,
  Users,
  X,
} from 'lucide-react';
import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  getCmiEventCardImageUrl,
  getCmiEventRegistrationPreviewLabel,
} from '@/components/intent/event-card-presentation';
import { LeafletMap } from '@/components/map/LeafletMap';
import { useAuth } from '@/contexts/AuthContext';
import {
  CMI_EVENTS,
  CMI_MAP_WILD_CHIANG_MAI_EVENT_ID,
  type CmiEvent,
  formatCmiEventTime,
  getCmiEventSortTime,
  isCmiEventExpired,
  isCmiInnEvent,
  isCmiMapCheckinActivityEvent,
} from '@/data/cmi-events';
import { isCommunityCuratedRecommendation } from '@/data/place-guides';
import {
  getAllRecommendations,
  getProfilesByUserIds,
  getProfilesByUserNames,
  type PublicProfile,
} from '@/db/api';
import {
  type BlackboardAnnouncementRecord,
  type BlackboardPostRecord,
  getBlackboardAnnouncements,
  getBlackboardPosts,
} from '@/db/blackboard-posts';
import {
  getCurrentUserCmiEventRegistrations,
  getPublishedCmiEvents,
  registerForCmiEvent,
} from '@/db/cmi-events';
import {
  type CmiInboxMessageRecord,
  createCmiInboxMessage,
  getCmiInboxMessages,
  markCmiInboxMessagesRead,
} from '@/db/cmi-inbox';
import {
  type EventListRegistrationButtonState,
  getEventListRegistrationButtonState,
  isCapacityFullRegistrationError,
  isEventRegistrationPastCutoff,
} from '@/features/cmi-events/event-list-registration-state';
import { CMI_EVENT_REGISTRATION_SUCCESS_DESCRIPTION } from '@/features/cmi-events/event-rsvp-utils';
import { formatBlackboardCreatedLabel } from '@/features/home/blackboard/blackboard-model';
import {
  loadAvailableStickers,
  loadRecommendationStickerPlacements,
  placeRecommendationSticker,
  toggleRecommendationWishlist,
} from '@/features/interactions/interaction-service';
import {
  appendStickerPlacement,
  applyWishlistState,
  createOptimisticStickerPlacement,
  getRecommendationStickerPlacements,
  mergeStickerPlacementMaps,
  type PlacedStickerMap,
  removeStickerPlacement,
  replaceStickerPlacement,
  type WishlistStateMap,
} from '@/features/interactions/recommendation-card-interactions';
import { createCmiEventShareCard } from '@/lib/cmi-event-share-card';
import { getRecommendationLinkedEvent } from '@/lib/cmi-recommendation-events';
import { getRecommendationReasonText } from '@/lib/easter-icons';
import {
  getAddTracePath,
  getCmiEventCreatePath,
  getCmiEventPath,
  getCmiFeedPath,
  getMarkPlacePath,
  getPlacePath,
  getProfilePath,
  getPublicCmiEventUrl,
} from '@/lib/paths';
import { getDisplayPlaceName, getRecommendationMetaParts } from '@/lib/recommendation-display';
import {
  type Category,
  CMI_INN_PLACE_NAME,
  getCategoryConfig,
  isPublicMapRecommendation,
  type MapMarker,
  normalizeCategory,
  type PlacedSticker,
  type Recommendation,
  type Sticker,
} from '@/types/types';
import './cmi-map-v3-prototype.css';

type ScreenId = 'map' | 'feed' | 'publish' | 'events';
type PrimaryScreenId = 'feed' | 'map' | 'events' | 'publish';
type MapFilterId = 'all' | 'food' | 'play' | 'events' | 'easter';
type FeedCardTone = 'paper' | 'yellow' | 'green' | 'pink';
type EventStatusTone = 'open' | 'full' | 'ended';
type EventTabId = 'ongoing' | 'upcoming' | 'ended' | 'joined';
type SheetSnap = 'minimized' | 'collapsed' | 'expanded';
type SheetDragSource = 'pointer' | 'mouse' | 'touch';
type ProfileLookup = Record<string, PublicProfile>;
type InboxDisplayItemKind = 'comment' | 'reply' | 'system';
type InboxDisplayItem = {
  id: string;
  kind: InboxDisplayItemKind;
  title: string;
  body: string;
  meta: string;
  createdAt: string;
  isUnread: boolean;
};
type RecommendationReplyTarget = {
  recommendationId: string;
  recipientId: string;
  recipientName: string;
  placeName: string;
  summary: string;
};
type FileShareData = {
  files?: File[];
  title?: string;
  text?: string;
};
type NavigatorWithFileShare = Navigator & {
  canShare?: (data: FileShareData) => boolean;
  share?: (data: FileShareData) => Promise<void>;
};

interface FilterItem {
  id: MapFilterId;
  label: string;
  iconUrl?: string;
}

interface RecommendationEventBadge {
  id: string;
  title: string;
  posterUrl?: string;
}

interface FeedAssociationTagData {
  kind: 'event' | 'place';
  label: string;
}

type CmiV3FeedItem =
  | {
      id: string;
      type: 'recommendation';
      createdAt: string;
      recommendation: Recommendation;
    }
  | {
      id: string;
      type: 'forumPost';
      createdAt: string;
      post: BlackboardPostRecord;
    };

interface EventMarker extends MapMarker {
  eventId: string;
}

interface SheetAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

const mapFilters: FilterItem[] = [
  { id: 'all', label: '动态' },
  { id: 'food', label: '好吃', iconUrl: '/map-icons/cmi-flat-v2/direct-eat.png' },
  { id: 'play', label: '好玩', iconUrl: '/map-icons/cmi-flat-v2/direct-play.png' },
  { id: 'events', label: '活动', iconUrl: '/map-icons/cmi-flat-v2/home-events.png' },
  { id: 'easter', label: '彩蛋', iconUrl: '/map-icons/cmi-easter-v2/egg-v2-03-cat-face.png' },
];
const eventTabs: Array<{ id: EventTabId; label: string }> = [
  { id: 'ongoing', label: '正在发生' },
  { id: 'upcoming', label: '即将开始' },
  { id: 'ended', label: '刚结束' },
  { id: 'joined', label: '我参加的' },
];

const screenIds: ScreenId[] = ['map', 'feed', 'publish', 'events'];
const primaryScreenPositions: Record<PrimaryScreenId, number> = {
  map: 0,
  feed: 1,
  events: 2,
  publish: 3,
};
const CMI_MAP_DEFAULT_ZOOM = 14.5;
const SHEET_OPEN_THRESHOLD = -28;
const SHEET_CLOSE_THRESHOLD = 54;
const SHEET_MINIMIZE_THRESHOLD = 96;
const SHEET_DRAG_LIMIT = 160;
const SHEET_TAP_SLOP = 8;
const SHEET_FLING_VELOCITY = 0.42;
const USER_AVATAR_FALLBACK_COLORS = ['#f6c85f', '#f28c6b', '#70b7a7', '#6f9fd8', '#b58ad9', '#ef9eb3'];

const foodCategories = new Set<Category>(['吃饭', '咖啡', '市集']);
const playCategories = new Set<Category>(['户外', '景点', '购物', '运动', '酒吧', '身心']);

const downloadCmiEventShareCard = (card: { blob: Blob; fileName: string }) => {
  const downloadUrl = URL.createObjectURL(card.blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = card.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
};

interface ViewTransitionHandle {
  finished: Promise<void>;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => ViewTransitionHandle;
};

function resolveScreenId(value: string | null): ScreenId {
  return screenIds.find(screen => screen === value) ?? 'map';
}

function getPrimaryScreen(screen: ScreenId): PrimaryScreenId | null {
  if (screen === 'feed' || screen === 'map' || screen === 'events' || screen === 'publish') return screen;
  return null;
}

function getRecommendationTone(recommendation: Recommendation): FeedCardTone {
  const category = normalizeCategory(recommendation.category);
  if (category === '吃饭' || category === '咖啡') return 'yellow';
  if (category === '彩蛋') return 'pink';
  if (category === '户外' || category === '身心' || category === '运动') return 'green';
  return 'paper';
}

function getEventTone(event: CmiEvent): FeedCardTone {
  if (event.type === 'wellness' || event.type === 'meditation' || event.type === 'sport') return 'green';
  if (event.type === 'market') return 'pink';
  return 'paper';
}

function isEventOngoing(event: CmiEvent, referenceDate: Date) {
  const sortTime = getCmiEventSortTime(event, referenceDate);
  return (
    sortTime !== Number.MAX_SAFE_INTEGER &&
    sortTime <= referenceDate.getTime() &&
    (!event.endAt || new Date(event.endAt).getTime() >= referenceDate.getTime())
  );
}

function getEventStatusBadge(event: CmiEvent): { label: string; tone: EventStatusTone } {
  const referenceDate = new Date();

  if (isCmiEventExpired(event, referenceDate)) return { label: '已结束', tone: 'ended' };
  if (isEventOngoing(event, referenceDate)) return { label: '进行中', tone: 'open' };
  if (event.registrationEnabled && event.registrationStatus === 'closed') return { label: '名额已满', tone: 'full' };
  return { label: '未开始', tone: 'open' };
}

function compareUpcomingEvents(left: CmiEvent, right: CmiEvent, referenceDate: Date) {
  return getCmiEventSortTime(left, referenceDate) - getCmiEventSortTime(right, referenceDate);
}

function compareEndedEvents(left: CmiEvent, right: CmiEvent, referenceDate: Date) {
  return getCmiEventSortTime(right, referenceDate) - getCmiEventSortTime(left, referenceDate);
}

function compareCommunityEvents(left: CmiEvent, right: CmiEvent, referenceDate: Date) {
  const isLeftEnded = isCmiEventExpired(left, referenceDate);
  const isRightEnded = isCmiEventExpired(right, referenceDate);

  if (isLeftEnded !== isRightEnded) return isLeftEnded ? 1 : -1;
  return isLeftEnded
    ? compareEndedEvents(left, right, referenceDate)
    : compareUpcomingEvents(left, right, referenceDate);
}

function getProfileLookupKey(value: string | null | undefined) {
  return value?.normalize('NFKC').trim().toLowerCase() ?? '';
}

function addProfileLookupEntry(lookup: ProfileLookup, profile: PublicProfile) {
  [profile.id, profile.handle, profile.user_name].forEach(value => {
    const key = getProfileLookupKey(value);
    if (key) lookup[key] = profile;
  });
}

function getRecommendationAuthorProfile(recommendation: Recommendation, profiles: ProfileLookup) {
  return profiles[getProfileLookupKey(recommendation.user_id)]
    ?? profiles[getProfileLookupKey(recommendation.user_name)]
    ?? null;
}

function getUserInitial(name: string | null | undefined) {
  const normalizedName = name?.normalize('NFKC').trim();
  return normalizedName ? Array.from(normalizedName)[0].toUpperCase() : 'C';
}

function isCuratedCommunityEvent(event: CmiEvent) {
  return isCmiInnEvent(event) || isCmiMapCheckinActivityEvent(event);
}

function getCuratedCommunityEventLabel(event: CmiEvent) {
  return isCmiInnEvent(event) ? '清迈客栈' : '社区活动';
}

function formatTraceTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '刚刚';

  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;

  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });
}

function compareInboxItems(left: InboxDisplayItem, right: InboxDisplayItem) {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

function getInboxMessageTitle(message: CmiInboxMessageRecord) {
  const title = message.title.trim();
  if (title) return title;
  return message.kind === 'reply'
    ? `${message.sender_name} 回复了你的动态`
    : `${message.sender_name} 评论了你的动态`;
}

function getInboxMessageMeta(message: CmiInboxMessageRecord) {
  const sourceLabel = message.source_label.trim();
  const parts = [formatTraceTime(message.created_at)];
  if (sourceLabel) parts.push(sourceLabel);
  return parts.join(' · ');
}

function getRecommendationSummary(recommendation: Recommendation) {
  const reason = getRecommendationReasonText(recommendation).trim();
  return reason || '这个地点还缺一句现场感，等社区成员补上。';
}

function getRecommendationEventBadge(
  recommendation: Recommendation,
  events: CmiEvent[]
): RecommendationEventBadge | null {
  const linkedEvent = getRecommendationLinkedEvent(recommendation);
  if (!linkedEvent) return null;

  const event = events.find(item => item.id === linkedEvent.id);

  return {
    id: linkedEvent.id,
    title: event?.title ?? linkedEvent.title ?? '活动现场',
    posterUrl: event ? getCmiEventCardImageUrl(event) : undefined,
  };
}

function getRecommendationAssociationTag(
  recommendation: Recommendation,
  events: CmiEvent[]
): FeedAssociationTagData | null {
  const linkedEvent = getRecommendationEventBadge(recommendation, events);
  if (linkedEvent) {
    return {
      kind: 'event',
      label: linkedEvent.title,
    };
  }

  const placeName = getDisplayPlaceName(recommendation.place_name);
  if (!placeName) return null;
  return { kind: 'place', label: placeName };
}

function getBlackboardPostAuthorProfile(post: BlackboardPostRecord, profiles: ProfileLookup) {
  return profiles[getProfileLookupKey(post.author_id)]
    ?? profiles[getProfileLookupKey(post.author_name)]
    ?? null;
}

function getBlackboardPostImageUrl(post: BlackboardPostRecord, events: CmiEvent[]) {
  const uploadedImageUrl = post.image_urls?.find(Boolean);
  if (uploadedImageUrl) return uploadedImageUrl;

  const linkedEvent = post.linked_event_id
    ? events.find(event => event.id === post.linked_event_id)
    : null;
  return linkedEvent ? getCmiEventCardImageUrl(linkedEvent) : '';
}

function getBlackboardPostTargetPath(post: BlackboardPostRecord) {
  if (post.linked_event_id) return getCmiEventPath(post.linked_event_id);
  if (post.linked_place_name) return getPlacePath(post.linked_place_name);
  return '';
}

function getBlackboardAssociationTag(
  post: BlackboardPostRecord,
  events: CmiEvent[]
): FeedAssociationTagData | null {
  if (post.linked_event_id) {
    const linkedEvent = events.find(event => event.id === post.linked_event_id);
    return {
      kind: 'event',
      label: post.linked_event_title?.trim() || linkedEvent?.title || '活动现场',
    };
  }

  const placeName = getDisplayPlaceName(post.linked_place_name);
  if (!placeName) return null;
  return { kind: 'place', label: placeName };
}

function getFeedItemSortTime(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortCmiV3FeedItems(feedItems: CmiV3FeedItem[]) {
  return [...feedItems].sort((left, right) => getFeedItemSortTime(right.createdAt) - getFeedItemSortTime(left.createdAt));
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase('zh-CN');
}

function textMatchesSearch(query: string, values: Array<string | null | undefined>) {
  if (!query) return true;
  return values.some(value => normalizeSearchText(value ?? '').includes(query));
}

function recommendationMatchesFilter(recommendation: Recommendation, filterId: MapFilterId) {
  if (filterId === 'all') return true;
  const category = normalizeCategory(recommendation.category);
  if (filterId === 'food') return foodCategories.has(category);
  if (filterId === 'play') return playCategories.has(category);
  if (filterId === 'easter') return category === '彩蛋';
  return false;
}

function recommendationMatchesSearch(recommendation: Recommendation, query: string) {
  const category = normalizeCategory(recommendation.category);
  return textMatchesSearch(query, [
    recommendation.place_name,
    getRecommendationReasonText(recommendation),
    recommendation.user_name,
    category,
    recommendation.input_category_id,
    recommendation.primary_intent_id,
    ...(recommendation.place_type_ids ?? []),
    ...(recommendation.detail_tag_ids ?? []),
  ]);
}

function eventMatchesSearch(event: CmiEvent, query: string) {
  return textMatchesSearch(query, [
    event.title,
    event.summary,
    event.venueName,
    event.area,
    event.hostName,
    event.sourceLabel,
    event.type,
    event.language,
    ...(event.tags ?? []),
    ...(event.suitableFor ?? []),
  ]);
}

function isWishlistedByUser(recommendation: Recommendation, userId: string | null) {
  if (!userId) return false;
  return recommendation.wishlists?.some(wishlist => wishlist.user_id === userId) ?? false;
}

// NOTE: 默认地图只显示真实用户留下的分享，运营精选和历史底库继续留给搜索、专题和地点页承载。
function isUserSharedRecommendation(recommendation: Recommendation) {
  return Boolean(recommendation.user_id) && !isCommunityCuratedRecommendation(recommendation);
}

function clampRatio(value: number) {
  return Math.min(100, Math.max(0, value));
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getFallbackAvatarUrl(name: string) {
  const initial = getUserInitial(name);
  const colorIndex = Array.from(name || initial).reduce(
    (sum, character) => sum + (character.codePointAt(0) ?? 0),
    0
  ) % USER_AVATAR_FALLBACK_COLORS.length;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="48" fill="${USER_AVATAR_FALLBACK_COLORS[colorIndex]}"/>
      <text x="48" y="48" text-anchor="middle" dominant-baseline="central" alignment-baseline="middle" font-family="Arial, sans-serif" font-size="38" font-weight="800" fill="#2f2a23">${escapeSvgText(initial)}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getAuthorAvatarUrl(recommendation: Recommendation, profiles: ProfileLookup) {
  const profile = getRecommendationAuthorProfile(recommendation, profiles);
  const authorName = recommendation.user_name || profile?.user_name || 'CMI 朋友';
  return profile?.avatar_url?.trim() || getFallbackAvatarUrl(authorName);
}

function getUserShareMarker(recommendation: Recommendation, profiles: ProfileLookup): MapMarker {
  const authorProfile = getRecommendationAuthorProfile(recommendation, profiles);
  const authorName = recommendation.user_name || authorProfile?.user_name || 'CMI 朋友';

  return {
    id: `share:${recommendation.id}`,
    place_name: recommendation.place_name,
    category: recommendation.category,
    latitude: recommendation.latitude,
    longitude: recommendation.longitude,
    recommendations: [recommendation],
    visualOverride: {
      label: authorName,
      iconUrl: getAuthorAvatarUrl(recommendation, profiles),
      isAvatar: true,
    },
  };
}

function getUserShareMarkers(recommendations: Recommendation[], profiles: ProfileLookup): MapMarker[] {
  return recommendations.map(recommendation => getUserShareMarker(recommendation, profiles));
}

function getEventMarkers(events: CmiEvent[]): EventMarker[] {
  return events.flatMap(event => {
    if (!event.mapLocation) return [];

    return [{
      id: `event:${event.id}`,
      eventId: event.id,
      place_name: event.venueName,
      category: event.mapLocation.category,
      latitude: event.mapLocation.latitude,
      longitude: event.mapLocation.longitude,
      recommendations: [],
      visualOverride: {
        label: '活动',
        iconUrl: getCmiEventCardImageUrl(event),
        isPoster: true,
      },
    }];
  });
}

function isEventMarker(marker: MapMarker): marker is EventMarker {
  return marker.id.startsWith('event:') && 'eventId' in marker;
}

function supportsPointerEvents() {
  return typeof window !== 'undefined' && 'PointerEvent' in window;
}

function getAdjacentSheetSnap(current: SheetSnap, direction: 'up' | 'down') {
  if (direction === 'up') {
    if (current === 'minimized') return 'collapsed';
    return 'expanded';
  }

  if (current === 'expanded') return 'collapsed';
  return 'minimized';
}

function useBottomSheetDrag(itemId: string) {
  const [snap, setSnap] = useState<SheetSnap>('collapsed');
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    lastTime: number;
    lastY: number;
    snap: SheetSnap;
    source: SheetDragSource;
    velocityY: number;
    y: number;
  } | null>(null);
  const pendingDragOffsetRef = useRef(0);
  const dragFrameRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    setSnap('collapsed');
    setDragOffset(0);
    setIsDragging(false);
    dragStartRef.current = null;
    pendingDragOffsetRef.current = 0;
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
  }, [itemId]);

  useEffect(() => () => {
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
    }
  }, []);

  const isInteractiveTarget = (target: EventTarget) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('button, a'));
  };

  const flushDragOffset = useCallback(() => {
    dragFrameRef.current = null;
    setDragOffset(pendingDragOffsetRef.current);
  }, []);

  const updateDrag = useCallback((clientY: number) => {
    const dragStart = dragStartRef.current;
    if (!dragStart) return;

    const now = performance.now();
    const elapsed = Math.max(16, now - dragStart.lastTime);
    dragStart.velocityY = (clientY - dragStart.lastY) / elapsed;
    dragStart.lastY = clientY;
    dragStart.lastTime = now;

    const deltaY = clientY - dragStart.y;
    pendingDragOffsetRef.current = Math.max(-SHEET_DRAG_LIMIT, Math.min(SHEET_DRAG_LIMIT, deltaY));
    if (dragFrameRef.current === null) {
      dragFrameRef.current = window.requestAnimationFrame(flushDragOffset);
    }
  }, [flushDragOffset]);

  const settleDrag = useCallback((clientY: number) => {
    const dragStart = dragStartRef.current;
    if (!dragStart) return;

    const deltaY = clientY - dragStart.y;
    const velocityY = dragStart.velocityY;
    if (Math.abs(deltaY) > SHEET_TAP_SLOP) {
      suppressNextClickRef.current = true;
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 250);
    }

    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }

    setSnap(current => {
      if (velocityY <= -SHEET_FLING_VELOCITY || deltaY <= SHEET_OPEN_THRESHOLD) {
        return getAdjacentSheetSnap(dragStart.snap, 'up');
      }
      if (
        velocityY >= SHEET_FLING_VELOCITY ||
        deltaY >= (dragStart.snap === 'expanded' ? SHEET_CLOSE_THRESHOLD : SHEET_MINIMIZE_THRESHOLD)
      ) {
        return getAdjacentSheetSnap(dragStart.snap, 'down');
      }
      return current;
    });
    pendingDragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const startDrag = useCallback((clientY: number, source: SheetDragSource) => {
    if (dragStartRef.current) return;

    dragStartRef.current = {
      lastTime: performance.now(),
      lastY: clientY,
      snap,
      source,
      velocityY: 0,
      y: clientY,
    };
    setIsDragging(true);
    setDragOffset(0);
  }, [snap]);

  useEffect(() => {
    if (!isDragging) return;

    const resetDrag = () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
      pendingDragOffsetRef.current = 0;
      setDragOffset(0);
      setIsDragging(false);
      dragStartRef.current = null;
    };

    const handleWindowPointerMove = (event: PointerEvent) => {
      if (dragStartRef.current?.source !== 'pointer') return;
      event.preventDefault();
      updateDrag(event.clientY);
    };

    const handleWindowPointerUp = (event: PointerEvent) => {
      if (dragStartRef.current?.source !== 'pointer') return;
      settleDrag(event.clientY);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (dragStartRef.current?.source !== 'mouse') return;
      updateDrag(event.clientY);
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (dragStartRef.current?.source !== 'mouse') return;
      settleDrag(event.clientY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (dragStartRef.current?.source !== 'touch') return;
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      updateDrag(touch.clientY);
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (dragStartRef.current?.source !== 'touch') return;
      const touch = event.changedTouches[0];
      settleDrag(touch?.clientY ?? dragStartRef.current.y);
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', resetDrag);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', resetDrag);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', resetDrag);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', resetDrag);
    };
  }, [isDragging, settleDrag, updateDrag]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;

    event.preventDefault();
    startDrag(event.clientY, 'pointer');
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragStartRef.current?.source !== 'pointer') return;
    event.preventDefault();
    updateDrag(event.clientY);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragStartRef.current?.source !== 'pointer') return;

    settleDrag(event.clientY);
  };

  const handlePointerCancel = () => {
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    pendingDragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;
    startDrag(event.clientY, 'mouse');
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
    if (supportsPointerEvents()) return;
    if (isInteractiveTarget(event.target)) return;
    const touch = event.touches[0];
    if (!touch) return;
    startDrag(touch.clientY, 'touch');
  };

  const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (isInteractiveTarget(event.target)) return;

    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      event.preventDefault();
      return;
    }

    setSnap(current => {
      if (current === 'expanded') return 'collapsed';
      if (current === 'minimized') return 'collapsed';
      return 'expanded';
    });
  };

  return {
    dragHandlers: {
      onClick: handleClick,
      onMouseDown: handleMouseDown,
      onPointerCancel: handlePointerCancel,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onTouchStart: handleTouchStart,
    },
    dragOffset,
    isDragging,
    setSnap,
    snap,
  };
}

export default function CmiMapV3Prototype() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeScreen, setActiveScreen] = useState<ScreenId>(() => resolveScreenId(searchParams.get('screen')));
  const [activeFilter, setActiveFilter] = useState<MapFilterId>('all');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [locationRequestKey, setLocationRequestKey] = useState(0);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [blackboardPosts, setBlackboardPosts] = useState<BlackboardPostRecord[]>([]);
  const [blackboardAnnouncements, setBlackboardAnnouncements] = useState<BlackboardAnnouncementRecord[]>([]);
  const [inboxMessages, setInboxMessages] = useState<CmiInboxMessageRecord[]>([]);
  const [profilesByAuthorKey, setProfilesByAuthorKey] = useState<ProfileLookup>({});
  const [events, setEvents] = useState<CmiEvent[]>(CMI_EVENTS);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => searchParams.get('event'));
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [isLoadingBlackboardPosts, setIsLoadingBlackboardPosts] = useState(true);
  const [isLoadingInboxMessages, setIsLoadingInboxMessages] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [blackboardPostsError, setBlackboardPostsError] = useState<string | null>(null);
  const [localWishlists, setLocalWishlists] = useState<WishlistStateMap>({});
  const [availableStickers, setAvailableStickers] = useState<Sticker[]>([]);
  const [placedStickers, setPlacedStickers] = useState<PlacedStickerMap>({});
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [activeRecIdForSticker, setActiveRecIdForSticker] = useState<string | null>(null);
  const [showStickerDrawer, setShowStickerDrawer] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<RecommendationReplyTarget | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplySubmitting, setIsReplySubmitting] = useState(false);

  const handleNavigate = (screen: ScreenId, input?: { eventId?: string | null }) => {
    const currentPrimaryScreen = getPrimaryScreen(activeScreen);
    const nextPrimaryScreen = getPrimaryScreen(screen);
    const direction =
      currentPrimaryScreen && nextPrimaryScreen && currentPrimaryScreen !== nextPrimaryScreen
        ? primaryScreenPositions[nextPrimaryScreen] < primaryScreenPositions[currentPrimaryScreen]
          ? 'from-left'
          : 'from-right'
        : null;

    const applyNavigation = () => {
      setActiveScreen(screen);
      if (input?.eventId) {
        setSelectedEventId(input.eventId);
        if (screen === 'map') setSelectedMarker(null);
      } else {
        setSelectedEventId(null);
      }

      const nextParams = new URLSearchParams();
      if (screen !== 'map') nextParams.set('screen', screen);
      if (input?.eventId) nextParams.set('event', input.eventId);
      setSearchParams(nextParams, { replace: true });
    };

    const viewTransitionDocument = document as ViewTransitionDocument;
    if (direction && viewTransitionDocument.startViewTransition) {
      document.documentElement.dataset.cmiV3ScreenDirection = direction;
      const transition = viewTransitionDocument.startViewTransition(() => {
        flushSync(applyNavigation);
      });
      transition.finished.finally(() => {
        delete document.documentElement.dataset.cmiV3ScreenDirection;
      });
      return;
    }

    applyNavigation();
  };

  useEffect(() => {
    setIsLoadingRecommendations(true);
    getAllRecommendations({ throwOnError: true })
      .then(data => {
        const publicRecommendations = data.filter(isPublicMapRecommendation);
        setRecommendations(publicRecommendations);
        setPlacedStickers(getRecommendationStickerPlacements(publicRecommendations));
        setSelectedMarker(current => {
          if (!current) return null;
          const stillExists = publicRecommendations.some(recommendation =>
            current.recommendations.some(item => item.id === recommendation.id)
          );
          return stillExists ? current : null;
        });
      })
      .catch(error => {
        console.error('CMI Map 3.0 推荐数据加载失败:', error);
        setRecommendations([]);
        setRecommendationsError('地点动态暂时没连上');
      })
      .finally(() => {
        setIsLoadingRecommendations(false);
      });
  }, []);

  useEffect(() => {
    let isActive = true;
    setIsLoadingBlackboardPosts(true);
    setBlackboardPostsError(null);

    getBlackboardPosts()
      .then(data => {
        if (!isActive) return;
        setBlackboardPosts(data);
      })
      .catch(error => {
        console.warn('CMI Map 3.0 动态帖子加载失败:', error);
        if (!isActive) return;
        setBlackboardPosts([]);
        setBlackboardPostsError('帖子动态暂时没连上');
      })
      .finally(() => {
        if (isActive) setIsLoadingBlackboardPosts(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    getBlackboardAnnouncements()
      .then(data => {
        if (isActive) setBlackboardAnnouncements(data);
      })
      .catch(error => {
        console.warn('CMI Map 3.0 系统消息加载失败:', error);
        if (isActive) setBlackboardAnnouncements([]);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const refreshInboxMessages = useCallback(async () => {
    if (!user?.id) {
      setInboxMessages([]);
      setIsLoadingInboxMessages(false);
      return;
    }

    setIsLoadingInboxMessages(true);
    try {
      setInboxMessages(await getCmiInboxMessages(user.id));
    } finally {
      setIsLoadingInboxMessages(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshInboxMessages();
  }, [refreshInboxMessages]);

  useEffect(() => {
    let isActive = true;
    const userIds = [
      ...recommendations.map(recommendation => recommendation.user_id),
      ...blackboardPosts.map(post => post.author_id),
    ];
    const userNames = [
      ...recommendations.map(recommendation => recommendation.user_name),
      ...blackboardPosts.map(post => post.author_name),
    ]
      .filter(name => Boolean(getProfileLookupKey(name)));
    const hasLookupInput = userIds.some(Boolean) || userNames.length > 0;

    if (!hasLookupInput) {
      setProfilesByAuthorKey({});
      return () => {
        isActive = false;
      };
    }

    Promise.all([
      getProfilesByUserIds(userIds),
      getProfilesByUserNames(userNames),
    ])
      .then(([profilesById, profilesByName]) => {
        if (!isActive) return;

        const nextLookup: ProfileLookup = {};
        [...profilesById, ...profilesByName].forEach(profile => {
          addProfileLookupEntry(nextLookup, profile);
        });
        setProfilesByAuthorKey(nextLookup);
      })
      .catch(error => {
        console.error('CMI Map 3.0 用户头像加载失败:', error);
        if (isActive) setProfilesByAuthorKey({});
      });

    return () => {
      isActive = false;
    };
  }, [blackboardPosts, recommendations]);

  useEffect(() => {
    const nextWishlists: WishlistStateMap = {};
    recommendations.forEach(recommendation => {
      nextWishlists[recommendation.id] = isWishlistedByUser(recommendation, user?.id ?? null);
    });
    setLocalWishlists(nextWishlists);
  }, [recommendations, user?.id]);

  useEffect(() => {
    setIsLoadingEvents(true);
    getPublishedCmiEvents()
      .then(data => {
        setEvents(data);
      })
      .catch(error => {
        console.error('CMI Map 3.0 活动数据加载失败:', error);
        setEvents(CMI_EVENTS);
      })
      .finally(() => {
        setIsLoadingEvents(false);
      });
  }, []);

  const userSharedRecommendations = useMemo(
    () => recommendations.filter(isUserSharedRecommendation),
    [recommendations]
  );

  const normalizedMapSearchQuery = useMemo(
    () => normalizeSearchText(mapSearchQuery),
    [mapSearchQuery]
  );

  const filteredMapRecommendations = useMemo(
    () => userSharedRecommendations.filter(recommendation => {
      if (normalizedMapSearchQuery) return recommendationMatchesSearch(recommendation, normalizedMapSearchQuery);
      return recommendationMatchesFilter(recommendation, activeFilter);
    }),
    [activeFilter, normalizedMapSearchQuery, userSharedRecommendations]
  );

  const communityEvents = useMemo(
    () => {
      const referenceDate = new Date();
      return events
        .filter(isCuratedCommunityEvent)
        .sort((left, right) => compareCommunityEvents(left, right, referenceDate));
    },
    [events]
  );

  const upcomingCommunityEvents = useMemo(
    () => {
      const referenceDate = new Date();
      return communityEvents.filter(event => !isCmiEventExpired(event, referenceDate));
    },
    [communityEvents]
  );

  const visibleEvents = useMemo(
    () => {
      if (normalizedMapSearchQuery) {
        return upcomingCommunityEvents
          .filter(event => eventMatchesSearch(event, normalizedMapSearchQuery))
          .slice(0, 12);
      }
      if (activeFilter !== 'events') return [];
      return upcomingCommunityEvents.slice(0, 12);
    },
    [activeFilter, normalizedMapSearchQuery, upcomingCommunityEvents]
  );

  const mapMarkers = useMemo(
    () => [
      ...getUserShareMarkers(filteredMapRecommendations, profilesByAuthorKey),
      ...getEventMarkers(visibleEvents),
    ],
    [filteredMapRecommendations, profilesByAuthorKey, visibleEvents]
  );

  const feedRecommendations = useMemo(
    () => recommendations.slice(0, 12),
    [recommendations]
  );

  const stickerSourceRecommendations = useMemo(
    () => {
      const recommendationsById = new Map<string, Recommendation>();
      [...feedRecommendations, ...filteredMapRecommendations].forEach(recommendation => {
        recommendationsById.set(recommendation.id, recommendation);
      });
      return Array.from(recommendationsById.values());
    },
    [feedRecommendations, filteredMapRecommendations]
  );

  useEffect(() => {
    let isActive = true;
    if (stickerSourceRecommendations.length === 0) {
      return () => {
        isActive = false;
      };
    }

    loadRecommendationStickerPlacements(stickerSourceRecommendations)
      .then(nextPlacedStickers => {
        if (isActive) {
          setPlacedStickers(current => mergeStickerPlacementMaps(current, nextPlacedStickers));
        }
      })
      .catch(error => {
        console.error('CMI Map 3.0 盖戳数据加载失败:', error);
      });

    return () => {
      isActive = false;
    };
  }, [stickerSourceRecommendations]);

  useEffect(() => {
    if (!showStickerDrawer || availableStickers.length > 0) return;

    let isActive = true;
    loadAvailableStickers()
      .then(stickers => {
        if (isActive) setAvailableStickers(stickers);
      })
      .catch(error => {
        console.error('CMI Map 3.0 图章库加载失败:', error);
        if (isActive) setAvailableStickers([]);
      });

    return () => {
      isActive = false;
    };
  }, [availableStickers.length, showStickerDrawer]);

  const selectedEvent = useMemo(
    () => communityEvents.find(event => event.id === selectedEventId) ?? communityEvents[0] ?? null,
    [communityEvents, selectedEventId]
  );
  const primaryActivityEvent = useMemo(
    () => upcomingCommunityEvents.find(event => event.id === CMI_MAP_WILD_CHIANG_MAI_EVENT_ID) ?? null,
    [upcomingCommunityEvents]
  );
  const inboxItems = useMemo<InboxDisplayItem[]>(
    () => [
      ...inboxMessages.map(message => ({
        id: `message:${message.id}`,
        kind: message.kind,
        title: getInboxMessageTitle(message),
        body: message.body,
        meta: getInboxMessageMeta(message),
        createdAt: message.created_at,
        isUnread: !message.read_at,
      })),
      ...blackboardAnnouncements.map(announcement => ({
        id: `system:${announcement.id}`,
        kind: 'system' as const,
        title: announcement.title,
        body: announcement.body,
        meta: `系统消息 · ${formatTraceTime(announcement.created_at)}`,
        createdAt: announcement.created_at,
        isUnread: false,
      })),
    ].sort(compareInboxItems),
    [blackboardAnnouncements, inboxMessages]
  );
  const hasUnreadInboxMessages = useMemo(
    () => inboxMessages.some(message => !message.read_at),
    [inboxMessages]
  );

  const getCurrentV3Path = useCallback(() => {
    const queryString = searchParams.toString();
    return `/v3${queryString ? `?${queryString}` : ''}`;
  }, [searchParams]);

  const requireLoggedInUser = useCallback((actionLabel: string) => {
    if (user) return true;

    toast(`登录后才能${actionLabel}`, { description: '注册只需要一个邮箱' });
    navigate('/login', { state: { from: getCurrentV3Path() } });
    return false;
  }, [getCurrentV3Path, navigate, user]);

  const handleOpenInbox = useCallback(() => {
    if (!requireLoggedInUser('查看收件箱') || !user?.id) return;

    setIsInboxOpen(true);
    if (!hasUnreadInboxMessages) return;

    const readAt = new Date().toISOString();
    setInboxMessages(currentMessages =>
      currentMessages.map(message => message.read_at ? message : { ...message, read_at: readAt })
    );

    markCmiInboxMessagesRead(user.id, readAt)
      .catch(() => {
        void refreshInboxMessages();
      });
  }, [hasUnreadInboxMessages, refreshInboxMessages, requireLoggedInUser, user?.id]);

  const handleOpenRecommendationReply = useCallback((recommendation: Recommendation) => {
    if (!requireLoggedInUser('回复') || !user) return;

    if (!recommendation.user_id) {
      toast.error('这条动态暂时不能回复');
      return;
    }

    if (recommendation.user_id === user.id) {
      toast('这是你自己的动态');
      return;
    }

    const authorProfile = getRecommendationAuthorProfile(recommendation, profilesByAuthorKey);
    const authorName = recommendation.user_name || authorProfile?.user_name || 'CMI 朋友';
    setReplyTarget({
      recommendationId: recommendation.id,
      recipientId: recommendation.user_id,
      recipientName: authorName,
      placeName: getDisplayPlaceName(recommendation.place_name) || recommendation.place_name,
      summary: getRecommendationSummary(recommendation),
    });
    setReplyText('');
  }, [profilesByAuthorKey, requireLoggedInUser, user]);

  const handleSubmitRecommendationReply = useCallback(async () => {
    if (!user || !replyTarget) return;

    const body = replyText.trim();
    if (!body) return;

    const senderName = profile?.user_name?.trim() || user.email?.split('@')[0] || 'CMI 朋友';
    setIsReplySubmitting(true);

    try {
      await createCmiInboxMessage({
        recipientId: replyTarget.recipientId,
        senderId: user.id,
        senderName,
        kind: 'comment',
        title: `${senderName} 评论了你的动态`,
        body,
        sourceType: 'recommendation',
        sourceId: replyTarget.recommendationId,
        sourceLabel: replyTarget.placeName,
      });
      toast.success('已发到对方收件箱');
      setReplyTarget(null);
      setReplyText('');
    } catch (error) {
      console.error('CMI Map 3.0 回复发送失败:', error);
      toast.error('发送失败，请稍后再试');
    } finally {
      setIsReplySubmitting(false);
    }
  }, [profile?.user_name, replyTarget, replyText, user]);

  const handleStartStamp = useCallback((recommendationId: string) => {
    if (!requireLoggedInUser('盖戳')) return;

    setActiveRecIdForSticker(recommendationId);
    setShowStickerDrawer(true);
  }, [requireLoggedInUser]);

  const handleToggleWishlist = useCallback(async (recommendation: Recommendation) => {
    if (!requireLoggedInUser('收藏') || !user) return;

    let previousValue = false;
    setLocalWishlists(current => {
      previousValue = current[recommendation.id] ?? isWishlistedByUser(recommendation, user.id);
      return applyWishlistState(current, recommendation.id, !previousValue);
    });

    try {
      const nextValue = await toggleRecommendationWishlist(recommendation.id, user.id);
      setLocalWishlists(current => applyWishlistState(current, recommendation.id, nextValue));
      toast.success(nextValue ? '已收藏' : '已取消收藏');
    } catch (error) {
      console.error('CMI Map 3.0 收藏失败:', error);
      setLocalWishlists(current => applyWishlistState(current, recommendation.id, previousValue));
      toast.error('收藏失败，请稍后再试');
    }
  }, [requireLoggedInUser, user]);

  const handleMapSearchChange = useCallback((query: string) => {
    setMapSearchQuery(query);
    setSelectedMarker(null);
    setSelectedEventId(null);
  }, []);

  const handleMapRecommendationSelect = useCallback((recommendation: Recommendation) => {
    navigate(getPlacePath(recommendation.place_name));
  }, [navigate]);

  const handleBottomAdd = useCallback((screen: PrimaryScreenId) => {
    if (screen === 'events') {
      navigate(getMarkPlacePath({ eventId: CMI_MAP_WILD_CHIANG_MAI_EVENT_ID }));
      return;
    }

    navigate(getMarkPlacePath({ eventId: CMI_MAP_WILD_CHIANG_MAI_EVENT_ID }));
  }, [navigate]);

  const handleRecommendationCardClick = useCallback(async (
    event: ReactMouseEvent<HTMLElement>,
    recommendationId: string
  ) => {
    if (!activeStickerId || activeRecIdForSticker !== recommendationId || !user) return;

    const selectedStickerId = activeStickerId;
    const sticker = availableStickers.find(item => item.id === selectedStickerId);
    if (!sticker) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const xRatio = clampRatio(((event.clientX - rect.left) / rect.width) * 100);
    const yRatio = clampRatio(((event.clientY - rect.top) / rect.height) * 100);
    const rotation = Math.random() * 40 - 20;
    const optimisticPlacement = createOptimisticStickerPlacement({
      id: `preview-${recommendationId}-${Date.now()}`,
      recommendationId,
      userId: user.id,
      sticker,
      xRatio,
      yRatio,
      rotation,
      createdAt: new Date().toISOString(),
    });

    setPlacedStickers(current => appendStickerPlacement(current, recommendationId, optimisticPlacement));
    setActiveStickerId(null);
    setActiveRecIdForSticker(null);

    try {
      const savedPlacement = await placeRecommendationSticker({
        recommendation_id: recommendationId,
        user_id: user.id,
        sticker_id: selectedStickerId,
        x_ratio: xRatio,
        y_ratio: yRatio,
        rotation,
      });

      if (!savedPlacement) throw new Error('盖戳没有保存到数据库');

      setPlacedStickers(current =>
        replaceStickerPlacement(current, recommendationId, optimisticPlacement.id, savedPlacement)
      );
    } catch (error) {
      console.error('CMI Map 3.0 盖戳保存失败:', error);
      setPlacedStickers(current => removeStickerPlacement(current, recommendationId, optimisticPlacement.id));
      toast.error('盖戳没有保存成功，请稍后再试');
    }
  }, [activeRecIdForSticker, activeStickerId, availableStickers, user]);

  const activePrimaryScreen = getPrimaryScreen(activeScreen);
  const profileName = profile?.user_name || user?.email?.split('@')[0] || '游客';
  const profileAvatarUrl = profile?.avatar_url?.trim() || getFallbackAvatarUrl(profileName);

  return (
    <div className={`cmi-v3-screen cmi-v3-screen--${activeScreen}`}>
      <div className="cmi-v3-main-view" data-active-screen={activeScreen}>
        {activeScreen === 'map' && (
          <MapMode
            activeFilter={activeFilter}
            filters={mapFilters}
            isLoading={isLoadingRecommendations || isLoadingEvents}
            markers={mapMarkers}
            recommendationsError={recommendationsError}
            searchQuery={mapSearchQuery}
            profileAvatarUrl={profileAvatarUrl}
            profileName={profileName}
            listEvents={normalizedMapSearchQuery ? visibleEvents : upcomingCommunityEvents}
            listRecommendations={filteredMapRecommendations}
            localWishlists={localWishlists}
            placedStickers={placedStickers}
            activeRecIdForSticker={activeRecIdForSticker}
            activeStickerId={activeStickerId}
            profilesByAuthorKey={profilesByAuthorKey}
            locationRequestKey={locationRequestKey}
            selectedMarker={selectedMarker}
            selectedEvent={selectedEventId ? selectedEvent : null}
            primaryActivityEvent={primaryActivityEvent}
            hasUnreadInboxMessages={hasUnreadInboxMessages}
            onClearSelection={() => {
              setSelectedMarker(null);
              setSelectedEventId(null);
            }}
            onFilterChange={setActiveFilter}
            onLocateUser={() => setLocationRequestKey(current => current + 1)}
            onOpenInbox={handleOpenInbox}
            onOpenProfile={() => navigate(getProfilePath())}
            onSearchChange={handleMapSearchChange}
            onRecommendationSelect={handleMapRecommendationSelect}
            onReplyToRecommendation={handleOpenRecommendationReply}
            onPlaceStamp={handleRecommendationCardClick}
            onStartStamp={handleStartStamp}
            onToggleWishlist={handleToggleWishlist}
            onMarkerSelect={(marker) => {
              if (isEventMarker(marker)) {
                const event = events.find(item => item.id === marker.eventId);
                setSelectedEventId(event?.id ?? marker.eventId);
                setSelectedMarker(null);
                return;
              }

              const recommendation = marker.recommendations[0];
              if (recommendation) {
                navigate(getPlacePath(recommendation.place_name));
                return;
              }

              setSelectedMarker(marker);
              setSelectedEventId(null);
            }}
            onNavigate={handleNavigate}
            onOpenPath={navigate}
          />
        )}
        {activeScreen === 'feed' && (
          <FeedMode
            blackboardPosts={blackboardPosts}
            blackboardPostsError={blackboardPostsError}
            events={communityEvents}
            isLoading={isLoadingRecommendations || isLoadingBlackboardPosts}
            localWishlists={localWishlists}
            placedStickers={placedStickers}
            activeRecIdForSticker={activeRecIdForSticker}
            activeStickerId={activeStickerId}
            profilesByAuthorKey={profilesByAuthorKey}
            recommendations={feedRecommendations}
            onNavigate={handleNavigate}
            onPlaceStamp={handleRecommendationCardClick}
            onOpenPath={navigate}
            onReplyToRecommendation={handleOpenRecommendationReply}
            onStartStamp={handleStartStamp}
            onToggleWishlist={handleToggleWishlist}
          />
        )}
        {activeScreen === 'publish' && (
          <PublishMode
            selectedMarker={selectedMarker}
            onNavigate={handleNavigate}
            onOpenPath={navigate}
          />
        )}
        {activeScreen === 'events' && (
          <EventsMode
            events={communityEvents}
            isLoading={isLoadingEvents}
            onNavigate={handleNavigate}
            onOpenPath={navigate}
          />
        )}
      </div>
      {activePrimaryScreen && (
        <CmiV3BottomNav
          activeScreen={activePrimaryScreen}
          onAdd={() => handleBottomAdd(activePrimaryScreen)}
          onNavigate={handleNavigate}
        />
      )}
      {isInboxOpen && (
        <CmiInboxSheet
          items={inboxItems}
          isLoading={isLoadingInboxMessages}
          onClose={() => setIsInboxOpen(false)}
        />
      )}
      {replyTarget && (
        <RecommendationReplySheet
          target={replyTarget}
          value={replyText}
          submitting={isReplySubmitting}
          onChange={setReplyText}
          onClose={() => {
            if (isReplySubmitting) return;
            setReplyTarget(null);
            setReplyText('');
          }}
          onSubmit={handleSubmitRecommendationReply}
        />
      )}
      <StickerDrawer
        availableStickers={availableStickers}
        isOpen={showStickerDrawer}
        onClose={() => {
          setShowStickerDrawer(false);
          setActiveRecIdForSticker(null);
        }}
        onSelectSticker={(stickerId) => {
          setActiveStickerId(stickerId);
          setShowStickerDrawer(false);
          toast.success('图章已沾墨水', { description: '现在点击动态卡片，把它盖上去。', duration: 4000 });
        }}
      />
    </div>
  );
}

function MapMode({
  activeFilter,
  filters,
  locationRequestKey,
  markers,
  listEvents,
  listRecommendations,
  selectedMarker,
  selectedEvent,
  primaryActivityEvent,
  isLoading,
  localWishlists,
  placedStickers,
  activeRecIdForSticker,
  activeStickerId,
  profilesByAuthorKey,
  recommendationsError,
  searchQuery,
  profileAvatarUrl,
  profileName,
  hasUnreadInboxMessages,
  onClearSelection,
  onFilterChange,
  onLocateUser,
  onMarkerSelect,
  onNavigate,
  onOpenInbox,
  onOpenPath,
  onOpenProfile,
  onSearchChange,
  onRecommendationSelect,
  onReplyToRecommendation,
  onPlaceStamp,
  onStartStamp,
  onToggleWishlist,
}: {
  activeFilter: MapFilterId;
  filters: FilterItem[];
  locationRequestKey: number;
  markers: MapMarker[];
  listEvents: CmiEvent[];
  listRecommendations: Recommendation[];
  selectedMarker: MapMarker | null;
  selectedEvent: CmiEvent | null;
  primaryActivityEvent: CmiEvent | null;
  isLoading: boolean;
  localWishlists: WishlistStateMap;
  placedStickers: PlacedStickerMap;
  activeRecIdForSticker: string | null;
  activeStickerId: string | null;
  profilesByAuthorKey: ProfileLookup;
  recommendationsError: string | null;
  searchQuery: string;
  profileAvatarUrl: string;
  profileName: string;
  hasUnreadInboxMessages: boolean;
  onClearSelection: () => void;
  onFilterChange: (filterId: MapFilterId) => void;
  onLocateUser: () => void;
  onMarkerSelect: (marker: MapMarker) => void;
  onNavigate: (screen: ScreenId, input?: { eventId?: string | null }) => void;
  onOpenInbox: () => void;
  onOpenPath: (path: string) => void;
  onOpenProfile: () => void;
  onSearchChange: (query: string) => void;
  onRecommendationSelect: (recommendation: Recommendation) => void;
  onReplyToRecommendation: (recommendation: Recommendation) => void;
  onPlaceStamp: (event: ReactMouseEvent<HTMLElement>, recommendationId: string) => void;
  onStartStamp: (recommendationId: string) => void;
  onToggleWishlist: (recommendation: Recommendation) => void;
}) {
  const selectedRecommendation = selectedMarker?.recommendations[0] ?? null;
  const selectedRecommendationAuthorProfile = selectedRecommendation
    ? getRecommendationAuthorProfile(selectedRecommendation, profilesByAuthorKey)
    : null;
  const handleRecommendationSelect = (recommendation: Recommendation) => {
    const matchedMarker = markers.find(marker =>
      marker.recommendations.some(item => item.id === recommendation.id)
    );
    if (matchedMarker) {
      onMarkerSelect(matchedMarker);
      return;
    }

    onRecommendationSelect(recommendation);
  };

  return (
    <section className="cmi-v3-map-mode" aria-label="CMI Map 3.0 地图形态页">
      <LeafletMap
        key={`map-location-${locationRequestKey}`}
        markers={markers}
        onMarkerClick={onMarkerSelect}
        defaultZoom={CMI_MAP_DEFAULT_ZOOM}
        focusUserLocation
        locationZoom={16}
        constrainToChiangMai
        className="cmi-v3-live-map"
      />

      <header className="cmi-v3-map-topbar">
        <form
          className={`cmi-v3-map-search ${searchQuery.trim() ? 'has-value' : ''}`}
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <Search size={16} strokeWidth={3} />
          <input
            aria-label="搜索动态、地点和活动"
            enterKeyHint="search"
            placeholder="搜动态 / 地点"
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {searchQuery.trim() && (
            <button
              type="button"
              className="cmi-v3-map-search-clear"
              aria-label="清空搜索"
              onClick={() => onSearchChange('')}
            >
              <X size={15} strokeWidth={3} />
            </button>
          )}
        </form>
        <button type="button" className="cmi-v3-round-button" onClick={() => onNavigate('feed')} aria-label="打开信息流">
          <List size={20} strokeWidth={3} />
        </button>
      </header>

      <div className="cmi-v3-map-filters" aria-label="地图筛选">
        {filters.map(filter => (
          <button
            key={filter.id}
            type="button"
            className={`cmi-v3-map-filter ${activeFilter === filter.id ? 'is-active' : ''}`}
            onClick={() => onFilterChange(filter.id)}
          >
            {filter.iconUrl && <img src={filter.iconUrl} alt="" />}
            <span>{filter.label}</span>
          </button>
        ))}
      </div>

      {primaryActivityEvent && (
        <button
          type="button"
          className="cmi-v3-map-activity-entry"
          onClick={() => onOpenPath(getCmiEventPath(primaryActivityEvent.id))}
          aria-label={`打开${primaryActivityEvent.title}活动说明`}
        >
          <img src="/map-icons/cmi-flat-v2/wild-chiang-mai-activity-entry.png" alt="" />
        </button>
      )}

      <div className="cmi-v3-map-layer-control" aria-label="消息收件箱">
        <button
          type="button"
          className={`cmi-v3-map-inbox-button ${hasUnreadInboxMessages ? 'has-unread' : ''}`}
          onClick={onOpenInbox}
          aria-label={hasUnreadInboxMessages ? '打开消息收件箱，有新消息' : '打开消息收件箱'}
        >
          <Megaphone size={22} strokeWidth={2.8} />
        </button>
      </div>

      <div className="cmi-v3-map-quick-controls" aria-label="地图快捷操作">
        <button
          type="button"
          className="cmi-v3-map-side-button cmi-v3-map-side-button--locate"
          onClick={onLocateUser}
          aria-label="定位到自己"
        >
          <Navigation size={23} strokeWidth={3} />
        </button>
        <button
          type="button"
          className="cmi-v3-map-side-button cmi-v3-map-side-button--profile"
          onClick={onOpenProfile}
          aria-label="打开个人主页"
        >
          <img src={profileAvatarUrl} alt={`${profileName} 的头像`} />
        </button>
      </div>

      {(isLoading || recommendationsError) && (
        <div className="cmi-v3-map-state">
          {recommendationsError ?? '正在同步社区动态和活动'}
        </div>
      )}

      {selectedRecommendation ? (
        <PlacePostSheet
          itemId={`recommendation:${selectedRecommendation.id}`}
          authorProfile={selectedRecommendationAuthorProfile}
          recommendation={selectedRecommendation}
          onOpenDetails={() => onOpenPath(getPlacePath(selectedRecommendation.place_name))}
          onDismiss={onClearSelection}
        />
      ) : selectedEvent ? (
        <MapBottomSheet
          detailHref={getCmiEventPath(selectedEvent.id)}
          itemId={`event:${selectedEvent.id}`}
          imageAlt={selectedEvent.title}
          imageUrl={getCmiEventCardImageUrl(selectedEvent)}
          meta={`${formatCmiEventTime(selectedEvent)} · ${selectedEvent.venueName}`}
          onDetailOpen={() => onOpenPath(getCmiEventPath(selectedEvent.id))}
          primaryAction={{
            label: '打开活动页',
            href: getCmiEventPath(selectedEvent.id),
            onClick: () => onOpenPath(getCmiEventPath(selectedEvent.id)),
          }}
          title={selectedEvent.title}
          onDismiss={onClearSelection}
        >
          <EventSheetBody event={selectedEvent} />
        </MapBottomSheet>
      ) : (
        <MapPulseSheet
          activeRecIdForSticker={activeRecIdForSticker}
          activeStickerId={activeStickerId}
          events={listEvents}
          isLoading={isLoading}
          localWishlists={localWishlists}
          placedStickers={placedStickers}
          profilesByAuthorKey={profilesByAuthorKey}
          recommendations={listRecommendations}
          searchQuery={searchQuery}
          onEventSelect={(event) => onNavigate('map', { eventId: event.id })}
          onOpenPath={onOpenPath}
          onPlaceStamp={onPlaceStamp}
          onRecommendationSelect={handleRecommendationSelect}
          onReplyToRecommendation={onReplyToRecommendation}
          onStartStamp={onStartStamp}
          onToggleWishlist={onToggleWishlist}
        />
      )}

    </section>
  );
}

function CmiInboxSheet({
  items,
  isLoading,
  onClose,
}: {
  items: InboxDisplayItem[];
  isLoading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="cmi-v3-inbox-overlay" role="presentation">
      <button type="button" className="cmi-v3-inbox-backdrop" aria-label="关闭收件箱" onClick={onClose} />
      <section className="cmi-v3-inbox-panel" role="dialog" aria-modal="true" aria-label="消息收件箱">
        <header className="cmi-v3-inbox-head">
          <h2>收件箱</h2>
          <button type="button" onClick={onClose} aria-label="关闭收件箱">
            <X size={20} strokeWidth={2.7} />
          </button>
        </header>

        <div className="cmi-v3-inbox-list">
          {isLoading ? (
            <p className="cmi-v3-inbox-state">正在同步消息</p>
          ) : items.length > 0 ? (
            items.map(item => (
              <article
                key={item.id}
                className={`cmi-v3-inbox-item cmi-v3-inbox-item--${item.kind} ${item.isUnread ? 'is-unread' : ''}`}
              >
                <span className="cmi-v3-inbox-item-icon" aria-hidden="true">
                  {item.kind === 'system' ? <Megaphone size={18} strokeWidth={2.6} /> : <MessageCircle size={18} strokeWidth={2.6} />}
                </span>
                <div>
                  <div className="cmi-v3-inbox-item-title">
                    <strong>{item.title}</strong>
                    {item.isUnread && <i aria-label="新消息" />}
                  </div>
                  <p>{item.body}</p>
                  <span>{item.meta}</span>
                </div>
              </article>
            ))
          ) : (
            <p className="cmi-v3-inbox-state">暂无消息</p>
          )}
        </div>
      </section>
    </div>
  );
}

function RecommendationReplySheet({
  target,
  value,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: {
  target: RecommendationReplyTarget;
  value: string;
  submitting: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim() || submitting) return;
    void onSubmit();
  };

  return (
    <div className="cmi-v3-reply-overlay" role="presentation">
      <button type="button" className="cmi-v3-reply-backdrop" aria-label="关闭回复" onClick={onClose} />
      <form className="cmi-v3-reply-panel" aria-label={`回复 ${target.recipientName}`} onSubmit={handleSubmit}>
        <header className="cmi-v3-reply-head">
          <div>
            <h2>回复动态</h2>
            <p>{target.recipientName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭回复" disabled={submitting}>
            <X size={20} strokeWidth={2.7} />
          </button>
        </header>

        <article className="cmi-v3-reply-target">
          <strong>{target.placeName}</strong>
          <p>{target.summary}</p>
        </article>

        <textarea
          value={value}
          onChange={event => onChange(event.target.value)}
          maxLength={240}
          placeholder="写回复"
          autoFocus
        />

        <button type="submit" disabled={!value.trim() || submitting}>
          <Send size={18} strokeWidth={2.8} />
          {submitting ? '发送中' : '发送'}
        </button>
      </form>
    </div>
  );
}

function PlacePostSheet({
  authorProfile,
  itemId,
  recommendation,
  onOpenDetails,
  onDismiss,
}: {
  authorProfile: PublicProfile | null;
  itemId: string;
  recommendation: Recommendation;
  onOpenDetails: () => void;
  onDismiss?: () => void;
}) {
  const { dragHandlers, dragOffset, isDragging, snap } = useBottomSheetDrag(itemId);
  const isExpanded = snap === 'expanded';
  const categoryConfig = getCategoryConfig(recommendation.category);
  const imageUrl = recommendation.images[0] || categoryConfig.iconUrl;
  const authorName = recommendation.user_name || authorProfile?.user_name || 'CMI 朋友';
  const authorAvatarUrl = authorProfile?.avatar_url?.trim() ?? '';
  const categoryLabel = normalizeCategory(recommendation.category);
  const summary = getRecommendationSummary(recommendation).trim();
  const title = getDisplayPlaceName(recommendation.place_name);
  const visibleSummary = summary && summary !== title ? summary : '';
  const panelLabel = title || visibleSummary || authorName;
  const sheetStyle = { '--cmi-v3-sheet-drag-y': `${dragOffset}px` } as CSSProperties;
  const sheetClassName = [
    'cmi-v3-selected-note',
    'cmi-v3-place-post-sheet',
    isExpanded ? 'is-expanded' : '',
    isDragging ? 'is-dragging' : '',
  ].filter(Boolean).join(' ');

  const handleSheetClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.defaultPrevented || (event.target instanceof Element && event.target.closest('a, button'))) return;
    onOpenDetails();
  };

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    onOpenDetails();
  };

  return (
    <article className={sheetClassName} data-sheet-state={snap} style={sheetStyle} onClick={handleSheetClick}>
      {onDismiss && (
        <button type="button" className="cmi-v3-selected-note-close" onClick={onDismiss} aria-label="关闭详情">
          <X size={18} strokeWidth={3} />
        </button>
      )}
      <div className="cmi-v3-selected-note-grabber" aria-hidden="true" />
      <div
        className="cmi-v3-place-post-panel"
        role="link"
        tabIndex={0}
        aria-label={`打开${panelLabel}详情`}
        onKeyDown={handlePanelKeyDown}
        {...dragHandlers}
      >
        <div className="cmi-v3-place-post-copy">
          <div className="cmi-v3-place-post-author">
            <span className="cmi-v3-place-post-avatar" aria-hidden="true">
              {authorAvatarUrl ? <img src={authorAvatarUrl} alt="" /> : getUserInitial(authorName)}
            </span>
            <div>
              <strong>{authorName}</strong>
              <span>{`${categoryLabel} · ${formatTraceTime(recommendation.created_at)}`}</span>
            </div>
          </div>
          {title && <h2>{title}</h2>}
          {visibleSummary && <p>{visibleSummary}</p>}
        </div>
        <img className="cmi-v3-place-post-photo" src={imageUrl} alt={panelLabel} />
      </div>
    </article>
  );
}

function MapBottomSheet({
  children,
  detailHref,
  imageAlt,
  imageUrl,
  itemId,
  meta,
  primaryAction,
  secondaryAction,
  title,
  onDetailOpen,
  onDismiss,
}: {
  children: ReactNode;
  detailHref?: string;
  imageAlt: string;
  imageUrl: string;
  itemId: string;
  meta: string;
  primaryAction?: SheetAction;
  secondaryAction?: SheetAction;
  title: string;
  onDetailOpen?: () => void;
  onDismiss?: () => void;
}) {
  const { dragHandlers, dragOffset, isDragging, setSnap, snap } = useBottomSheetDrag(itemId);
  const isExpanded = snap === 'expanded';
  const sheetStyle = { '--cmi-v3-sheet-drag-y': `${dragOffset}px` } as CSSProperties;
  const sheetClassName = [
    'cmi-v3-selected-note',
    isExpanded ? 'is-expanded' : '',
    isDragging ? 'is-dragging' : '',
  ].filter(Boolean).join(' ');

  const handleSummaryKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    setSnap(isExpanded ? 'collapsed' : 'expanded');
  };
  const handleSheetClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!detailHref) return;
    if (event.defaultPrevented || (event.target instanceof Element && event.target.closest('a, button'))) return;

    if (onDetailOpen) {
      onDetailOpen();
      return;
    }

    window.location.assign(detailHref);
  };
  const handleDetailLinkClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!onDetailOpen) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    onDetailOpen();
  };
  const summaryContent = (
    <>
      <img src={imageUrl} alt={imageAlt} />
      <div>
        <h2>{title}</h2>
        <p>{meta}</p>
      </div>
    </>
  );

  return (
    <article
      className={sheetClassName}
      data-sheet-state={snap}
      style={sheetStyle}
      onClick={handleSheetClick}
    >
      {onDismiss && (
        <button type="button" className="cmi-v3-selected-note-close" onClick={onDismiss} aria-label="关闭详情">
          <X size={18} strokeWidth={3} />
        </button>
      )}
      <div className="cmi-v3-selected-note-grabber" aria-hidden="true" />
      {detailHref ? (
        <a
          className="cmi-v3-selected-note-summary cmi-v3-selected-note-summary--link"
          href={detailHref}
          aria-label={`打开${title}活动详情`}
          onClick={handleDetailLinkClick}
        >
          {summaryContent}
        </a>
      ) : (
        <div
          className="cmi-v3-selected-note-summary"
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label={title}
          onKeyDown={handleSummaryKeyDown}
          {...dragHandlers}
        >
          {summaryContent}
        </div>
      )}
      <div className="cmi-v3-selected-note-body">
        {(primaryAction || secondaryAction) && (
          <div className="cmi-v3-selected-note-actions">
            {primaryAction && <SheetActionControl action={primaryAction} />}
            {secondaryAction && <SheetActionControl action={secondaryAction} />}
          </div>
        )}
        {children}
      </div>
    </article>
  );
}

function SheetActionControl({ action }: { action: SheetAction }) {
  if (action.href) {
    const handleActionLinkClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (!action.onClick) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      event.preventDefault();
      action.onClick();
    };

    return <a href={action.href} onClick={handleActionLinkClick}>{action.label}</a>;
  }

  return <button type="button" onClick={action.onClick}>{action.label}</button>;
}

function MapPulseSheet({
  activeRecIdForSticker,
  activeStickerId,
  events,
  isLoading,
  localWishlists,
  placedStickers,
  profilesByAuthorKey,
  recommendations,
  searchQuery,
  onEventSelect,
  onOpenPath,
  onPlaceStamp,
  onRecommendationSelect,
  onReplyToRecommendation,
  onStartStamp,
  onToggleWishlist,
}: {
  activeRecIdForSticker: string | null;
  activeStickerId: string | null;
  events: CmiEvent[];
  isLoading: boolean;
  localWishlists: WishlistStateMap;
  placedStickers: PlacedStickerMap;
  profilesByAuthorKey: ProfileLookup;
  recommendations: Recommendation[];
  searchQuery: string;
  onEventSelect: (event: CmiEvent) => void;
  onOpenPath: (path: string) => void;
  onPlaceStamp: (event: ReactMouseEvent<HTMLElement>, recommendationId: string) => void;
  onRecommendationSelect: (recommendation: Recommendation) => void;
  onReplyToRecommendation: (recommendation: Recommendation) => void;
  onStartStamp: (recommendationId: string) => void;
  onToggleWishlist: (recommendation: Recommendation) => void;
}) {
  const { dragHandlers, dragOffset, isDragging, setSnap, snap } = useBottomSheetDrag('map-pulse');
  const isExpanded = snap === 'expanded';
  const sheetStyle = { '--cmi-v3-sheet-drag-y': `${dragOffset}px` } as CSSProperties;
  const visibleRecommendations = recommendations.slice(0, 8);
  const visibleEvents = events.filter(isCuratedCommunityEvent).slice(0, 4);
  const trimmedSearchQuery = searchQuery.trim();
  const isSearching = trimmedSearchQuery.length > 0;

  useEffect(() => {
    if (isSearching) setSnap('expanded');
  }, [isSearching, setSnap]);

  const handleHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    setSnap(isExpanded ? 'collapsed' : 'expanded');
  };

  return (
    <section
      className={`cmi-v3-map-pulse-sheet ${isExpanded ? 'is-expanded' : ''} ${isDragging ? 'is-dragging' : ''}`}
      data-sheet-state={snap}
      style={sheetStyle}
      aria-label="CMI社区新动态！"
    >
      <div
        className="cmi-v3-map-pulse-handle-zone"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={handleHeaderKeyDown}
        {...dragHandlers}
      >
        <div className="cmi-v3-selected-note-grabber" aria-hidden="true" />
      </div>

      <div className="cmi-v3-map-pulse-body">
        <div className="cmi-v3-map-pulse-head" {...dragHandlers}>
          <div>
            <h2>{isSearching ? `搜索：${trimmedSearchQuery}` : 'CMI社区新动态！'}</h2>
            <p>{isSearching ? `找到 ${visibleEvents.length + visibleRecommendations.length} 条相关内容` : '附近的人刚留下的新鲜事'}</p>
          </div>
        </div>

        {isLoading && <p className="cmi-v3-map-pulse-state">正在同步社区活动和动态</p>}

        {visibleEvents.length > 0 ? (
          <div className="cmi-v3-map-pulse-row" aria-label="清迈客栈活动">
            {visibleEvents.map(event => (
              <button
                key={event.id}
                type="button"
                className="cmi-v3-map-pulse-card"
                aria-label={`查看${event.title}活动`}
                onClick={() => onEventSelect(event)}
              >
                <img src={getCmiEventCardImageUrl(event)} alt="" />
                <div className="cmi-v3-map-pulse-card-copy">
                  <span>{getCuratedCommunityEventLabel(event)}</span>
                  <strong>{event.title}</strong>
                  <p>{`${formatCmiEventTime(event)} · ${event.venueName}`}</p>
                </div>
              </button>
            ))}
          </div>
        ) : !isLoading && visibleRecommendations.length === 0 ? (
          <p className="cmi-v3-map-pulse-state">
            {isSearching ? '没有找到相关活动。' : '暂时没有新的清迈客栈活动。'}
          </p>
        ) : null}

        {isExpanded && visibleRecommendations.length > 0 && (
          <div className="cmi-v3-map-pulse-feed" aria-label="社区动态列表">
            {visibleRecommendations.map(recommendation => {
              const categoryConfig = getCategoryConfig(recommendation.category);
              const imageUrl = recommendation.images[0] || categoryConfig.iconUrl;
              const categoryLabel = normalizeCategory(recommendation.category);
              const authorProfile = getRecommendationAuthorProfile(recommendation, profilesByAuthorKey);
              const authorName = recommendation.user_name || authorProfile?.user_name || 'CMI 朋友';
              const authorAvatarUrl = authorProfile?.avatar_url?.trim() || getFallbackAvatarUrl(authorName);
              const linkedEventBadge = getRecommendationEventBadge(recommendation, events);
              const traceMetaParts = getRecommendationMetaParts(recommendation.place_name, '');
              const traceMetaLabel = [formatTraceTime(recommendation.created_at), ...traceMetaParts].join(' · ');
              const imageAlt = getDisplayPlaceName(recommendation.place_name) || getRecommendationSummary(recommendation);

              return (
                <article
                  key={recommendation.id}
                  className={`cmi-v3-map-pulse-trace ${
                    activeStickerId && activeRecIdForSticker === recommendation.id ? 'is-stamp-target' : ''
                  }`}
                  onClick={(event) => {
                    if (activeStickerId && activeRecIdForSticker === recommendation.id) {
                      onPlaceStamp(event, recommendation.id);
                      return;
                    }
                    onRecommendationSelect(recommendation);
                  }}
                >
                  <PlacedStickerLayer placements={placedStickers[recommendation.id]} variant="pulse" />
                  <img className="cmi-v3-map-pulse-trace-image" src={imageUrl} alt={imageAlt} />
                  <div className="cmi-v3-map-pulse-trace-content">
                    <EventPosterWatermark badge={linkedEventBadge} variant="pulse" />
                    <div className="cmi-v3-map-pulse-trace-head">
                      <span className="cmi-v3-map-pulse-trace-avatar">
                        <img src={authorAvatarUrl} alt="" />
                      </span>
                      <div>
                        <strong>{authorName}</strong>
                        <span>{categoryLabel}</span>
                      </div>
                      <em>...</em>
                    </div>
                    <p>{getRecommendationSummary(recommendation)}</p>
                    <div className="cmi-v3-map-pulse-trace-foot">
                      <span>{traceMetaLabel}</span>
                      <RecommendationActionButtons
                        isWishlisted={localWishlists[recommendation.id] ?? false}
                        onComment={() => onReplyToRecommendation(recommendation)}
                        onStamp={() => onStartStamp(recommendation.id)}
                        onWishlist={() => onToggleWishlist(recommendation)}
                        variant="pulse"
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {isExpanded && !isLoading && visibleRecommendations.length === 0 && (
          <p className="cmi-v3-map-pulse-state">
            {isSearching ? '没有找到相关动态或地点。' : '附近还没有新的社区动态。'}
          </p>
        )}

        {isExpanded && (
          <div className="cmi-v3-map-pulse-actions">
            <button type="button" onClick={() => onOpenPath(getMarkPlacePath())}>活动返图</button>
            <button type="button" onClick={() => onOpenPath(getCmiEventCreatePath())}>发布活动</button>
          </div>
        )}
      </div>
    </section>
  );
}

function EventSheetBody({ event }: { event: CmiEvent }) {
  return (
    <div className="cmi-v3-selected-note-thread">
      <strong>活动信息</strong>
      <article>
        <span>{`${event.hostName} · ${event.area}`}</span>
        <p>{event.summary}</p>
      </article>
      <article>
        <span>{event.registrationLabel}</span>
        <p>{event.priceLabel}</p>
      </article>
    </div>
  );
}

function FeedMode({
  blackboardPosts,
  blackboardPostsError,
  events,
  recommendations,
  isLoading,
  localWishlists,
  placedStickers,
  activeRecIdForSticker,
  activeStickerId,
  profilesByAuthorKey,
  onNavigate,
  onPlaceStamp,
  onOpenPath,
  onReplyToRecommendation,
  onStartStamp,
  onToggleWishlist,
}: {
  blackboardPosts: BlackboardPostRecord[];
  blackboardPostsError: string | null;
  events: CmiEvent[];
  recommendations: Recommendation[];
  isLoading: boolean;
  localWishlists: WishlistStateMap;
  placedStickers: PlacedStickerMap;
  activeRecIdForSticker: string | null;
  activeStickerId: string | null;
  profilesByAuthorKey: ProfileLookup;
  onNavigate: (screen: ScreenId, input?: { eventId?: string | null }) => void;
  onPlaceStamp: (event: ReactMouseEvent<HTMLElement>, recommendationId: string) => void;
  onOpenPath: (path: string) => void;
  onReplyToRecommendation: (recommendation: Recommendation) => void;
  onStartStamp: (recommendationId: string) => void;
  onToggleWishlist: (recommendation: Recommendation) => void;
}) {
  const feedItems = useMemo<CmiV3FeedItem[]>(
    () => sortCmiV3FeedItems([
      ...blackboardPosts.map(post => ({
        id: `forum:${post.id}`,
        type: 'forumPost' as const,
        createdAt: post.created_at,
        post,
      })),
      ...recommendations.map(recommendation => ({
        id: `recommendation:${recommendation.id}`,
        type: 'recommendation' as const,
        createdAt: recommendation.created_at,
        recommendation,
      })),
    ]),
    [blackboardPosts, recommendations]
  );
  const featuredFeedItem = useMemo(
    () => feedItems.find(feedItem => feedItem.type === 'forumPost' && Boolean(feedItem.post.is_featured))
      ?? feedItems.find(feedItem => feedItem.type === 'forumPost')
      ?? feedItems[0]
      ?? null,
    [feedItems]
  );
  const streamFeedItems = useMemo(
    () => featuredFeedItem
      ? feedItems.filter(feedItem => feedItem.id !== featuredFeedItem.id)
      : feedItems,
    [featuredFeedItem, feedItems]
  );

  return (
    <ComicPage title="动态" hideTitle onTitleClick={() => onNavigate('map')}>
      <FeedCenterPanel
        item={featuredFeedItem}
        events={events}
        profilesByAuthorKey={profilesByAuthorKey}
        onOpenPath={onOpenPath}
      />

      {isLoading && <p className="cmi-v3-inline-state">正在同步社区动态</p>}
      {blackboardPostsError && <p className="cmi-v3-inline-state">{blackboardPostsError}</p>}

      <div className="cmi-v3-feed-stream" aria-label="社区动态列表">
        {streamFeedItems.map(feedItem => (
          feedItem.type === 'forumPost' ? (
            <BlackboardFeedCard
              key={feedItem.id}
              authorProfile={getBlackboardPostAuthorProfile(feedItem.post, profilesByAuthorKey)}
              events={events}
              post={feedItem.post}
              onOpenPath={onOpenPath}
            />
          ) : (
            <RecommendationFeedCard
              key={feedItem.id}
              activeRecIdForSticker={activeRecIdForSticker}
              activeStickerId={activeStickerId}
              associationTag={getRecommendationAssociationTag(feedItem.recommendation, events)}
              authorProfile={getRecommendationAuthorProfile(feedItem.recommendation, profilesByAuthorKey)}
              isWishlisted={localWishlists[feedItem.recommendation.id] ?? false}
              placedStickers={placedStickers[feedItem.recommendation.id] ?? []}
              recommendation={feedItem.recommendation}
              onComment={() => onReplyToRecommendation(feedItem.recommendation)}
              onPlaceStamp={onPlaceStamp}
              onSelect={() => onOpenPath(getPlacePath(feedItem.recommendation.place_name))}
              onStartStamp={() => onStartStamp(feedItem.recommendation.id)}
              onToggleWishlist={() => onToggleWishlist(feedItem.recommendation)}
            />
          )
        ))}
      </div>

      {!isLoading && feedItems.length === 0 && (
        <p className="cmi-v3-inline-state">还没有新的社区动态。</p>
      )}

    </ComicPage>
  );
}

function PublishMode({
  selectedMarker,
  onNavigate,
  onOpenPath,
}: {
  selectedMarker: MapMarker | null;
  onNavigate: (screen: ScreenId) => void;
  onOpenPath: (path: string) => void;
}) {
  const selectedPlaceName = selectedMarker?.place_name || CMI_INN_PLACE_NAME;

  return (
    <ComicPage title="添加" hideTitle onTitleClick={() => onNavigate('map')}>
      <section className="cmi-v3-hard-card cmi-v3-publish-panel cmi-v3-dot-paper">
        <ChapterHeader left="New Moment" right="Use Existing Flow" />
        <h1>记录此刻</h1>
        <p>拍照发动态时可以选择关联活动；返图会自动带上活动海报标签。</p>

        <button type="button" className="cmi-v3-photo-uploader" onClick={() => onOpenPath(getMarkPlacePath())}>
          <Camera size={36} strokeWidth={2.8} />
          <strong>发现了新地方</strong>
          <span>拍照 / 定位 / 写一句话</span>
        </button>

        <FormCard label="已有地点">
          <div className="cmi-v3-place-row">
            <div>
              <strong>{selectedPlaceName}</strong>
              <span>把刚刚发生的事挂到这个地点</span>
            </div>
            <button type="button" onClick={() => onOpenPath(getAddTracePath(selectedPlaceName))}>补一句</button>
          </div>
        </FormCard>

        <FormCard label="活动返图">
          <div className="cmi-v3-place-row">
            <div>
              <strong>参加活动后发现场照</strong>
              <span>拍照后选择对应活动，动态会带活动标签</span>
            </div>
            <button type="button" onClick={() => onOpenPath(getMarkPlacePath())}>返图</button>
          </div>
        </FormCard>

        <FormCard label="活动发布">
          <div className="cmi-v3-place-row">
            <div>
              <strong>发起一场社区活动</strong>
              <span>复用现有活动发布和报名系统</span>
            </div>
            <button type="button" onClick={() => onOpenPath(getCmiEventCreatePath())}>发布</button>
          </div>
        </FormCard>

        <div className="cmi-v3-publish-actions">
          <button type="button" onClick={() => onOpenPath(getMarkPlacePath())}>标记新地点</button>
          <button type="button" onClick={() => onOpenPath(getAddTracePath(selectedPlaceName))}>给地点补一句</button>
          <button type="button" onClick={() => onOpenPath(getMarkPlacePath())}>活动返图</button>
          <button type="button" onClick={() => onOpenPath(getCmiEventCreatePath())}>发布活动</button>
        </div>
      </section>
    </ComicPage>
  );
}

function EventsMode({
  events,
  isLoading,
  onNavigate,
  onOpenPath,
}: {
  events: CmiEvent[];
  isLoading: boolean;
  onNavigate: (screen: ScreenId, input?: { eventId?: string | null }) => void;
  onOpenPath: (path: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [activeEventTab, setActiveEventTab] = useState<EventTabId>('upcoming');
  const [sharingEventIds, setSharingEventIds] = useState<Record<string, boolean>>({});
  const [shareSheetEvent, setShareSheetEvent] = useState<CmiEvent | null>(null);
  const [registeredEventIds, setRegisteredEventIds] = useState<Record<string, boolean>>({});
  const [registeringEventIds, setRegisteringEventIds] = useState<Record<string, boolean>>({});
  const [fullEventIds, setFullEventIds] = useState<Record<string, boolean>>({});
  const referenceDate = useMemo(() => new Date(), []);
  const eventGroups = useMemo(() => {
    const nextOngoingEvents: CmiEvent[] = [];
    const nextUpcomingEvents: CmiEvent[] = [];
    const nextEndedEvents: CmiEvent[] = [];

    events.forEach(event => {
      if (isCmiEventExpired(event, referenceDate)) {
        nextEndedEvents.push(event);
        return;
      }

      if (isEventOngoing(event, referenceDate)) {
        nextOngoingEvents.push(event);
        return;
      }

      nextUpcomingEvents.push(event);
    });

    return {
      ongoing: nextOngoingEvents.sort((left, right) => compareUpcomingEvents(left, right, referenceDate)),
      upcomingEvents: nextUpcomingEvents.sort((left, right) => compareUpcomingEvents(left, right, referenceDate)),
      endedEvents: nextEndedEvents.sort((left, right) => compareEndedEvents(left, right, referenceDate)),
      joined: [],
    };
  }, [events, referenceDate]);
  const visibleEvents =
    activeEventTab === 'ongoing'
      ? eventGroups.ongoing
      : activeEventTab === 'ended'
        ? eventGroups.endedEvents
        : activeEventTab === 'joined'
          ? eventGroups.joined
          : eventGroups.upcomingEvents;
  const visibleEventIdsKey = useMemo(
    () => visibleEvents.map(event => event.id).join('|'),
    [visibleEvents]
  );
  const emptyEventMessage: Record<EventTabId, string> = {
    ongoing: '现在没有正在发生的活动。',
    upcoming: '暂时没有未开始活动。',
    ended: '暂时没有刚结束的活动。',
    joined: '你参加的活动之后会放在这里。',
  };

  useEffect(() => {
    let isMounted = true;
    const eventIds = visibleEventIdsKey.split('|').filter(Boolean);

    if (eventIds.length === 0 || !user?.id) {
      setRegisteredEventIds({});
      return () => {
        isMounted = false;
      };
    }

    getCurrentUserCmiEventRegistrations(eventIds, user.id)
      .then(registrations => {
        if (!isMounted) return;

        setRegisteredEventIds(
          eventIds.reduce<Record<string, boolean>>((state, eventId) => {
            state[eventId] = registrations.some(registration => registration.eventId === eventId);
            return state;
          }, {})
        );
      })
      .catch(error => {
        console.error('CMI Map 3.0 当前用户报名状态加载失败:', error);
        if (isMounted) setRegisteredEventIds({});
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id, visibleEventIdsKey]);

  const handleQuickRegisterEvent = async (event: CmiEvent) => {
    if (!user?.id || !user.email) {
      toast('登录后可以一键报名', { description: '注册只需要一个邮箱。' });
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    if (registeredEventIds[event.id]) {
      toast('你已经报名这个活动了');
      return;
    }

    if (!event.registrationEnabled) {
      toast.error('这个活动暂时不能一键报名', { description: event.registrationLabel });
      return;
    }

    if (isEventRegistrationPastCutoff(event, referenceDate)) {
      toast.error('这个活动已经开始或结束，不能继续报名');
      return;
    }

    if (fullEventIds[event.id] || event.registrationStatus === 'closed') {
      toast.error('这个活动名额已满或报名已关闭');
      return;
    }

    const attendeeName = profile?.user_name?.trim() || user.email.split('@')[0] || 'CMI 朋友';

    setRegisteringEventIds(prev => ({ ...prev, [event.id]: true }));
    try {
      const result = await registerForCmiEvent({
        eventId: event.id,
        attendeeName,
        attendeeEmail: user.email,
        note: '从 CMI Map 3.0 活动卡片一键报名',
        userId: user.id,
      });

      setRegisteredEventIds(prev => ({ ...prev, [event.id]: true }));

      if (result.notificationError) {
        toast.warning('报名成功，邮件通知稍后需要补发', {
          description: CMI_EVENT_REGISTRATION_SUCCESS_DESCRIPTION,
        });
      } else {
        toast.success('报名成功', {
          description: CMI_EVENT_REGISTRATION_SUCCESS_DESCRIPTION,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '请稍后重试';
      const normalizedMessage = message.toLowerCase();

      if (normalizedMessage.includes('duplicate')) {
        setRegisteredEventIds(prev => ({ ...prev, [event.id]: true }));
        toast('你已经报名这个活动了');
        return;
      }

      if (isCapacityFullRegistrationError(message)) {
        setFullEventIds(prev => ({ ...prev, [event.id]: true }));
        toast.error('这个活动名额已满');
        return;
      }

      toast.error('报名失败', { description: message });
    } finally {
      setRegisteringEventIds(prev => ({ ...prev, [event.id]: false }));
    }
  };

  const renderEventCard = (event: CmiEvent) => (
    <EventListCard
      key={event.id}
      event={event}
      isSharing={Boolean(sharingEventIds[event.id])}
      registrationState={getEventListRegistrationButtonState({
        event,
        hasRegistered: Boolean(registeredEventIds[event.id]),
        isRegistering: Boolean(registeringEventIds[event.id]),
        isMarkedFull: Boolean(fullEventIds[event.id]),
        referenceDate,
      })}
      onOpenRealPage={() => onOpenPath(getCmiEventPath(event.id))}
      onOpenMap={() => {
        if (!event.mapLocation) {
          onOpenPath(getCmiEventPath(event.id));
          return;
        }
        onNavigate('map', { eventId: event.id });
      }}
      onRegister={() => handleQuickRegisterEvent(event)}
      onShare={() => setShareSheetEvent(event)}
    />
  );

  const handleShareEventExternally = async (event: CmiEvent) => {
    setSharingEventIds(prev => ({ ...prev, [event.id]: true }));

    try {
      const eventPageUrl = getPublicCmiEventUrl(event.id);
      const card = await createCmiEventShareCard({
        event,
        posterUrl: getCmiEventCardImageUrl(event),
        referenceDate,
        eventPageUrl,
      });
      const file = new File([card.blob], card.fileName, { type: 'image/png' });
      const shareData: FileShareData = {
        files: [file],
        title: `CMI Map · ${event.title}`,
        text: `${event.title}｜${formatCmiEventTime(event, referenceDate)}，${event.venueName}`,
      };
      const navigatorWithFileShare = navigator as NavigatorWithFileShare;

      if (navigatorWithFileShare.share && (!navigatorWithFileShare.canShare || navigatorWithFileShare.canShare(shareData))) {
        try {
          await navigatorWithFileShare.share(shareData);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          console.error('Failed to share CMI event card:', error);
        }
      }

      downloadCmiEventShareCard(card);
      toast.success('当前浏览器不支持直接分享，已改为下载活动图片');
    } catch (error) {
      console.error('Failed to create CMI event share card:', error);
      toast.error('活动卡片生成失败，请稍后再试');
    } finally {
      setSharingEventIds(prev => ({ ...prev, [event.id]: false }));
    }
  };

  return (
    <>
      <ComicPage title="活动" hideTitle onTitleClick={() => onNavigate('map')}>
        <section className="cmi-v3-hard-card cmi-v3-events-hero cmi-v3-dot-paper">
          <div className="cmi-v3-events-hero-head">
            <div className="cmi-v3-events-hero-copy">
              <span className="cmi-v3-events-hero-kicker">CMI Events</span>
              <h1>
                <span>清迈客栈的</span>
                <span>活动！</span>
              </h1>
            </div>
            <button
              type="button"
              className="cmi-v3-events-create-button"
              onClick={() => onOpenPath(getCmiEventCreatePath())}
            >
              <CalendarPlus size={18} strokeWidth={3} />
              <span>发起活动</span>
            </button>
          </div>
          <p>社区空间提供给大家使用，可以来办活动！</p>
          <div className="cmi-v3-event-tabs">
            {eventTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={activeEventTab === tab.id ? 'is-active' : undefined}
                aria-pressed={activeEventTab === tab.id}
                onClick={() => setActiveEventTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {isLoading && <p className="cmi-v3-inline-state">正在同步活动库</p>}

        {visibleEvents.map(renderEventCard)}

        {!isLoading && (events.length === 0 || visibleEvents.length === 0) && (
          <p className="cmi-v3-inline-state">
            {events.length === 0 ? '暂时还没有新的清迈客栈活动。' : emptyEventMessage[activeEventTab]}
          </p>
        )}
      </ComicPage>

      {shareSheetEvent && (
        <EventShareSheet
          event={shareSheetEvent}
          isSharing={Boolean(sharingEventIds[shareSheetEvent.id])}
          onClose={() => setShareSheetEvent(null)}
          onShareToBlackboard={() => {
            setShareSheetEvent(null);
            navigate(getCmiFeedPath({ compose: true, eventId: shareSheetEvent.id }));
          }}
          onShareOutside={() => {
            void handleShareEventExternally(shareSheetEvent).finally(() => setShareSheetEvent(null));
          }}
        />
      )}
    </>
  );
}

function EventPosterWatermark({
  badge,
  variant,
}: {
  badge: RecommendationEventBadge | null;
  variant: 'feed' | 'pulse';
}) {
  if (!badge) return null;

  return (
    <span className={`cmi-v3-event-watermark cmi-v3-event-watermark--${variant}`} aria-hidden="true">
      {badge.posterUrl && <img src={badge.posterUrl} alt="" />}
      <span>{badge.title}</span>
    </span>
  );
}

function FeedCenterPanel({
  events,
  item,
  profilesByAuthorKey,
  onOpenPath,
}: {
  events: CmiEvent[];
  item: CmiV3FeedItem | null;
  profilesByAuthorKey: ProfileLookup;
  onOpenPath: (path: string) => void;
}) {
  const content = useMemo(() => {
    if (!item) return null;

    if (item.type === 'forumPost') {
      const post = item.post;
      const authorProfile = getBlackboardPostAuthorProfile(post, profilesByAuthorKey);
      const authorName = post.author_name || authorProfile?.user_name || 'CMI 朋友';
      const targetPath = getBlackboardPostTargetPath(post);

      return {
        associationTag: getBlackboardAssociationTag(post, events),
        authorName,
        body: post.body,
        imageUrl: getBlackboardPostImageUrl(post, events),
        meta: formatBlackboardCreatedLabel(post.created_at),
        targetPath,
      };
    }

    const recommendation = item.recommendation;
    const authorProfile = getRecommendationAuthorProfile(recommendation, profilesByAuthorKey);
    const authorName = recommendation.user_name || authorProfile?.user_name || 'CMI 朋友';
    const categoryConfig = getCategoryConfig(recommendation.category);

    return {
      associationTag: getRecommendationAssociationTag(recommendation, events),
      authorName,
      body: getRecommendationSummary(recommendation),
      imageUrl: recommendation.images[0] || categoryConfig.iconUrl,
      meta: formatTraceTime(recommendation.created_at),
      targetPath: getPlacePath(recommendation.place_name),
    };
  }, [events, item, profilesByAuthorKey]);

  const openTarget = () => {
    if (content?.targetPath) onOpenPath(content.targetPath);
  };

  const handleKeyDown = (keyboardEvent: KeyboardEvent<HTMLElement>) => {
    if (!content?.targetPath || (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ')) return;
    keyboardEvent.preventDefault();
    openTarget();
  };

  return (
    <section className="cmi-v3-feed-center" aria-label="动态页标题和精选">
      <div className="cmi-v3-feed-center-heading">
        <h1>看看大家在做什么！</h1>
      </div>

      {content && (
        <article
          className="cmi-v3-feed-featured"
          role={content.targetPath ? 'link' : undefined}
          tabIndex={content.targetPath ? 0 : undefined}
          onClick={openTarget}
          onKeyDown={handleKeyDown}
        >
          <div className="cmi-v3-feed-featured-media">
            {content.imageUrl ? (
              <img src={content.imageUrl} alt="" />
            ) : (
              <Megaphone size={26} strokeWidth={2.7} />
            )}
          </div>
          <FeedAssociationTag tag={content.associationTag} />
          <div className="cmi-v3-feed-featured-copy">
            <div className="cmi-v3-feed-featured-meta">
              <strong>{content.authorName}</strong>
              <span>{content.meta}</span>
            </div>
            <p>{content.body}</p>
          </div>
        </article>
      )}
    </section>
  );
}

function BlackboardFeedCard({
  authorProfile,
  events,
  post,
  onOpenPath,
}: {
  authorProfile: PublicProfile | null;
  events: CmiEvent[];
  post: BlackboardPostRecord;
  onOpenPath: (path: string) => void;
}) {
  const authorName = post.author_name || authorProfile?.user_name || 'CMI 朋友';
  const avatarUrl = authorProfile?.avatar_url?.trim() || getFallbackAvatarUrl(authorName);
  const imageUrl = getBlackboardPostImageUrl(post, events);
  const targetPath = getBlackboardPostTargetPath(post);

  const openTarget = () => {
    if (targetPath) onOpenPath(targetPath);
  };

  const handleKeyDown = (keyboardEvent: KeyboardEvent<HTMLElement>) => {
    if (!targetPath || (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ')) return;
    keyboardEvent.preventDefault();
    openTarget();
  };

  return (
    <article
      className={`cmi-v3-feed-card cmi-v3-forum-post-card ${imageUrl ? '' : 'cmi-v3-forum-post-card--text-only'}`}
      role={targetPath ? 'link' : undefined}
      tabIndex={targetPath ? 0 : undefined}
      onClick={openTarget}
      onKeyDown={handleKeyDown}
    >
      <div className="cmi-v3-forum-post-media" aria-hidden="true">
        {imageUrl ? (
          <img src={imageUrl} alt="" />
        ) : (
          <span>
            <Users size={23} strokeWidth={2.7} />
          </span>
        )}
      </div>
      <FeedAssociationTag tag={getBlackboardAssociationTag(post, events)} />

      <div className="cmi-v3-forum-post-content">
        <div className="cmi-v3-feed-head cmi-v3-forum-post-head">
          <span className="cmi-v3-avatar cmi-v3-feed-user-avatar">
            <img src={avatarUrl} alt="" />
          </span>
          <div>
            <strong>{authorName}</strong>
            <span>{formatBlackboardCreatedLabel(post.created_at)}</span>
          </div>
        </div>

        <p>{post.body}</p>
      </div>
    </article>
  );
}

function RecommendationFeedCard({
  recommendation,
  activeRecIdForSticker,
  activeStickerId,
  associationTag,
  authorProfile,
  isWishlisted,
  placedStickers,
  onComment,
  onPlaceStamp,
  onSelect,
  onStartStamp,
  onToggleWishlist,
}: {
  recommendation: Recommendation;
  activeRecIdForSticker: string | null;
  activeStickerId: string | null;
  associationTag: FeedAssociationTagData | null;
  authorProfile: PublicProfile | null;
  isWishlisted: boolean;
  placedStickers: PlacedSticker[];
  onComment: () => void;
  onPlaceStamp: (event: ReactMouseEvent<HTMLElement>, recommendationId: string) => void;
  onSelect: () => void;
  onStartStamp: () => void;
  onToggleWishlist: () => void;
}) {
  const categoryConfig = getCategoryConfig(recommendation.category);
  const imageUrl = recommendation.images[0] || categoryConfig.iconUrl;
  const authorName = recommendation.user_name || authorProfile?.user_name || 'CMI 朋友';
  const authorAvatarUrl = authorProfile?.avatar_url?.trim() ?? '';
  const isStampTargetActive = activeStickerId && activeRecIdForSticker === recommendation.id;

  return (
    <article
      className={`cmi-v3-feed-card cmi-v3-feed-post-card cmi-v3-feed-card--${getRecommendationTone(recommendation)} ${
        isStampTargetActive ? 'is-stamp-target' : ''
      }`}
      onClick={(event) => {
        if (isStampTargetActive) {
          onPlaceStamp(event, recommendation.id);
          return;
        }
        onSelect();
      }}
    >
      <PlacedStickerLayer placements={placedStickers} variant="feed" />
      <img className="cmi-v3-feed-post-image" src={imageUrl} alt={recommendation.place_name} />
      <FeedAssociationTag tag={associationTag} />
      <div className="cmi-v3-feed-post-content">
        <div className="cmi-v3-feed-head">
          <span className="cmi-v3-avatar cmi-v3-feed-user-avatar" aria-hidden="true">
            {authorAvatarUrl ? <img src={authorAvatarUrl} alt="" /> : getUserInitial(authorName)}
          </span>
          <div>
            <strong>{authorName}</strong>
            <span>{formatTraceTime(recommendation.created_at)}</span>
          </div>
        </div>
        <p>{getRecommendationSummary(recommendation)}</p>
      </div>
      <RecommendationActionButtons
        isWishlisted={isWishlisted}
        onComment={onComment}
        onStamp={onStartStamp}
        onWishlist={onToggleWishlist}
        variant="feed"
      />
    </article>
  );
}

function FeedAssociationTag({ tag }: { tag: FeedAssociationTagData | null }) {
  if (!tag) return null;

  return (
    <span
      className={`cmi-v3-feed-association-tag cmi-v3-feed-association-tag--${tag.kind}`}
      aria-label={`${tag.kind === 'event' ? '关联活动' : '关联地点'}：${tag.label}`}
      title={tag.label}
    >
      {tag.label}
    </span>
  );
}

function RecommendationActionButtons({
  isWishlisted,
  onComment,
  onStamp,
  onWishlist,
  variant,
}: {
  isWishlisted: boolean;
  onComment: () => void;
  onStamp: () => void;
  onWishlist: () => void;
  variant: 'feed' | 'pulse';
}) {
  const handleActionClick = (event: ReactMouseEvent<HTMLButtonElement>, action: () => void) => {
    event.stopPropagation();
    action();
  };

  return (
    <div className={`cmi-v3-recommendation-actions cmi-v3-recommendation-actions--${variant}`}>
      <button type="button" onClick={(event) => handleActionClick(event, onStamp)} aria-label="盖戳" title="盖戳">
        <StickerIcon size={16} strokeWidth={3} />
        <span className="cmi-v3-feed-action-label">盖戳</span>
      </button>
      <button
        type="button"
        className={isWishlisted ? 'is-active' : undefined}
        onClick={(event) => handleActionClick(event, onWishlist)}
        aria-label={isWishlisted ? '取消收藏' : '收藏'}
        aria-pressed={isWishlisted}
        title="收藏"
      >
        <Bookmark size={16} strokeWidth={3} />
        <span className="cmi-v3-feed-action-label">收藏</span>
      </button>
      <button type="button" onClick={(event) => handleActionClick(event, onComment)} aria-label="评论" title="评论">
        <MessageCircle size={16} strokeWidth={3} />
        <span className="cmi-v3-feed-action-label">评论</span>
      </button>
    </div>
  );
}

function PlacedStickerLayer({
  placements = [],
  variant,
}: {
  placements?: PlacedSticker[];
  variant: 'feed' | 'pulse';
}) {
  if (placements.length === 0) return null;

  return (
    <div className={`cmi-v3-placed-sticker-layer cmi-v3-placed-sticker-layer--${variant}`} aria-hidden="true">
      {placements.map(placement => {
        if (!placement.sticker?.icon_url) return null;

        return (
          <span
            key={placement.id}
            className="cmi-v3-placed-sticker"
            style={{
              left: `${placement.x_ratio}%`,
              top: `${placement.y_ratio}%`,
              transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
            }}
          >
            <img src={placement.sticker.icon_url} alt="" />
          </span>
        );
      })}
    </div>
  );
}

function StickerDrawer({
  availableStickers,
  isOpen,
  onClose,
  onSelectSticker,
}: {
  availableStickers: Sticker[];
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (stickerId: string) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="cmi-v3-sticker-drawer" role="dialog" aria-modal="true" aria-label="选择盖戳图章">
      <button type="button" className="cmi-v3-sticker-drawer-backdrop" onClick={onClose} aria-label="关闭盖戳选择" />
      <div className="cmi-v3-sticker-drawer-panel">
        <div className="cmi-v3-sticker-drawer-title">
          <StickerIcon size={20} strokeWidth={3} />
          <strong>选择一个图章</strong>
        </div>
        {availableStickers.length > 0 ? (
          <div className="cmi-v3-sticker-grid">
            {availableStickers.map(sticker => (
              <button
                key={sticker.id}
                type="button"
                className="cmi-v3-sticker-option"
                onClick={() => onSelectSticker(sticker.id)}
              >
                <span>
                  <img src={sticker.icon_url} alt="" />
                </span>
                <strong>{sticker.name}</strong>
              </button>
            ))}
          </div>
        ) : (
          <p className="cmi-v3-sticker-loading">正在准备图章</p>
        )}
      </div>
    </div>
  );
}

function EventListCard({
  event,
  isSharing,
  registrationState,
  onOpenRealPage,
  onOpenMap,
  onRegister,
  onShare,
}: {
  event: CmiEvent;
  isSharing: boolean;
  registrationState: EventListRegistrationButtonState;
  onOpenRealPage: () => void;
  onOpenMap: () => void;
  onRegister: () => void;
  onShare: () => void;
}) {
  const registrationPreviewLabel = getCmiEventRegistrationPreviewLabel(event);
  const visibleTags = event.tags.slice(0, 4);
  const statusBadge = getEventStatusBadge(event);
  const handleActionClick = (clickEvent: ReactMouseEvent<HTMLButtonElement>, action: () => void) => {
    clickEvent.stopPropagation();
    action();
  };
  const handleCardKeyDown = (keyboardEvent: KeyboardEvent<HTMLElement>) => {
    if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;
    keyboardEvent.preventDefault();
    onOpenRealPage();
  };

  return (
    <article
      className={`cmi-v3-event-card cmi-v3-feed-card--${getEventTone(event)}`}
      role="link"
      tabIndex={0}
      aria-label={`查看 ${event.title} 活动详情`}
      onClick={onOpenRealPage}
      onKeyDown={handleCardKeyDown}
    >
      <div className="cmi-v3-event-card-media">
        <img src={getCmiEventCardImageUrl(event)} alt={`${event.title}活动海报`} />
        <span className={`cmi-v3-event-status-badge cmi-v3-event-status-badge--${statusBadge.tone}`}>
          {statusBadge.label}
        </span>
      </div>
      <div className="cmi-v3-event-card-copy">
        <h2>{event.title}</h2>
        <p>{event.summary}</p>

        {visibleTags.length > 0 && (
          <div className="cmi-v3-event-card-tags" aria-label="活动标签">
            {visibleTags.map(tag => <span key={tag}>{tag}</span>)}
          </div>
        )}

        <div className="cmi-v3-event-card-info">
          <div className="cmi-v3-event-card-line">
            <Calendar size={16} strokeWidth={3} />
            <span>{formatCmiEventTime(event)}</span>
          </div>
          <div className="cmi-v3-event-card-line">
            <MapPin size={16} strokeWidth={3} />
            <span>{event.venueName}</span>
          </div>
          <div className="cmi-v3-event-card-detail-grid">
            <div>
              <span>费用</span>
              <strong>{event.priceLabel}</strong>
            </div>
            <div>
              <span>参与</span>
              <strong>{registrationPreviewLabel}</strong>
            </div>
          </div>
        </div>

        <div className="cmi-v3-card-actions cmi-v3-event-card-actions">
          <button type="button" onClick={(clickEvent) => handleActionClick(clickEvent, onShare)} disabled={isSharing}>{isSharing ? '生成中' : '分享'}</button>
          <button
            type="button"
            className={`cmi-v3-event-register-button--${registrationState.tone}`}
            aria-disabled={registrationState.disabled}
            tabIndex={registrationState.disabled ? -1 : undefined}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              if (registrationState.disabled) return;
              onRegister();
            }}
            onKeyDown={(keyboardEvent) => keyboardEvent.stopPropagation()}
            aria-label={registrationState.ariaLabel}
          >
            {registrationState.label}
          </button>
          <button type="button" onClick={(clickEvent) => handleActionClick(clickEvent, onOpenMap)}>地图</button>
        </div>
      </div>
    </article>
  );
}

function EventShareSheet({
  event,
  isSharing,
  onClose,
  onShareToBlackboard,
  onShareOutside,
}: {
  event: CmiEvent;
  isSharing: boolean;
  onClose: () => void;
  onShareToBlackboard: () => void;
  onShareOutside: () => void;
}) {
  return (
    <div className="cmi-v3-event-share-sheet" role="presentation">
      <button
        type="button"
        className="cmi-v3-event-share-backdrop"
        aria-label="关闭活动分享"
        onClick={onClose}
      />
      <section
        className="cmi-v3-event-share-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`分享活动：${event.title}`}
      >
        <div className="cmi-v3-event-share-title">
          <img src={getCmiEventCardImageUrl(event)} alt="" />
          <div>
            <strong>分享这个活动</strong>
            <span>{event.title}</span>
          </div>
        </div>

        <button type="button" className="cmi-v3-event-share-option is-primary" onClick={onShareToBlackboard}>
          <MessageCircle size={20} strokeWidth={3} />
          <span>
            <strong>回到动态页</strong>
            <em>活动招募帖子现在统一显示在动态信息流里。</em>
          </span>
        </button>

        <button
          type="button"
          className="cmi-v3-event-share-option"
          disabled={isSharing}
          onClick={onShareOutside}
        >
          <Share2 size={20} strokeWidth={3} />
          <span>
            <strong>{isSharing ? '正在生成分享图' : '分享到其他平台 / 保存图片'}</strong>
            <em>{formatCmiEventTime(event)} · {event.venueName}</em>
          </span>
        </button>

        <button type="button" className="cmi-v3-event-share-cancel" onClick={onClose}>
          取消
        </button>
      </section>
    </div>
  );
}

function ComicPage({
  title,
  actionLabel,
  children,
  footer,
  headerContent,
  hideTitle = false,
  onTitleClick,
  onActionClick,
}: {
  title: string;
  actionLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  headerContent?: ReactNode;
  hideTitle?: boolean;
  onTitleClick: () => void;
  onActionClick?: () => void;
}) {
  const hasAction = Boolean(actionLabel && onActionClick);
  const topbarClassName = [
    'cmi-v3-comic-topbar',
    hideTitle ? 'cmi-v3-comic-topbar--action-only' : '',
    headerContent ? 'cmi-v3-comic-topbar--custom' : '',
  ].filter(Boolean).join(' ');

  return (
    <section className="cmi-v3-comic-page">
      <span className="cmi-v3-bg-ring cmi-v3-bg-ring--left" />
      <span className="cmi-v3-bg-ring cmi-v3-bg-ring--right" />
      <header className={topbarClassName}>
        {headerContent ?? (
          <>
            {!hideTitle && <button type="button" className="cmi-v3-comic-brand" onClick={onTitleClick}>{title}</button>}
            {hasAction && (
              <button type="button" className="cmi-v3-comic-action" onClick={onActionClick}>
                {actionLabel === '分享' ? <Share2 size={18} strokeWidth={3} /> : actionLabel === '地图' ? <MapIcon size={18} strokeWidth={3} /> : <Menu size={18} strokeWidth={3} />}
                <span>{actionLabel}</span>
              </button>
            )}
          </>
        )}
      </header>
      <div className="cmi-v3-comic-scroll">
        {children}
      </div>
      {footer}
    </section>
  );
}

function CmiV3BottomNav({
  activeScreen,
  onAdd,
  onNavigate,
}: {
  activeScreen: PrimaryScreenId;
  onAdd: () => void;
  onNavigate: (screen: ScreenId, input?: { eventId?: string | null }) => void;
}) {
  const addAriaLabel = activeScreen === 'events' ? '拍照返图' : '拍照发动态';

  return (
    <footer className="cmi-v3-map-bottom" aria-label="CMI Map 主导航">
      <button
        type="button"
        className={activeScreen === 'map' ? 'is-active' : undefined}
        aria-current={activeScreen === 'map' ? 'page' : undefined}
        onClick={() => onNavigate('map')}
      >
        <span className="cmi-v3-map-bottom-icon cmi-v3-map-bottom-icon--map">
          <MapIcon size={23} strokeWidth={3} />
        </span>
        地图
      </button>
      <button
        type="button"
        className={activeScreen === 'feed' ? 'is-active' : undefined}
        aria-current={activeScreen === 'feed' ? 'page' : undefined}
        onClick={() => onNavigate('feed')}
      >
        <span className="cmi-v3-map-bottom-icon cmi-v3-map-bottom-icon--feed">
          <Megaphone size={24} strokeWidth={3} />
        </span>
        动态
      </button>
      <button
        type="button"
        className={activeScreen === 'events' ? 'is-active' : undefined}
        aria-current={activeScreen === 'events' ? 'page' : undefined}
        onClick={() => onNavigate('events')}
      >
        <span className="cmi-v3-map-bottom-icon cmi-v3-map-bottom-icon--event">
          <Calendar size={24} strokeWidth={3} />
        </span>
        活动
      </button>
      <button
        type="button"
        className={`cmi-v3-map-bottom-add-button ${activeScreen === 'publish' ? 'is-active' : ''}`}
        onClick={onAdd}
        aria-current={activeScreen === 'publish' ? 'page' : undefined}
        aria-label={addAriaLabel}
      >
        <span className="cmi-v3-map-bottom-add-icon">
          <img src="/map-icons/cmi-flat-v2/wild-magnifier-checkin.png" alt="" />
        </span>
        打卡拍照
      </button>
    </footer>
  );
}

function ChapterHeader({ left, right }: { left: string; right?: string }) {
  return (
    <div className="cmi-v3-chapter-row">
      <span>{left}</span>
      {right && <span>{right}</span>}
    </div>
  );
}

function FormCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cmi-v3-form-card">
      <p>{label}</p>
      {children}
    </div>
  );
}
