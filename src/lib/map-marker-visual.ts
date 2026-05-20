import { getPlaceGuide, isCommunityCuratedRecommendation } from '@/data/place-guides';
import type { Category, MapMarker } from '@/types/types';
import { normalizeCategory } from '@/types/types';
import { getCmiEasterIconById, getRecommendationEasterIconId } from '@/lib/easter-icons';

type MarkerTone = 'food' | 'coffee' | 'outdoor' | 'photo' | 'landmark' | 'market' | 'wellness' | 'utility' | 'night' | 'creative' | 'neutral';

type MarkerIconAsset =
  | 'food'
  | 'coffee'
  | 'outdoor'
  | 'landmark'
  | 'market'
  | 'massage'
  | 'sport'
  | 'bar'
  | 'wellness'
  | 'utility'
  | 'sim'
  | 'pharmacy'
  | 'clinic'
  | 'motorbike'
  | 'visa'
  | 'laundry'
  | 'daily'
  | 'hair'
  | 'exchange'
  | 'print'
  | 'book'
  | 'gallery'
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

const EASTER_EGG_ICON_PATHS = ['/map-icons/cmi-easter/', '/map-icons/cmi-easter-v2/'];

export const isEasterEggMarkerVisual = (visual: Pick<MapMarkerVisual, 'iconUrl'>) =>
  EASTER_EGG_ICON_PATHS.some(path => visual.iconUrl.includes(path));

// NOTE: 地图点位用更细的图标表达地点类型，避免生存服务全部落到同一个工具箱图标。
const CMI_FLAT_ICON_BASE = '/map-icons/cmi-flat-v2';
const cmiFlatIcon = (name: string) => `${CMI_FLAT_ICON_BASE}/${name}.png`;

const MARKER_ICON_URLS: Record<MarkerIconAsset, string> = {
  food: cmiFlatIcon('place-restaurant'),
  coffee: cmiFlatIcon('place-cafe'),
  outdoor: cmiFlatIcon('place-nature'),
  landmark: cmiFlatIcon('place-landmark-camera'),
  market: cmiFlatIcon('place-market-handmade'),
  massage: cmiFlatIcon('place-massage'),
  sport: cmiFlatIcon('direct-sport'),
  bar: '/categories/9.png',
  wellness: cmiFlatIcon('place-yoga'),
  utility: cmiFlatIcon('direct-errands'),
  sim: cmiFlatIcon('survival-sim'),
  pharmacy: cmiFlatIcon('survival-pharmacy'),
  clinic: cmiFlatIcon('survival-clinic'),
  motorbike: cmiFlatIcon('survival-motorbike'),
  visa: cmiFlatIcon('survival-visa'),
  laundry: cmiFlatIcon('survival-laundry'),
  daily: cmiFlatIcon('survival-daily'),
  hair: cmiFlatIcon('survival-hair'),
  exchange: cmiFlatIcon('survival-exchange'),
  print: cmiFlatIcon('survival-print'),
  book: cmiFlatIcon('place-book'),
  gallery: cmiFlatIcon('place-gallery-palette'),
  music: cmiFlatIcon('place-livehouse-music'),
  'hot-spring': cmiFlatIcon('place-hot-spring'),
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
  landmark: {
    accent: '#1ba6b5',
    shadow: 'rgba(20, 114, 126, 0.2)',
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
  景点: { label: '景点', icon: 'landmark', tone: 'landmark' },
  拍照: { label: '景点', icon: 'landmark', tone: 'landmark' },
  市集: { label: '市集', icon: 'market', tone: 'market' },
  马杀鸡: { label: '马杀鸡', icon: 'massage', tone: 'wellness' },
  运动: { label: '运动', icon: 'sport', tone: 'outdoor' },
  酒吧: { label: '酒吧', icon: 'bar', tone: 'night' },
  身心: { label: '身心', icon: 'wellness', tone: 'wellness' },
  生存指南: { label: '实用', icon: 'utility', tone: 'utility' },
  彩蛋: { label: '发现', icon: 'book', tone: 'neutral' },
};

const KIND_RULES: MarkerRule[] = [
  { pattern: /电话卡|sim|esim|ais|true move|dtac/i, label: '电话卡', icon: 'sim', tone: 'photo' },
  { pattern: /药店|pharmacy|drugstore/i, label: '药店', icon: 'pharmacy', tone: 'utility' },
  { pattern: /诊所|医院|牙科|clinic|hospital|dental|dentist/i, label: '医疗', icon: 'clinic', tone: 'wellness' },
  { pattern: /租摩托|租车|motorbike|scooter|car rental/i, label: '租车', icon: 'motorbike', tone: 'neutral' },
  { pattern: /签证|visa|tm30|移民局|immigration|证件照|passport photo/i, label: '签证', icon: 'visa', tone: 'night' },
  { pattern: /洗衣|laundry|laundromat|dry clean/i, label: '洗衣', icon: 'laundry', tone: 'photo' },
  { pattern: /美妆|日用品|洗护|补货|cosmetics/i, label: '日用', icon: 'daily', tone: 'market' },
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
  { pattern: /景点|地标|观景点|观景台|寺庙|城门|temple|wat|landmark|viewpoint|monument/i, label: '景点', icon: 'landmark', tone: 'landmark' },
  { pattern: /公园|花园|瀑布|湖|户外|村|山|park|garden|waterfall|lake|village|ดอย/i, label: '户外', icon: 'outdoor', tone: 'outdoor' },
  { pattern: /艺术|手作|工作室|studio|artist|craft|gallery/i, label: '手作', icon: 'gallery', tone: 'creative' },
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
  iconUrl: MARKER_ICON_URLS[marker.icon],
  isCommunity,
});

export const getMapMarkerVisual = (
  markerData: Pick<MapMarker, 'place_name' | 'category' | 'recommendations' | 'visualOverride'>
): MapMarkerVisual => {
  const communityRecommendation = markerData.recommendations?.find(isCommunityCuratedRecommendation);
  const guide = communityRecommendation
    ? getPlaceGuide(communityRecommendation.place_name, communityRecommendation.category)
    : getPlaceGuide(markerData.place_name, markerData.category);
  const rule = findRule(`${guide.kind} ${guide.title} ${guide.placeName} ${markerData.place_name}`);
  const applyVisualOverride = (visual: MapMarkerVisual): MapMarkerVisual => (
    markerData.visualOverride
      ? {
        ...visual,
        label: markerData.visualOverride.label,
        iconUrl: markerData.visualOverride.iconUrl,
      }
      : visual
  );

  const normalizedCategory = normalizeCategory(markerData.category);
  if (normalizedCategory === '彩蛋') {
    const easterIconId = markerData.recommendations
      ?.map(getRecommendationEasterIconId)
      .find(Boolean);
    const easterIcon = getCmiEasterIconById(easterIconId);

    return applyVisualOverride({
      ...TONES.neutral,
      label: easterIcon.label,
      iconUrl: easterIcon.url,
      isCommunity: Boolean(communityRecommendation),
    });
  }

  if (rule) {
    return applyVisualOverride(buildVisual(rule, Boolean(communityRecommendation)));
  }

  return applyVisualOverride(
    buildVisual(CATEGORY_MARKERS[normalizedCategory] || CATEGORY_MARKERS.彩蛋, Boolean(communityRecommendation))
  );
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

export const renderEasterEggMarkerHtml = (visual: MapMarkerVisual) => {
  const label = escapeHtml(visual.label);
  const iconSize = visual.iconUrl.includes('easter-star') ? 34 : 30;

  return `
    <div title="${label}" aria-label="${label}" style="
      position:absolute;
      left:50%;
      top:50%;
      width:44px;
      height:44px;
      transform:translate(-50%, -50%);
      display:flex;
      align-items:center;
      justify-content:center;
      box-sizing:border-box;
    ">
      <img src="${visual.iconUrl}" alt="${label}" loading="lazy" style="
        width:${iconSize}px;
        height:${iconSize}px;
        object-fit:contain;
        display:block;
        filter:drop-shadow(0 2px 3px rgba(0,0,0,0.2));
      " />
    </div>
  `;
};

export const renderClusterIconHtml = (visuals: MapMarkerVisual[], count: number) => {
  if (visuals.length > 0 && visuals.every(isEasterEggMarkerVisual)) {
    const displayedVisuals = visuals.slice(0, 3);
    const miniIcons = displayedVisuals.map((visual, index) => {
      const offsets = [
        { left: 8, top: 10, rotate: -8 },
        { left: 24, top: 7, rotate: 10 },
        { left: 18, top: 21, rotate: -3 },
      ];
      const offset = offsets[index];
      const iconSize = visual.iconUrl.includes('easter-star') ? 24 : 22;

      return `
        <img src="${visual.iconUrl}" alt="" loading="lazy" style="
          position:absolute;
          left:${offset.left}px;
          top:${offset.top}px;
          width:${iconSize}px;
          height:${iconSize}px;
          object-fit:contain;
          transform:rotate(${offset.rotate}deg);
          filter:drop-shadow(0 2px 3px rgba(0,0,0,0.18));
          z-index:${index + 1};
        " />
      `;
    }).join('');

    return `
      <div style="position:relative; width:52px; height:44px;">
        ${miniIcons}
        ${count > 1 ? `
          <div style="
            position:absolute;
            right:1px;
            bottom:3px;
            z-index:10;
            min-width:18px;
            height:18px;
            padding:0 4px;
            border-radius:999px;
            background:#fff8eb;
            color:#342f2a;
            font-family:'Inter','PingFang SC','Noto Sans SC',sans-serif;
            font-weight:950;
            font-size:11px;
            line-height:18px;
            text-align:center;
            box-shadow:0 2px 5px rgba(0,0,0,0.14);
          ">+${count}</div>
        ` : ''}
      </div>
    `;
  }

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
          bottom:7px;
          right:-1px;
          z-index:10;
          min-width:27px;
          height:20px;
          background:#fff8eb;
          color:#342f2a;
          font-family:'Inter','PingFang SC','Noto Sans SC',sans-serif;
          font-weight:950;
          font-size:12px;
          line-height:1;
          padding:0 7px 1px;
          display:flex;
          align-items:center;
          justify-content:center;
          box-shadow:0 2px 0 rgba(45,39,34,0.15), 0 3px 7px rgba(45,39,34,0.14);
          border:1.5px solid rgba(55,49,43,0.28);
          border-radius:999px;
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
