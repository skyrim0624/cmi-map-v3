import { CalendarDays, Copy, ExternalLink, List, LocateFixed, LogIn, Map as MapIcon, MapPinned, Navigation, Plus, Search, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { LeafletMap } from '@/components/map/LeafletMap';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  filterCmiNearbyWanderRecommendations,
  getCmiNearbyWanderPlaceTypeFilters,
  isCmiNearbyWanderPlaceTypeId,
} from '@/data/cmi-nearby-wander';
import {
  CMI_EVENT_VERIFICATION_LABELS,
  type CmiEvent,
  formatCmiEventTime,
  getCmiEventById,
  getCmiEventIdFromMarkerId,
  getCmiEventMapMarker,
  getCmiEventsForScene,
  getCmiEventTimeBucketLabel,
} from '@/data/cmi-events';
import {
  getCmiIntentSecondaryFilters,
  matchesCmiIntentSecondaryFilter,
} from '@/data/cmi-scene-tags';
import {
  getCmiScene,
  getCmiSceneRecommendationPresentation,
  getCmiSceneRecommendations,
} from '@/data/cmi-scenes';
import {
  type CmiMapFilterGroup,
  type CmiMapFilterGroupId,
  type CmiPlaceTypeTag,
  getCmiMapFilterGroup,
  getCmiMapFilterGroups,
  getCmiPrimaryIntentSceneIds,
  getCmiPlaceTypeTag,
  getCmiPlaceTypeTagsByIds,
  matchesCmiMapFilterGroup,
  matchesCmiPlaceTypeTag,
  matchesCmiRecommendationSearchQuery,
  resolveCmiMapFilterQuery,
} from '@/data/cmi-taxonomy';
import {
  getGuideSourceLabel,
  getPlaceGuide,
  isCommunityCuratedRecommendation,
} from '@/data/place-guides';
import { getAllRecommendations } from '@/db/api';
import { warmupImages } from '@/lib/image-warmup';
import {
  DEFAULT_CMI_EASTER_ICON_ID,
  getCmiEasterIconById,
  getCmiEasterIconUrl,
  getRecommendationEasterIconId,
  getRecommendationReasonText,
} from '@/lib/easter-icons';
import { getMapMarkerVisual } from '@/lib/map-marker-visual';
import { getPersonMapPath, getPlacePath, getSceneListPath, getSceneMapPath } from '@/lib/paths';
import type { MapMarker as MapMarkerType, Recommendation } from '@/types/types';

type ActiveFilter = `place:${string}`;
type MapCategoryFilter = {
  id: ActiveFilter;
  label: string;
  iconUrl: string;
  needsIcon?: boolean;
  kind: 'place';
  value: string;
};
type LocationStatus = 'idle' | 'locating' | 'ready' | 'error';
type MapFilterSelection = CmiMapFilterGroupId | 'all';
const DIRECT_INTENT_SCENE_IDS = new Set(getCmiPrimaryIntentSceneIds());
const EASTER_QUESTION_ICON_URL = getCmiEasterIconUrl(DEFAULT_CMI_EASTER_ICON_ID);
const EASTER_STAR_ICON_URL = getCmiEasterIconUrl('egg-v2-02-star');
const EASTER_EGG_MARKER_LIMIT = 28;
const LIFE_RESCUE_FILTER_LABELS: Record<string, string> = {
  'sim-internet': '电话卡',
  'cash-exchange': '换钱',
  'motorbike-transport': '租摩托',
  pharmacy: '买药',
  'clinic-hospital': '看医生',
  'visa-documents': '签证',
  'print-copy': '打印',
  'laundry-supplies': '洗衣',
  'daily-restock': '日用品',
  'haircut-care': '理发',
};

const normalizeMapPlaceName = (value: string) =>
  value.normalize('NFKC').trim().toLocaleLowerCase();

const createPlaceFilterId = (placeTypeId: string): ActiveFilter => `place:${placeTypeId}`;

const getStableHash = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const createEasterEggMarkers = (sourceMarkers: MapMarkerType[]): MapMarkerType[] => {
  const realEasterEggMarkers = sourceMarkers.flatMap((marker) => {
    const easterRecommendations = marker.recommendations.filter(recommendation => recommendation.category === '彩蛋');
    if (easterRecommendations.length === 0) return [];

    const icon = getCmiEasterIconById(getRecommendationEasterIconId(easterRecommendations[0]));

    return [{
      ...marker,
      id: `easter-real-${marker.id}`,
      category: '彩蛋' as const,
      recommendations: easterRecommendations,
      visualOverride: {
        label: icon.label,
        iconUrl: icon.url,
      },
    }];
  });

  if (realEasterEggMarkers.length > 0) return realEasterEggMarkers;

  return sourceMarkers
    .map((marker, index) => ({
      marker,
      index,
      score: getStableHash(`${marker.id}-${marker.place_name}`),
    }))
    .sort((left, right) => left.score - right.score)
    .slice(0, EASTER_EGG_MARKER_LIMIT)
    .map(({ marker, index, score }) => {
      const isExplored = score % 3 === 0;
      const latitudeOffset = ((score % 7) - 3) * 0.00028;
      const longitudeOffset = (((Math.floor(score / 7) % 7) - 3) * 0.00028);
      const label = isExplored ? '已探索彩蛋' : '未探索彩蛋';
      const reason = isExplored
        ? '这里藏着一段已经被发现过的清迈小记忆。后续接真实数据后，会显示具体的猫、树、涂鸦或一句话。'
        : '这是一个还没被你探索过的彩蛋点。靠近之后再打开，才会知道别人藏了什么。';
      const recommendation: Recommendation = {
        id: `easter-${marker.id}`,
        place_name: label,
        category: '彩蛋',
        reason,
        user_name: 'CMI Map',
        user_id: null,
        latitude: marker.latitude + latitudeOffset,
        longitude: marker.longitude + longitudeOffset,
        images: [],
        created_at: '',
      };

      return {
        id: `easter-${marker.id}-${index}`,
        place_name: label,
        category: '彩蛋',
        latitude: recommendation.latitude,
        longitude: recommendation.longitude,
        recommendations: [recommendation],
        visualOverride: {
          label,
          iconUrl: isExplored ? EASTER_STAR_ICON_URL : EASTER_QUESTION_ICON_URL,
        },
      };
    });
};

const toMarkerVisualOverride = (tag: CmiPlaceTypeTag | null | undefined) => (
  tag?.iconUrl && !tag.needsIcon
    ? {
      label: tag.label,
      iconUrl: tag.iconUrl,
    }
    : undefined
);

const renderFilterIcon = (
  item: { iconUrl?: string; label: string; needsIcon?: boolean },
  className = 'h-6 w-6'
) => (
  <span
    className={`${className} flex shrink-0 items-center justify-center rounded-full bg-white p-[2px] shadow-[0_1px_4px_rgba(47,43,38,0.16)] ring-1 ring-foreground/10`}
    aria-hidden="true"
  >
    {item.needsIcon || !item.iconUrl ? (
      <span className="h-full w-full rounded-full border border-dashed border-muted-foreground/45 bg-muted/30" />
    ) : (
      <img src={item.iconUrl} alt="" className="h-full w-full object-contain" />
    )}
  </span>
);

export default function MapView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<MapMarkerType[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerType | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CmiEvent | null>(null);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Recommendation[]>([]);
  const [activeMapFilterGroupId, setActiveMapFilterGroupId] = useState<MapFilterSelection>('all');
  const [isMapFilterExpanded, setIsMapFilterExpanded] = useState(false);
  const [activeMapPlaceTypeId, setActiveMapPlaceTypeId] = useState<string | null>(null);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isEasterEggMode, setIsEasterEggMode] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationRequestKey, setLocationRequestKey] = useState(0);

  const activeScene = getCmiScene(searchParams.get('scene'));
  const selectedEventId = searchParams.get('event');
  const selectedPlaceNameParam = searchParams.get('place');
  const isNearbyScene = activeScene?.id === 'nearby' || activeScene?.id === 'nearby-wander';
  const activePlaceTypeParam = searchParams.get('placeType');
  const activePlaceTypeId =
    isNearbyScene && !isCmiNearbyWanderPlaceTypeId(activePlaceTypeParam)
      ? null
      : activePlaceTypeParam;
  const activePlaceTypeTag = getCmiPlaceTypeTag(activePlaceTypeId);
  const activeSceneFilterParam = searchParams.get('filter');
  const intentFilters = activeScene ? getCmiIntentSecondaryFilters(activeScene.id) : [];
  const activeSceneFilterId =
    activeSceneFilterParam && intentFilters.some(filter => filter.id === activeSceneFilterParam)
      ? activeSceneFilterParam
      : null;
  const activeIntentFilter = intentFilters.find(filter => filter.id === activeSceneFilterId) ?? null;
  const isLifeRescueScene = activeScene?.id === 'life-rescue';
  const isEventScene = activeScene?.id === 'tomorrow-events';
  const isDirectIntentScene = activeScene ? DIRECT_INTENT_SCENE_IDS.has(activeScene.id) : false;
  const displayName = profile?.user_name || user?.email?.split('@')[0] || '游客';
  const sceneEvents = useMemo(
    () => activeScene ? getCmiEventsForScene(activeScene.id) : [],
    [activeScene]
  );
  const mapFilterGroups = useMemo(() => getCmiMapFilterGroups(), []);
  const activeMapFilterGroup = useMemo(
    () => activeMapFilterGroupId === 'all'
      ? null
      : getCmiMapFilterGroup(activeMapFilterGroupId),
    [activeMapFilterGroupId]
  );
  const activeMapSecondaryTags = useMemo(
    () => activeMapFilterGroup ? getCmiPlaceTypeTagsByIds(activeMapFilterGroup.placeTypeIds) : [],
    [activeMapFilterGroup]
  );
  const activeMapPlaceTypeTag = useMemo(
    () => getCmiPlaceTypeTag(activeMapPlaceTypeId),
    [activeMapPlaceTypeId]
  );
  const mapSearchMatch = useMemo(
    () => resolveCmiMapFilterQuery(mapSearchQuery),
    [mapSearchQuery]
  );
  const nearbyPlaceTypeFilters = useMemo<MapCategoryFilter[]>(
    () =>
      getCmiNearbyWanderPlaceTypeFilters().map(tag => ({
        id: createPlaceFilterId(tag.placeTypeId!),
        label: tag.label,
        iconUrl: tag.iconUrl,
        needsIcon: tag.needsIcon,
        kind: 'place' as const,
        value: tag.placeTypeId!,
      })),
    []
  );
  const sceneEventMarkers = useMemo(
    () => sceneEvents.map(getCmiEventMapMarker).filter((marker): marker is MapMarkerType => Boolean(marker)),
    [sceneEvents]
  );
  const selectedEventFromParams = useMemo(() => {
    if (!selectedEventId) return null;
    return sceneEvents.find(event => event.id === selectedEventId) ?? getCmiEventById(selectedEventId);
  }, [sceneEvents, selectedEventId]);
  const selectedEventMarkerFromParams = useMemo(
    () => selectedEventFromParams ? getCmiEventMapMarker(selectedEventFromParams) : null,
    [selectedEventFromParams]
  );
  const selectedPlaceMarkerFromParams = useMemo(() => {
    if (!selectedPlaceNameParam) return null;
    const selectedPlaceName = normalizeMapPlaceName(selectedPlaceNameParam);
    return markers.find(marker => normalizeMapPlaceName(marker.place_name) === selectedPlaceName) ?? null;
  }, [markers, selectedPlaceNameParam]);

  const sceneRecommendationState = useMemo(() => {
    if (!activeScene) {
      return {
        recommendations: [] as Recommendation[],
        isPlaceTypeFallback: false,
      };
    }
    const baseSceneRecommendations = getCmiSceneRecommendations(recommendations, activeScene, {
      userLocation: userLocation ?? undefined,
    });
    const activeSceneRecommendations = isNearbyScene
      ? filterCmiNearbyWanderRecommendations(baseSceneRecommendations)
      : baseSceneRecommendations;
    const placeTypeFilteredRecommendations = activePlaceTypeId
      ? activeSceneRecommendations.filter(recommendation =>
        matchesCmiPlaceTypeTag(recommendation, activePlaceTypeId)
      )
      : activeSceneRecommendations;
    const filteredSceneRecommendations = activeSceneFilterId
      ? placeTypeFilteredRecommendations.filter(recommendation =>
        matchesCmiIntentSecondaryFilter(recommendation, activeScene.id, activeSceneFilterId)
      )
      : placeTypeFilteredRecommendations;
    const isPlaceTypeFallback =
      Boolean(activePlaceTypeId) &&
      !activeSceneFilterId &&
      filteredSceneRecommendations.length === 0;

    return {
      recommendations: filteredSceneRecommendations,
      isPlaceTypeFallback,
    };
  }, [activeScene, activePlaceTypeId, activeSceneFilterId, isNearbyScene, recommendations, userLocation]);
  const sceneRecommendations = sceneRecommendationState.recommendations;
  const isPlaceTypeFallback = sceneRecommendationState.isPlaceTypeFallback;

  const sceneMarkers = useMemo(() => {
    const markerMap = new Map<string, MapMarkerType>();

    sceneRecommendations.forEach((recommendation) => {
      if (!markerMap.has(recommendation.place_name)) {
        markerMap.set(recommendation.place_name, {
          id: recommendation.id,
          place_name: recommendation.place_name,
          category: recommendation.category,
          latitude: recommendation.latitude,
          longitude: recommendation.longitude,
          recommendations: [],
        });
      }
      markerMap.get(recommendation.place_name)!.recommendations.push(recommendation);
    });

    return Array.from(markerMap.values());
  }, [sceneRecommendations]);

  // 加载推荐数据
  useEffect(() => {
    loadRecommendations();
  }, []);

  useEffect(() => {
    setSelectedMarker(null);
    setSelectedEvent(null);
    setSelectedRecommendations([]);
  }, [activeScene?.id, activePlaceTypeId, activeSceneFilterId]);

  useEffect(() => {
    if (!selectedEventId) {
      setSelectedEvent(null);
      return;
    }

    if (!selectedEventFromParams || !selectedEventMarkerFromParams) {
      setSelectedEvent(null);
      return;
    }

    setSelectedEvent(selectedEventFromParams);
    setSelectedMarker(selectedEventMarkerFromParams);
    setSelectedRecommendations(selectedEventMarkerFromParams.recommendations);
  }, [selectedEventId, selectedEventFromParams, selectedEventMarkerFromParams]);

  useEffect(() => {
    if (!selectedPlaceNameParam || selectedEventId) return;
    if (!selectedPlaceMarkerFromParams) {
      if (!isLoadingRecommendations) {
        setSelectedMarker(null);
        setSelectedRecommendations([]);
      }
      return;
    }

    setSelectedEvent(null);
    setSelectedMarker(selectedPlaceMarkerFromParams);
    setSelectedRecommendations(selectedPlaceMarkerFromParams.recommendations);
  }, [
    isLoadingRecommendations,
    selectedEventId,
    selectedPlaceMarkerFromParams,
    selectedPlaceNameParam,
  ]);

  useEffect(() => {
    if (!isNearbyScene) {
      setLocationStatus('idle');
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }

    setLocationStatus(userLocation ? 'ready' : 'locating');
  }, [isNearbyScene, userLocation]);

  const loadRecommendations = async () => {
    setIsLoadingRecommendations(true);
    setRecommendationsError(null);

    try {
      const data = await getAllRecommendations({ throwOnError: true });
      setRecommendations(data);

      // 按地点名称分组，创建标记点
      const markerMap = new Map<string, MapMarkerType>();
      data.forEach((rec) => {
        if (!markerMap.has(rec.place_name)) {
          markerMap.set(rec.place_name, {
            id: rec.id,
            place_name: rec.place_name,
            category: rec.category,
            latitude: rec.latitude,
            longitude: rec.longitude,
            recommendations: []
          });
        }
        markerMap.get(rec.place_name)!.recommendations.push(rec);
      });

      setMarkers(Array.from(markerMap.values()));
    } catch {
      setRecommendations([]);
      setMarkers([]);
      setRecommendationsError('地点库暂时没连上');
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const removeSelectedLocationFromUrl = () => {
    if (!searchParams.has('event') && !searchParams.has('place')) return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('event');
    nextSearchParams.delete('place');
    const nextSearch = nextSearchParams.toString();
    navigate(nextSearch ? `/map?${nextSearch}` : '/map', { replace: true });
  };

  // 点击标记点
  const handleMarkerClick = (marker: MapMarkerType) => {
    const eventId = getCmiEventIdFromMarkerId(marker.id);
    const event = eventId
      ? sceneEvents.find(candidate => candidate.id === eventId) ?? getCmiEventById(eventId)
      : null;

    if (event) {
      setSelectedEvent(event);
      setSelectedMarker(marker);
      setSelectedRecommendations(marker.recommendations);

      const nextSearchParams = new URLSearchParams(searchParams);
      if (activeScene) nextSearchParams.set('scene', activeScene.id);
      nextSearchParams.delete('place');
      nextSearchParams.set('event', event.id);
      navigate(`/map?${nextSearchParams.toString()}`, { replace: true });
      return;
    }

    setSelectedEvent(null);
    setSelectedMarker(marker);
    setSelectedRecommendations(marker.recommendations);
    removeSelectedLocationFromUrl();
  };

  // 点击预览卡片，进入详情页
  const handleCardClick = () => {
    if (selectedEvent) return;
    if (selectedMarker?.category === '彩蛋') return;
    if (selectedMarker) {
      navigate(getPlacePath(selectedMarker.place_name));
    }
  };

  const handleSelectedNavigation = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!selectedMarker) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.latitude},${selectedMarker.longitude}`,
      '_blank'
    );
  };

  const handleSelectedDetails = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!selectedMarker) return;
    navigate(getPlacePath(selectedMarker.place_name));
  };

  const handleCopySelectedPlace = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!selectedMarker) return;

    const text = `${selectedMarker.place_name}\n${selectedMarker.latitude}, ${selectedMarker.longitude}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制地点和坐标');
    } catch {
      toast('复制失败，可以先点导航打开地图');
    }
  };

  // 点击地图空白区域，关闭预览卡片
  const handleMapClick = () => {
    setSelectedMarker(null);
    setSelectedEvent(null);
    setSelectedRecommendations([]);
    removeSelectedLocationFromUrl();
  };

  const handleEasterEggToggle = () => {
    setSelectedMarker(null);
    setSelectedEvent(null);
    setSelectedRecommendations([]);
    setMapSearchQuery('');
    setActiveMapFilterGroupId('all');
    setActiveMapPlaceTypeId(null);
    setIsMapFilterExpanded(false);
    setIsEasterEggMode(isActive => !isActive);
  };

  const handleUserLocation = (latitude: number, longitude: number) => {
    setUserLocation({ latitude, longitude });
    if (isNearbyScene) setLocationStatus('ready');
  };

  const handleUserLocationError = () => {
    if (isNearbyScene) setLocationStatus('error');
  };

  const handleRetryUserLocation = () => {
    setUserLocation(null);
    setLocationStatus('locating');
    setLocationRequestKey(key => key + 1);
  };

  const handleSceneFilterSelect = (filterId: string | null) => {
    if (!activeScene) return;
    setSelectedMarker(null);
    setSelectedRecommendations([]);
    navigate(getSceneMapPath(activeScene.id, {
      filterId,
      placeTypeId: activePlaceTypeId,
    }));
  };

  const handleNearbyPlaceTypeSelect = (placeTypeId: string | null) => {
    if (!activeScene) return;
    setSelectedMarker(null);
    setSelectedRecommendations([]);
    navigate(getSceneMapPath(activeScene.id, { placeTypeId }));
  };

  const resetMapFilters = () => {
    setMapSearchQuery('');
    setActiveMapFilterGroupId('all');
    setActiveMapPlaceTypeId(null);
    setIsMapFilterExpanded(false);
    setIsEasterEggMode(false);
    setSelectedMarker(null);
    setSelectedRecommendations([]);
  };

  const handleMapGroupSelect = (group: CmiMapFilterGroup | null) => {
    setMapSearchQuery('');
    setIsEasterEggMode(false);
    setSelectedMarker(null);
    setSelectedRecommendations([]);

    if (!group) {
      setActiveMapFilterGroupId('all');
      setActiveMapPlaceTypeId(null);
      setIsMapFilterExpanded(false);
      return;
    }

    if (activeMapFilterGroupId === group.id) {
      setActiveMapPlaceTypeId(null);
      setIsMapFilterExpanded(isExpanded => !isExpanded);
      return;
    }

    setActiveMapFilterGroupId(group.id);
    setActiveMapPlaceTypeId(null);
    setIsMapFilterExpanded(true);
  };

  const handleMapPlaceTypeSelect = (tag: CmiPlaceTypeTag | null) => {
    setMapSearchQuery('');
    setIsEasterEggMode(false);
    setSelectedMarker(null);
    setSelectedRecommendations([]);

    if (!tag) {
      setActiveMapPlaceTypeId(null);
      return;
    }

    setActiveMapPlaceTypeId(tag.id);
  };

  const handleMapSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    setMapSearchQuery(nextQuery);
    setIsEasterEggMode(false);
    setSelectedMarker(null);
    setSelectedRecommendations([]);

    const match = resolveCmiMapFilterQuery(nextQuery);
    if (match) {
      setActiveMapFilterGroupId(match.groupId);
      setActiveMapPlaceTypeId(match.placeTypeId ?? null);
      setIsMapFilterExpanded(true);
      return;
    }

    setActiveMapFilterGroupId('all');
    setActiveMapPlaceTypeId(null);
    setIsMapFilterExpanded(false);
  };

  const handleMapSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsEasterEggMode(false);
    const match = resolveCmiMapFilterQuery(mapSearchQuery);
    if (match) {
      setActiveMapFilterGroupId(match.groupId);
      setActiveMapPlaceTypeId(match.placeTypeId ?? null);
      setIsMapFilterExpanded(true);
    }
  };

  const easterEggMarkers = useMemo(
    () => createEasterEggMarkers(markers),
    [markers]
  );

  // 过滤当前需要显示的标记点
  const displayedMarkers = useMemo(() => {
    if (activeScene) {
      return isEventScene
        ? sceneEventMarkers
        : [...sceneEventMarkers, ...sceneMarkers];
    }

    if (isEasterEggMode) return easterEggMarkers;

    const isRawSearchActive = Boolean(mapSearchQuery.trim() && !mapSearchMatch);
    const isFilteredMap =
      Boolean(activeMapPlaceTypeId) ||
      activeMapFilterGroupId !== 'all' ||
      isRawSearchActive;

    if (!isFilteredMap) return markers;

    return markers.flatMap((marker) => {
      const matchingRecommendations = marker.recommendations.filter((recommendation) => {
        const matchesPlaceType = activeMapPlaceTypeId
          ? matchesCmiPlaceTypeTag(recommendation, activeMapPlaceTypeId)
          : true;
        const matchesGroup = activeMapPlaceTypeId || activeMapFilterGroupId === 'all'
          ? true
          : matchesCmiMapFilterGroup(recommendation, activeMapFilterGroupId);
        const matchesSearch = isRawSearchActive
          ? normalizeMapPlaceName(marker.place_name).includes(normalizeMapPlaceName(mapSearchQuery)) ||
            matchesCmiRecommendationSearchQuery(recommendation, mapSearchQuery)
          : true;

        return matchesPlaceType && matchesGroup && matchesSearch;
      });

      if (matchingRecommendations.length === 0) return [];

      const visualTag = activeMapPlaceTypeTag ?? (
        activeMapFilterGroup
          ? activeMapSecondaryTags.find(tag =>
            matchingRecommendations.some(recommendation => matchesCmiPlaceTypeTag(recommendation, tag.id))
          )
          : null
      );

      return [{
        ...marker,
        id: matchingRecommendations[0].id,
        category: matchingRecommendations[0].category,
        recommendations: matchingRecommendations,
        visualOverride: toMarkerVisualOverride(visualTag),
      }];
    });
  }, [
    activeMapFilterGroup,
    activeMapFilterGroupId,
    activeMapPlaceTypeId,
    activeMapPlaceTypeTag,
    activeMapSecondaryTags,
    activeScene,
    easterEggMarkers,
    isEasterEggMode,
    isEventScene,
    mapSearchMatch,
    mapSearchQuery,
    markers,
    sceneEventMarkers,
    sceneMarkers,
  ]);
  const mapWarmupImageUrls = useMemo(() => {
    const urls = new Set<string>();
    const activeFilters = isNearbyScene ? nearbyPlaceTypeFilters : activeMapSecondaryTags;

    mapFilterGroups.forEach(group => {
      if (!group.needsIcon) urls.add(group.iconUrl);
    });
    activeFilters.forEach(filter => {
      if (!filter.needsIcon && filter.iconUrl) urls.add(filter.iconUrl);
    });
    urls.add(EASTER_QUESTION_ICON_URL);
    urls.add(EASTER_STAR_ICON_URL);
    displayedMarkers.slice(0, 48).forEach(marker => urls.add(getMapMarkerVisual(marker).iconUrl));
    sceneRecommendations.slice(0, 4).forEach(recommendation => {
      const firstImage = recommendation.images[0];
      if (firstImage) urls.add(firstImage);
    });

    return Array.from(urls);
  }, [
    activeMapSecondaryTags,
    displayedMarkers,
    isNearbyScene,
    mapFilterGroups,
    nearbyPlaceTypeFilters,
    sceneRecommendations,
  ]);
  const selectedMarkerFromParams = selectedEventMarkerFromParams ?? selectedPlaceMarkerFromParams;
  const selectedMarkerZoom = selectedEventMarkerFromParams ? 15 : selectedPlaceMarkerFromParams ? 16 : undefined;
  const defaultMapCenter = useMemo(
    () =>
      selectedMarkerFromParams
        ? {
          lat: selectedMarkerFromParams.latitude,
          lng: selectedMarkerFromParams.longitude,
        }
        : undefined,
    [selectedMarkerFromParams]
  );

  const selectedRecommendation = selectedRecommendations[0] || null;
  const selectedGuide = selectedRecommendation
    ? getPlaceGuide(selectedRecommendation.place_name, selectedRecommendation.category)
    : null;
  const selectedIsCommunityGuide = selectedRecommendation
    ? isCommunityCuratedRecommendation(selectedRecommendation)
    : false;
  const nearbyLocationLabel =
    locationStatus === 'ready'
      ? '已定位：地图以你为中心，附近点按距离排序'
      : locationStatus === 'error'
        ? '没拿到定位权限，允许后点重试'
        : '正在定位，允许后会以你为中心';

  useEffect(() => {
    warmupImages(mapWarmupImageUrls, { batchSize: 8, delayMs: 80 });
  }, [mapWarmupImageUrls]);

  return (
    <div className="relative h-full w-full overflow-hidden overscroll-none bg-background">
      {/* 地图 - 全屏显示，z-index 最低 */}
      <div className="absolute inset-0 z-0">
        <LeafletMap
          key={
            isNearbyScene
              ? `nearby-${locationRequestKey}`
              : selectedEventId
                ? `event-${selectedEventId}`
                : selectedPlaceNameParam
                  ? `place-${selectedPlaceNameParam}`
                  : 'default'
          }
          markers={displayedMarkers}
          onMarkerClick={handleMarkerClick}
          onMapClick={handleMapClick}
          mode="view"
          defaultCenter={defaultMapCenter}
          defaultZoom={selectedMarkerZoom}
          focusTarget={defaultMapCenter}
          focusTargetZoom={selectedMarkerZoom}
          focusTargetOffsetYRatio={0.14}
          focusUserLocation={isNearbyScene}
          constrainToChiangMai
          locationZoom={16}
          onUserLocation={handleUserLocation}
          onUserLocationError={handleUserLocationError}
          className="w-full h-full"
        />
      </div>

      {/* 左上角应用名称 */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+12px)] left-4 md:left-6 z-20 flex items-center gap-3">
        <h1>
          <a
            href="/"
            className="inline-block rounded-full border border-border/50 bg-background/80 px-4 py-2 text-xl font-black text-foreground shadow-lg backdrop-blur-sm transition-transform active:translate-y-0.5"
            aria-label="回到首页"
          >
            CMI Map
          </a>
        </h1>
      </div>

      {!activeScene && (
        <form
          className="absolute top-[calc(env(safe-area-inset-top)+12px)] left-[148px] right-[70px] z-20 md:left-[184px] md:right-[92px]"
          onSubmit={handleMapSearchSubmit}
          role="search"
        >
          <label className="flex h-11 min-w-0 items-center gap-2 rounded-full border border-border/50 bg-background/90 px-3 shadow-lg backdrop-blur-sm">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2.6} />
            <input
              value={mapSearchQuery}
              onChange={handleMapSearchChange}
              className="min-w-0 flex-1 bg-transparent text-sm font-black text-foreground outline-none placeholder:text-muted-foreground/70"
              placeholder="搜地点 / 分类"
              aria-label="搜索地点或分类"
            />
            {mapSearchQuery && (
              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={resetMapFilters}
                aria-label="清空搜索"
              >
                <X className="h-4 w-4" strokeWidth={2.8} />
              </button>
            )}
          </label>
        </form>
      )}

      {!isNearbyScene && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+12px)] right-4 md:right-6 z-20 flex items-center gap-2">
          {activeScene && isDirectIntentScene && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/map')}
              className="press-feedback bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background border-border/50"
              aria-label="打开完整地图"
            >
              <MapIcon className="w-5 h-5" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(activeScene
              ? getSceneListPath(activeScene.id, {
                filterId: activeSceneFilterId,
                placeTypeId: activePlaceTypeId,
              })
              : activeMapPlaceTypeId
                ? `/list?placeType=${encodeURIComponent(activeMapPlaceTypeId)}`
                : '/list'
            )}
            className="press-feedback bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background border-border/50"
            aria-label={activeScene ? '查看清单' : '查看地点清单'}
          >
            <List className="w-5 h-5" />
          </Button>
        </div>
      )}

      {isNearbyScene && activeScene && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+12px)] right-4 md:right-6 z-20">
          <a
            href={getSceneListPath(activeScene.id, { placeTypeId: activePlaceTypeId })}
            className="inline-flex h-9 items-center justify-center rounded-full border border-primary/70 bg-primary px-2.5 text-xs font-black text-primary-foreground shadow-[2px_3px_0_rgba(0,0,0,0.14)] backdrop-blur-sm transition-transform active:translate-y-0.5"
          >
            <List className="mr-1 h-3.5 w-3.5" strokeWidth={2.5} />
            看清单
          </a>
        </div>
      )}

      {/* 分类抽屉/场景状态栏 */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+64px)] left-0 right-0 z-20 px-4 md:px-6">
        {activeScene ? (
          isNearbyScene ? (
          <div className="flex w-max items-center gap-2 pb-2">
            <Button
              size="sm"
              className={`h-9 rounded-full border px-3 text-xs font-black shadow-md backdrop-blur-sm transition-transform active:translate-y-0.5 ${
                !activePlaceTypeId
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border/50 bg-background/90 text-foreground'
              }`}
              onClick={() => handleNearbyPlaceTypeSelect(null)}
            >
              全部
            </Button>
            {nearbyPlaceTypeFilters.map(filter => (
              <Button
                key={filter.id}
                size="sm"
                className={`h-9 shrink-0 rounded-full border px-2.5 text-xs font-black shadow-md backdrop-blur-sm transition-transform active:translate-y-0.5 ${
                  activePlaceTypeId === filter.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/50 bg-background/90 text-foreground'
                }`}
                onClick={() => handleNearbyPlaceTypeSelect(filter.value)}
              >
                <span className="mr-1.5">
                  {renderFilterIcon(filter, 'h-5 w-5')}
                </span>
                {filter.label}
              </Button>
            ))}
          </div>
          ) : isDirectIntentScene ? null : isLifeRescueScene ? (
          <div className="flex w-max items-center gap-2 pb-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-2 border-border/50 bg-background/90 font-black shadow-md backdrop-blur-sm"
              onClick={() => navigate('/map')}
            >
              完整地图
            </Button>
            <Button
              size="sm"
              className={`rounded-full border-2 px-4 font-black shadow-md backdrop-blur-sm transition-transform active:translate-y-0.5 ${
                !activeSceneFilterId
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border/50 bg-background/90 text-foreground'
              }`}
              onClick={() => handleSceneFilterSelect(null)}
            >
              全部
            </Button>
            {intentFilters.map(filter => (
              <Button
                key={filter.id}
                size="sm"
                className={`rounded-full border-2 px-4 font-black shadow-md backdrop-blur-sm transition-transform active:translate-y-0.5 ${
                  activeSceneFilterId === filter.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border/50 bg-background/90 text-foreground'
                }`}
                onClick={() => handleSceneFilterSelect(filter.id)}
              >
                {LIFE_RESCUE_FILTER_LABELS[filter.id] ?? filter.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-2 border-border/50 bg-background/90 font-black shadow-md backdrop-blur-sm"
              onClick={() => navigate(getSceneListPath(activeScene.id, {
                filterId: activeSceneFilterId,
                placeTypeId: activePlaceTypeId,
              }))}
            >
              看清单
            </Button>
          </div>
          ) : (
          <div className="flex w-max items-center gap-3 pb-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-2 border-border/50 bg-background/90 font-black shadow-md backdrop-blur-sm"
              onClick={() => navigate('/map')}
            >
              完整地图
            </Button>
            <div className="flex items-center gap-2 rounded-full border-2 border-primary bg-primary px-4 py-2 text-sm font-black text-primary-foreground shadow-md">
              <MapPinned className="h-4 w-4" strokeWidth={2.5} />
              <span>{activeScene.mapTitle}</span>
              {activePlaceTypeTag && (
                <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">
                  {activePlaceTypeTag.label}
                </span>
              )}
              {activeIntentFilter && (
                <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">
                  {activeIntentFilter.label}
                </span>
              )}
              <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs">
                {displayedMarkers.length} 处
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-2 border-border/50 bg-background/90 font-black shadow-md backdrop-blur-sm"
              onClick={() => navigate(getSceneListPath(activeScene.id, {
                filterId: activeSceneFilterId,
                placeTypeId: activePlaceTypeId,
              }))}
            >
              看清单
            </Button>
          </div>
          )
        ) : isEasterEggMode ? null : (
          <div className="space-y-2 pb-2">
            <div className="-mx-4 overflow-x-auto px-4 hide-scrollbar md:-mx-6 md:px-6">
              <div className="flex w-max items-center gap-2">
              <Button
                size="sm"
                className={`h-10 rounded-full px-4 text-sm font-black shadow-md press-feedback transition-transform ${
                  !isEasterEggMode && activeMapFilterGroupId === 'all'
                    ? 'border-2 border-transparent bg-primary text-primary-foreground scale-105'
                    : 'border-2 border-border/50 bg-background/90 text-foreground backdrop-blur-sm hover:bg-background'
                }`}
                onClick={() => handleMapGroupSelect(null)}
                aria-label="显示全部地点"
              >
                全部
              </Button>
              {mapFilterGroups.map(group => (
                <Button
                  key={group.id}
                  size="sm"
                  className={`h-10 shrink-0 rounded-full px-3 text-sm font-black shadow-md press-feedback transition-transform ${
                    !isEasterEggMode && activeMapFilterGroupId === group.id
                      ? 'border-2 border-transparent bg-primary text-primary-foreground scale-105'
                      : 'border-2 border-border/50 bg-background/90 text-foreground backdrop-blur-sm hover:bg-background'
                  }`}
                  onClick={() => handleMapGroupSelect(group)}
                  aria-label={`一级分类：${group.label}`}
                  aria-expanded={activeMapFilterGroupId === group.id ? isMapFilterExpanded : false}
                >
                  <span className="mr-1.5">
                    {renderFilterIcon(group, 'h-6 w-6')}
                  </span>
                  {group.label}
                </Button>
              ))}
              </div>
            </div>

            {activeMapFilterGroup && isMapFilterExpanded && (
              <div className="-mx-4 overflow-x-auto px-4 hide-scrollbar md:-mx-6 md:px-6">
                <div className="flex w-max items-center gap-2">
                {activeMapSecondaryTags.map(tag => (
                  <Button
                    key={tag.id}
                    variant="outline"
                    size="sm"
                    className={`h-9 min-w-[5.25rem] shrink-0 rounded-full px-2.5 text-xs font-black shadow-md press-feedback transition-transform ${
                      activeMapPlaceTypeId === tag.id
                        ? 'border-2 border-primary bg-white/95 text-primary hover:bg-white'
                        : 'border border-border/50 bg-background/90 text-foreground backdrop-blur-sm hover:bg-background'
                    }`}
                    onClick={() => handleMapPlaceTypeSelect(tag)}
                    aria-label={`二级分类：${tag.label}`}
                  >
                    <span className="mr-1.5">
                      {renderFilterIcon(tag, 'h-5 w-5')}
                    </span>
                    {tag.label}
                  </Button>
                ))}
                </div>
              </div>
            )}

            {mapSearchQuery && mapSearchMatch && (
              <div className="w-max rounded-full border border-primary/25 bg-background/90 px-3 py-1.5 text-[11px] font-black text-primary shadow-sm backdrop-blur-sm">
                已匹配：{mapSearchMatch.label}
              </div>
            )}
          </div>
        )}
      </div>

      {isNearbyScene && (
        <div className="pointer-events-none absolute top-[calc(env(safe-area-inset-top)+110px)] left-4 right-4 z-20 md:left-6 md:right-auto md:max-w-[360px]">
          <div className="flex items-center gap-2 rounded-full border-2 border-border/50 bg-background/90 px-3 py-2 text-xs font-black text-foreground shadow-md backdrop-blur-sm">
            <LocateFixed className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
            <span className="min-w-0 flex-1">{nearbyLocationLabel}</span>
            {locationStatus === 'error' && (
              <button
                type="button"
                className="pointer-events-auto shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-black text-foreground transition-transform active:scale-[0.96]"
                onClick={handleRetryUserLocation}
              >
                重试
              </button>
            )}
          </div>
        </div>
      )}

      {!activeScene && (isLoadingRecommendations || recommendationsError) && (
        <div className="pointer-events-none absolute left-4 right-4 top-[calc(env(safe-area-inset-top)+112px)] z-20 md:left-6 md:right-auto md:max-w-[360px]">
          <div className="rounded-full border border-border/60 bg-background/90 px-3 py-2 text-xs font-black text-foreground shadow-md backdrop-blur-sm">
            {recommendationsError ?? '正在同步地点库'}
          </div>
        </div>
      )}

      {activeScene && !isNearbyScene && !selectedMarker && (
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+96px)] left-3 right-3 z-30 md:left-6 md:right-auto md:w-[420px]">
          <section className="max-h-[46dvh] overflow-hidden rounded-lg border-2 border-foreground bg-background/95 p-2.5 shadow-[4px_5px_0_rgba(0,0,0,0.18)] backdrop-blur-md">
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                  CMI SCENE
                </p>
                <h2 className="truncate text-lg font-black leading-tight text-foreground">
                  {activeScene.mapTitle}
                </h2>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-black text-foreground transition-transform active:scale-[0.97]"
                onClick={() => navigate(getSceneListPath(activeScene.id, {
                  filterId: activeSceneFilterId,
                  placeTypeId: activePlaceTypeId,
                }))}
              >
                看清单
              </button>
            </div>

            {!isDirectIntentScene && (
              <p className="mb-3 line-clamp-2 text-xs font-semibold leading-snug text-muted-foreground">
                {activeIntentFilter
                  ? `${activeIntentFilter.label}相关地点。点地图标记看位置，点下面卡片看详情。`
                  : activeScene.description}
              </p>
            )}
            {isPlaceTypeFallback && activePlaceTypeTag && (
              <p className="mb-3 rounded-md border border-dashed border-border bg-card px-2.5 py-2 text-xs font-bold leading-snug text-muted-foreground">
                {activePlaceTypeTag.label}还在补录，先不混入其他地点。可以看完整地图，或回生存包换一个入口。
              </p>
            )}

            <div className="max-h-[34dvh] space-y-2 overflow-y-auto pr-1">
              {recommendationsError ? (
                <div className="rounded-lg border border-dashed border-destructive/30 bg-destructive/5 p-3 text-sm font-semibold leading-relaxed text-destructive">
                  <p>{recommendationsError}，请检查网络后重试。</p>
                  <button
                    type="button"
                    className="mt-2 rounded-full border border-destructive/30 bg-background px-3 py-1.5 text-xs font-black text-destructive"
                    onClick={loadRecommendations}
                  >
                    重新同步
                  </button>
                </div>
              ) : isLoadingRecommendations ? (
                <div className="space-y-2">
                  {[0, 1].map(item => (
                    <div key={item} className="flex items-center gap-3 rounded-lg border border-border bg-card p-2">
                      <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-muted" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
                        <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
              {isEventScene && sceneEvents.slice(0, 2).map(event => (
                <button
                  key={event.id}
                  type="button"
                  className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-2 text-left transition-transform active:scale-[0.98]"
                  onClick={() => navigate(getSceneMapPath(activeScene.id, { eventId: event.id }))}
                >
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarDays className="h-5 w-5" strokeWidth={2.5} />
                    <span className="mt-1 text-[10px] font-black">
                      {getCmiEventTimeBucketLabel(event)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-sm font-black text-foreground">
                        {event.title}
                      </p>
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-black text-accent-foreground">
                        {event.priceLabel}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-muted-foreground">
                      {formatCmiEventTime(event)} · {event.venueName}
                    </p>
                  </div>
                </button>
              ))}

              {!isEventScene && sceneRecommendations.slice(0, 2).map(recommendation => {
                const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
                const isCommunityGuide = isCommunityCuratedRecommendation(recommendation);
                const presentation = getCmiSceneRecommendationPresentation(recommendation);
                const markerVisual = getMapMarkerVisual({
                  place_name: recommendation.place_name,
                  category: recommendation.category,
                  recommendations: [recommendation],
                });
                const summary = isCommunityGuide ? guide.summary : getRecommendationReasonText(recommendation);
                const cardImage = recommendation.images[0];
                return (
                  <button
                    key={recommendation.id}
                    type="button"
                    className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-2 text-left transition-transform active:scale-[0.98]"
                    onClick={() => navigate(getPlacePath(recommendation.place_name))}
                  >
                    {cardImage ? (
                      <img
                        src={cardImage}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-accent p-2">
                        <img
                          src={markerVisual.iconUrl}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-sm font-black text-foreground">
                          {recommendation.place_name}
                        </p>
                        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-black text-accent-foreground">
                          {presentation.kind}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-muted-foreground">
                        {summary || `${markerVisual.label}，点开看详情。`}
                      </p>
                    </div>
                  </button>
                );
              })}

              {isEventScene && sceneEvents.length === 0 && (
                <p className="rounded-lg border border-dashed border-border bg-card p-3 text-sm font-semibold text-muted-foreground">
                  近期活动还在整理中。运营库补录后会自动出现在这里。
                </p>
              )}

              {!isEventScene && sceneRecommendations.length === 0 && (
                <p className="rounded-lg border border-dashed border-border bg-card p-3 text-sm font-semibold text-muted-foreground">
                  {isPlaceTypeFallback && activePlaceTypeTag
                    ? `${activePlaceTypeTag.label}地点还在补录中。`
                    : activeIntentFilter
                    ? `${activeIntentFilter.label}地点还在补录中。`
                    : '这个场景还在整理中，可以先切到完整地图看看。'}
                </p>
              )}
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {/* 底部中间发帖按钮 (11. FAB Hard Press) */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] left-1/2 -translate-x-1/2 z-20">
        <button
          className="app-fab flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-4 rounded-full border-2 border-foreground"
          aria-label="标记新地点"
          onClick={() => {
            if (!user) {
              toast('登录后才能标记地点哦', { description: '注册只需要一个邮箱 ✉️' });
              navigate('/login', { state: { from: '/mark' } });
              return;
            }
            navigate('/mark');
          }}
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
          <span>标记新地点</span>
        </button>
      </div>

      {/* 左下角用户头像/登录按钮 - 与发帖按钮持平 */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] left-4 md:left-6 z-20">
        {user ? (
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full p-0 press-feedback bg-background border-2 border-foreground shadow-[3px_4px_0px_rgba(0,0,0,0.25)] hover:shadow-[2px_3px_0px_rgba(0,0,0,0.25)] hover:translate-y-[1px] transition-all"
            onClick={() => navigate('/profile')}
            aria-label="打开个人页面"
          >
            <Avatar className="w-full h-full">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={displayName} />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="rounded-full press-feedback shadow-lg border-2 border-foreground font-bold"
            onClick={() => navigate('/login')}
          >
            <LogIn className="w-4 h-4 mr-2" />
            登录
          </Button>
        )}
      </div>

      {!activeScene && (
        <>
          {isEasterEggMode && (
            <div className="pointer-events-none absolute right-4 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-20 flex items-center gap-1.5 rounded-full border border-border/40 bg-background/90 px-2.5 py-1.5 text-xs font-black text-foreground shadow-lg backdrop-blur-sm md:right-6">
              <img
                src={EASTER_STAR_ICON_URL}
                alt=""
                className="h-4 w-4 object-contain"
                aria-hidden="true"
              />
              彩蛋探索
            </div>
          )}
          <button
            type="button"
            className="press-feedback absolute right-4 bottom-[calc(env(safe-area-inset-bottom)+26px)] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-transparent transition-transform hover:scale-105 active:scale-95 md:right-6"
            onClick={handleEasterEggToggle}
            aria-label={isEasterEggMode ? '退出彩蛋探索' : '进入彩蛋探索'}
            aria-pressed={isEasterEggMode}
          >
            <img
              src={isEasterEggMode ? EASTER_STAR_ICON_URL : EASTER_QUESTION_ICON_URL}
              alt=""
              className={`object-contain drop-shadow-[0_3px_5px_rgba(0,0,0,0.22)] ${
                isEasterEggMode ? 'h-12 w-12' : 'h-11 w-11'
              }`}
              aria-hidden="true"
            />
          </button>
        </>
      )}

      {/* 活动详情卡片 - z-index 最高 */}
      {selectedMarker && selectedEvent && (
        <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border/20 bg-card p-6 shadow-2xl slide-up">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                    {selectedEvent.type === 'market' ? '周末地点' : '活动'}
                  </span>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-black text-accent-foreground">
                    {getCmiEventTimeBucketLabel(selectedEvent)}
                  </span>
                </div>
                <h2 className="text-2xl font-black leading-tight text-foreground">
                  {selectedEvent.title}
                </h2>
              </div>
              <span className="shrink-0 rounded-full bg-background px-3 py-1 text-xs font-black text-primary">
                {selectedEvent.priceLabel}
              </span>
            </div>

            <p className="text-base font-semibold leading-relaxed text-foreground/85">
              {selectedEvent.summary}
            </p>

            <div className="space-y-2 text-sm font-bold text-muted-foreground">
              <p className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                <span>{formatCmiEventTime(selectedEvent)}</span>
              </p>
              <p className="flex items-start gap-2">
                <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                <span>{selectedEvent.venueName} · {selectedEvent.area}</span>
              </p>
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                <span>
                  {CMI_EVENT_VERIFICATION_LABELS[selectedEvent.verificationStatus]} · {selectedEvent.sourceLabel}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedEvent.tags.slice(0, 5).map(tag => (
                <span key={tag} className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
                  {tag}
                </span>
              ))}
            </div>

            {selectedEvent.sourceUrl && (
              <a
                href={selectedEvent.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-black text-foreground transition-transform active:scale-[0.97]"
              >
                查看来源
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.5} />
              </a>
            )}
          </div>
        </div>
      )}

      {selectedMarker && !selectedEvent && isEasterEggMode && selectedMarker.category === '彩蛋' && selectedRecommendation && (
        <div className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border/20 bg-card p-6 shadow-2xl slide-up">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-background p-2 shadow-md">
                <img
                  src={selectedMarker.visualOverride?.iconUrl ?? EASTER_QUESTION_ICON_URL}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black leading-tight text-foreground">
                  {selectedMarker.place_name}
                </p>
                <p className="mt-1 text-xs font-black text-primary">
                  彩蛋探索模式
                </p>
              </div>
            </div>

            <p className="text-base font-semibold leading-relaxed text-foreground/85">
              {getRecommendationReasonText(selectedRecommendation)}
            </p>

            <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-4 py-3 text-sm font-bold leading-relaxed text-muted-foreground">
              后续这里会接真实彩蛋数据：谁留下的、里面是什么、你是否已经亲自探索过。
            </div>
          </div>
        </div>
      )}

      {/* 预览卡片 - z-index 最高 */}
      {selectedMarker && !selectedEvent && !isEasterEggMode && selectedRecommendations.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-6 card-shadow slide-up cursor-pointer press-feedback border-t border-border/20"
          onClick={handleCardClick}
        >
          <div className="space-y-4">
            {selectedIsCommunityGuide && selectedGuide ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                    {selectedGuide.kind}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {getGuideSourceLabel(selectedRecommendation!)}
                  </span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black leading-tight text-foreground">
                    {selectedGuide.title}
                  </h2>
                  {selectedGuide.title !== selectedMarker.place_name && (
                    <p className="break-words text-sm font-semibold text-muted-foreground">
                      {selectedMarker.place_name}
                    </p>
                  )}
                </div>
                <p className="line-clamp-4 text-base font-medium leading-relaxed text-foreground">
                  {selectedGuide.summary}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedGuide.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="quote-text text-lg leading-relaxed text-foreground">
                {getRecommendationReasonText(selectedRecommendations[0])}
              </p>
            )}

            {/* 地点名称和分类 */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center p-1.5 border border-border/50">
                <img src={getMapMarkerVisual(selectedMarker).iconUrl} alt="" className="w-full h-full object-contain" />
              </div>
              <span className="text-base font-black text-foreground">
                {selectedMarker.place_name}
              </span>
            </div>

            {/* 推荐人 */}
            {selectedIsCommunityGuide ? (
              <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <span className="w-8 border-t border-muted-foreground/30"></span>
                来自 CMI 社区收藏
              </p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="w-8 border-t border-muted-foreground/30"></span> 
                <button
                  type="button"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(getPersonMapPath(selectedRecommendations[0].user_name));
                  }}
                >
                  {selectedRecommendations[0].user_name} 的清迈地图
                </button>
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-sm font-black text-primary-foreground shadow-sm transition-transform hover:bg-primary/90 active:scale-[0.97]"
                onClick={handleSelectedNavigation}
              >
                <Navigation className="h-4 w-4" strokeWidth={2.5} />
                导航
              </button>
              <button
                type="button"
                className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm font-black text-foreground transition-transform active:scale-[0.97]"
                onClick={handleSelectedDetails}
              >
                <MapPinned className="h-4 w-4" strokeWidth={2.5} />
                详情
              </button>
              <button
                type="button"
                className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 text-sm font-black text-foreground transition-transform active:scale-[0.97]"
                onClick={handleCopySelectedPlace}
              >
                <Copy className="h-4 w-4" strokeWidth={2.5} />
                复制
              </button>
            </div>

            {/* 缩略图 */}
            {selectedRecommendations[0].images.length > 0 && (
              <div className="flex gap-2">
                {selectedRecommendations[0].images.slice(0, 3).map((img, idx) => (
                  <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-border shadow-sm">
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 多人推荐提示 */}
            {selectedRecommendations.length > 1 && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground/80">
                  还有 {selectedRecommendations.length - 1} 人推荐了这里
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
