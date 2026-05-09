import { getPlaceGuide, isCommunityCuratedRecommendation } from '@/data/place-guides';
import type { Category, Recommendation } from '@/types/types';

export type CmiSceneView = 'detail' | 'map';
export type CmiSceneHomeGroupId = 'clear-need' | 'nearby' | 'inspiration';

export type CmiSceneId =
  | 'nearby'
  | 'pick-for-me'
  | 'eat'
  | 'coffee-work'
  | 'massage-relax'
  | 'wander'
  | 'life-rescue'
  | 'night'
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
    homeTitle: '不知道去哪',
    homeDescription: '先给自己一个不费劲的出门答案。',
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
    mapTitle: '吃饭地点地图',
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
    title: '咖啡办公',
    description: '想喝咖啡、换个地方坐下，或者找一个能认真待一会儿的空间。',
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
      'coffee',
      'cafe',
      'roastery',
    ],
    primaryActionLabel: '看咖啡办公点',
    mapTitle: '咖啡办公地图',
    detailTitle: '适合坐下来的咖啡点',
    showOnHome: true,
    homeGroup: 'clear-need',
    homeOrder: 2,
    homeTitle: '咖啡 / 办公',
    homeDescription: '喝一杯，见朋友，或换个地方坐下来。',
    homeIconCategory: '咖啡',
  },
  {
    id: 'massage-relax',
    title: '马杀鸡 / 放松',
    defaultView: 'detail',
    categoryFallback: '马杀鸡',
    description: '身体累了、脑子太满的时候，找一个能稳定放松的地方。',
    matchKeywords: ['马杀鸡', '按摩', '放松', 'spa', 'massage', '舒服', '休息', '身体', '疗愈'],
    primaryActionLabel: '看放松推荐',
    mapTitle: '放松地点地图',
    detailTitle: '适合放松一下的地方',
    showOnHome: true,
    homeGroup: 'clear-need',
    homeOrder: 3,
    homeTitle: '马杀鸡 / 放松',
    homeDescription: '身体累了，找个舒服靠谱的地方。',
    homeIconCategory: '马杀鸡',
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
    description: '打印、换汇、理发、采购、办事这些不浪漫但很关键的清迈生活点。',
    defaultView: 'map',
    categoryFallback: '生存指南',
    matchKeywords: [
      '办事',
      '救急',
      '打印',
      '换汇',
      '理发',
      '采购',
      '现金',
      '签证',
      '生活基础设施',
      '长期生活',
      'print',
      'exchange',
      'hair',
      'salon',
      'market',
    ],
    primaryActionLabel: '打开救急地图',
    mapTitle: '生活救急地图',
    detailTitle: '在清迈住一阵子会用到的地方',
    showOnHome: true,
    homeGroup: 'clear-need',
    homeOrder: 4,
    homeTitle: '办事 / 救急',
    homeDescription: '打印、换汇、理发、采购这些实际问题。',
    homeIconCategory: '生存指南',
  },
  {
    id: 'night',
    title: '晚上去哪',
    description: '晚上的清迈不只有酒吧，也包括朋友小聚、演出、夜间吃饭和把一天收尾的地方。',
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
    mapTitle: '晚上去哪地图',
    detailTitle: '适合晚上去的地方',
    showOnHome: false,
    homeGroup: null,
    homeOrder: 0,
    homeTitle: '晚上去哪',
    homeDescription: '夜间吃饭、小聚、演出和喝点东西。',
    homeIconCategory: '酒吧',
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
    showOnHome: true,
    homeGroup: 'nearby',
    homeOrder: 2,
    homeTitle: 'CMI 社区常去',
    homeDescription: '先看社区真正留下来的清迈生活底图。',
  },
  {
    id: 'photo',
    title: '拍照适合去哪',
    description: '找适合拍照、散步、约朋友一起去的地点，但不把它包装成过度打卡。',
    defaultView: 'detail',
    categoryFallback: '拍照',
    matchKeywords: [
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
    primaryActionLabel: '看拍照推荐',
    mapTitle: '拍照地点地图',
    detailTitle: '适合拍照和慢慢看的地方',
    showOnHome: true,
    homeGroup: 'inspiration',
    homeOrder: 1,
    homeTitle: '拍照 / 好看',
    homeDescription: '找适合拍照、慢慢看、约朋友一起去的地方。',
    homeIconCategory: '拍照',
  },
];

const SCENE_MAP = new Map(CMI_SCENES.map(scene => [scene.id, scene]));
const COMMUNITY_SCENE_IDS = new Set<CmiSceneId>(['community']);
const QUALITY_SCENE_IDS = new Set<CmiSceneId>(['nearby', 'pick-for-me', 'explore']);
const SCENE_ID_ALIASES: Record<string, CmiSceneId> = {
  today: 'pick-for-me',
  weekend: 'wander',
};

const normalizeSearchValue = (value: string) => value.trim().toLocaleLowerCase();

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
  return normalizeSearchValue(
    [
      recommendation.place_name,
      recommendation.category,
      recommendation.reason,
      guide.title,
      guide.kind,
      guide.summary,
      ...guide.tags,
    ].join(' ')
  );
};

export const isDecisionReadyRecommendation = (recommendation: Recommendation) => {
  if (!isCommunityCuratedRecommendation(recommendation)) {
    return recommendation.reason.trim().length >= 18;
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
    summary: isCommunityGuide ? guide.summary : recommendation.reason,
    tags: guide.tags,
    source: isCommunityGuide ? 'community-guide' : 'user-recommendation',
  };
};

export const matchesCmiScene = (recommendation: Recommendation, scene: CmiScene) => {
  if (COMMUNITY_SCENE_IDS.has(scene.id)) {
    return isCommunityCuratedRecommendation(recommendation);
  }

  if (QUALITY_SCENE_IDS.has(scene.id) && isDecisionReadyRecommendation(recommendation)) {
    return true;
  }

  if (scene.categoryFallback && recommendation.category === scene.categoryFallback) {
    return true;
  }

  const sceneText = getRecommendationSceneText(recommendation);
  return scene.matchKeywords.some(keyword => sceneText.includes(normalizeSearchValue(keyword)));
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
    if (scene.id === 'nearby' && options.userLocation) {
      const leftDistance = getDistanceInMeters(options.userLocation, left);
      const rightDistance = getDistanceInMeters(options.userLocation, right);
      return leftDistance - rightDistance;
    }

    if (scene.categoryFallback) {
      const leftCategoryMatch = left.category === scene.categoryFallback ? 1 : 0;
      const rightCategoryMatch = right.category === scene.categoryFallback ? 1 : 0;
      const categoryDifference = rightCategoryMatch - leftCategoryMatch;
      if (categoryDifference !== 0) return categoryDifference;
    }

    const qualityDifference = getRecommendationQualityScore(right) - getRecommendationQualityScore(left);
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
