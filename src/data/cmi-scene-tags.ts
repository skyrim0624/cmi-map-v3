import type { CmiSceneId } from '@/data/cmi-scenes';
import { getPlaceGuide, isCommunityCuratedRecommendation } from '@/data/place-guides';
import { getRecommendationReasonText } from '@/lib/easter-icons';
import type { Recommendation } from '@/types/types';

export interface CmiIntentSecondaryFilter {
  id: string;
  label: string;
  keywords: string[];
}

interface CmiIntentSceneRule {
  sceneId: CmiSceneId;
  scenarioTags: string[];
  keywords: string[];
  secondaryFilters: CmiIntentSecondaryFilter[];
  fallbackTitle: string;
  fallbackDescription: string;
}

const normalize = (value: string) => value.trim().toLocaleLowerCase();

const containsAny = (text: string, keywords: string[]) =>
  keywords.some(keyword => text.includes(normalize(keyword)));

export const CMI_INTENT_SCENE_RULES: Partial<Record<CmiSceneId, CmiIntentSceneRule>> = {
  night: {
    sceneId: 'night',
    scenarioTags: ['适合晚上', '夜市', '小酌', 'live', '夜景', '按摩', '甜品', '安静坐坐'],
    keywords: [
      '晚上',
      '夜间',
      '夜市',
      'night',
      'bar',
      '酒吧',
      'live',
      '演出',
      '按摩',
      '马杀鸡',
      '甜品',
      '夜景',
      '朋友小聚',
    ],
    secondaryFilters: [
      { id: 'night-market', label: '夜市', keywords: ['夜市', 'market', 'bazaar', 'walking street'] },
      { id: 'drink', label: '小酌', keywords: ['酒吧', 'bar', '小酌', '喝点东西'] },
      { id: 'live', label: 'Live', keywords: ['live', '演出', '音乐', 'livehouse', 'jazz'] },
      { id: 'massage', label: '按摩', keywords: ['按摩', '马杀鸡', 'spa', 'massage'] },
      { id: 'quiet', label: '安静坐坐', keywords: ['安静', '坐坐', '咖啡', '甜品', '休息'] },
    ],
    fallbackTitle: '今晚先给你几个稳定选择',
    fallbackDescription: '如果没有新的活动或演出，就先从夜市、按摩、甜品、夜景和安静坐坐里挑一个。',
  },
  weekend: {
    sceneId: 'weekend',
    scenarioTags: ['适合周末', '市集', '短途', '自然', '咖啡', '手作', '出片', '不太游客'],
    keywords: [
      '周末',
      'weekend',
      '市集',
      'market',
      'walking street',
      '短途',
      '自然',
      '户外',
      '咖啡',
      '手作',
      '花园',
      '艺术',
      '展览',
      '慢逛',
    ],
    secondaryFilters: [
      { id: 'photo', label: '出片', keywords: ['拍照', '好看', '花园', '艺术', '景', 'photo'] },
      { id: 'market', label: '市集', keywords: ['市集', 'market', 'walking street', 'bazaar'] },
      { id: 'nature', label: '自然', keywords: ['自然', '户外', '花园', '公园', '山', '温泉', 'waterfall'] },
      { id: 'coffee', label: '咖啡', keywords: ['咖啡', 'coffee', 'cafe', 'roastery'] },
      { id: 'less-touristy', label: '不太游客', keywords: ['本地', '日常', '社区', '不太游客', '慢逛'] },
    ],
    fallbackTitle: '周末可以先从这些稳定场景开始',
    fallbackDescription: '市集、咖啡、自然和慢逛路线是清迈周末最不容易出错的组合。',
  },
  'tomorrow-events': {
    sceneId: 'tomorrow-events',
    scenarioTags: ['活动', '近期', '本周', 'CMI', '工作坊', '展览', '市集', '音乐', '中文友好'],
    keywords: [
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
    secondaryFilters: [
      { id: 'cmi', label: 'CMI', keywords: ['CMI', '清迈客栈', '社区'] },
      { id: 'workshop', label: '工作坊', keywords: ['工作坊', 'workshop', '分享', '共创'] },
      { id: 'exhibition', label: '展览', keywords: ['展览', 'exhibition', 'gallery', '艺术'] },
      { id: 'music', label: '音乐', keywords: ['音乐', 'live', 'jazz', '演出'] },
      { id: 'free', label: '免费', keywords: ['免费', 'free'] },
    ],
    fallbackTitle: '近期暂时没有高可信活动',
    fallbackDescription: '先展示本周可关注活动和稳定替代选择，避免让用户看到空白页。',
  },
  'nearby-wander': {
    sceneId: 'nearby-wander',
    scenarioTags: ['附近', '随便逛逛', '走路可达', '小店', '坐坐', '拍照', 'CMI 痕迹'],
    keywords: [
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
    secondaryFilters: [
      { id: 'walkable', label: '走路可到', keywords: ['附近', '走路', '周边', '顺路'] },
      { id: 'photo', label: '好拍', keywords: ['拍照', '好看', '花园', '艺术', 'photo'] },
      { id: 'coffee', label: '咖啡', keywords: ['咖啡', 'coffee', 'cafe'] },
      { id: 'sit', label: '坐坐', keywords: ['坐坐', '安静', '休息', '咖啡', '甜品'] },
      { id: 'cmi-trace', label: 'CMI 痕迹', keywords: ['CMI', '社区', '有人补过一句', '社区收藏'] },
    ],
    fallbackTitle: '附近内容不够时，先扩大一点范围',
    fallbackDescription: '从步行 10 分钟扩到 20 分钟，或者先看附近 CMI 高质量点位。',
  },
  'life-rescue': {
    sceneId: 'life-rescue',
    scenarioTags: ['电话卡', '换汇', '租摩托', '药店', '诊所', '签证文件', '打印', '洗衣', '日用品', '理发'],
    keywords: [
      '电话卡',
      'sim',
      'esim',
      'ais',
      '换汇',
      'money exchange',
      'exchange',
      'atm',
      '现金',
      '租摩托',
      '租车',
      'motorbike',
      'scooter',
      '药店',
      'pharmacy',
      '诊所',
      'clinic',
      '医院',
      'hospital',
      '签证',
      'visa',
      'tm30',
      '移民局',
      '打印',
      'print',
      '复印',
      '日用品',
      '补给',
      '饮用水',
      'supermarket',
      '洗衣',
      'laundry',
      '理发',
      'hair',
      'salon',
      'barber',
    ],
    secondaryFilters: [
      { id: 'sim-internet', label: '电话卡 / 网络', keywords: ['电话卡', 'sim', 'esim', 'ais', 'true move', 'dtac'] },
      { id: 'cash-exchange', label: '换汇 / 取现', keywords: ['换汇', 'money exchange', 'exchange', 'atm', '现金'] },
      { id: 'motorbike-transport', label: '租摩托 / 交通', keywords: ['租摩托', '租车', 'motorbike', 'scooter', 'car rental'] },
      { id: 'pharmacy', label: '买药 / 药店', keywords: ['药店', 'pharmacy', 'drugstore', '买药', '常用药'] },
      { id: 'clinic-hospital', label: '诊所 / 医院', keywords: ['诊所', 'clinic', '医院', 'hospital', '牙科', 'dental', 'dentist'] },
      { id: 'visa-documents', label: '签证 / 文件', keywords: ['签证', 'visa', 'tm30', '移民局', '证件照'] },
      { id: 'print-copy', label: '打印 / 复印', keywords: ['打印', 'print', '复印', 'copy', 'scan', '证件照', 'passport photo'] },
      { id: 'laundry-supplies', label: '洗衣 / 清洁', keywords: ['洗衣', 'laundry', 'laundromat', 'dry clean', '干洗'] },
      { id: 'daily-restock', label: '日用品 / 补给', keywords: ['日用品', 'supermarket', '美妆', '补货', '饮用水', 'water', '便利店', '7-eleven'] },
      { id: 'haircut-care', label: '理发 / 护理', keywords: ['理发', 'hair', 'salon', 'barber', 'haircut', 'beauty'] },
    ],
    fallbackTitle: '清迈生活刚需点还在补齐',
    fallbackDescription: '先显示已经整理出的换汇、打印、理发等实用点，电话卡、药店、诊所和租车会继续补。',
  },
};

export const getCmiIntentRule = (sceneId: CmiSceneId) => CMI_INTENT_SCENE_RULES[sceneId] ?? null;

export const getCmiIntentSecondaryFilters = (sceneId: CmiSceneId) =>
  getCmiIntentRule(sceneId)?.secondaryFilters ?? [];

export const getRecommendationScenarioTags = (recommendation: Recommendation) => {
  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  const tags = new Set<string>([recommendation.category, ...guide.tags, guide.kind]);
  const reasonText = getRecommendationReasonText(recommendation);
  const text = normalize(
    [recommendation.place_name, recommendation.category, reasonText, guide.title, guide.kind, guide.summary, ...guide.tags].join(' ')
  );

  if (containsAny(text, ['夜市', '晚上', '夜间', '酒吧', 'bar', 'live', '演出'])) tags.add('适合晚上');
  if (containsAny(text, ['市集', 'market', 'walking street', '手作', '周末'])) tags.add('适合周末');
  if (containsAny(text, ['拍照', '好看', '花园', '艺术', 'photo'])) tags.add('适合拍照');
  if (containsAny(text, ['安静', '坐一会', '短坐', '休息', '咖啡'])) tags.add('适合坐坐');
  if (containsAny(text, ['户外', '公园', '散步', '慢逛', '自然'])) tags.add('适合闲逛');
  if (isCommunityCuratedRecommendation(recommendation)) tags.add('CMI 推荐');
  if (recommendation.images.length > 0) tags.add('有照片');
  if (reasonText.length >= 18) tags.add('有真人痕迹');

  return Array.from(tags);
};

export const getRecommendationIntentScore = (recommendation: Recommendation, sceneId: CmiSceneId) => {
  const rule = getCmiIntentRule(sceneId);
  if (!rule) return 0;

  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  const reasonText = getRecommendationReasonText(recommendation);
  const text = normalize(
    [recommendation.place_name, recommendation.category, reasonText, guide.title, guide.kind, guide.summary, ...guide.tags].join(' ')
  );
  const scenarioTags = getRecommendationScenarioTags(recommendation);

  const keywordScore = rule.keywords.reduce(
    (score, keyword) => score + (text.includes(normalize(keyword)) ? 12 : 0),
    0
  );
  const scenarioScore = rule.scenarioTags.reduce(
    (score, tag) => score + (scenarioTags.some(candidate => normalize(candidate).includes(normalize(tag))) ? 10 : 0),
    0
  );
  const communityScore = isCommunityCuratedRecommendation(recommendation) ? 8 : 0;

  return keywordScore + scenarioScore + communityScore;
};

export const matchesCmiIntentSecondaryFilter = (
  recommendation: Recommendation,
  sceneId: CmiSceneId,
  filterId: string | null | undefined
) => {
  if (!filterId || filterId === 'all') return true;
  const filter = getCmiIntentSecondaryFilters(sceneId).find(item => item.id === filterId);
  if (!filter) return true;

  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  const reasonText = getRecommendationReasonText(recommendation);
  const text = normalize(
    [recommendation.place_name, recommendation.category, reasonText, guide.title, guide.kind, guide.summary, ...guide.tags].join(' ')
  );

  return containsAny(text, filter.keywords);
};
