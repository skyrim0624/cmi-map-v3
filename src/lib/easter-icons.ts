import { isEasterEggRecommendation, type Recommendation } from '@/types/types';

export type CmiEasterIcon = {
  id: string;
  label: string;
  slug: string;
  url: string;
};

const EASTER_ICON_BASE = '/map-icons/cmi-easter-v2';
const EASTER_ICON_META_PATTERN = /^\[\[cmi:easter-icon=([a-z0-9-]+)\]\]\s*/i;

export const DEFAULT_CMI_EASTER_ICON_ID = 'egg-v2-01-question';

export const CMI_EASTER_ICON_OPTIONS: CmiEasterIcon[] = [
  ['01', 'question', '问号'],
  ['02', 'star', '星星'],
  ['03', 'cat-face', '猫脸'],
  ['04', 'cat-paw', '猫爪'],
  ['05', 'dog-face', '小狗'],
  ['06', 'dog-paw', '狗爪'],
  ['07', 'flower', '小花'],
  ['08', 'leaf', '叶子'],
  ['09', 'tree', '小树'],
  ['10', 'mushroom', '蘑菇'],
  ['11', 'spray-can', '喷漆罐'],
  ['12', 'graffiti', '涂鸦'],
  ['13', 'portrait', '人像'],
  ['14', 'old-man', '老爷爷'],
  ['15', 'smile-face', '笑脸'],
  ['16', 'street-lamp', '路灯'],
  ['17', 'little-door', '小门'],
  ['18', 'window', '窗户'],
  ['19', 'bench', '长椅'],
  ['20', 'bicycle', '自行车'],
  ['21', 'helmet', '头盔'],
  ['22', 'camera', '相机'],
  ['23', 'postcard', '明信片'],
  ['24', 'note', '纸条'],
  ['25', 'map-pin', '地图钉'],
  ['26', 'heart', '爱心'],
  ['27', 'spark', '闪光'],
  ['28', 'moon', '月亮'],
  ['29', 'cloud', '云朵'],
  ['30', 'umbrella', '雨伞'],
  ['31', 'flip-flop', '拖鞋'],
  ['32', 'coffee', '咖啡'],
  ['33', 'noodles', '面碗'],
  ['34', 'mango', '芒果'],
  ['35', 'coconut', '椰子'],
  ['36', 'butterfly', '蝴蝶'],
  ['37', 'gecko', '壁虎'],
  ['38', 'bird', '小鸟'],
  ['39', 'fish', '小鱼'],
  ['40', 'temple-bell', '钟'],
  ['41', 'lantern', '灯笼'],
  ['42', 'book', '书'],
  ['43', 'pencil', '铅笔'],
  ['44', 'cassette', '磁带'],
  ['45', 'music-note', '音符'],
  ['46', 'chess-pawn', '棋子'],
  ['47', 'key', '钥匙'],
  ['48', 'shell', '贝壳'],
  ['49', 'pebble', '小石头'],
  ['50', 'paper-plane', '纸飞机'],
].map(([number, slug, label]) => {
  const id = `egg-v2-${number}-${slug}`;
  return {
    id,
    label,
    slug,
    url: `${EASTER_ICON_BASE}/${id}.png`,
  };
});

export const getCmiEasterIconById = (id?: string | null): CmiEasterIcon => (
  CMI_EASTER_ICON_OPTIONS.find(icon => icon.id === id) ?? CMI_EASTER_ICON_OPTIONS[0]
);

export const getCmiEasterIconUrl = (id?: string | null): string => getCmiEasterIconById(id).url;

export const isCmiEasterIconId = (id?: string | null): id is string => (
  Boolean(id && CMI_EASTER_ICON_OPTIONS.some(icon => icon.id === id))
);

export const encodeEasterIconMetadata = (reason: string, iconId: string): string => (
  `[[cmi:easter-icon=${iconId}]]\n${stripEasterIconMetadata(reason)}`
);

export const extractEasterIconIdFromReason = (reason?: string | null): string | null => {
  const match = reason?.match(EASTER_ICON_META_PATTERN);
  return isCmiEasterIconId(match?.[1]) ? match[1] : null;
};

export const stripEasterIconMetadata = (reason?: string | null): string => (
  (reason ?? '').replace(EASTER_ICON_META_PATTERN, '').trim()
);

export const getRecommendationEasterIconId = (recommendation: Pick<Recommendation, 'category' | 'reason' | 'easter_icon_id'>): string | null => {
  if (isCmiEasterIconId(recommendation.easter_icon_id)) return recommendation.easter_icon_id;

  const metadataIconId = extractEasterIconIdFromReason(recommendation.reason);
  if (metadataIconId) return metadataIconId;

  return isEasterEggRecommendation(recommendation) ? DEFAULT_CMI_EASTER_ICON_ID : null;
};

export const getRecommendationReasonText = (recommendation: Pick<Recommendation, 'reason'>): string => (
  stripEasterIconMetadata(recommendation.reason)
);
