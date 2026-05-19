import type { CmiEvent } from '@/data/cmi-events';
import type { CmiSceneId } from '@/data/cmi-scenes';
import type { Recommendation } from '@/types/types';

export interface CmiInspirationCard {
  id: string;
  title: string;
  summary: string;
  sceneId: CmiSceneId;
  durationLabel: string;
  bestTimeLabel: string;
  steps: string[];
  tags: string[];
  source: 'rule' | 'event' | 'fallback';
}

const getPlaceNames = (recommendations: Recommendation[], count: number) =>
  recommendations.slice(0, count).map(recommendation => recommendation.place_name);

const getEventTitles = (events: CmiEvent[], count: number) =>
  events.slice(0, count).map(event => event.title);

export const getCmiInspirationCards = (
  sceneId: CmiSceneId,
  recommendations: Recommendation[],
  events: CmiEvent[]
): CmiInspirationCard[] => {
  const placeNames = getPlaceNames(recommendations, 3);
  const eventTitles = getEventTitles(events, 2);

  if (sceneId === 'night') {
    return [
      {
        id: 'night-easy-close',
        title: '今晚别规划太重',
        summary: '先找一个能吃或能坐的地方，再接一个夜市、按摩或小酒吧。',
        sceneId,
        durationLabel: '2-3 小时',
        bestTimeLabel: '18:00 以后',
        steps: placeNames.length > 0 ? placeNames : ['先吃点东西', '去夜市走一圈', '按摩或找个地方坐坐'],
        tags: ['晚上', '低风险', '不用想太多'],
        source: placeNames.length > 0 ? 'rule' : 'fallback',
      },
      {
        id: 'night-event-first',
        title: '如果有活动，先看活动',
        summary: '有 live、夜市或 CMI 活动时，活动比随机找店更容易产生记忆点。',
        sceneId,
        durationLabel: '1.5-3 小时',
        bestTimeLabel: '晚上',
        steps: eventTitles.length > 0 ? eventTitles : ['看近期活动', '附近吃饭', '活动后散步或小酌'],
        tags: ['活动优先', '适合认识人'],
        source: eventTitles.length > 0 ? 'event' : 'fallback',
      },
    ];
  }

  if (sceneId === 'weekend') {
    return [
      {
        id: 'weekend-market-cafe',
        title: '市集 + 咖啡 + 慢逛',
        summary: '这是清迈周末最稳定的半天组合，适合普通游客，也适合刚来的人。',
        sceneId,
        durationLabel: '半天',
        bestTimeLabel: '周末上午或下午',
        steps: placeNames.length > 0 ? placeNames : ['周末市集', '附近咖啡', '手作或小店慢逛'],
        tags: ['市集', '咖啡', '半天'],
        source: placeNames.length > 0 ? 'rule' : 'fallback',
      },
      {
        id: 'weekend-photo-slow',
        title: '想出片，但别只打卡',
        summary: '把好拍的地方和能坐下来的地方放在一起，体验会比纯拍照更舒服。',
        sceneId,
        durationLabel: '2-4 小时',
        bestTimeLabel: '下午',
        steps: placeNames.length > 0 ? placeNames.slice(0, 2).concat('找个地方坐下来') : ['好拍地点', '咖啡或花园', '慢慢收尾'],
        tags: ['出片', '慢逛', '不赶路'],
        source: placeNames.length > 0 ? 'rule' : 'fallback',
      },
    ];
  }

  if (sceneId === 'tomorrow-events') {
    return [
      {
        id: 'events-cmi-first',
        title: '先看 CMI 和中文友好活动',
        summary: '活动是普通游客认识 CMI / 清迈客栈最快的入口，比单纯查地点更容易发生连接。',
        sceneId,
        durationLabel: '1.5-3 小时',
        bestTimeLabel: '明天或本周',
        steps: eventTitles.length > 0 ? eventTitles : ['看 CMI 活动', '看本地工作坊', '没有活动时改走稳定市集'],
        tags: ['CMI', '中文友好', '认识人'],
        source: eventTitles.length > 0 ? 'event' : 'fallback',
      },
      {
        id: 'events-no-empty',
        title: '没有活动也不要空白',
        summary: '如果明天没有可信活动，就给稳定市集、CMI 推荐地点或附近探索路线。',
        sceneId,
        durationLabel: '半天以内',
        bestTimeLabel: '全天',
        steps: placeNames.length > 0 ? placeNames : ['稳定市集', 'CMI 推荐地点', '附近探索路线'],
        tags: ['兜底', '稳定选择'],
        source: placeNames.length > 0 ? 'rule' : 'fallback',
      },
    ];
  }

  if (sceneId === 'nearby-wander') {
    return [
      {
        id: 'nearby-walkable',
        title: '先从走路可到开始',
        summary: '附近随便逛逛的重点是不专门打车，不做重计划，先让当前位置变得有东西。',
        sceneId,
        durationLabel: '30-90 分钟',
        bestTimeLabel: '碎片时间',
        steps: placeNames.length > 0 ? placeNames : ['附近咖啡', '附近小店', '附近能坐下的地方'],
        tags: ['附近', '走路', '碎片时间'],
        source: placeNames.length > 0 ? 'rule' : 'fallback',
      },
    ];
  }

  return [];
};
