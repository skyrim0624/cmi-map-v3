import { getPlaceGuide, isCommunityCuratedRecommendation } from '@/data/place-guides';
import type { Category, MapMarker } from '@/types/types';

type MarkerTone = 'food' | 'coffee' | 'outdoor' | 'photo' | 'market' | 'wellness' | 'utility' | 'night' | 'creative' | 'neutral';

type MarkerIconAsset =
  | 'food'
  | 'coffee'
  | 'outdoor'
  | 'photo'
  | 'market'
  | 'massage'
  | 'sport'
  | 'bar'
  | 'wellness'
  | 'utility'
  | 'hair'
  | 'exchange'
  | 'print'
  | 'book'
  | 'music'
  | 'hot-spring';

type MarkerRule = {
  pattern: RegExp;
  label: string;
  icon: MarkerIconAsset;
  tone: MarkerTone;
};

export type MapMarkerVisual = {
  label: string;
  iconUrl: string;
  accent: string;
  shadow: string;
  isCommunity: boolean;
};

// NOTE: 地图点位使用同一套旧贴纸资产，补齐全局分类之外的细分场景映射。
const LEGACY_MARKER_ICON_URLS: Record<MarkerIconAsset, string> = {
  food: '/categories/1.png',
  coffee: '/categories/2.png',
  outdoor: '/categories/3.png',
  photo: '/categories/4.png',
  market: '/categories/5.png',
  massage: '/categories/6.png',
  sport: '/categories/7.png',
  bar: '/categories/9.png',
  wellness: '/categories/10.png',
  utility: '/categories/11.png',
  hair: '/categories/11.png',
  exchange: '/categories/11.png',
  print: '/categories/11.png',
  book: '/categories/8.png',
  music: '/categories/9.png',
  'hot-spring': '/categories/10.png',
};

const TONES: Record<MarkerTone, Pick<MapMarkerVisual, 'accent' | 'shadow'>> = {
  food: {
    accent: '#e75f3d',
    shadow: 'rgba(149, 59, 32, 0.24)',
  },
  coffee: {
    accent: '#8b5e3c',
    shadow: 'rgba(91, 58, 34, 0.23)',
  },
  outdoor: {
    accent: '#3f7d4a',
    shadow: 'rgba(38, 90, 49, 0.21)',
  },
  photo: {
    accent: '#227c9d',
    shadow: 'rgba(22, 83, 106, 0.2)',
  },
  market: {
    accent: '#c75b78',
    shadow: 'rgba(142, 48, 78, 0.21)',
  },
  wellness: {
    accent: '#8566a8',
    shadow: 'rgba(93, 67, 128, 0.21)',
  },
  utility: {
    accent: '#0f8a83',
    shadow: 'rgba(9, 98, 93, 0.21)',
  },
  night: {
    accent: '#5757a7',
    shadow: 'rgba(57, 57, 119, 0.21)',
  },
  creative: {
    accent: '#b66b2f',
    shadow: 'rgba(124, 69, 29, 0.19)',
  },
  neutral: {
    accent: '#5f665f',
    shadow: 'rgba(63, 70, 63, 0.17)',
  },
};

const CATEGORY_MARKERS: Record<Category, Pick<MarkerRule, 'label' | 'icon' | 'tone'>> = {
  吃饭: { label: '吃饭', icon: 'food', tone: 'food' },
  咖啡: { label: '咖啡', icon: 'coffee', tone: 'coffee' },
  户外: { label: '户外', icon: 'outdoor', tone: 'outdoor' },
  拍照: { label: '拍照', icon: 'photo', tone: 'photo' },
  市集: { label: '市集', icon: 'market', tone: 'market' },
  马杀鸡: { label: '马杀鸡', icon: 'massage', tone: 'wellness' },
  运动: { label: '运动', icon: 'sport', tone: 'outdoor' },
  酒吧: { label: '酒吧', icon: 'bar', tone: 'night' },
  身心: { label: '身心', icon: 'wellness', tone: 'wellness' },
  生存指南: { label: '实用', icon: 'utility', tone: 'utility' },
  彩蛋: { label: '发现', icon: 'book', tone: 'neutral' },
};

const KIND_RULES: MarkerRule[] = [
  { pattern: /理发|salon|hair|barber|beauty/i, label: '理发', icon: 'hair', tone: 'utility' },
  { pattern: /换汇|exchange|money|currency/i, label: '换汇', icon: 'exchange', tone: 'utility' },
  { pattern: /打印|print|copy/i, label: '打印', icon: 'print', tone: 'utility' },
  { pattern: /书店|书房|书|book|library/i, label: '书店', icon: 'book', tone: 'creative' },
  { pattern: /商场|mall|central/i, label: '商场', icon: 'market', tone: 'market' },
  { pattern: /夜市|市场|市集|bazaar|market|ตลาด/i, label: '市场', icon: 'market', tone: 'market' },
  { pattern: /咖啡|烘焙|cafe|coffee|roastery|กาแฟ/i, label: '咖啡', icon: 'coffee', tone: 'coffee' },
  { pattern: /素食|vegan|vegetarian/i, label: '素食', icon: 'food', tone: 'food' },
  { pattern: /日料|寿司|日本|sushi|yakitori|japanese/i, label: '日料', icon: 'food', tone: 'food' },
  { pattern: /烤鸡|roast chicken/i, label: '烤鸡', icon: 'food', tone: 'food' },
  { pattern: /小吃|noodle|面|粿条|ข้าว|หมู|เป็ด/i, label: '小吃', icon: 'food', tone: 'food' },
  { pattern: /餐厅|厨房|自助|泰北菜|restaurant|kitchen|buffet|bbq|food/i, label: '餐厅', icon: 'food', tone: 'food' },
  { pattern: /livehouse|演出|音乐|show|theater|theatre/i, label: '演出', icon: 'music', tone: 'night' },
  { pattern: /酒吧|bar|pub|cocktail/i, label: '酒吧', icon: 'bar', tone: 'night' },
  { pattern: /温泉|hot spring/i, label: '温泉', icon: 'hot-spring', tone: 'wellness' },
  { pattern: /按摩|spa|马杀鸡|massage/i, label: '按摩', icon: 'massage', tone: 'wellness' },
  { pattern: /瑜伽|冥想|身心|yoga|meditation/i, label: '身心', icon: 'wellness', tone: 'wellness' },
  { pattern: /体育|运动|跑步|stadium|tennis|gym|fitness/i, label: '运动', icon: 'sport', tone: 'outdoor' },
  { pattern: /公园|花园|瀑布|湖|户外|村|山|park|garden|waterfall|lake|village|ดอย/i, label: '户外', icon: 'outdoor', tone: 'outdoor' },
  { pattern: /艺术|手作|工作室|studio|artist|craft|gallery/i, label: '手作', icon: 'book', tone: 'creative' },
  { pattern: /坐标|待确认|coordinate/i, label: '待确认', icon: 'utility', tone: 'neutral' },
];

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const findRule = (value: string) => KIND_RULES.find(rule => rule.pattern.test(value));

const buildVisual = (
  marker: Pick<MarkerRule, 'label' | 'icon' | 'tone'>,
  isCommunity: boolean
): MapMarkerVisual => ({
  ...TONES[marker.tone],
  label: marker.label,
  iconUrl: LEGACY_MARKER_ICON_URLS[marker.icon],
  isCommunity,
});

export const getMapMarkerVisual = (
  markerData: Pick<MapMarker, 'place_name' | 'category' | 'recommendations'>
): MapMarkerVisual => {
  const communityRecommendation = markerData.recommendations?.find(isCommunityCuratedRecommendation);
  const guide = communityRecommendation
    ? getPlaceGuide(communityRecommendation.place_name, communityRecommendation.category)
    : getPlaceGuide(markerData.place_name, markerData.category);
  const rule = findRule(`${guide.kind} ${guide.title} ${guide.placeName} ${markerData.place_name}`);

  if (rule) {
    return buildVisual(rule, Boolean(communityRecommendation));
  }

  return buildVisual(CATEGORY_MARKERS[markerData.category] || CATEGORY_MARKERS.彩蛋, Boolean(communityRecommendation));
};

export const renderMarkerBadgeHtml = (visual: MapMarkerVisual, isHotspot: boolean) => {
  const label = escapeHtml(visual.label);
  const iconSize = isHotspot ? 60 : 56;
  const tailTop = iconSize - 10;

  return `
    <div title="${label}" aria-label="${label}" style="
      position:absolute;
      left:50%;
      top:0;
      width:${iconSize}px;
      height:${iconSize}px;
      transform:translateX(-50%);
      border-radius:999px;
      background:#ffffff;
      padding:6px;
      box-shadow:0 4px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
      display:flex;
      align-items:center;
      justify-content:center;
      box-sizing:border-box;
    ">
      <img src="${visual.iconUrl}" alt="${label}" loading="lazy" style="
        width:100%;
        height:100%;
        object-fit:contain;
        display:block;
        filter:drop-shadow(0 1px 2px rgba(0,0,0,0.1));
      " />
      ${visual.isCommunity ? `
        <div style="
          position:absolute;
          right:6px;
          top:6px;
          width:7px;
          height:7px;
          border-radius:999px;
          background:${visual.accent};
          border:1.5px solid #fff;
          box-shadow:0 2px 4px ${visual.shadow};
        "></div>
      ` : ''}
    </div>
    <div style="
      position:absolute;
      left:50%;
      top:${tailTop}px;
      width:12px;
      height:12px;
      transform:translateX(-50%) rotate(45deg);
      background:#ffffff;
      border-right:1.5px solid rgba(70,61,52,0.12);
      border-bottom:1.5px solid rgba(70,61,52,0.12);
      box-shadow:4px 4px 7px ${visual.shadow};
    "></div>
  `;
};

export const renderClusterIconHtml = (visuals: MapMarkerVisual[], count: number) => {
  const transforms = [
    'translate(0px, 0px) rotate(-8deg)',
    'translate(12px, -6px) rotate(14deg)',
    'translate(-4px, 12px) rotate(-12deg)',
  ];
  const displayedVisuals = visuals.slice(0, 3);
  const miniIcons = displayedVisuals.map((visual, index) => `
    <div aria-hidden="true" style="
      position:absolute;
      top:8px;
      left:8px;
      width:48px;
      height:48px;
      transform:${transforms[index]};
      z-index:${index + 1};
      background:#ffffff;
      border-radius:50%;
      padding:5px;
      box-shadow:0 3px 6px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
      display:flex;
      align-items:center;
      justify-content:center;
      box-sizing:border-box;
    ">
      <img src="${visual.iconUrl}" alt="" loading="lazy" style="
        width:100%;
        height:100%;
        object-fit:contain;
        display:block;
        filter:drop-shadow(0 1px 2px rgba(0,0,0,0.1));
      " />
    </div>
  `).join('');
  const remaining = count - displayedVisuals.length;

  return `
    <div style="position:relative; width:72px; height:62px;">
      ${miniIcons}
      ${remaining > 0 ? `
        <div style="
          position:absolute;
          bottom:2px;
          right:-4px;
          z-index:10;
          background:#e2e8ce;
          color:#4a5d23;
          font-family:'Inter','PingFang SC','Noto Sans SC',sans-serif;
          font-weight:900;
          font-size:18px;
          line-height:1;
          padding:5px 9px 6px;
          transform:rotate(-6deg);
          box-shadow:1px 2px 4px rgba(0,0,0,0.15);
          border:1px dashed rgba(74,93,35,0.22);
          border-radius:2px;
        ">
          +${remaining}
        </div>
      ` : ''}
      <div style="
        position:absolute;
        left:50%;
        top:53px;
        width:10px;
        height:10px;
        transform:translateX(-50%) rotate(45deg);
        background:#ffffff;
        border-right:1.5px solid rgba(47,43,38,0.12);
        border-bottom:1.5px solid rgba(47,43,38,0.12);
        box-shadow:3px 3px 5px rgba(35,31,27,0.12);
      "></div>
    </div>
  `;
};
