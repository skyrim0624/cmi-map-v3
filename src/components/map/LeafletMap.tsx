import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapMarker } from '@/types/types';
import { getCategoryColor, getCategoryIconUrl } from '@/types/types';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface LeafletMapProps {
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: () => void; // 点击地图空白区域的回调
  mode?: 'view' | 'mark'; // 查看模式或标记模式
  onCenterChange?: (lat: number, lng: number) => void;
  defaultCenter?: { lat: number; lng: number };
  className?: string;
}

// 清迈市中心坐标
const CHIANG_MAI_CENTER = { lat: 18.7883, lng: 98.9853 };

// 清迈地区边界（大致范围）
const CHIANG_MAI_BOUNDS: L.LatLngBoundsExpression = [
  [18.65, 98.85], // 西南角
  [18.95, 99.15]  // 东北角
];

export const LeafletMap = ({
  markers = [],
  onMarkerClick,
  onMapClick,
  mode = 'view',
  onCenterChange,
  defaultCenter = CHIANG_MAI_CENTER,
  className = ''
}: LeafletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const onCenterChangeRef = useRef(onCenterChange);
  const userHeadingRef = useRef<number>(0); // 用户朝向角度

  // 更新回调引用
  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // 创建地图实例
    const map = L.map(mapRef.current, {
      center: [defaultCenter.lat, defaultCenter.lng],
      zoom: 13,
      minZoom: 11,  // 最小缩放级别，防止缩得太小
      maxZoom: 18,  // 最大缩放级别
      zoomControl: false, // 隐藏缩放控制按钮
      attributionControl: false, // 隐藏版权信息
      maxBounds: CHIANG_MAI_BOUNDS, // 限制地图边界
      maxBoundsViscosity: 1.0 // 边界粘性，1.0 表示完全不能拖出边界
    });

    // 使用自定义样式的 OpenStreetMap 瓦片 - 更白的风格
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '' // 移除版权信息
    }).addTo(map);

    // 添加自定义 CSS 来修改地图颜色 - 更白的背景
    const style = document.createElement('style');
    style.textContent = `
      .leaflet-container {
        background: #ffffff !important;
      }
      .leaflet-tile-pane {
        opacity: 0.6;
      }
    `;
    document.head.appendChild(style);

    mapInstanceRef.current = map;

    // 添加地图点击事件
    if (mode === 'mark') {
      // 标记模式：点击地图移动到点击位置
      console.log('标记模式：添加点击事件监听器');
      map.on('click', (e: L.LeafletMouseEvent) => {
        console.log('地图点击事件触发:', e.latlng);
        map.setView(e.latlng, map.getZoom(), {
          animate: true,
          duration: 0.5
        });
      });
    } else if (mode === 'view' && onMapClick) {
      // 查看模式：点击地图空白区域关闭预览卡片
      map.on('click', () => {
        onMapClick();
      });
    }

    // 等待地图完全加载
    map.whenReady(() => {
      // 标记模式：监听地图移动
      if (mode === 'mark') {
        map.on('moveend', () => {
          const center = map.getCenter();
          if (onCenterChangeRef.current) {
            onCenterChangeRef.current(center.lat, center.lng);
          }
        });
      }

      // 获取用户当前位置并添加可爱的位置标记
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            try {
              const userLat = position.coords.latitude;
              const userLng = position.coords.longitude;
              
              // 根据模式选择用户位置图标
              const userIconUrl = mode === 'mark' 
                ? 'https://miaoda-conversation-file.cdn.bcebos.com/user-aitwe90l6zuo/conv-az97tfv4utc0/20260416/file-azwq0xhr1hxc.png' // 录入模式：橙红色地图标记
                : 'https://miaoda-conversation-file.cdn.bcebos.com/user-aitwe90l6zuo/conv-az97tfv4utc0/20260416/file-azw6hmx5ubr4.png'; // 查看模式：蓝色箭头
              
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
              const userMarker = L.marker([userLat, userLng], { icon: createUserIcon(0) })
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
                window.addEventListener('deviceorientationabsolute', handleOrientation as any);
                window.addEventListener('deviceorientation', handleOrientation);
              }

              // 标记模式下，将地图中心移动到用户位置
              if (mode === 'mark') {
                map.setView([userLat, userLng], 15);
              }
            } catch (error) {
              console.log('设置用户位置标记失败', error);
            }
          },
          (error) => {
            console.log('无法获取位置，使用默认位置', error);
          }
        );
      }
    });

    return () => {
      // 清理设备方向监听器
      if (typeof DeviceOrientationEvent !== 'undefined') {
        window.removeEventListener('deviceorientationabsolute', () => {});
        window.removeEventListener('deviceorientation', () => {});
      }
      
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mode, defaultCenter]); // 移除 onCenterChange 依赖

  // 更新标记点
  useEffect(() => {
    if (!mapInstanceRef.current || mode !== 'view') return;

    const map = mapInstanceRef.current;

    // 清除旧标记
    if (clusterGroupRef.current) {
      clusterGroupRef.current.clearLayers();
      map.removeLayer(clusterGroupRef.current);
    }
    
    markersRef.current = [];

    // 初始化聚合组
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: function(cluster) {
        return L.divIcon({
          className: 'custom-cluster-icon',
          html: `
            <div style="
              width: 48px;
              height: 48px;
              background: hsl(var(--foreground));
              color: hsl(var(--background));
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 18px;
              border: 3px solid hsl(var(--background));
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              font-family: 'Inter', sans-serif;
            ">
              ${cluster.getChildCount()}
            </div>
          `,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });
      }
    });

    // 添加新标记
    markers.forEach((markerData) => {
      const iconUrl = getCategoryIconUrl(markerData.category);
      
      // 创建手绘风格图标
      const icon = L.divIcon({
        className: 'custom-marker-icon',
        html: `
          <div style="
            width: 56px;
            height: 56px;
            position: relative;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          ">
            <img 
              src="${iconUrl}" 
              style="
                width: 100%;
                height: 100%;
                object-fit: contain;
              "
              alt=""
            />
          </div>
        `,
        iconSize: [56, 56],
        iconAnchor: [28, 28]
      });

      const marker = L.marker([markerData.latitude, markerData.longitude], { icon });

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

  }, [markers, mode, onMarkerClick]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-[0px]" style={{ minHeight: '100%' }} />
      {/* 标记模式：显示中心定位大头针 - 放在上半部分地图的中心（黄金分割点） */}
      {mode === 'mark' && (
        <div className="absolute top-[31%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1000]">
          <div className="relative animate-bounce-slow">
            {/* 橙红色手绘地图定位大头针 */}
            <img 
              src="/custom-pin.png" 
              alt="定位标记" 
              style={{
                width: '64px',
                height: '64px',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                transform: 'translateY(-8px)'
              }}
            />
            {/* 底部阴影圆点 */}
            <div 
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-1.5 bg-black/40 rounded-full blur-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
};
