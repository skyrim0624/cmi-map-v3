import { getRecommendationIntentScore } from '@/data/cmi-scene-tags';
import { matchesCmiSurvivalKitRecommendation } from '@/data/cmi-survival-kit';
import {
  getCmiDetailTagsForRecommendation,
  getCmiPlaceTypeTagsForRecommendation,
  type CmiMapFilterGroupId,
  matchesCmiMapFilterGroup,
} from '@/data/cmi-taxonomy';
import { getPlaceGuide, isCommunityCuratedRecommendation } from '@/data/place-guides';
import { getRecommendationReasonText } from '@/lib/easter-icons';
import type { Category, Recommendation } from '@/types/types';
import { normalizeCategory } from '@/types/types';

export type CmiSceneView = 'detail' | 'map';
export type CmiSceneHomeGroupId = 'clear-need' | 'nearby' | 'inspiration';

export type CmiSceneId =
  | 'nearby'
  | 'pick-for-me'
  | 'eat'
  | 'coffee-work'
  | 'study'
  | 'shopping'
  | 'play'
  | 'massage-relax'
  | 'wander'
  | 'weekend'
  | 'tomorrow-events'
  | 'nearby-wander'
  | 'life-rescue'
  | 'night'
  | 'sport'
  | 'explore'
  | 'community'
  | 'photo';

export interface CmiScene {
  id: CmiSceneId;
  title: string;
  description: string;
  defaultView: CmiSceneView;
  categoryFallback: Category | null;
  matchKeywords: string[];
  primaryActionLabel: string;
  mapTitle: string;
  detailTitle: string;
  showOnHome: boolean;
  homeGroup: CmiSceneHomeGroupId | null;
  homeOrder: number;
  homeTitle: string;
  homeDescription: string;
  homeIconCategory?: Category;
}

export interface CmiSceneRecommendationOptions {
  limit?: number;
  dedupeByPlace?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface CmiSceneRecommendationPresentation {
  title: string;
  kind: string;
  summary: string;
  tags: string[];
  source: 'community-guide' | 'user-recommendation';
}

export const CMI_HOME_SCENE_GROUPS: Array<{
  id: CmiSceneHomeGroupId;
  title: string;
  description: string;
}> = [
  {
    id: 'clear-need',
    title: '我有明确需求',
    description: '吃饭、咖啡、放松、办事，先解决眼前这件事。',
  },
  {
    id: 'nearby',
    title: '看看附近',
    description: '从你身边的社区点位开始，不用先研究整张地图。',
  },
  {
    id: 'inspiration',
    title: '找点灵感',
    description: '没想清楚也没关系，先找一个出门理由。',
  },
];

export const CMI_SCENES: CmiScene[] = [
  {
    id: 'nearby',
    title: '附近值得去',
    description: '先看你身边有什么被社区留下的点，再决定走过去、打车，还是换个方向。',
    defaultView: 'map',
    categoryFallback: null,
    matchKeywords: ['附近', '周边', '顺路', '走路', 'grab', '交通', '停车', '近', '本地生活'],
    primaryActionLabel: '查看附近地图',
    mapTitle: '附近值得去',
    detailTitle: '附近的 CMI 推荐',
    showOnHome: true,
    homeGroup: 'nearby',
    homeOrder: 1,
    homeTitle: '附近值得去',
    homeDescription: '先看身边有哪些社区留下来的地方。',
  },
  {
    id: 'pick-for-me',
    title: '不知道去哪',
    description: '还没想清楚要干什么时，先从社区整理过的靠谱候选里挑一个。',
    defaultView: 'detail',
    categoryFallback: null,
    matchKeywords: ['不知道去哪', '随便', '推荐一个', '日常', '稳定', '顺路', '休息', '聊天', '吃饭', '咖啡', '散步'],
    primaryActionLabel: '给我推荐一个',
    mapTitle: '可以先去这些地方',
    detailTitle: '还没想好时的 CMI 候选',
    showOnHome: true,
    homeGroup: 'inspiration',
    homeOrder: 3,
    homeTitle: '看看大家都去了哪里',
    homeDescription: '直接看最近大家更新了什么。',
  },
  {
    id: 'eat',
    title: '吃饭',
    description: '不是泛泛找餐厅，而是看 CMI 社区会把哪些地方放进日常选择里。',
    defaultView: 'detail',
    categoryFallback: '吃饭',
    matchKeywords: [
      '餐厅',
      '小吃',
      '聚餐',
      '晚餐',
      '午餐',
      '早餐',
      '换口味',
      '泰餐',
      '日料',
      '素食',
      'noodle',
      'restaurant',
      'kitchen',
      'food',
    ],
    primaryActionLabel: '看吃饭推荐',
    mapTitle: '吃点啥呢',
    detailTitle: 'CMI 社区吃饭清单',
    showOnHome: true,
    homeGroup: 'clear-need',
    homeOrder: 1,
    homeTitle: '吃饭',
    homeDescription: '找一顿今天真的能去吃的饭。',
    homeIconCategory: '吃饭',
  },
  {
    id: 'coffee-work',
    title: '办公',
    description: '找一个能坐下来处理事情的地方，先从咖啡馆、Coworking 和安静空间开始。',
    defaultView: 'detail',
    categoryFallback: '咖啡',
    matchKeywords: [
      '咖啡',
      '办公',
      '手冲',
      '烘焙',
      '安静',
      '插座',
      '坐一会',
      '短坐',
      '电脑',
      '工作',
      'coworking',
      '共享办公',
      'coffee',
      'cafe',
      'roastery',
    ],
    primaryActionLabel: '看咖啡办公点',
    mapTitle: '办公地点地图',
    detailTitle: '适合办公和坐下来的地方',
    showOnHome: true,
    homeGroup: 'clear-need',
    homeOrder: 2,
    homeTitle: '办公',
    homeDescription: '咖啡馆、Coworking，或安静空间。',
    homeIconCategory: '咖啡',
  },
  {
    id: 'study',
    title: '学习',
    description: '找能读书、自习、上课、参加工作坊，或者补一点知识能量的地方。',
    defaultView: 'detail',
    categoryFallback: null,
    matchKeywords: [
      '学习',
      '读书',
      '自习',
      '图书馆',
      '书店',
      '文具',
      '课程',
      '工作坊',
      'workshop',
      'library',
      'bookstore',
      '安静',
      '展览',
      '设计',
    ],
    primaryActionLabel: '看学习地点',
    mapTitle: '学习地点地图',
    detailTitle: '适合学习和读书的地方',
    showOnHome: true,
    homeGroup: 'clear-need',
    homeOrder: 3,
    homeTitle: '学习',
    homeDescription: '图书馆、书店、课程和安静自习。',
  },
  {
    id: 'massage-relax',
    title: '马杀鸡 / 放松',
    defaultView: 'detail',
    categoryFallback: '马杀鸡',
    description: '身体累了、脑子太满的时候，找一个能稳定放松的地方。',
    matchKeywords: ['马杀鸡', '按摩', 'spa', 'massage', '温泉', 'hot spring', '瑜伽', 'yoga', '身体调理'],
    primaryActionLabel: '看放松推荐',
    mapTitle: '放松地点地图',
    detailTitle: '适合放松一下的地方',
    showOnHome: true,
    homeGroup: 'clear-need',
    homeOrder: 6,
    homeTitle: '放松',
    homeDescription: '马杀鸡、SPA、温泉和身体调理。',
    homeIconCategory: '马杀鸡',
  },
  {
    id: 'shopping',
    title: '购物',
    description: '商场、市集、菜市场、超市、伴手礼和日用品补给，先解决买东西这件事。',
    defaultView: 'detail',
    categoryFallback: '市集',
    matchKeywords: [
      '购物',
      '商场',
      '市集',
      '菜市场',
      '超市',
      '采购',
      '伴手礼',
      '日用品',
      '市场',
      '生鲜',
      '水果',
      '美妆',
      '手作材料',
      '布料',
      'mall',
      'market',
      'shopping',
    ],
    primaryActionLabel: '看购物地点',
    mapTitle: '购物地点地图',
    detailTitle: '买东西和补给地点',
    showOnHome: true,
    homeGroup: 'clear-need',
    homeOrder: 4,
    homeTitle: '购物',
    homeDescription: '商场、市集、菜市场和日用品。',
    homeIconCategory: '市集',
  },
  {
    id: 'play',
    title: '游玩',
    description: '寺庙、公园、展览、夜市、短途自然点和第一次来清迈会想去的地方。',
    defaultView: 'detail',
    categoryFallback: '户外',
    matchKeywords: [
      '游玩',
      '寺庙',
      '公园',
      '展览',
      '艺术',
      '夜市',
      '短途',
      '自然',
      '瀑布',
      '温泉',
      '上山',
      '拍照',
      '市集',
      'temple',
      'park',
      'gallery',
      'waterfall',
      'hot spring',
    ],
    primaryActionLabel: '看游玩地点',
    mapTitle: '游玩地点地图',
    detailTitle: '适合游玩和逛逛的地方',
    showOnHome: true,
    homeGroup: 'clear-need',
    homeOrder: 5,
    homeTitle: '游玩',
    homeDescription: '寺庙、公园、展览、短途和夜市。',
    homeIconCategory: '户外',
  },
  {
    id: 'wander',
    title: '放空 / 闲逛',
    description: '不追求效率，找一个能慢下来、换空气、随便走走的地方。',
    defaultView: 'detail',
    categoryFallback: '户外',
    matchKeywords: [
      '放空',
      '闲逛',
      '慢逛',
      '散步',
      '艺术',
      '手作',
      '市集',
      '花园',
      '户外',
      '温泉',
      '短途',
      '活动',
      'park',
      'garden',
      'market',
    ],
    primaryActionLabel: '看闲逛推荐',
    mapTitle: '放空闲逛地图',
    detailTitle: '适合慢慢晃的地方',
    showOnHome: true,
    homeGroup: 'inspiration',
    homeOrder: 2,
    homeTitle: '放空 / 闲逛',
    homeDescription: '不赶时间，找一个能慢慢晃的地方。',
    homeIconCategory: '户外',
  },
  {
    id: 'life-rescue',
    title: '生活救急',
    description: '电话卡、换汇、租摩托、药店、诊所、签证文件、打印、洗衣、日用品、理发这些清迈生活刚需点。',
    defaultView: 'map',
    categoryFallback: null,
    matchKeywords: [
      '办事',
      '救急',
      '电话卡',
      '网络',
      '打印',
      '复印',
      '日用品',
      '补给',
      '饮用水',
      '超市',
      '换汇',
      '现金',
      'ATM',
      '理发',
      '药店',
      '诊所',
      '医院',
      '签证',
      '移民局',
      '洗衣',
      '租摩托',
      '租车',
      '生存包',
      'print',
      'supermarket',
      'water',
      'exchange',
      'atm',
      'hair',
      'salon',
      'pharmacy',
      'clinic',
      'hospital',
      'laundry',
      'motorbike',
      'visa',
    ],
    primaryActionLabel: '打开救急地图',
    mapTitle: '生活救急地图',
    detailTitle: '生活服务离不开',
    showOnHome: true,
    homeGroup: 'clear-need',
    homeOrder: 8,
    homeTitle: '办事',
    homeDescription: '换汇、打印、药店、诊所、日用品、租车。',
    homeIconCategory: '生存指南',
  },
  {
    id: 'night',
    title: '今晚去哪？',
    description: '晚上的清迈不只有酒吧，也包括夜市、朋友小聚、演出、按摩和把一天收尾的地方。',
    defaultView: 'detail',
    categoryFallback: '酒吧',
    matchKeywords: [
      '晚上',
      '夜间',
      '晚间',
      '酒吧',
      '演出',
      '小聚',
      '喝点东西',
      '收尾',
      '夜市',
      'bar',
      'show',
      'night',
    ],
    primaryActionLabel: '看晚上推荐',
    mapTitle: '今晚去哪地图',
    detailTitle: '今晚可以这样过',
    showOnHome: false,
    homeGroup: 'inspiration',
    homeOrder: 1,
    homeTitle: '今晚去哪？',
    homeDescription: '夜市、小酌、夜景、按摩。',
    homeIconCategory: '酒吧',
  },
  {
    id: 'sport',
    title: '运动',
    description: '健身房、瑜伽、球场、公园跑步，以及长期住清迈会用到的运动点。',
    defaultView: 'detail',
    categoryFallback: '运动',
    matchKeywords: [
      '运动',
      '健身',
      '健身房',
      '瑜伽',
      '跑步',
      '慢跑',
      '球场',
      '网球',
      '体育场',
      'stadium',
      'tennis',
      'gym',
      'yoga',
      'park',
    ],
    primaryActionLabel: '看运动地点',
    mapTitle: '运动地点地图',
    detailTitle: '适合运动的地方',
    showOnHome: true,
    homeGroup: 'clear-need',
    homeOrder: 7,
    homeTitle: '运动',
    homeDescription: '健身、瑜伽、球场和跑步点。',
    homeIconCategory: '运动',
  },
  {
    id: 'weekend',
    title: '周末去哪？',
    description: '周末更适合市集、短途、自然、咖啡和慢慢逛，不要把它做成普通地点列表。',
    defaultView: 'detail',
    categoryFallback: '市集',
    matchKeywords: [
      '周末',
      'weekend',
      '市集',
      'walking street',
      'market',
      '手作',
      '自然',
      '户外',
      '咖啡',
      '花园',
      '艺术',
      '展览',
      '慢逛',
      '短途',
    ],
    primaryActionLabel: '看周末灵感',
    mapTitle: '周末灵感地图',
    detailTitle: '周末可以这样安排',
    showOnHome: true,
    homeGroup: 'inspiration',
    homeOrder: 2,
    homeTitle: '周末去哪？',
    homeDescription: '市集、短途、自然、咖啡。',
    homeIconCategory: '市集',
  },
  {
    id: 'tomorrow-events',
    title: '有什么活动？',
    description: '按时间看今天、明天和最近可参加的活动，优先展示已核实来源和稳定活动源。',
    defaultView: 'detail',
    categoryFallback: null,
    matchKeywords: [
      '活动',
      '明天',
      '本周',
      'workshop',
      '工作坊',
      '展览',
      'exhibition',
      'live',
      '音乐',
      'meetup',
      '市集',
      'CMI',
      '清迈客栈',
    ],
    primaryActionLabel: '看活动',
    mapTitle: '近期活动地图',
    detailTitle: '最近有什么活动？',
    showOnHome: true,
    homeGroup: 'inspiration',
    homeOrder: 3,
    homeTitle: '有什么活动？',
    homeDescription: '今天、明天、周末活动。',
  },
  {
    id: 'nearby-wander',
    title: '附近逛逛',
    description: '人已经在这里了，就先看走路或短距离能到的咖啡、小店、拍照点和社区痕迹。',
    defaultView: 'map',
    categoryFallback: null,
    matchKeywords: [
      '附近',
      '周边',
      '走路',
      '随便逛',
      '慢逛',
      '散步',
      '小店',
      '坐坐',
      '咖啡',
      '拍照',
      '社区收藏',
      'CMI',
      '日常',
    ],
    primaryActionLabel: '看附近',
    mapTitle: '附近逛逛',
    detailTitle: '走路可到的有趣地方',
    showOnHome: true,
    homeGroup: 'inspiration',
    homeOrder: 4,
    homeTitle: '附近逛逛',
    homeDescription: '走路可到的有趣地方。',
  },
  {
    id: 'explore',
    title: '探索模式',
    description: '把清迈当成一场轻量探索：随机给你一个方向，去发现一个平时不会点开的地方。',
    defaultView: 'map',
    categoryFallback: null,
    matchKeywords: ['探索', '随机', '彩蛋', '没去过', '新地方', '任务', '发现', '随便走走'],
    primaryActionLabel: '开始探索',
    mapTitle: '探索任务地图',
    detailTitle: '今天可以探索的清迈角落',
    showOnHome: true,
    homeGroup: 'inspiration',
    homeOrder: 4,
    homeTitle: '探索模式',
    homeDescription: '随机给自己一个方向，去发现一个没点开过的地方。',
  },
  {
    id: 'community',
    title: 'CMI 社区常去',
    description: '先看社区真正留下来的地点：它们可能不全是网红，但构成了 CMI 的清迈生活底图。',
    defaultView: 'map',
    categoryFallback: null,
    matchKeywords: ['CMI', '社区', '常去', '社区收藏', '社区整理', '精选收藏', '清迈生活'],
    primaryActionLabel: '看社区地图',
    mapTitle: 'CMI 社区常去地图',
    detailTitle: 'CMI 社区留下来的地方',
    showOnHome: false,
    homeGroup: 'nearby',
    homeOrder: 2,
    homeTitle: 'CMI 社区常去',
    homeDescription: '先看社区真正留下来的清迈生活底图。',
  },
  {
    id: 'photo',
    title: '景点 / 地标',
    description: '找城门、寺庙、观景点和第一次来清迈会明确去看的地方；“好拍照”后面更适合作为标签。',
    defaultView: 'detail',
    categoryFallback: '景点',
    matchKeywords: [
      '景点',
      '地标',
      '观景点',
      '观景台',
      '城门',
      '古城',
      '寺庙',
      'landmark',
      'viewpoint',
      '拍照',
      '好看',
      '花园',
      '艺术',
      '手作',
      '展览',
      '氛围',
      '慢逛',
      '打卡',
      'photo',
      'gallery',
      'studio',
    ],
    primaryActionLabel: '看景点地标',
    mapTitle: '景点地标地图',
    detailTitle: '景点、地标和慢慢看的地方',
    showOnHome: true,
    homeGroup: 'inspiration',
    homeOrder: 1,
    homeTitle: '景点 / 地标',
    homeDescription: '城门、观景点、第一次来会想看的地方。',
    homeIconCategory: '景点',
  },
];

const SCENE_MAP = new Map(CMI_SCENES.map(scene => [scene.id, scene]));
const COMMUNITY_SCENE_IDS = new Set<CmiSceneId>(['community']);
const QUALITY_SCENE_IDS = new Set<CmiSceneId>(['nearby', 'pick-for-me', 'explore']);
const PROXIMITY_RANKED_SCENE_IDS = new Set<CmiSceneId>([
  'eat',
  'coffee-work',
  'study',
  'shopping',
  'play',
  'massage-relax',
  'sport',
  'life-rescue',
]);
const DIRECT_SCENE_MAP_FILTER_GROUPS: Partial<Record<CmiSceneId, CmiMapFilterGroupId>> = {
  eat: 'eat',
  'coffee-work': 'work',
  shopping: 'shopping',
  play: 'play',
  'massage-relax': 'relax',
  sport: 'sport',
};
const SCENE_ID_ALIASES: Record<string, CmiSceneId> = {
  today: 'pick-for-me',
  tonight: 'night',
  weekend: 'weekend',
  events: 'tomorrow-events',
  wanderNearby: 'nearby-wander',
};

const normalizeSearchValue = (value: string) => value.trim().toLocaleLowerCase();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsLatinToken = (text: string, keyword: string) => {
  const escapedKeyword = escapeRegExp(keyword).replace(/\s+/g, '\\s+');
  const tokenPattern = new RegExp(`(^|[^a-z0-9])${escapedKeyword}([^a-z0-9]|$)`, 'i');
  return tokenPattern.test(text);
};

const matchesSceneKeyword = (text: string, keyword: string) => {
  const normalizedKeyword = normalizeSearchValue(keyword);
  if (!normalizedKeyword) return false;

  if (/[a-z0-9]/i.test(normalizedKeyword)) {
    return containsLatinToken(text, normalizedKeyword);
  }

  return text.includes(normalizedKeyword);
};

const normalizePlaceKey = (value: string) =>
  normalizeSearchValue(value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ');

const getUpvoteCount = (recommendation: Recommendation) => recommendation.upvotes?.length ?? 0;

const getRecommendationCreatedTime = (recommendation: Recommendation) => {
  const time = new Date(recommendation.created_at).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getDistanceInMeters = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) => {
  const earthRadiusInMeters = 6371_000;
  const toRadians = (degree: number) => (degree * Math.PI) / 180;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const haversine =
    Math.sin(latDelta / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;

  return 2 * earthRadiusInMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export const getCmiScene = (sceneId: string | null | undefined) => {
  if (!sceneId) return null;
  const normalizedSceneId = SCENE_ID_ALIASES[sceneId] ?? sceneId;
  return SCENE_MAP.get(normalizedSceneId as CmiSceneId) ?? null;
};

export const getCmiHomeScenesByGroup = (groupId: CmiSceneHomeGroupId) =>
  CMI_SCENES.filter(scene => scene.showOnHome && scene.homeGroup === groupId).sort(
    (left, right) => left.homeOrder - right.homeOrder
  );

export const getCmiSceneRequiredView = (scene: CmiScene, requestedView?: CmiSceneView | null) =>
  requestedView ?? scene.defaultView;

export const getRecommendationSceneText = (recommendation: Recommendation) => {
  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  const placeTypeLabels = getCmiPlaceTypeTagsForRecommendation(recommendation).map(tag => tag.label);
  const detailLabels = getCmiDetailTagsForRecommendation(recommendation).map(tag => tag.label);
  return normalizeSearchValue(
    [
      recommendation.place_name,
      recommendation.category,
      getRecommendationReasonText(recommendation),
      guide.title,
      guide.kind,
      guide.summary,
      ...guide.tags,
      ...placeTypeLabels,
      ...detailLabels,
    ].join(' ')
  );
};

export const isDecisionReadyRecommendation = (recommendation: Recommendation) => {
  if (!isCommunityCuratedRecommendation(recommendation)) {
    return getRecommendationReasonText(recommendation).length >= 18;
  }

  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  return !guide.tags.includes('待确认') && guide.kind !== '坐标点' && guide.summary.trim().length >= 30;
};

export const getCmiSceneRecommendationPresentation = (
  recommendation: Recommendation
): CmiSceneRecommendationPresentation => {
  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  const isCommunityGuide = isCommunityCuratedRecommendation(recommendation);

  return {
    title: isCommunityGuide ? guide.title : recommendation.place_name,
    kind: guide.kind,
    summary: isCommunityGuide ? guide.summary : getRecommendationReasonText(recommendation),
    tags: Array.from(new Set([
      ...guide.tags,
      ...getCmiDetailTagsForRecommendation(recommendation).map(tag => tag.label),
    ])),
    source: isCommunityGuide ? 'community-guide' : 'user-recommendation',
  };
};

export const matchesCmiScene = (recommendation: Recommendation, scene: CmiScene) => {
  if (COMMUNITY_SCENE_IDS.has(scene.id)) {
    return isCommunityCuratedRecommendation(recommendation);
  }

  if (scene.id === 'life-rescue') {
    return matchesCmiSurvivalKitRecommendation(recommendation);
  }

  const directSceneMapFilterGroup = DIRECT_SCENE_MAP_FILTER_GROUPS[scene.id];
  if (directSceneMapFilterGroup) {
    return matchesCmiMapFilterGroup(recommendation, directSceneMapFilterGroup);
  }

  if (getRecommendationIntentScore(recommendation, scene.id) > 0) {
    return true;
  }

  if (QUALITY_SCENE_IDS.has(scene.id) && isDecisionReadyRecommendation(recommendation)) {
    return true;
  }

  if (scene.categoryFallback && normalizeCategory(recommendation.category) === scene.categoryFallback) {
    return true;
  }

  const sceneText = getRecommendationSceneText(recommendation);
  return scene.matchKeywords.some(keyword => matchesSceneKeyword(sceneText, keyword));
};

const getRecommendationQualityScore = (recommendation: Recommendation) => {
  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  const communityScore = isCommunityCuratedRecommendation(recommendation) ? 40 : 0;
  const decisionScore = isDecisionReadyRecommendation(recommendation) ? 30 : 0;
  const imageScore = Math.min(recommendation.images.length, 3) * 4;
  const upvoteScore = Math.min(getUpvoteCount(recommendation), 10);
  const guideScore = guide.tags.includes('待确认') || guide.kind === '坐标点' ? -60 : 0;

  return communityScore + decisionScore + imageScore + upvoteScore + guideScore;
};

const dedupeRecommendationsByPlace = (recommendations: Recommendation[]) => {
  const recommendationMap = new Map<string, Recommendation>();

  for (const recommendation of recommendations) {
    const key = normalizePlaceKey(recommendation.place_name);
    const existingRecommendation = recommendationMap.get(key);

    if (
      !existingRecommendation ||
      getRecommendationQualityScore(recommendation) > getRecommendationQualityScore(existingRecommendation)
    ) {
      recommendationMap.set(key, recommendation);
    }
  }

  return Array.from(recommendationMap.values());
};

const sortSceneRecommendations = (
  recommendations: Recommendation[],
  scene: CmiScene,
  options: CmiSceneRecommendationOptions
) =>
  [...recommendations].sort((left, right) => {
    const leftQualityScore = getRecommendationQualityScore(left);
    const rightQualityScore = getRecommendationQualityScore(right);

    if ((scene.id === 'nearby' || scene.id === 'nearby-wander') && options.userLocation) {
      const leftDistance = getDistanceInMeters(options.userLocation, left);
      const rightDistance = getDistanceInMeters(options.userLocation, right);
      return leftDistance - rightDistance;
    }

    if (PROXIMITY_RANKED_SCENE_IDS.has(scene.id) && options.userLocation) {
      const leftDistance = getDistanceInMeters(options.userLocation, left);
      const rightDistance = getDistanceInMeters(options.userLocation, right);
      const leftDistanceBucket = Math.floor(leftDistance / 750);
      const rightDistanceBucket = Math.floor(rightDistance / 750);
      const distanceBucketDifference = leftDistanceBucket - rightDistanceBucket;
      if (distanceBucketDifference !== 0) return distanceBucketDifference;

      const qualityDifference = rightQualityScore - leftQualityScore;
      if (qualityDifference !== 0) return qualityDifference;

      const distanceDifference = leftDistance - rightDistance;
      if (distanceDifference !== 0) return distanceDifference;
    }

    if (scene.categoryFallback) {
      const leftCategoryMatch = left.category === scene.categoryFallback ? 1 : 0;
      const rightCategoryMatch = right.category === scene.categoryFallback ? 1 : 0;
      const categoryDifference = rightCategoryMatch - leftCategoryMatch;
      if (categoryDifference !== 0) return categoryDifference;
    }

    const intentDifference =
      getRecommendationIntentScore(right, scene.id) - getRecommendationIntentScore(left, scene.id);
    if (intentDifference !== 0) return intentDifference;

    const qualityDifference = rightQualityScore - leftQualityScore;
    if (qualityDifference !== 0) return qualityDifference;

    const upvoteDifference = getUpvoteCount(right) - getUpvoteCount(left);
    if (upvoteDifference !== 0) return upvoteDifference;

    return getRecommendationCreatedTime(right) - getRecommendationCreatedTime(left);
  });

export const getCmiSceneRecommendations = (
  recommendations: Recommendation[],
  sceneOrId: CmiScene | CmiSceneId | string,
  options: CmiSceneRecommendationOptions = {}
) => {
  const scene = typeof sceneOrId === 'string' ? getCmiScene(sceneOrId) : sceneOrId;
  if (!scene) return [];

  const matchingRecommendations = recommendations.filter(recommendation =>
    matchesCmiScene(recommendation, scene)
  );
  const sceneRecommendations =
    options.dedupeByPlace === false
      ? matchingRecommendations
      : dedupeRecommendationsByPlace(matchingRecommendations);
  const sortedRecommendations = sortSceneRecommendations(sceneRecommendations, scene, options);

  return typeof options.limit === 'number'
    ? sortedRecommendations.slice(0, options.limit)
    : sortedRecommendations;
};
