import { getPlaceGuide, isCommunityCuratedRecommendation } from '@/data/place-guides';
import type { Category, MapMarker } from '@/types/types';

type MarkerTone = 'food' | 'coffee' | 'outdoor' | 'photo' | 'market' | 'wellness' | 'utility' | 'night' | 'creative' | 'neutral';

type MarkerRule = {
  pattern: RegExp;
  label: string;
  glyph: string;
  tone: MarkerTone;
};

export type MapMarkerVisual = {
  label: string;
  glyph: string;
  accent: string;
  tint: string;
  ink: string;
  border: string;
  shadow: string;
  isCommunity: boolean;
};

const TONES: Record<MarkerTone, Omit<MapMarkerVisual, 'label' | 'glyph' | 'isCommunity'>> = {
  food: {
    accent: '#e55f3f',
    tint: '#fff0e8',
    ink: '#9f321d',
    border: 'rgba(229, 95, 63, 0.32)',
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

const CATEGORY_MARKERS: Record<Category, Pick<MarkerRule, 'label' | 'glyph' | 'tone'>> = {
  吃饭: { label: '吃饭', glyph: '饭', tone: 'food' },
  咖啡: { label: '咖啡', glyph: '咖', tone: 'coffee' },
  户外: { label: '户外', glyph: '山', tone: 'outdoor' },
  拍照: { label: '拍照', glyph: '拍', tone: 'photo' },
  市集: { label: '市集', glyph: '市', tone: 'market' },
  马杀鸡: { label: '按摩', glyph: '按', tone: 'wellness' },
  运动: { label: '运动', glyph: '动', tone: 'outdoor' },
  酒吧: { label: '酒吧', glyph: '酒', tone: 'night' },
  身心: { label: '身心', glyph: '心', tone: 'wellness' },
  生存指南: { label: '实用', glyph: '用', tone: 'utility' },
  彩蛋: { label: '发现', glyph: '寻', tone: 'neutral' },
};

const KIND_RULES: MarkerRule[] = [
  { pattern: /理发|salon|hair|barber|beauty/i, label: '理发', glyph: '剪', tone: 'utility' },
  { pattern: /换汇|exchange|money|currency/i, label: '换汇', glyph: '฿', tone: 'utility' },
  { pattern: /打印|print|copy/i, label: '打印', glyph: '印', tone: 'utility' },
  { pattern: /书店|书房|书|book|library/i, label: '书店', glyph: '书', tone: 'creative' },
  { pattern: /商场|mall|central/i, label: '商场', glyph: '买', tone: 'market' },
  { pattern: /夜市|市场|市集|bazaar|market|ตลาด/i, label: '市场', glyph: '市', tone: 'market' },
  { pattern: /咖啡|烘焙|cafe|coffee|roastery|กาแฟ/i, label: '咖啡', glyph: '咖', tone: 'coffee' },
  { pattern: /素食|vegan|vegetarian/i, label: '素食', glyph: '素', tone: 'food' },
  { pattern: /日料|寿司|日本|sushi|yakitori|japanese/i, label: '日料', glyph: '寿', tone: 'food' },
  { pattern: /烤鸡|roast chicken/i, label: '烤鸡', glyph: '烤', tone: 'food' },
  { pattern: /小吃|noodle|面|粿条|ข้าว|หมู|เป็ด/i, label: '小吃', glyph: '食', tone: 'food' },
  { pattern: /餐厅|厨房|自助|泰北菜|restaurant|kitchen|buffet|bbq|food/i, label: '餐厅', glyph: '饭', tone: 'food' },
  { pattern: /livehouse|演出|音乐|show|theater|theatre/i, label: '演出', glyph: '音', tone: 'night' },
  { pattern: /酒吧|bar|pub|cocktail/i, label: '酒吧', glyph: '酒', tone: 'night' },
  { pattern: /温泉|hot spring/i, label: '温泉', glyph: '汤', tone: 'wellness' },
  { pattern: /按摩|spa|马杀鸡|massage/i, label: '按摩', glyph: '按', tone: 'wellness' },
  { pattern: /瑜伽|冥想|身心|yoga|meditation/i, label: '身心', glyph: '心', tone: 'wellness' },
  { pattern: /体育|运动|跑步|stadium|tennis|gym|fitness/i, label: '运动', glyph: '动', tone: 'outdoor' },
  { pattern: /公园|花园|瀑布|湖|户外|村|山|park|garden|waterfall|lake|village|ดอย/i, label: '户外', glyph: '山', tone: 'outdoor' },
  { pattern: /艺术|手作|工作室|studio|artist|craft|gallery/i, label: '手作', glyph: '艺', tone: 'creative' },
  { pattern: /坐标|待确认|coordinate/i, label: '待核', glyph: '核', tone: 'neutral' },
];

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const compactLabel = (value: string) => {
  const clean = value.replace(/\s+/g, '').replace(/[/-].*$/, '');
  if (clean.length <= 3) return clean;
  return clean.slice(0, 3);
};

const findRule = (value: string) => KIND_RULES.find(rule => rule.pattern.test(value));

const buildVisual = (
  marker: Pick<MarkerRule, 'label' | 'glyph' | 'tone'>,
  isCommunity: boolean
): MapMarkerVisual => ({
  ...TONES[marker.tone],
  label: compactLabel(marker.label),
  glyph: marker.glyph,
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

const getChipWidth = (label: string) => {
  if (label.length >= 3) return 74;
  return 64;
};

export const renderMarkerBadgeHtml = (visual: MapMarkerVisual, isHotspot: boolean) => {
  const label = escapeHtml(visual.label);
  const glyph = escapeHtml(visual.glyph);
  const chipWidth = getChipWidth(visual.label);
  const chipHeight = isHotspot ? 42 : 38;
  const glyphSize = isHotspot ? 25 : 23;
  const textSize = visual.label.length >= 3 ? 12 : 13;

  return `
    <div style="
      position:absolute;
      left:50%;
      top:2px;
      width:${chipWidth}px;
      height:${chipHeight}px;
      transform:translateX(-50%);
      border-radius:999px 999px 999px 14px;
      background:linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,248,244,0.96));
      border:1.5px solid ${visual.border};
      box-shadow:0 9px 18px ${visual.shadow}, 0 2px 4px rgba(26,24,21,0.08), inset 0 1px 0 rgba(255,255,255,0.96);
      display:flex;
      align-items:center;
      justify-content:center;
      gap:4px;
      padding:0 7px 0 5px;
      box-sizing:border-box;
    ">
      <span style="
        width:${glyphSize}px;
        height:${glyphSize}px;
        border-radius:999px;
        background:${visual.tint};
        border:1px solid ${visual.border};
        color:${visual.ink};
        display:flex;
        align-items:center;
        justify-content:center;
        font-family:'Inter','PingFang SC','Noto Sans SC',sans-serif;
        font-size:${textSize}px;
        font-weight:950;
        line-height:1;
        box-shadow:inset 0 1px 0 rgba(255,255,255,0.86);
        flex-shrink:0;
      ">${glyph}</span>
      <span style="
        color:#2c2924;
        font-family:'Inter','PingFang SC','Noto Sans SC',sans-serif;
        font-size:${textSize}px;
        font-weight:950;
        letter-spacing:0;
        line-height:1;
        white-space:nowrap;
      ">${label}</span>
    </div>
    <div style="
      position:absolute;
      left:50%;
      top:${chipHeight + 1}px;
      width:10px;
      height:10px;
      transform:translateX(-50%) rotate(45deg);
      background:rgba(250,248,244,0.98);
      border-right:1.5px solid ${visual.border};
      border-bottom:1.5px solid ${visual.border};
      box-shadow:3px 3px 5px ${visual.shadow};
    "></div>
  `;
};

export const renderClusterIconHtml = (visuals: MapMarkerVisual[], count: number) => {
  const displayVisuals = visuals.slice(0, 3);
  const toneDots = displayVisuals.map((visual, index) => `
    <div style="
      width:10px;
      height:10px;
      border-radius:999px;
      background:${visual.accent};
      border:1.5px solid rgba(255,255,255,0.92);
      box-shadow:0 2px 5px ${visual.shadow};
      margin-left:${index === 0 ? '0' : '-3px'};
    "></div>
  `).join('');

  return `
    <div style="position:relative; width:68px; height:48px;">
      <div style="
        position:absolute;
        left:7px;
        top:6px;
        width:54px;
        height:34px;
        border-radius:18px;
        background:linear-gradient(180deg, rgba(255,255,255,0.98), rgba(249,247,242,0.96));
        color:#2f2b26;
        border:1.5px solid rgba(47,43,38,0.16);
        box-shadow:0 8px 18px rgba(35,31,27,0.18), inset 0 1px 0 rgba(255,255,255,0.94);
        display:flex;
        align-items:center;
        justify-content:center;
        font-family:'Inter','PingFang SC','Noto Sans SC',sans-serif;
        font-size:13px;
        font-weight:950;
        letter-spacing:0;
      ">${count}处</div>
      <div style="
        position:absolute;
        left:13px;
        top:1px;
        height:12px;
        display:flex;
        align-items:center;
        z-index:5;
      ">${toneDots}</div>
      <div style="
        position:absolute;
        left:50%;
        top:37px;
        width:9px;
        height:9px;
        transform:translateX(-50%) rotate(45deg);
        background:rgba(249,247,242,0.98);
        border-right:1.5px solid rgba(47,43,38,0.13);
        border-bottom:1.5px solid rgba(47,43,38,0.13);
        box-shadow:3px 3px 5px rgba(35,31,27,0.12);
      "></div>
    </div>
  `;
};
