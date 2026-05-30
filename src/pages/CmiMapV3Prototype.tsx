import {
  Calendar,
  Camera,
  Heart,
  List,
  Map as MapIcon,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Plus,
  Search,
  Share2,
  Users,
  X,
} from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LeafletMap } from '@/components/map/LeafletMap';
import { getCmiEventCardImageUrl } from '@/components/intent/event-card-presentation';
import { CMI_EVENTS, formatCmiEventTime, type CmiEvent } from '@/data/cmi-events';
import { getAllRecommendations } from '@/db/api';
import { getPublishedCmiEvents } from '@/db/cmi-events';
import {
  getAddTracePath,
  getCmiEventCreatePath,
  getCmiEventPath,
  getPlaceMapPath,
  getPlacePath,
} from '@/lib/paths';
import {
  CMI_INN_PLACE_NAME,
  getCategoryConfig,
  isPublicMapRecommendation,
  normalizeCategory,
  type Category,
  type MapMarker,
  type Recommendation,
} from '@/types/types';
import './cmi-map-v3-prototype.css';

type ScreenId = 'map' | 'feed' | 'publish' | 'events' | 'eventDetail';
type MapFilterId = 'all' | 'food' | 'play' | 'events' | 'easter';
type FeedCardTone = 'paper' | 'yellow' | 'green' | 'pink';
type SheetSnap = 'collapsed' | 'expanded';
type SheetDragSource = 'pointer' | 'mouse' | 'touch';

interface FilterItem {
  id: MapFilterId;
  label: string;
  iconUrl?: string;
}

interface EventMarker extends MapMarker {
  eventId: string;
}

const mapFilters: FilterItem[] = [
  { id: 'all', label: '全部' },
  { id: 'food', label: '好吃', iconUrl: '/map-icons/cmi-flat-v2/direct-eat.png' },
  { id: 'play', label: '好玩', iconUrl: '/map-icons/cmi-flat-v2/direct-play.png' },
  { id: 'events', label: '活动', iconUrl: '/map-icons/cmi-flat-v2/home-events.png' },
  { id: 'easter', label: '彩蛋', iconUrl: '/map-icons/cmi-easter-v2/egg-v2-03-cat-face.png' },
];

const screenIds: ScreenId[] = ['map', 'feed', 'publish', 'events', 'eventDetail'];
const SHEET_OPEN_THRESHOLD = -44;
const SHEET_CLOSE_THRESHOLD = 54;
const SHEET_DRAG_LIMIT = 160;

const foodCategories = new Set<Category>(['吃饭', '咖啡', '市集']);
const playCategories = new Set<Category>(['户外', '景点', '购物', '运动', '酒吧', '身心']);

function resolveScreenId(value: string | null): ScreenId {
  return screenIds.find(screen => screen === value) ?? 'map';
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

function getRecommendationSummary(recommendation: Recommendation) {
  const reason = recommendation.reason.trim();
  return reason || '这个地点还缺一句现场感，等社区成员补上。';
}

function recommendationMatchesFilter(recommendation: Recommendation, filterId: MapFilterId) {
  if (filterId === 'all') return true;
  const category = normalizeCategory(recommendation.category);
  if (filterId === 'food') return foodCategories.has(category);
  if (filterId === 'play') return playCategories.has(category);
  if (filterId === 'easter') return category === '彩蛋';
  return false;
}

function groupRecommendationsIntoMarkers(recommendations: Recommendation[]): MapMarker[] {
  const markerMap = new globalThis.Map<string, MapMarker>();

  recommendations.forEach(recommendation => {
    const key = recommendation.place_name.trim();
    if (!key) return;

    if (!markerMap.has(key)) {
      markerMap.set(key, {
        id: recommendation.id,
        place_name: recommendation.place_name,
        category: recommendation.category,
        latitude: recommendation.latitude,
        longitude: recommendation.longitude,
        recommendations: [],
      });
    }

    markerMap.get(key)?.recommendations.push(recommendation);
  });

  return Array.from(markerMap.values());
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
      },
    }];
  });
}

function isEventMarker(marker: MapMarker): marker is EventMarker {
  return marker.id.startsWith('event:') && 'eventId' in marker;
}

function useBottomSheetDrag(itemId: string) {
  const [snap, setSnap] = useState<SheetSnap>('collapsed');
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ y: number; snap: SheetSnap; source: SheetDragSource } | null>(null);
  const suppressNextClickRef = useRef(false);

  useEffect(() => {
    setSnap('collapsed');
    setDragOffset(0);
    setIsDragging(false);
    dragStartRef.current = null;
  }, [itemId]);

  const isInteractiveTarget = (target: EventTarget) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('button, a'));
  };

  const updateDrag = useCallback((clientY: number) => {
    if (!dragStartRef.current) return;

    const deltaY = clientY - dragStartRef.current.y;
    setDragOffset(Math.max(-SHEET_DRAG_LIMIT, Math.min(SHEET_DRAG_LIMIT, deltaY)));
  }, []);

  const settleDrag = useCallback((clientY: number) => {
    const dragStart = dragStartRef.current;
    if (!dragStart) return;

    const deltaY = clientY - dragStart.y;
    const shouldExpand = dragStart.snap === 'collapsed' && deltaY <= SHEET_OPEN_THRESHOLD;
    const shouldCollapse = dragStart.snap === 'expanded' && deltaY >= SHEET_CLOSE_THRESHOLD;

    if (Math.abs(deltaY) > 8) {
      suppressNextClickRef.current = true;
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 250);
    }
    setSnap(current => {
      if (shouldExpand) return 'expanded';
      if (shouldCollapse) return 'collapsed';
      return current;
    });
    setDragOffset(0);
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const startDrag = useCallback((clientY: number, source: SheetDragSource) => {
    if (dragStartRef.current) return;

    dragStartRef.current = { y: clientY, snap, source };
    setIsDragging(true);
    setDragOffset(0);
  }, [snap]);

  useEffect(() => {
    if (!isDragging) return;

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

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, settleDrag, updateDrag]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (isInteractiveTarget(event.target)) return;

    startDrag(event.clientY, 'pointer');
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragStartRef.current?.source !== 'pointer') return;
    updateDrag(event.clientY);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragStartRef.current?.source !== 'pointer') return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    settleDrag(event.clientY);
  };

  const handlePointerCancel = () => {
    setDragOffset(0);
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;
    startDrag(event.clientY, 'mouse');
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
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

    setSnap(current => current === 'expanded' ? 'collapsed' : 'expanded');
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeScreen, setActiveScreen] = useState<ScreenId>(() => resolveScreenId(searchParams.get('screen')));
  const [activeFilter, setActiveFilter] = useState<MapFilterId>('all');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [events, setEvents] = useState<CmiEvent[]>(CMI_EVENTS);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => searchParams.get('event'));
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  const handleNavigate = (screen: ScreenId, input?: { eventId?: string | null }) => {
    setActiveScreen(screen);
    if (input?.eventId) {
      setSelectedEventId(input.eventId);
      if (screen === 'map') setSelectedMarker(null);
    } else if (screen !== 'eventDetail') {
      setSelectedEventId(null);
    }

    const nextParams = new URLSearchParams();
    if (screen !== 'map') nextParams.set('screen', screen);
    if (input?.eventId) nextParams.set('event', input.eventId);
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    setIsLoadingRecommendations(true);
    getAllRecommendations({ throwOnError: true })
      .then(data => {
        const publicRecommendations = data.filter(isPublicMapRecommendation);
        setRecommendations(publicRecommendations);
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

  const filteredRecommendations = useMemo(
    () => recommendations.filter(recommendation => recommendationMatchesFilter(recommendation, activeFilter)),
    [activeFilter, recommendations]
  );

  const visibleEvents = useMemo(
    () => events
      .filter(event => activeFilter === 'all' || activeFilter === 'events')
      .slice(0, 12),
    [activeFilter, events]
  );

  const mapMarkers = useMemo(
    () => [
      ...groupRecommendationsIntoMarkers(filteredRecommendations),
      ...getEventMarkers(visibleEvents),
    ],
    [filteredRecommendations, visibleEvents]
  );

  const feedRecommendations = useMemo(
    () => recommendations.slice(0, 12),
    [recommendations]
  );

  const featuredEvents = useMemo(
    () => events.slice(0, 8),
    [events]
  );

  const selectedEvent = useMemo(
    () => events.find(event => event.id === selectedEventId) ?? events[0] ?? null,
    [events, selectedEventId]
  );

  return (
    <div className={`cmi-v3-screen cmi-v3-screen--${activeScreen}`}>
      {activeScreen === 'map' && (
        <MapMode
          activeFilter={activeFilter}
          filters={mapFilters}
          isLoading={isLoadingRecommendations || isLoadingEvents}
          markers={mapMarkers}
          recommendationsError={recommendationsError}
          listEvents={visibleEvents}
          listRecommendations={filteredRecommendations}
          selectedMarker={selectedMarker}
          selectedEvent={selectedEventId ? selectedEvent : null}
          onClearSelection={() => {
            setSelectedMarker(null);
            setSelectedEventId(null);
          }}
          onFilterChange={setActiveFilter}
          onMarkerSelect={(marker) => {
            if (isEventMarker(marker)) {
              const event = events.find(item => item.id === marker.eventId);
              setSelectedEventId(event?.id ?? marker.eventId);
              setSelectedMarker(null);
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
          isLoading={isLoadingRecommendations}
          recommendations={feedRecommendations}
          onNavigate={handleNavigate}
          onOpenPath={navigate}
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
          events={featuredEvents}
          isLoading={isLoadingEvents}
          onNavigate={handleNavigate}
          onOpenPath={navigate}
        />
      )}
      {activeScreen === 'eventDetail' && selectedEvent && (
        <EventDetailMode
          event={selectedEvent}
          onNavigate={handleNavigate}
          onOpenPath={navigate}
        />
      )}
    </div>
  );
}

function MapMode({
  activeFilter,
  filters,
  markers,
  listEvents,
  listRecommendations,
  selectedMarker,
  selectedEvent,
  isLoading,
  recommendationsError,
  onClearSelection,
  onFilterChange,
  onMarkerSelect,
  onNavigate,
  onOpenPath,
}: {
  activeFilter: MapFilterId;
  filters: FilterItem[];
  markers: MapMarker[];
  listEvents: CmiEvent[];
  listRecommendations: Recommendation[];
  selectedMarker: MapMarker | null;
  selectedEvent: CmiEvent | null;
  isLoading: boolean;
  recommendationsError: string | null;
  onClearSelection: () => void;
  onFilterChange: (filterId: MapFilterId) => void;
  onMarkerSelect: (marker: MapMarker) => void;
  onNavigate: (screen: ScreenId, input?: { eventId?: string | null }) => void;
  onOpenPath: (path: string) => void;
}) {
  const selectedRecommendation = selectedMarker?.recommendations[0] ?? null;
  const handleRecommendationSelect = (recommendation: Recommendation) => {
    const matchedMarker = markers.find(marker =>
      marker.recommendations.some(item => item.id === recommendation.id)
    );
    if (matchedMarker) onMarkerSelect(matchedMarker);
  };

  return (
    <section className="cmi-v3-map-mode" aria-label="CMI Map 3.0 地图形态页">
      <LeafletMap
        markers={markers}
        onMarkerClick={onMarkerSelect}
        defaultZoom={13.3}
        constrainToChiangMai
        className="cmi-v3-live-map"
      />

      <header className="cmi-v3-map-topbar">
        <button type="button" className="cmi-v3-map-brand" onClick={() => onNavigate('feed')}>
          CMI Map
        </button>
        <button type="button" className="cmi-v3-map-search" onClick={() => onNavigate('feed')}>
          <Search size={16} strokeWidth={3} />
          <span>搜动态 / 地点</span>
        </button>
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

      {(isLoading || recommendationsError) && (
        <div className="cmi-v3-map-state">
          {recommendationsError ?? '正在同步社区动态和活动'}
        </div>
      )}

      {selectedRecommendation ? (
        <MapBottomSheet
          itemId={`recommendation:${selectedRecommendation.id}`}
          imageAlt={selectedRecommendation.place_name}
          imageUrl={selectedRecommendation.images[0] || getCategoryConfig(selectedRecommendation.category).iconUrl}
          meta={`${selectedRecommendation.user_name || 'CMI 朋友'} · ${formatTraceTime(selectedRecommendation.created_at)}`}
          primaryAction={{
            label: '详情',
            onClick: () => onOpenPath(getPlacePath(selectedRecommendation.place_name)),
          }}
          secondaryAction={{
            label: '补一句',
            onClick: () => onOpenPath(getAddTracePath(selectedRecommendation.place_name)),
          }}
          title={selectedRecommendation.place_name}
          onDismiss={onClearSelection}
        >
          <RecommendationSheetBody recommendations={selectedMarker?.recommendations ?? [selectedRecommendation]} />
        </MapBottomSheet>
      ) : selectedEvent ? (
        <MapBottomSheet
          itemId={`event:${selectedEvent.id}`}
          imageAlt={selectedEvent.title}
          imageUrl={getCmiEventCardImageUrl(selectedEvent)}
          meta={`${formatCmiEventTime(selectedEvent)} · ${selectedEvent.venueName}`}
          primaryAction={{
            label: '详情',
            onClick: () => onNavigate('eventDetail', { eventId: selectedEvent.id }),
          }}
          secondaryAction={{
            label: '报名',
            onClick: () => onOpenPath(getCmiEventPath(selectedEvent.id)),
          }}
          title={selectedEvent.title}
          onDismiss={onClearSelection}
        >
          <EventSheetBody event={selectedEvent} />
        </MapBottomSheet>
      ) : (
        <MapPulseSheet
          events={listEvents}
          isLoading={isLoading}
          recommendations={listRecommendations}
          onEventSelect={(event) => onNavigate('map', { eventId: event.id })}
          onOpenPath={onOpenPath}
          onRecommendationSelect={handleRecommendationSelect}
        />
      )}

      <footer className="cmi-v3-map-bottom">
        <button type="button" onClick={() => onNavigate('feed')}>
          <Navigation size={18} strokeWidth={3} />
          动态
        </button>
        <button type="button" onClick={() => onOpenPath('/mark')}>
          <Plus size={22} strokeWidth={3} />
          留个彩蛋
        </button>
      </footer>
    </section>
  );
}

function MapBottomSheet({
  children,
  imageAlt,
  imageUrl,
  itemId,
  meta,
  primaryAction,
  secondaryAction,
  title,
  onDismiss,
}: {
  children: ReactNode;
  imageAlt: string;
  imageUrl: string;
  itemId: string;
  meta: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction: { label: string; onClick: () => void };
  title: string;
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

  return (
    <article
      className={sheetClassName}
      data-sheet-state={snap}
      style={sheetStyle}
    >
      {onDismiss && (
        <button type="button" className="cmi-v3-selected-note-close" onClick={onDismiss} aria-label="关闭详情">
          <X size={18} strokeWidth={3} />
        </button>
      )}
      <div className="cmi-v3-selected-note-grabber" aria-hidden="true" />
      <div
        className="cmi-v3-selected-note-summary"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={title}
        onKeyDown={handleSummaryKeyDown}
        {...dragHandlers}
      >
        <img src={imageUrl} alt={imageAlt} />
        <div>
          <h2>{title}</h2>
          <p>{meta}</p>
        </div>
      </div>
      <div className="cmi-v3-selected-note-body">
        <div className="cmi-v3-selected-note-actions">
          <button type="button" onClick={primaryAction.onClick}>{primaryAction.label}</button>
          <button type="button" onClick={secondaryAction.onClick}>{secondaryAction.label}</button>
        </div>
        {children}
      </div>
    </article>
  );
}

function MapPulseSheet({
  events,
  isLoading,
  recommendations,
  onEventSelect,
  onOpenPath,
  onRecommendationSelect,
}: {
  events: CmiEvent[];
  isLoading: boolean;
  recommendations: Recommendation[];
  onEventSelect: (event: CmiEvent) => void;
  onOpenPath: (path: string) => void;
  onRecommendationSelect: (recommendation: Recommendation) => void;
}) {
  const { dragHandlers, dragOffset, isDragging, setSnap, snap } = useBottomSheetDrag('map-pulse');
  const isExpanded = snap === 'expanded';
  const sheetStyle = { '--cmi-v3-sheet-drag-y': `${dragOffset}px` } as CSSProperties;
  const visibleRecommendations = recommendations.slice(0, 8);
  const visibleEvents = events.slice(0, 4);

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
      aria-label="本地生活脉搏"
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
        <div className="cmi-v3-map-pulse-head">
          <div>
            <h2>本地生活脉搏</h2>
            <p>附近的人刚留下的新鲜事</p>
          </div>
        </div>
      </div>

      <div className="cmi-v3-map-pulse-body">
        <div className="cmi-v3-map-pulse-rank">
          <span>地图人气热榜</span>
        </div>

        {isLoading && <p className="cmi-v3-map-pulse-state">正在同步社区动态</p>}

        {visibleRecommendations.length > 0 && (
          <div className="cmi-v3-map-pulse-row" aria-label="附近动态">
            {visibleRecommendations.map(recommendation => (
              <button
                key={recommendation.id}
                type="button"
                className="cmi-v3-map-pulse-card"
                onClick={() => onRecommendationSelect(recommendation)}
              >
                <img
                  src={recommendation.images[0] || getCategoryConfig(recommendation.category).iconUrl}
                  alt=""
                />
                <strong>{recommendation.place_name}</strong>
                <span>{`${recommendation.user_name || 'CMI 朋友'} · ${formatTraceTime(recommendation.created_at)}`}</span>
                <p>{getRecommendationSummary(recommendation)}</p>
              </button>
            ))}
          </div>
        )}

        {isExpanded && visibleEvents.length > 0 && (
          <div className="cmi-v3-map-pulse-section">
            <strong>附近活动</strong>
            {visibleEvents.map(event => (
              <button
                key={event.id}
                type="button"
                className="cmi-v3-map-pulse-event"
                onClick={() => onEventSelect(event)}
              >
                <img src={getCmiEventCardImageUrl(event)} alt="" />
                <div>
                  <span>{formatCmiEventTime(event)}</span>
                  <strong>{event.title}</strong>
                  <p>{event.venueName}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {isExpanded && (
          <div className="cmi-v3-map-pulse-actions">
            <button type="button" onClick={() => onOpenPath('/mark')}>留个彩蛋</button>
            <button type="button" onClick={() => onOpenPath(getCmiEventCreatePath())}>发布活动</button>
          </div>
        )}
      </div>
    </section>
  );
}

function RecommendationSheetBody({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <div className="cmi-v3-selected-note-thread">
      <strong>这个地点的最近动态</strong>
      {recommendations.slice(0, 4).map(recommendation => (
        <article key={recommendation.id}>
          <span>{`${recommendation.user_name || 'CMI 朋友'} · ${formatTraceTime(recommendation.created_at)}`}</span>
          <p>{getRecommendationSummary(recommendation)}</p>
        </article>
      ))}
    </div>
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
  recommendations,
  isLoading,
  onNavigate,
  onOpenPath,
}: {
  recommendations: Recommendation[];
  isLoading: boolean;
  onNavigate: (screen: ScreenId, input?: { eventId?: string | null }) => void;
  onOpenPath: (path: string) => void;
}) {
  return (
    <ComicPage
      title="CMI Map"
      actionLabel="地图"
      hideTitle
      onTitleClick={() => onNavigate('map')}
      onActionClick={() => onNavigate('map')}
    >
      <FeedEventSwitch activeScreen="feed" onNavigate={onNavigate} />

      <section className="cmi-v3-hard-card cmi-v3-feed-hero cmi-v3-dot-paper">
        <ChapterHeader left="Today in Chiang Mai" right="CMI Community Feed" />
        <img src="/cmi-home/yard-scene.jpg" alt="清迈客栈院子" />
        <h1>今天清迈发生了什么</h1>
        <p>附近的人留下了新的吃饭、散步和小发现。</p>
      </section>

      {isLoading && <p className="cmi-v3-inline-state">正在同步社区动态</p>}

      {recommendations.map(recommendation => (
        <RecommendationFeedCard
          key={recommendation.id}
          recommendation={recommendation}
          onOpenMap={() => onOpenPath(getPlaceMapPath(recommendation.place_name))}
          onOpenPlace={() => onOpenPath(getPlacePath(recommendation.place_name))}
          onAddTrace={() => onOpenPath(getAddTracePath(recommendation.place_name))}
        />
      ))}

      {!isLoading && recommendations.length === 0 && (
        <p className="cmi-v3-inline-state">还没有新的社区动态。</p>
      )}

      <button type="button" className="cmi-v3-floating-create" onClick={() => onOpenPath('/mark')}>
        <Plus size={22} strokeWidth={3} />
      </button>
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
    <ComicPage title="留个彩蛋" actionLabel="返回" onTitleClick={() => onNavigate('feed')} onActionClick={() => onNavigate('feed')}>
      <section className="cmi-v3-hard-card cmi-v3-publish-panel cmi-v3-dot-paper">
        <ChapterHeader left="New Moment" right="Use Existing Flow" />
        <h1>记录此刻</h1>
        <p>先用现有 V2 的发布能力跑起来：新地点走标记地点，已有地点走补一句，活动走发布活动。</p>

        <button type="button" className="cmi-v3-photo-uploader" onClick={() => onOpenPath('/mark')}>
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

        <FormCard label="活动">
          <div className="cmi-v3-place-row">
            <div>
              <strong>发起一场社区活动</strong>
              <span>复用现有活动发布和报名系统</span>
            </div>
            <button type="button" onClick={() => onOpenPath(getCmiEventCreatePath())}>发布</button>
          </div>
        </FormCard>

        <div className="cmi-v3-publish-actions">
          <button type="button" onClick={() => onOpenPath('/mark')}>标记新地点</button>
          <button type="button" onClick={() => onOpenPath(getAddTracePath(selectedPlaceName))}>给地点补一句</button>
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
  return (
    <ComicPage
      title="活动"
      headerContent={<FeedEventSwitch activeScreen="events" onNavigate={onNavigate} placement="top" />}
      footer={
        <button type="button" className="cmi-v3-events-create-fixed" onClick={() => onOpenPath(getCmiEventCreatePath())}>
          <Plus size={22} strokeWidth={3} />
          发布活动
        </button>
      }
      onTitleClick={() => onNavigate('feed')}
    >
      <section className="cmi-v3-hard-card cmi-v3-events-hero cmi-v3-dot-paper">
        <ChapterHeader left="CMI Events" right="what is happening" />
        <h1>最近可以去哪儿</h1>
        <p>活动不是公告板，是社区共同记忆的入口。</p>
        <div className="cmi-v3-event-tabs">
          {['正在发生', '即将开始', '刚结束', '我参加的'].map((tab, index) => (
            <button key={tab} type="button" className={index === 0 ? 'is-active' : undefined}>{tab}</button>
          ))}
        </div>
      </section>

      {isLoading && <p className="cmi-v3-inline-state">正在同步活动库</p>}

      {events.map(event => (
        <EventListCard
          key={event.id}
          event={event}
          onOpenDetail={() => onNavigate('eventDetail', { eventId: event.id })}
          onOpenRealPage={() => onOpenPath(getCmiEventPath(event.id))}
          onOpenMap={() => {
            if (!event.mapLocation) {
              onOpenPath(getCmiEventPath(event.id));
              return;
            }
            onNavigate('map', { eventId: event.id });
          }}
        />
      ))}
    </ComicPage>
  );
}

function EventDetailMode({
  event,
  onNavigate,
  onOpenPath,
}: {
  event: CmiEvent;
  onNavigate: (screen: ScreenId, input?: { eventId?: string | null }) => void;
  onOpenPath: (path: string) => void;
}) {
  return (
    <ComicPage title="活动详情" actionLabel="正式页" onTitleClick={() => onNavigate('events')} onActionClick={() => onOpenPath(getCmiEventPath(event.id))} footer={
      <div className="cmi-v3-fixed-footer">
        <button type="button" onClick={() => onNavigate('map', { eventId: event.id })}>在地图看</button>
        <button type="button" className="is-primary" onClick={() => onOpenPath(getCmiEventPath(event.id))}>报名参加</button>
      </div>
    }>
      <section className="cmi-v3-hard-card cmi-v3-feed-hero cmi-v3-dot-paper">
        <ChapterHeader left="Chapter Event" right={event.venueName} />
        <img className="cmi-v3-detail-poster" src={getCmiEventCardImageUrl(event)} alt={event.title} />
        <h1>{event.title}</h1>
        <p>{event.summary}</p>
      </section>

      <div className="cmi-v3-detail-meta">
        <MetaRow icon={<Calendar size={20} strokeWidth={3} />} title={formatCmiEventTime(event)} body={event.priceLabel} />
        <MetaRow icon={<MapPin size={20} strokeWidth={3} />} title={event.venueName} body={event.area} />
        <MetaRow icon={<Users size={20} strokeWidth={3} />} title={event.registrationLabel} body={event.hostName} />
      </div>

      <article className="cmi-v3-feed-card cmi-v3-feed-card--paper">
        <div className="cmi-v3-feed-head">
          <span className="cmi-v3-avatar"><Camera size={18} strokeWidth={3} /></span>
          <div>
            <strong>活动动态</strong>
            <span>现在先进入正式活动详情页报名和查看信息</span>
          </div>
          <em>V2</em>
        </div>
        <div className="cmi-v3-card-actions">
          <button type="button" onClick={() => onOpenPath(getCmiEventPath(event.id))}>打开正式页</button>
          <button type="button" onClick={() => onOpenPath(getCmiEventCreatePath())}>发布活动</button>
        </div>
      </article>
    </ComicPage>
  );
}

function RecommendationFeedCard({
  recommendation,
  onOpenMap,
  onOpenPlace,
  onAddTrace,
}: {
  recommendation: Recommendation;
  onOpenMap: () => void;
  onOpenPlace: () => void;
  onAddTrace: () => void;
}) {
  const categoryConfig = getCategoryConfig(recommendation.category);
  const imageUrl = recommendation.images[0] || categoryConfig.iconUrl;
  const categoryLabel = normalizeCategory(recommendation.category);

  return (
    <article className={`cmi-v3-feed-card cmi-v3-feed-post-card cmi-v3-feed-card--${getRecommendationTone(recommendation)}`}>
      <img className="cmi-v3-feed-post-image" src={imageUrl} alt={recommendation.place_name} />
      <div className="cmi-v3-feed-post-content">
        <div className="cmi-v3-feed-head">
          <span className="cmi-v3-avatar"><img src={categoryConfig.iconUrl} alt="" /></span>
          <div>
            <strong>{recommendation.user_name || 'CMI 朋友'}</strong>
            <span>{`${categoryLabel} · ${formatTraceTime(recommendation.created_at)}`}</span>
          </div>
        </div>
        <h2>{recommendation.place_name}</h2>
        <p>{getRecommendationSummary(recommendation)}</p>
        <div className="cmi-v3-card-actions">
          <button type="button" onClick={onOpenMap} aria-label="打开地图" title="地图">
            <MapPin size={16} strokeWidth={3} />
            <span className="cmi-v3-feed-action-label">地图</span>
          </button>
          <button type="button" onClick={onOpenPlace} aria-label="查看详情" title="详情">
            <Heart size={16} strokeWidth={3} />
            <span className="cmi-v3-feed-action-label">详情</span>
          </button>
          <button type="button" onClick={onAddTrace} aria-label="补一句" title="补一句">
            <MessageCircle size={16} strokeWidth={3} />
            <span className="cmi-v3-feed-action-label">补一句</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function EventListCard({
  event,
  onOpenDetail,
  onOpenRealPage,
  onOpenMap,
}: {
  event: CmiEvent;
  onOpenDetail: () => void;
  onOpenRealPage: () => void;
  onOpenMap: () => void;
}) {
  return (
    <article className={`cmi-v3-event-card cmi-v3-feed-card--${getEventTone(event)}`}>
      <img src={getCmiEventCardImageUrl(event)} alt={event.title} />
      <div>
        <span>{formatCmiEventTime(event)}</span>
        <h2>{event.title}</h2>
        <p>{event.summary}</p>
        <div className="cmi-v3-card-actions">
          <button type="button" onClick={onOpenDetail}>预览</button>
          <button type="button" onClick={onOpenRealPage}>报名</button>
          <button type="button" onClick={onOpenMap}>地图</button>
        </div>
      </div>
    </article>
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

function FeedEventSwitch({
  activeScreen,
  onNavigate,
  placement = 'content',
}: {
  activeScreen: 'feed' | 'events';
  onNavigate: (screen: ScreenId, input?: { eventId?: string | null }) => void;
  placement?: 'content' | 'top';
}) {
  return (
    <div className={`cmi-v3-mode-switch ${placement === 'top' ? 'cmi-v3-mode-switch--top' : ''}`}>
      <button
        type="button"
        className={activeScreen === 'feed' ? 'is-active' : undefined}
        onClick={() => onNavigate('feed')}
      >
        动态
      </button>
      <button
        type="button"
        className={activeScreen === 'events' ? 'is-active' : undefined}
        onClick={() => onNavigate('events')}
      >
        活动
      </button>
    </div>
  );
}

function ChapterHeader({ left, right }: { left: string; right: string }) {
  return (
    <div className="cmi-v3-chapter-row">
      <span>{left}</span>
      <span>{right}</span>
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

function MetaRow({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="cmi-v3-meta-row">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <em>{body}</em>
      </div>
    </div>
  );
}
