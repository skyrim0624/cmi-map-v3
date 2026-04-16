import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapMarker } from '@/types/types';
import { getCategoryColor, getCategoryIconUrl } from '@/types/types';

interface LeafletMapProps {
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
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
  mode = 'view',
  onCenterChange,
  defaultCenter = CHIANG_MAI_CENTER,
  className = ''
}: LeafletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
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

    // 标记模式：添加地图点击事件（在 whenReady 之前添加）
    if (mode === 'mark') {
      console.log('标记模式：添加点击事件监听器');
      map.on('click', (e: L.LeafletMouseEvent) => {
        console.log('地图点击事件触发:', e.latlng);
        map.setView(e.latlng, map.getZoom(), {
          animate: true,
          duration: 0.5
        });
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
                ? 'https://miaoda-conversation-file.cdn.bcebos.com/user-aitwe90l6zuo/conv-az97tfv4utc0/20260416/file-azwlu3kp7ev4.png' // 录入模式：橙红色地图标记
                : 'https://miaoda-conversation-file.cdn.bcebos.com/user-aitwe90l6zuo/conv-az97tfv4utc0/20260416/file-azw6hmx5ubr4.png'; // 查看模式：蓝色箭头
              
              // 创建用户位置标记（带旋转）
              const createUserIcon = (heading: number = 0) => {
                return L.divIcon({
                  className: 'user-location-marker',
                  html: `
                    <div style="
                      width: 56px;
                      height: 56px;
                      position: relative;
                      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
                      transform: rotate(${heading}deg);
                      transition: transform 0.3s ease-out;
                    ">
                      <img 
                        src="${userIconUrl}" 
                        alt="用户位置" 
                        style="width: 100%; height: 100%; object-fit: contain;"
                      />
                    </div>
                  `,
                  iconSize: [56, 56],
                  iconAnchor: [28, 28]
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
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // 添加新标记
    markers.forEach((markerData) => {
      const categoryColor = getCategoryColor(markerData.category);
      const iconUrl = getCategoryIconUrl(markerData.category);
      
      // 创建手绘风格图标
      const icon = L.divIcon({
        className: 'custom-marker-icon',
        html: `
          <div style="
            width: 48px;
            height: 48px;
            position: relative;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          ">
            <div style="
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: hsl(var(--${categoryColor}));
              padding: 6px;
              box-sizing: border-box;
              border: 3px solid white;
            ">
              <img 
                src="${iconUrl}" 
                style="
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  border-radius: 50%;
                "
                alt=""
              />
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });

      const marker = L.marker([markerData.latitude, markerData.longitude], { icon })
        .addTo(map);

      // 添加点击事件
      if (onMarkerClick) {
        marker.on('click', () => {
          onMarkerClick(markerData);
        });
      }

      markersRef.current.push(marker);
    });
  }, [markers, mode, onMarkerClick]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-[0px]" style={{ minHeight: '100%' }} />
      {/* 标记模式：显示中心定位大头针 - 放在上半部分地图的中心（黄金分割点） */}
      {mode === 'mark' && (
        <div className="absolute top-[31%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1000]">
          <div className="relative animate-bounce-slow">
            {/* 橙红色地图定位图标 */}
            <img 
              src="https://miaoda-conversation-file.cdn.bcebos.com/user-aitwe90l6zuo/conv-az97tfv4utc0/20260416/file-azvnxf4clcsg.png" 
              alt="定位标记" 
              style={{
                width: '48px',
                height: '48px',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
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
