import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { CHIANG_MAI_PROVINCE_BOUNDARY, CHIANG_MAI_PROVINCE_BOUNDS } from '@/data/chiang-mai-boundary';
import { CHIANG_MAI_FEATURE_LINES } from '@/data/chiang-mai-map-features';
import {
  getMapMarkerVisual,
  isEasterEggMarkerVisual,
  type MapMarkerVisual,
  renderClusterIconHtml,
  renderEasterEggMarkerHtml,
  renderMarkerBadgeHtml,
} from '@/lib/map-marker-visual';
import type { MapMarker } from '@/types/types';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface LeafletMapProps {
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: () => void; // 点击地图空白区域的回调
  onMapInteraction?: () => void;
  mode?: 'view' | 'mark'; // 查看模式或标记模式
  onCenterChange?: (lat: number, lng: number) => void;
  onUserLocation?: (lat: number, lng: number) => void;
  onUserLocationError?: (error: GeolocationPositionError) => void;
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
  focusTarget?: { lat: number; lng: number };
  focusTargetZoom?: number;
  focusTargetOffsetYRatio?: number;
  focusUserLocation?: boolean;
  constrainToChiangMai?: boolean;
  locationZoom?: number;
  markTargetYRatio?: number;
  interactive?: boolean;
  showUserLocation?: boolean;
  className?: string;
}

// 清迈市中心坐标
const CHIANG_MAI_CENTER = { lat: 18.7883, lng: 98.9853 };

// 清迈地区边界：交互上用清迈府 bbox 限制拖动，视觉上再用真实行政边界做非矩形遮罩。
const CHIANG_MAI_BOUNDS: L.LatLngBoundsExpression = CHIANG_MAI_PROVINCE_BOUNDS;
const MAP_BOUNDARY_MASK_OUTER_RING: L.LatLngExpression[] = [
  [21.2, 97.2],
  [21.2, 100.4],
  [16.2, 100.4],
  [16.2, 97.2],
];

type MapBackgroundOverlay = {
  id: string;
  imageUrl: string;
  bounds: L.LatLngBoundsExpression;
  opacity: number;
};

type MapBackgroundArea = {
  id: string;
  label: string;
  position: L.LatLngExpression;
  primary?: boolean;
};

type MapBackgroundLandmark = {
  id: string;
  label: string;
  position: L.LatLngExpression;
  iconUrl: string;
  iconSize: [number, number];
  cityOpacity?: number;
  nearOpacity?: number;
  visualTone?: 'stamp';
};

const MAP_BACKGROUND_OVERLAYS: MapBackgroundOverlay[] = [
  {
    id: 'wild-chiang-mai-map',
    imageUrl: '/map-background-overlays/theme/wild-chiang-mai-map.webp',
    bounds: [
      [18.7556, 98.948],
      [18.8106, 99.009],
    ],
    opacity: 0.96,
  },
];

const MAP_BACKGROUND_AREA_LABELS: MapBackgroundArea[] = [
  { id: 'nimman', label: '尼曼区', position: [18.8026, 98.9624] },
  { id: 'old-city', label: '古城区', position: [18.7902, 98.9818], primary: true },
  { id: 'riverside', label: '河边 / 瓦洛洛', position: [18.787, 99.0068] },
  { id: 'hang-dong', label: '杭东区', position: [18.7048, 98.9272] },
  { id: 'mae-rim', label: '湄林区', position: [18.9189, 98.9397] },
  { id: 'suthep', label: '素贴山脚', position: [18.798, 98.944] },
  { id: 'chang-phueak', label: '昌普区', position: [18.817, 98.985] },
];

const LANDMARK_ICON_BASE = '/map-landmark-icons/optimized';
const STAMP_LANDMARK_ICON_BASE = '/map-landmark-icons/stamp';

const MAP_BACKGROUND_LANDMARKS: MapBackgroundLandmark[] = [
  {
    id: 'airport',
    label: '机场',
    position: [18.7717, 98.9683],
    iconUrl: `${LANDMARK_ICON_BASE}/airport-plane-flat.webp`,
    iconSize: [58, 62],
    cityOpacity: 0.38,
    nearOpacity: 0.56,
  },
  {
    id: 'tha-phae-gate',
    label: '塔佩门',
    position: [18.7878, 98.9931],
    iconUrl: `${LANDMARK_ICON_BASE}/tha-phae-gate-flat.webp`,
    iconSize: [84, 36],
    cityOpacity: 0.44,
    nearOpacity: 0.64,
  },
  {
    id: 'wat-chedi-luang',
    label: '契迪龙寺',
    position: [18.7869, 98.9868],
    iconUrl: `${LANDMARK_ICON_BASE}/wat-chedi-luang-flat.webp`,
    iconSize: [46, 34],
    cityOpacity: 0.14,
    nearOpacity: 0.34,
  },
  {
    id: 'wat-phra-singh',
    label: '帕辛寺',
    position: [18.7888, 98.9813],
    iconUrl: `${LANDMARK_ICON_BASE}/wat-phra-singh-flat.webp`,
    iconSize: [46, 35],
    cityOpacity: 0.12,
    nearOpacity: 0.32,
  },
  {
    id: 'doi-suthep',
    label: '素贴山 / 双龙寺',
    position: [18.8049, 98.9217],
    iconUrl: `${LANDMARK_ICON_BASE}/doi-suthep-flat.webp`,
    iconSize: [76, 42],
    cityOpacity: 0.26,
    nearOpacity: 0.46,
  },
  {
    id: 'three-kings',
    label: '三王纪念碑',
    position: [18.7903, 98.987],
    iconUrl: `${LANDMARK_ICON_BASE}/three-kings-monument-flat.webp`,
    iconSize: [40, 39],
    cityOpacity: 0.12,
    nearOpacity: 0.3,
  },
  {
    id: 'maya',
    label: 'MAYA / 尼曼',
    position: [18.807, 98.9607],
    iconUrl: `${LANDMARK_ICON_BASE}/maya-nimman-flat.webp`,
    iconSize: [50, 37],
    cityOpacity: 0.24,
    nearOpacity: 0.42,
  },
  {
    id: 'chiang-mai-university',
    label: '清迈大学',
    position: [18.8002, 98.9528],
    iconUrl: `${STAMP_LANDMARK_ICON_BASE}/chiang-mai-university-stamp.webp`,
    iconSize: [44, 42],
    cityOpacity: 0.28,
    nearOpacity: 0.52,
    visualTone: 'stamp',
  },
  {
    id: 'wat-umong',
    label: '悟孟寺',
    position: [18.7836, 98.9525],
    iconUrl: `${STAMP_LANDMARK_ICON_BASE}/wat-umong-stamp.webp`,
    iconSize: [48, 32],
    cityOpacity: 0.22,
    nearOpacity: 0.42,
    visualTone: 'stamp',
  },
  {
    id: 'wat-suan-dok',
    label: '松达寺',
    position: [18.7898, 98.972],
    iconUrl: `${STAMP_LANDMARK_ICON_BASE}/wat-suan-dok-stamp.webp`,
    iconSize: [32, 43],
    cityOpacity: 0.2,
    nearOpacity: 0.4,
    visualTone: 'stamp',
  },
  {
    id: 'warorot-market',
    label: '瓦洛洛市场',
    position: [18.7906, 99.0018],
    iconUrl: `${STAMP_LANDMARK_ICON_BASE}/warorot-market-stamp.webp`,
    iconSize: [44, 38],
    cityOpacity: 0.26,
    nearOpacity: 0.48,
    visualTone: 'stamp',
  },
  {
    id: 'railway-station',
    label: '火车站',
    position: [18.7823, 99.0165],
    iconUrl: `${STAMP_LANDMARK_ICON_BASE}/railway-station-stamp.webp`,
    iconSize: [34, 41],
    cityOpacity: 0.32,
    nearOpacity: 0.58,
    visualTone: 'stamp',
  },
  {
    id: 'arcade-bus-terminal',
    label: 'Arcade 巴士站',
    position: [18.8012, 99.0174],
    iconUrl: `${STAMP_LANDMARK_ICON_BASE}/arcade-bus-terminal-stamp.webp`,
    iconSize: [40, 34],
    cityOpacity: 0.3,
    nearOpacity: 0.56,
    visualTone: 'stamp',
  },
  {
    id: 'iron-bridge',
    label: '铁桥',
    position: [18.7839, 99.0062],
    iconUrl: `${LANDMARK_ICON_BASE}/iron-bridge-flat.webp`,
    iconSize: [70, 17],
    cityOpacity: 0.16,
    nearOpacity: 0.34,
  },
];

const MAP_ZOOM_CLASSES = ['cmi-map-zoom-wide', 'cmi-map-zoom-city', 'cmi-map-zoom-near', 'cmi-map-zoom-street'];

const getMapZoomClass = (zoom: number) => {
  if (zoom >= 16) return 'cmi-map-zoom-street';
  if (zoom >= 14.5) return 'cmi-map-zoom-near';
  if (zoom >= 12.5) return 'cmi-map-zoom-city';
  return 'cmi-map-zoom-wide';
};

const applyMapBackgroundZoomClass = (map: L.Map) => {
  const container = map.getContainer();
  container.classList.remove(...MAP_ZOOM_CLASSES);
  container.classList.add(getMapZoomClass(map.getZoom()));
};

const createAreaLabelIcon = (area: MapBackgroundArea) => L.divIcon({
  className: 'cmi-map-area-label-icon bg-transparent border-none',
  html: `<span class="cmi-map-area-label ${area.primary ? 'cmi-map-area-label--primary' : ''}">${area.label}</span>`,
  iconSize: area.primary ? [122, 42] : [112, 36],
  iconAnchor: area.primary ? [61, 21] : [56, 18],
});

const createLandmarkIcon = (landmark: MapBackgroundLandmark) => L.divIcon({
  className: 'cmi-map-landmark-icon bg-transparent border-none',
  html: `
    <div
      class="cmi-map-landmark ${landmark.visualTone === 'stamp' ? 'cmi-map-landmark--stamp' : ''}"
      style="
        --city-opacity: ${landmark.cityOpacity ?? 0.3};
        --near-opacity: ${landmark.nearOpacity ?? 0.48};
        --landmark-width: ${landmark.iconSize[0]}px;
        --landmark-height: ${landmark.iconSize[1]}px;
      "
    >
      <img
        src="${landmark.iconUrl}"
        alt=""
        width="${landmark.iconSize[0]}"
        height="${landmark.iconSize[1]}"
        loading="lazy"
        decoding="async"
        draggable="false"
      />
      <span>${landmark.label}</span>
    </div>
  `,
  iconSize: [landmark.iconSize[0], landmark.iconSize[1] + 18],
  iconAnchor: [landmark.iconSize[0] / 2, landmark.iconSize[1] / 2],
});

const getRiverLineStyle = (layer: 'casing' | 'stroke'): L.PolylineOptions => ({
  pane: 'cmi-map-feature-pane',
  interactive: false,
  lineCap: 'round',
  lineJoin: 'round',
  smoothFactor: 0.8,
  color: layer === 'casing' ? '#fff2c8' : '#2a9fb0',
  weight: layer === 'casing' ? 9.6 : 4.2,
  opacity: layer === 'casing' ? 0.46 : 0.52,
});

const addMapBackgroundLayer = (map: L.Map) => {
  const boundaryMaskPane = map.createPane('cmi-map-boundary-mask-pane');
  boundaryMaskPane.style.zIndex = '305';
  boundaryMaskPane.style.pointerEvents = 'none';

  const boundaryLinePane = map.createPane('cmi-map-boundary-line-pane');
  boundaryLinePane.style.zIndex = '306';
  boundaryLinePane.style.pointerEvents = 'none';

  const overlayPane = map.createPane('cmi-map-overlay-pane');
  overlayPane.style.zIndex = '308';
  overlayPane.style.pointerEvents = 'none';

  const featurePane = map.createPane('cmi-map-feature-pane');
  featurePane.style.zIndex = '312';
  featurePane.style.pointerEvents = 'none';

  const areaPane = map.createPane('cmi-map-area-pane');
  areaPane.style.zIndex = '342';
  areaPane.style.pointerEvents = 'none';

  const landmarkPane = map.createPane('cmi-map-landmark-pane');
  landmarkPane.style.zIndex = '365';
  landmarkPane.style.pointerEvents = 'none';

  const backgroundLayer = L.layerGroup();

  L.polygon([MAP_BOUNDARY_MASK_OUTER_RING, CHIANG_MAI_PROVINCE_BOUNDARY], {
    pane: 'cmi-map-boundary-mask-pane',
    interactive: false,
    stroke: false,
    fill: true,
    fillColor: '#fff0bd',
    fillOpacity: 1,
    fillRule: 'evenodd',
    smoothFactor: 0.6,
  }).addTo(backgroundLayer);

  L.polyline(CHIANG_MAI_PROVINCE_BOUNDARY, {
    pane: 'cmi-map-boundary-line-pane',
    interactive: false,
    color: '#2b241c',
    weight: 1.2,
    opacity: 0.24,
    dashArray: '2 7',
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 0.6,
  }).addTo(backgroundLayer);

  MAP_BACKGROUND_OVERLAYS.forEach((overlay) => {
    L.imageOverlay(overlay.imageUrl, overlay.bounds, {
      alt: '',
      pane: 'cmi-map-overlay-pane',
      interactive: false,
      opacity: overlay.opacity,
    }).addTo(backgroundLayer);
  });

  CHIANG_MAI_FEATURE_LINES.forEach((line) => {
    L.polyline(line.paths as L.LatLngExpression[][], getRiverLineStyle('casing')).addTo(backgroundLayer);
    L.polyline(line.paths as L.LatLngExpression[][], getRiverLineStyle('stroke')).addTo(backgroundLayer);
  });

  MAP_BACKGROUND_AREA_LABELS.forEach((area) => {
    L.marker(area.position, {
      icon: createAreaLabelIcon(area),
      interactive: false,
      keyboard: false,
      pane: 'cmi-map-area-pane',
      zIndexOffset: 0,
    }).addTo(backgroundLayer);
  });

  MAP_BACKGROUND_LANDMARKS.forEach((landmark) => {
    L.marker(landmark.position, {
      icon: createLandmarkIcon(landmark),
      interactive: false,
      keyboard: false,
      pane: 'cmi-map-landmark-pane',
      zIndexOffset: -80,
    }).addTo(backgroundLayer);
  });

  backgroundLayer.addTo(map);
  applyMapBackgroundZoomClass(map);

  const updateZoomClass = () => applyMapBackgroundZoomClass(map);
  map.on('zoomend', updateZoomClass);

  return () => {
    map.off('zoomend', updateZoomClass);
    backgroundLayer.remove();
  };
};

export const LeafletMap = ({
  markers = [],
  onMarkerClick,
  onMapClick,
  onMapInteraction,
  mode = 'view',
  onCenterChange,
  onUserLocation,
  onUserLocationError,
  defaultCenter = CHIANG_MAI_CENTER,
  defaultZoom = 13,
  focusTarget,
  focusTargetZoom,
  focusTargetOffsetYRatio = 0.14,
  focusUserLocation = false,
  constrainToChiangMai = true,
  locationZoom = 15,
  markTargetYRatio = 0.5,
  interactive = true,
  showUserLocation = true,
  className = ''
}: LeafletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const standaloneMarkerLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const onCenterChangeRef = useRef(onCenterChange);
  const onMapClickRef = useRef(onMapClick);
  const onMapInteractionRef = useRef(onMapInteraction);
  const onUserLocationRef = useRef(onUserLocation);
  const onUserLocationErrorRef = useRef(onUserLocationError);
  const orientationHandlerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);
  const markerVisualsRef = useRef(new WeakMap<L.Marker, MapMarkerVisual>());
  const userHeadingRef = useRef<number>(0); // 用户朝向角度
  const hasFocusedUserLocationRef = useRef(false);

  // 更新回调引用
  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    onMapInteractionRef.current = onMapInteraction;
  }, [onMapInteraction]);

  useEffect(() => {
    onUserLocationRef.current = onUserLocation;
  }, [onUserLocation]);

  useEffect(() => {
    onUserLocationErrorRef.current = onUserLocationError;
  }, [onUserLocationError]);

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // 创建地图实例
    const map = L.map(mapRef.current, {
      center: [defaultCenter.lat, defaultCenter.lng],
      zoom: defaultZoom,
      minZoom: 8,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      maxBounds: constrainToChiangMai ? CHIANG_MAI_BOUNDS : undefined,
      maxBoundsViscosity: constrainToChiangMai ? 1.0 : undefined,
      // NOTE: 外部地点搜索会触发“清空筛选点位 -> 插入临时 pin -> 聚焦”的连续更新；Canvas 渲染器在这条路径上偶发 clearRect 空引用。
      preferCanvas: false,
      zoomSnap: 0.5,              // 缩放步长更大，减少中间帧
      zoomAnimation: true,
      markerZoomAnimation: false, // 禁用 marker 跟随缩放的补间动画
      fadeAnimation: false,       // 禁用瓦片淡入，减少合成层
    });

    // 使用无文字底图，清迈区域、地标和主路由我们自己叠中文信息，避免泰文文字干扰。
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '' // 移除版权信息
    }).addTo(map);

    // 添加自定义 CSS 来修改地图颜色 - 更白的背景
    const style = document.createElement('style');
    style.textContent = `
      .leaflet-container {
        background: #fff2c8 !important;
      }
      .leaflet-tile-pane {
        opacity: 0.08;
        filter: sepia(0.8) saturate(0.72) hue-rotate(342deg) brightness(1.32) contrast(0.78);
        mix-blend-mode: multiply;
      }
      .cmi-map-boundary-mask-pane,
      .cmi-map-boundary-line-pane,
      .cmi-map-feature-pane,
      .cmi-map-overlay-pane,
      .cmi-map-area-pane,
      .cmi-map-landmark-pane,
      .cmi-map-area-label-icon,
      .cmi-map-landmark-icon,
      .cmi-map-area-label,
      .cmi-map-landmark {
        pointer-events: none !important;
      }
      .cmi-map-area-label {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 88px;
        color: rgba(8, 8, 6, 0.52);
        font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', system-ui, sans-serif;
        font-size: 16px;
        font-weight: 900;
        letter-spacing: 0;
        line-height: 1;
        text-align: center;
        white-space: nowrap;
        text-shadow:
          0 1px 0 rgba(255, 248, 220, 0.96),
          0 0 7px rgba(255, 248, 220, 0.8);
        transform: translateZ(0);
        transition: opacity 160ms ease;
      }
      .cmi-map-area-label--primary {
        color: rgba(8, 8, 6, 0.76);
        font-size: 25px;
        font-weight: 950;
      }
      .cmi-map-overlay-pane img {
        mix-blend-mode: normal;
        filter: saturate(1.04) contrast(1.04) brightness(0.98);
      }
      .cmi-map-feature-pane path {
        filter: drop-shadow(2px 2px 0 rgba(8, 8, 6, 0.07));
      }
      .cmi-map-landmark {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        opacity: 0;
        transform: translateZ(0) scale(0.96);
        transition: opacity 160ms ease;
        will-change: opacity;
      }
      .cmi-map-landmark img {
        display: block;
        width: var(--landmark-width);
        height: var(--landmark-height);
        max-width: none;
        object-fit: contain;
        filter: saturate(1.18) contrast(1.16) brightness(0.98);
        mix-blend-mode: multiply;
        user-select: none;
      }
      .cmi-map-landmark--stamp img {
        filter: saturate(1.24) contrast(1.28) brightness(0.96);
      }
      .cmi-map-landmark span {
        color: rgba(8, 8, 6, 0.58);
        font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', system-ui, sans-serif;
        font-size: 10px;
        font-weight: 900;
        line-height: 1;
        opacity: 0;
        text-shadow: 0 1px 0 rgba(255, 248, 220, 0.84);
        white-space: nowrap;
      }
      .cmi-map-zoom-wide .cmi-map-area-label {
        opacity: 0.86;
      }
      .cmi-map-zoom-city .cmi-map-area-label {
        opacity: 0.74;
      }
      .cmi-map-zoom-city .cmi-map-landmark {
        opacity: var(--city-opacity);
      }
      .cmi-map-zoom-city .cmi-map-landmark span {
        opacity: 0.56;
      }
      .cmi-map-zoom-near .cmi-map-area-label {
        opacity: 0.58;
      }
      .cmi-map-zoom-near .cmi-map-landmark {
        opacity: var(--near-opacity);
        transform: translateZ(0) scale(1.08);
      }
      .cmi-map-zoom-near .cmi-map-landmark span {
        opacity: 0.7;
      }
      .cmi-map-zoom-street .cmi-map-area-label {
        opacity: 0.42;
      }
      .cmi-map-zoom-street .cmi-map-landmark {
        opacity: calc(var(--near-opacity) + 0.12);
        transform: translateZ(0) scale(1.12);
      }
      .cmi-map-zoom-street .cmi-map-landmark span {
        opacity: 1;
      }
      .user-location-marker {
        z-index: 1200 !important;
      }
    `;
    document.head.appendChild(style);

    const cleanupMapBackgroundLayer = addMapBackgroundLayer(map);

    mapInstanceRef.current = map;
    const notifyMapInteraction = () => {
      onMapInteractionRef.current?.();
    };

    if (mode === 'view') {
      map.on('dragstart zoomstart', notifyMapInteraction);
    }

    // 添加地图点击事件
    if (mode === 'mark') {
      // 标记模式：点击地图移动到准星位置。准星比例由容器布局传入，避免准星和真实坐标错位。
      map.on('click', (e: L.LeafletMouseEvent) => {
        const mapSize = map.getSize();
        const targetPoint = L.point(mapSize.x / 2, mapSize.y * markTargetYRatio);
        const offset = e.containerPoint.subtract(targetPoint);
        map.panBy(offset, { animate: true, duration: 0.5 });
      });
    } else if (mode === 'view') {
      // 查看模式：点击地图空白区域关闭预览卡片
      map.on('click', () => {
        onMapClickRef.current?.();
      });
    }

    // 等待地图完全加载
    map.whenReady(() => {
      // 标记模式：监听地图移动与设置初始偏移
      if (mode === 'mark') {
        const mapSize = map.getSize();
        // 初始移动：把默认物理中心拉到准星位置。
        map.panBy(L.point(0, mapSize.y * (0.5 - markTargetYRatio)), { animate: false });
        
        map.on('moveend', () => {
          const currentMapSize = map.getSize();
          const targetPoint = L.point(currentMapSize.x / 2, currentMapSize.y * markTargetYRatio);
          const customCenter = map.containerPointToLatLng(targetPoint);
          if (onCenterChangeRef.current) {
            onCenterChangeRef.current(customCenter.lat, customCenter.lng);
          }
        });
      }

      // 获取用户当前位置并添加可爱的位置标记
      if (showUserLocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            try {
              const userLat = position.coords.latitude;
              const userLng = position.coords.longitude;
              onUserLocationRef.current?.(userLat, userLng);
              
              // 创建用户位置标记（手工矢量+脉冲光环+指南针指向）
              const createUserIcon = (heading: number = 0) => {
                return L.divIcon({
                  className: 'user-location-marker',
                  html: `
                    <div style="
                      width: 64px;
                      height: 64px;
                      position: relative;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    ">
                      <!-- 底部高亮脉冲圈 -->
                      <div style="
                        position: absolute;
                        width: 48px;
                        height: 48px;
                        background: hsl(var(--primary));
                        border-radius: 50%;
                        opacity: 0.3;
                        animation: aura-pulse 2s infinite ease-out;
                      "></div>
                      
                      <!-- 旋转的主干（带指南针和中心圆圈） -->
                      <div style="
                        position: relative;
                        width: 40px;
                        height: 40px;
                        transform: rotate(${heading}deg);
                        transition: transform 0.3s ease-out;
                        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
                      ">
                        <!-- 纯CSS/SVG手绘制品 -->
                        <svg viewBox="0 0 100 100" width="100%" height="100%" overflow="visible">
                          <!-- 外部不规则炭黑圈 -->
                          <circle cx="50" cy="50" r="30" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" stroke-width="6" stroke-dasharray="180" stroke-dashoffset="10"/>
                          <!-- 中心亮色定位点 -->
                          <circle cx="50" cy="50" r="14" fill="hsl(var(--destructive))" />
                          <!-- 指向玩家朝向的三角锥形指示器 -->
                          <path d="M50 0 L65 25 L35 25 Z" fill="hsl(var(--foreground))" stroke="hsl(var(--foreground))" stroke-width="4" stroke-linejoin="round" />
                        </svg>
                      </div>
                    </div>
                  `,
                  iconSize: [64, 64],
                  iconAnchor: [32, 32]
                });
              };

              // 添加用户位置标记
              const userMarker = L.marker([userLat, userLng], {
                icon: createUserIcon(0),
                interactive: false,
                zIndexOffset: 1200,
              })
                .addTo(map);
              
              userLocationMarkerRef.current = userMarker;

              // 监听设备方向变化
              const handleOrientation = (event: DeviceOrientationEvent) => {
                if (event.alpha !== null && userLocationMarkerRef.current) {
                  // alpha 是指南针方向（0-360度，0度为北）
                  const heading = 360 - event.alpha;
                  userHeadingRef.current = heading;
                  
                  // 更新箭头图标
                  const newIcon = createUserIcon(heading);
                  userLocationMarkerRef.current.setIcon(newIcon);
                }
              };

              if (typeof DeviceOrientationEvent !== 'undefined') {
                orientationHandlerRef.current = handleOrientation;
                window.addEventListener('deviceorientationabsolute' as keyof WindowEventMap, handleOrientation as EventListener);
                window.addEventListener('deviceorientation', handleOrientation);
              }

              // 标记模式下，将地图中心移动到用户位置
              if (mode === 'mark') {
                map.setView([userLat, userLng], 15);
              }

              if (mode === 'view' && focusUserLocation && !hasFocusedUserLocationRef.current) {
                const userLatLng = L.latLng(userLat, userLng);
                const chiangMaiBounds = L.latLngBounds(CHIANG_MAI_BOUNDS);
                if (!constrainToChiangMai || chiangMaiBounds.contains(userLatLng)) {
                  hasFocusedUserLocationRef.current = true;
                  map.setView(userLatLng, Math.max(map.getZoom(), locationZoom), { animate: false });
                }
              }
            } catch (error) {
              console.debug('设置用户位置标记失败', error);
            }
          },
          (error) => {
            onUserLocationErrorRef.current?.(error);
            console.debug('无法获取位置，使用默认位置', error);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 30_000,
            timeout: 10_000,
          }
        );
      }
    });

    return () => {
      // 清理设备方向监听器
      if (typeof DeviceOrientationEvent !== 'undefined' && orientationHandlerRef.current) {
        window.removeEventListener('deviceorientationabsolute' as keyof WindowEventMap, orientationHandlerRef.current as EventListener);
        window.removeEventListener('deviceorientation', orientationHandlerRef.current);
        orientationHandlerRef.current = null;
      }
      
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
      }
      map.off('dragstart zoomstart', notifyMapInteraction);
      cleanupMapBackgroundLayer();
      style.remove();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mode, defaultCenter, defaultZoom, focusUserLocation, constrainToChiangMai, interactive, locationZoom, markTargetYRatio, showUserLocation]); // 移除 onCenterChange 依赖

  useEffect(() => {
    if (!mapInstanceRef.current || mode !== 'view' || !focusTarget) return;

    const map = mapInstanceRef.current;
    const targetLatLng = L.latLng(focusTarget.lat, focusTarget.lng);

    // NOTE: 详情卡会盖住下半屏，选中地点需要停在露出的地图区域里，而不是物理中心。
    const focusSelectedTarget = () => {
      map.invalidateSize();
      map.setView(targetLatLng, focusTargetZoom ?? defaultZoom, { animate: false });
      const mapSize = map.getSize();
      map.panBy(L.point(0, mapSize.y * focusTargetOffsetYRatio), { animate: false });
    };

    if (map.getContainer()) {
      map.whenReady(focusSelectedTarget);
    }
  }, [
    mode,
    defaultZoom,
    focusTarget,
    focusTargetZoom,
    focusTargetOffsetYRatio,
  ]);

  // 更新标记点
  useEffect(() => {
    if (!mapInstanceRef.current || mode !== 'view') return;

    const map = mapInstanceRef.current;

    // 清除旧标记
    if (clusterGroupRef.current) {
      clusterGroupRef.current.clearLayers();
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    if (standaloneMarkerLayerRef.current) {
      standaloneMarkerLayerRef.current.clearLayers();
      map.removeLayer(standaloneMarkerLayerRef.current);
      standaloneMarkerLayerRef.current = null;
    }
    
    markersRef.current = [];

    // 初始化聚合组
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 58,
      zoomToBoundsOnClick: false,
      spiderfyOnMaxZoom: true,
      animate: false,              // 禁用聚合/散开动画，大幅降低缩放开销
      disableClusteringAtZoom: 17, // zoom 17+ 不再聚合，减少 DOM 操作
      
      iconCreateFunction: function(cluster) {
        const children = cluster.getAllChildMarkers();
        const count = children.length;
        
        // 最多展示 3 个叠放的类型印章，数量用“处”表达，避免被误读成点赞或评分。
        const displayMarkers = children.slice(0, Math.min(3, count));
        const visuals = displayMarkers
          .map(marker => markerVisualsRef.current.get(marker))
          .filter((visual): visual is MapMarkerVisual => Boolean(visual));
        const isEasterEggCluster = visuals.length > 0 && visuals.every(isEasterEggMarkerVisual);
        
        return L.divIcon({
          html: renderClusterIconHtml(visuals, count),
          className: 'scrapbook-cluster-icon bg-transparent border-none',
          iconSize: isEasterEggCluster ? [44, 38] : [62, 54],
          iconAnchor: isEasterEggCluster ? [22, 19] : [31, 50]
        });
      }
    });

    // 绑定点击事件，实现点位散开
    clusterGroup.on('clusterclick', function (a) {
      a.layer.spiderfy();
    });

    const standaloneMarkerLayer = L.layerGroup();

    // 添加新标记
    markers.forEach((markerData) => {
      const markerVisual = getMapMarkerVisual(markerData);
      const isEasterEggMarker = !markerVisual.isAvatar && (
        markerData.category === '彩蛋' || isEasterEggMarkerVisual(markerVisual)
      );

      if (isEasterEggMarker) {
        const icon = L.divIcon({
          className: 'custom-marker-icon bg-transparent border-none',
          html: `
            <div style="
              width:44px;
              height:44px;
              position:relative;
            ">
              ${renderEasterEggMarkerHtml(markerVisual)}
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });

        const marker = L.marker([markerData.latitude, markerData.longitude], { icon });
        markerVisualsRef.current.set(marker, markerVisual);

        if (onMarkerClick) {
          marker.on('click', () => {
            onMarkerClick(markerData);
          });
        }

        standaloneMarkerLayer.addLayer(marker);
        markersRef.current.push(marker);
        return;
      }
      
      // 计算该地点所有推荐的总点赞数
      const totalUpvotes = markerData.recommendations?.reduce((sum, rec) => {
        return sum + (rec.upvotes?.length || 0);
      }, 0) || 0;
      
      // 收集并统计该地点所有的贴纸
      const stickerCounts: Record<string, { count: number; sticker: any }> = {};
      markerData.recommendations?.forEach((rec) => {
        if (!rec.placed_stickers) return;
        const psArray = Array.isArray(rec.placed_stickers) ? rec.placed_stickers : [rec.placed_stickers];
        psArray.forEach((ps) => {
          if (!ps.sticker) return;
          const s = Array.isArray(ps.sticker) ? ps.sticker[0] : ps.sticker;
          if (!s) return;
          if (!stickerCounts[ps.sticker_id]) {
            stickerCounts[ps.sticker_id] = { count: 0, sticker: s };
          }
          stickerCounts[ps.sticker_id].count++;
        });
      });
      const topStickers = Object.values(stickerCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      const stickersHtml = topStickers.map((ts, idx) => `
        <div style="
          position: absolute;
          bottom: ${-4 + (idx * 2)}px;
          left: ${-8 + (idx * 16)}px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 12px;
          padding: 1px 4px;
          display: flex;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          z-index: ${20 - idx};
          transform: rotate(${idx % 2 === 0 ? '-5deg' : '5deg'});
        ">
          <img src="${ts.sticker.icon_url}" style="width: 14px; height: 14px; object-fit: contain; filter: saturate(0.8);" />
          <span style="font-size: 10px; font-weight: bold; color: #666; margin-left: 2px;">${ts.count}</span>
        </div>
      `).join('');

      const isHotspot = totalUpvotes > 0;
      const rootWidth = markerVisual.isAvatar ? (isHotspot ? 56 : 52) : (isHotspot ? 58 : 54);
      const rootHeight = markerVisual.isAvatar ? (isHotspot ? 56 : 52) : (isHotspot ? 58 : 54);
      const iconAnchor = markerVisual.isAvatar
        ? (isHotspot ? [28, 51] as [number, number] : [26, 47] as [number, number])
        : (isHotspot ? [29, 53] as [number, number] : [27, 49] as [number, number]);
      
      const icon = L.divIcon({
        className: 'custom-marker-icon bg-transparent border-none',
        html: `
          <div style="
            width: ${rootWidth}px;
            height: ${rootHeight}px;
            position: relative;
          ">
            ${renderMarkerBadgeHtml(markerVisual, isHotspot)}
            ${isHotspot ? `
              <div style="
                position: absolute;
                top: -2px;
                right: 1px;
                background: #f0533f;
                color: #fff;
                font-family: 'Inter','PingFang SC','Noto Sans SC',sans-serif;
                font-weight: 950;
                font-size: 10px;
                line-height: 1;
                padding: 4px 6px;
                border-radius: 999px;
                border: 2px solid white;
                box-shadow: 0 5px 10px rgba(240,83,63,0.25);
                transform: rotate(5deg);
              ">
                ♥ ${totalUpvotes}
              </div>
            ` : ''}
            ${stickersHtml}
          </div>
        `,
        iconSize: [rootWidth, rootHeight],
        iconAnchor
      });

      const marker = L.marker([markerData.latitude, markerData.longitude], { icon });
      markerVisualsRef.current.set(marker, markerVisual);

      // 添加点击事件
      if (onMarkerClick) {
        marker.on('click', () => {
          onMarkerClick(markerData);
        });
      }

      clusterGroup.addLayer(marker);
      markersRef.current.push(marker);
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    if (standaloneMarkerLayer.getLayers().length > 0) {
      map.addLayer(standaloneMarkerLayer);
      standaloneMarkerLayerRef.current = standaloneMarkerLayer;
    }

  }, [markers, mode, onMarkerClick]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div
        ref={mapRef}
        className="w-full h-full rounded-[0px]"
        style={{
          minHeight: '100%',
          pointerEvents: interactive ? 'auto' : 'none',
          touchAction: 'none',
          willChange: 'transform',
        }}
      />
      {/* 标记模式：显示精确准星，中心小点才是真正落点。 */}
      {mode === 'mark' && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1000]"
          style={{ top: `${markTargetYRatio * 100}%` }}
        >
          <div className="relative h-16 w-16">
            <div className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-[92%] items-center justify-center rounded-2xl border border-foreground/10 bg-background/95 text-[#f97316] shadow-[0_10px_24px_rgba(0,0,0,0.2)] backdrop-blur">
              <MapPin className="h-6 w-6" strokeWidth={3} />
            </div>
            <span
              aria-label="定位准星"
              className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f97316] shadow-[0_0_0_4px_rgba(255,255,255,0.95),0_4px_10px_rgba(0,0,0,0.22)]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
