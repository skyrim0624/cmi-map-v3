import { getPlaceGuide, isCommunityCuratedRecommendation } from '@/data/place-guides';
import type { Category, MapMarker } from '@/types/types';

type MarkerTone = 'food' | 'coffee' | 'outdoor' | 'photo' | 'market' | 'wellness' | 'utility' | 'night' | 'creative' | 'neutral';

type MarkerIcon =
  | 'bowl'
  | 'coffee'
  | 'mountain'
  | 'camera'
  | 'market'
  | 'massage'
  | 'runner'
  | 'wine'
  | 'lotus'
  | 'tool'
  | 'egg'
  | 'scissors'
  | 'exchange'
  | 'printer'
  | 'book'
  | 'bag'
  | 'leaf'
  | 'sushi'
  | 'chicken'
  | 'music'
  | 'spring'
  | 'palette'
  | 'target';

type MarkerRule = {
  pattern: RegExp;
  label: string;
  icon: MarkerIcon;
  tone: MarkerTone;
};

export type MapMarkerVisual = {
  label: string;
  icon: MarkerIcon;
  accent: string;
  tint: string;
  ink: string;
  border: string;
  shadow: string;
  isCommunity: boolean;
};

const TONES: Record<MarkerTone, Omit<MapMarkerVisual, 'label' | 'icon' | 'isCommunity'>> = {
  food: {
    accent: '#e75f3d',
    tint: '#fff0e8',
    ink: '#a33722',
    border: 'rgba(231, 95, 61, 0.34)',
    shadow: 'rgba(149, 59, 32, 0.22)',
  },
  coffee: {
    accent: '#8b5e3c',
    tint: '#fff5e8',
    ink: '#5f3a22',
    border: 'rgba(139, 94, 60, 0.34)',
    shadow: 'rgba(91, 58, 34, 0.22)',
  },
  outdoor: {
    accent: '#3f7d4a',
    tint: '#eef8ec',
    ink: '#265a31',
    border: 'rgba(63, 125, 74, 0.32)',
    shadow: 'rgba(38, 90, 49, 0.2)',
  },
  photo: {
    accent: '#227c9d',
    tint: '#edf8fc',
    ink: '#16536a',
    border: 'rgba(34, 124, 157, 0.3)',
    shadow: 'rgba(22, 83, 106, 0.2)',
  },
  market: {
    accent: '#c75b78',
    tint: '#fff0f5',
    ink: '#8e304e',
    border: 'rgba(199, 91, 120, 0.32)',
    shadow: 'rgba(142, 48, 78, 0.2)',
  },
  wellness: {
    accent: '#8566a8',
    tint: '#f6f1ff',
    ink: '#5d4380',
    border: 'rgba(133, 102, 168, 0.3)',
    shadow: 'rgba(93, 67, 128, 0.2)',
  },
  utility: {
    accent: '#0f8a83',
    tint: '#eaf9f6',
    ink: '#09625d',
    border: 'rgba(15, 138, 131, 0.3)',
    shadow: 'rgba(9, 98, 93, 0.2)',
  },
  night: {
    accent: '#5757a7',
    tint: '#f0f1ff',
    ink: '#393977',
    border: 'rgba(87, 87, 167, 0.3)',
    shadow: 'rgba(57, 57, 119, 0.2)',
  },
  creative: {
    accent: '#b66b2f',
    tint: '#fff4e8',
    ink: '#7c451d',
    border: 'rgba(182, 107, 47, 0.3)',
    shadow: 'rgba(124, 69, 29, 0.18)',
  },
  neutral: {
    accent: '#5f665f',
    tint: '#f2f4ef',
    ink: '#3f463f',
    border: 'rgba(95, 102, 95, 0.28)',
    shadow: 'rgba(63, 70, 63, 0.16)',
  },
};

const CATEGORY_MARKERS: Record<Category, Pick<MarkerRule, 'label' | 'icon' | 'tone'>> = {
  吃饭: { label: '吃饭', icon: 'bowl', tone: 'food' },
  咖啡: { label: '咖啡', icon: 'coffee', tone: 'coffee' },
  户外: { label: '户外', icon: 'mountain', tone: 'outdoor' },
  拍照: { label: '拍照', icon: 'camera', tone: 'photo' },
  市集: { label: '市集', icon: 'market', tone: 'market' },
  马杀鸡: { label: '马杀鸡', icon: 'massage', tone: 'wellness' },
  运动: { label: '运动', icon: 'runner', tone: 'outdoor' },
  酒吧: { label: '酒吧', icon: 'wine', tone: 'night' },
  身心: { label: '身心', icon: 'lotus', tone: 'wellness' },
  生存指南: { label: '实用', icon: 'tool', tone: 'utility' },
  彩蛋: { label: '发现', icon: 'egg', tone: 'neutral' },
};

const KIND_RULES: MarkerRule[] = [
  { pattern: /理发|salon|hair|barber|beauty/i, label: '理发', icon: 'scissors', tone: 'utility' },
  { pattern: /换汇|exchange|money|currency/i, label: '换汇', icon: 'exchange', tone: 'utility' },
  { pattern: /打印|print|copy/i, label: '打印', icon: 'printer', tone: 'utility' },
  { pattern: /书店|书房|书|book|library/i, label: '书店', icon: 'book', tone: 'creative' },
  { pattern: /商场|mall|central/i, label: '商场', icon: 'bag', tone: 'market' },
  { pattern: /夜市|市场|市集|bazaar|market|ตลาด/i, label: '市场', icon: 'market', tone: 'market' },
  { pattern: /咖啡|烘焙|cafe|coffee|roastery|กาแฟ/i, label: '咖啡', icon: 'coffee', tone: 'coffee' },
  { pattern: /素食|vegan|vegetarian/i, label: '素食', icon: 'leaf', tone: 'food' },
  { pattern: /日料|寿司|日本|sushi|yakitori|japanese/i, label: '日料', icon: 'sushi', tone: 'food' },
  { pattern: /烤鸡|roast chicken/i, label: '烤鸡', icon: 'chicken', tone: 'food' },
  { pattern: /小吃|noodle|面|粿条|ข้าว|หมู|เป็ด/i, label: '小吃', icon: 'bowl', tone: 'food' },
  { pattern: /餐厅|厨房|自助|泰北菜|restaurant|kitchen|buffet|bbq|food/i, label: '餐厅', icon: 'bowl', tone: 'food' },
  { pattern: /livehouse|演出|音乐|show|theater|theatre/i, label: '演出', icon: 'music', tone: 'night' },
  { pattern: /酒吧|bar|pub|cocktail/i, label: '酒吧', icon: 'wine', tone: 'night' },
  { pattern: /温泉|hot spring/i, label: '温泉', icon: 'spring', tone: 'wellness' },
  { pattern: /按摩|spa|马杀鸡|massage/i, label: '按摩', icon: 'massage', tone: 'wellness' },
  { pattern: /瑜伽|冥想|身心|yoga|meditation/i, label: '身心', icon: 'lotus', tone: 'wellness' },
  { pattern: /体育|运动|跑步|stadium|tennis|gym|fitness/i, label: '运动', icon: 'runner', tone: 'outdoor' },
  { pattern: /公园|花园|瀑布|湖|户外|村|山|park|garden|waterfall|lake|village|ดอย/i, label: '户外', icon: 'mountain', tone: 'outdoor' },
  { pattern: /艺术|手作|工作室|studio|artist|craft|gallery/i, label: '手作', icon: 'palette', tone: 'creative' },
  { pattern: /坐标|待确认|coordinate/i, label: '待确认', icon: 'target', tone: 'neutral' },
];

const ICON_PATHS: Record<MarkerIcon, string> = {
  bowl: `
    <path d="M5 11.5h14c-.35 4.2-3 7-7 7s-6.65-2.8-7-7Z" />
    <path d="M7 18.5h10" />
    <path d="M7 7.5 18 4.5" />
    <path d="M9 9 20 6" />
  `,
  coffee: `
    <path d="M6.5 9.5h9.5v5.2a4.1 4.1 0 0 1-4.1 4.1H10.6a4.1 4.1 0 0 1-4.1-4.1V9.5Z" />
    <path d="M16 11h1.2a2.2 2.2 0 0 1 0 4.4H16" />
    <path d="M8 20h8" />
    <path d="M9 5.2c-.7.8-.7 1.5 0 2.3" />
    <path d="M12 4.4c-.8.9-.8 1.8 0 2.7" />
    <path d="M15 5.2c-.7.8-.7 1.5 0 2.3" />
  `,
  mountain: `
    <path d="M3.8 18.5 9.6 8.2l4.1 6.7 2-3.2 4.5 6.8H3.8Z" />
    <path d="M8.1 11.1 9.7 12.8l1.7-1.8" />
  `,
  camera: `
    <path d="M5 8.5h3.3l1.2-2h5l1.2 2H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
    <circle cx="12" cy="14" r="3.2" />
    <path d="M17.5 11h.1" />
  `,
  market: `
    <path d="M5.2 9.5h13.6l-1 10H6.2l-1-10Z" />
    <path d="M8.5 9.5a3.5 3.5 0 0 1 7 0" />
    <path d="M7.3 13.2h9.4" />
  `,
  massage: `
    <path d="M7.8 18.4c2.2-2 2.4-4.2.8-6.5" />
    <path d="M12 18.8c2.6-2.8 2.7-6.2.3-9.4" />
    <path d="M16.4 18.4c2.1-2.3 1.9-4.7-.6-7.2" />
    <path d="M8.1 8.2h7.8" />
    <path d="M12 5.2v5.8" />
  `,
  runner: `
    <circle cx="13.5" cy="5.5" r="1.8" />
    <path d="M11.5 9.2 8.8 12l3.8 1.4 2.2 3.6" />
    <path d="M13.1 9.3 16 11l2.3-.7" />
    <path d="M10 13.2 8.2 18" />
    <path d="M14.8 16.9 18.3 19" />
  `,
  wine: `
    <path d="M8 5.5h8l-.9 5.2a3.1 3.1 0 0 1-6.2 0L8 5.5Z" />
    <path d="M12 13.8v5" />
    <path d="M8.7 19h6.6" />
    <path d="M8.5 9h7" />
  `,
  lotus: `
    <path d="M12 18.7c-2.1-2.4-2.1-5 0-7.8 2.1 2.8 2.1 5.4 0 7.8Z" />
    <path d="M8.8 17.9c-2.4-.9-3.6-2.8-3.5-5.8 2.7.8 4.1 2.6 4.2 5.4" />
    <path d="M15.2 17.9c2.4-.9 3.6-2.8 3.5-5.8-2.7.8-4.1 2.6-4.2 5.4" />
    <path d="M6.5 19.2h11" />
  `,
  tool: `
    <path d="M14.7 6.2a4 4 0 0 0 4.8 4.8l-6.9 6.9a2.3 2.3 0 0 1-3.2-3.2l6.9-6.9Z" />
    <path d="M7.5 16.5 5.2 18.8" />
  `,
  egg: `
    <path d="M12 20c-3 0-5.2-2.1-5.2-5.4 0-3.9 2.4-10.1 5.2-10.1s5.2 6.2 5.2 10.1c0 3.3-2.2 5.4-5.2 5.4Z" />
    <path d="M9.4 14.6c1.4 1 3.9 1 5.2 0" />
  `,
  scissors: `
    <circle cx="6.4" cy="7.2" r="2.2" />
    <circle cx="6.4" cy="16.8" r="2.2" />
    <path d="M8.2 8.5 19 17.8" />
    <path d="M8.2 15.5 19 6.2" />
    <path d="M11 12h.1" />
  `,
  exchange: `
    <path d="M7 8h10l-2.4-2.4" />
    <path d="M17 16H7l2.4 2.4" />
    <path d="M16.8 8.1 19 10.3" />
    <path d="M7.2 15.9 5 13.7" />
    <circle cx="12" cy="12" r="2.2" />
  `,
  printer: `
    <path d="M7.2 8V4.8h9.6V8" />
    <path d="M6 17H4.6a1.8 1.8 0 0 1-1.8-1.8v-4.4A1.8 1.8 0 0 1 4.6 9h14.8a1.8 1.8 0 0 1 1.8 1.8v4.4a1.8 1.8 0 0 1-1.8 1.8H18" />
    <path d="M7 14h10v5.2H7z" />
    <path d="M17.8 11.8h.1" />
  `,
  book: `
    <path d="M5.2 5.5h5.1a2 2 0 0 1 2 2v11.2a2 2 0 0 0-2-2H5.2V5.5Z" />
    <path d="M18.8 5.5h-5.1a2 2 0 0 0-2 2v11.2a2 2 0 0 1 2-2h5.1V5.5Z" />
  `,
  bag: `
    <path d="M6.5 9h11l1 10.2h-13L6.5 9Z" />
    <path d="M9 9a3 3 0 0 1 6 0" />
    <path d="M9.2 13.5h5.6" />
  `,
  leaf: `
    <path d="M5.3 18.8c.8-7.1 5.5-10.9 13.8-11.4-.4 7.5-4.7 11.7-12.7 12" />
    <path d="M7.2 17.6c2.8-3.4 5.7-5.6 8.9-6.7" />
  `,
  sushi: `
    <path d="M5.5 8.2h13v8.6h-13z" />
    <path d="M8.1 8.2v8.6" />
    <path d="M15.9 8.2v8.6" />
    <path d="M5.5 11.1h13" />
  `,
  chicken: `
    <path d="M9.4 11.6a4.1 4.1 0 0 1 7.1-2.8 4.1 4.1 0 0 1-2.8 7.1H9.4v-4.3Z" />
    <path d="M9.4 14.6 6.7 17.3" />
    <path d="M5.3 16.1 7.9 18.7" />
  `,
  music: `
    <path d="M14.5 5.2v10.4a2.5 2.5 0 1 1-1.5-2.3V7.1l6-1.5v8.6a2.5 2.5 0 1 1-1.5-2.3V5.2" />
  `,
  spring: `
    <path d="M7.2 16.5c2.5 1.7 7.1 1.7 9.6 0" />
    <path d="M8.8 19c1.9.8 4.5.8 6.4 0" />
    <path d="M9 11.5c-.8-1.2-.7-2.3.4-3.4" />
    <path d="M12 12.2c-1-1.5-1-2.9.2-4.1" />
    <path d="M15 11.5c-.8-1.2-.7-2.3.4-3.4" />
  `,
  palette: `
    <path d="M12 4.8a7.4 7.4 0 0 0 0 14.8h1.4a1.7 1.7 0 0 0 1.2-2.9l-.3-.3a1.3 1.3 0 0 1 .9-2.2h1.2A3.5 3.5 0 0 0 20 10.7c0-3.3-3.4-5.9-8-5.9Z" />
    <circle cx="8.8" cy="10" r=".7" />
    <circle cx="11.6" cy="8" r=".7" />
    <circle cx="14.7" cy="9.4" r=".7" />
  `,
  target: `
    <circle cx="12" cy="12" r="6.8" />
    <circle cx="12" cy="12" r="2.3" />
    <path d="M12 3.8v3" />
    <path d="M12 17.2v3" />
    <path d="M3.8 12h3" />
    <path d="M17.2 12h3" />
  `,
};

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
  icon: marker.icon,
  isCommunity,
});

const renderLineIcon = (icon: MarkerIcon, color: string, size: number) => `
  <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    ${ICON_PATHS[icon]}
  </svg>
`;

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
  const bodySize = isHotspot ? 56 : 52;
  const innerSize = isHotspot ? 43 : 40;
  const iconSize = isHotspot ? 27 : 25;
  const tailTop = bodySize - 7;

  return `
    <div title="${label}" aria-label="${label}" style="
      position:absolute;
      left:50%;
      top:0;
      width:${bodySize}px;
      height:${bodySize}px;
      transform:translateX(-50%);
      border-radius:999px;
      background:linear-gradient(180deg, rgba(255,255,255,0.98), rgba(249,247,241,0.96));
      border:1.5px solid ${visual.border};
      box-shadow:0 10px 20px ${visual.shadow}, 0 2px 5px rgba(31,28,24,0.1), inset 0 1px 0 rgba(255,255,255,0.95);
      display:flex;
      align-items:center;
      justify-content:center;
      box-sizing:border-box;
    ">
      <div style="
        width:${innerSize}px;
        height:${innerSize}px;
        border-radius:999px;
        background:radial-gradient(circle at 35% 25%, rgba(255,255,255,0.98), ${visual.tint} 66%);
        border:1px solid ${visual.border};
        color:${visual.ink};
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:inset 0 1px 0 rgba(255,255,255,0.92);
      ">
        ${renderLineIcon(visual.icon, visual.ink, iconSize)}
      </div>
      ${visual.isCommunity ? `
        <div style="
          position:absolute;
          right:5px;
          top:5px;
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
      background:rgba(249,247,241,0.98);
      border-right:1.5px solid ${visual.border};
      border-bottom:1.5px solid ${visual.border};
      box-shadow:4px 4px 7px ${visual.shadow};
    "></div>
  `;
};

export const renderClusterIconHtml = (visuals: MapMarkerVisual[], count: number) => {
  const displayVisuals = visuals.slice(0, 3);
  const miniIcons = displayVisuals.map((visual, index) => `
    <div style="
      width:24px;
      height:24px;
      border-radius:999px;
      background:${visual.tint};
      border:1.5px solid rgba(255,255,255,0.94);
      box-shadow:0 4px 9px ${visual.shadow};
      display:flex;
      align-items:center;
      justify-content:center;
      margin-left:${index === 0 ? '0' : '-7px'};
      color:${visual.ink};
    ">
      ${renderLineIcon(visual.icon, visual.ink, 14)}
    </div>
  `).join('');

  return `
    <div style="position:relative; width:70px; height:58px;">
      <div style="
        position:absolute;
        left:50%;
        top:2px;
        width:52px;
        height:52px;
        transform:translateX(-50%);
        border-radius:999px;
        background:linear-gradient(180deg, rgba(255,255,255,0.98), rgba(249,247,241,0.96));
        color:#2f2b26;
        border:1.5px solid rgba(47,43,38,0.14);
        box-shadow:0 10px 20px rgba(35,31,27,0.17), inset 0 1px 0 rgba(255,255,255,0.95);
        display:flex;
        align-items:center;
        justify-content:center;
        font-family:'Inter','PingFang SC','Noto Sans SC',sans-serif;
        font-size:18px;
        font-weight:950;
        letter-spacing:0;
      ">${count}</div>
      <div style="
        position:absolute;
        left:50%;
        top:-4px;
        transform:translateX(-50%);
        height:26px;
        display:flex;
        align-items:center;
        z-index:5;
      ">${miniIcons}</div>
      <div style="
        position:absolute;
        left:50%;
        top:48px;
        width:10px;
        height:10px;
        transform:translateX(-50%) rotate(45deg);
        background:rgba(249,247,241,0.98);
        border-right:1.5px solid rgba(47,43,38,0.12);
        border-bottom:1.5px solid rgba(47,43,38,0.12);
        box-shadow:3px 3px 5px rgba(35,31,27,0.12);
      "></div>
    </div>
  `;
};
