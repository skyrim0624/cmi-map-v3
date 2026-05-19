import type { CmiSceneId } from '@/data/cmi-scenes';
import type { Category, MapMarker, Recommendation } from '@/types/types';

export type CmiEventType =
  | 'cmi'
  | 'workshop'
  | 'exhibition'
  | 'market'
  | 'music'
  | 'meetup'
  | 'festival'
  | 'wellness'
  | 'meditation'
  | 'sport'
  | 'tech'
  | 'stable';

export type CmiEventSourceType =
  | 'cmi'
  | 'official'
  | 'government'
  | 'venue'
  | 'community'
  | 'stable-local'
  | 'manual'
  | 'ai';

export type CmiEventVerificationStatus =
  | 'verified'
  | 'needs-review'
  | 'stable-recurring'
  | 'ai-candidate'
  | 'rejected';

export type CmiEventTimeBucket = 'today-afternoon' | 'tonight' | 'tomorrow' | 'this-week' | 'later' | 'stable';

export interface CmiEventRecurrence {
  weekdays: number[];
  startTime: string;
  endTime?: string;
  label: string;
}

export interface CmiEventMapLocation {
  latitude: number;
  longitude: number;
  category: Category;
}

export interface CmiEvent {
  id: string;
  title: string;
  type: CmiEventType;
  startAt?: string;
  endAt?: string;
  recurrence?: CmiEventRecurrence;
  stableSchedule?: string;
  venueName: string;
  area: string;
  mapLocation?: CmiEventMapLocation;
  priceLabel: string;
  registrationLabel: string;
  sourceType: CmiEventSourceType;
  sourceLabel: string;
  sourceUrl?: string;
  hostName: string;
  language: string;
  suitableFor: string[];
  isCmiRelated: boolean;
  isVerified: boolean;
  verificationStatus: CmiEventVerificationStatus;
  lastCheckedAt: string;
  nextCheckBefore?: string;
  reliabilityNote: string;
  tags: string[];
  summary: string;
}

export const CMI_EVENT_TYPE_OPTIONS: Array<{ id: 'all' | CmiEventType; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'cmi', label: 'CMI' },
  { id: 'workshop', label: '工作坊' },
  { id: 'wellness', label: '身心灵' },
  { id: 'meditation', label: '禅修' },
  { id: 'sport', label: '运动' },
  { id: 'music', label: '音乐' },
  { id: 'tech', label: '科技' },
  { id: 'exhibition', label: '展览' },
  { id: 'market', label: '市集' },
  { id: 'festival', label: '节庆' },
  { id: 'meetup', label: '聚会' },
  { id: 'stable', label: '稳定去处' },
];

export const CMI_EVENT_VERIFICATION_LABELS: Record<CmiEventVerificationStatus, string> = {
  verified: '已核实',
  'needs-review': '待核实',
  'stable-recurring': '稳定周期',
  'ai-candidate': 'AI 候选',
  rejected: '已拒绝',
};

export const CMI_EVENT_TIME_BUCKET_LABELS: Record<CmiEventTimeBucket, string> = {
  'today-afternoon': '今天下午',
  tonight: '今晚',
  tomorrow: '明天',
  'this-week': '本周',
  later: '近期',
  stable: '稳定活动',
};

export const CMI_EVENTS: CmiEvent[] = [
  {
    id: 'cmi-ai-nomad-community-2026-05-20',
    title: 'AI 时代，数智游民社区发展趋势探讨',
    type: 'cmi',
    startAt: '2026-05-20T19:00:00+07:00',
    endAt: '2026-05-20T21:30:00+07:00',
    venueName: '清迈客栈',
    area: 'CMI / 清迈客栈',
    priceLabel: '免费参与',
    registrationLabel: 'Luma 报名',
    sourceType: 'cmi',
    sourceLabel: 'CMI 活动公告',
    sourceUrl: 'https://luma.com/ztpb14f8?tk=OBPFun',
    hostName: 'CMI 社区',
    language: '中文',
    suitableFor: ['想认识人', 'AI 创业者', '数字游民', '社区建设者'],
    isCmiRelated: true,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-19T11:30:00+07:00',
    nextCheckBefore: '2026-05-20T12:00:00+07:00',
    reliabilityNote: '来自 CMI 自有活动公告，时间和报名链接需要活动当天中午前再核一次。',
    tags: ['CMI', '分享会', '中文友好', '免费', '科技', 'AI'],
    summary: '一场围绕 AI 时代数字游民社区和真实实践展开的分享与讨论，适合想和 CMI 发生连接的人。',
  },
  {
    id: 'jing-jai-weekend-market',
    title: 'Jing Jai 周末市集',
    type: 'market',
    recurrence: {
      weekdays: [0, 6],
      startTime: '06:30',
      endTime: '15:00',
      label: '每周六、周日早上到下午',
    },
    stableSchedule: '每周六、周日 06:30-15:00',
    venueName: 'Jing Jai Market',
    area: 'JJ Market / Chang Phueak',
    mapLocation: { latitude: 18.8119, longitude: 98.9937, category: '市集' },
    priceLabel: '免费入场',
    registrationLabel: '直接去',
    sourceType: 'stable-local',
    sourceLabel: 'Citylife / Jing Jai 周末源',
    sourceUrl: 'https://www.chiangmaicitylife.com/clg/our-city/how-jing-jai-market-is-paving-the-way-for-sustainable-development-in-chiang-mai/',
    hostName: 'Jing Jai Market',
    language: '泰语 / 英语',
    suitableFor: ['第一次来清迈', '周末早上', '市集', '拍照'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'stable-recurring',
    lastCheckedAt: '2026-05-19T12:35:00+07:00',
    nextCheckBefore: '2026-05-23T08:00:00+07:00',
    reliabilityNote: 'Jing Jai 项目每日有店铺，周末市集本身为周六周日开放；具体摊位和特别主题仍需每周复核。',
    tags: ['市集', '周末', '早上', '出片'],
    summary: '清迈周末很稳定的市集选择，适合早上去吃点东西、看手作、买小物，作为周末半天路线的起点。',
  },
  {
    id: 'saturday-walking-street',
    title: '周六步行街',
    type: 'market',
    recurrence: {
      weekdays: [6],
      startTime: '16:00',
      endTime: '23:00',
      label: '每周六傍晚到晚上',
    },
    stableSchedule: '每周六 16:00-23:00',
    venueName: 'Wua Lai Road',
    area: '古城南侧',
    mapLocation: { latitude: 18.7808, longitude: 98.9848, category: '市集' },
    priceLabel: '免费入场',
    registrationLabel: '直接去',
    sourceType: 'stable-local',
    sourceLabel: 'LoveThailand 核查',
    sourceUrl: 'https://www.lovethailand.org/travel/en/1-Chiang-Mai/14-Wua-Lai-Walking-Street.html',
    hostName: '本地市集',
    language: '泰语 / 英语',
    suitableFor: ['周末', '晚上', '市集', '手作'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'stable-recurring',
    lastCheckedAt: '2026-05-19T12:35:00+07:00',
    nextCheckBefore: '2026-05-23T17:00:00+07:00',
    reliabilityNote: '稳定夜市源，适合不知道晚上去哪时兜底；雨季和节假日需当天复核。',
    tags: ['夜市', '周末', '手作', '晚上'],
    summary: '如果刚好在周六晚上，这是比随机找商场更有清迈感的稳定选择。',
  },
  {
    id: 'sunday-walking-street',
    title: '周日步行街',
    type: 'market',
    recurrence: {
      weekdays: [0],
      startTime: '16:00',
      endTime: '22:00',
      label: '每周日傍晚到晚上',
    },
    stableSchedule: '每周日 16:00-22:00',
    venueName: 'Tha Phae Gate / Ratchadamnoen Road',
    area: '古城',
    mapLocation: { latitude: 18.7882, longitude: 98.9936, category: '市集' },
    priceLabel: '免费入场',
    registrationLabel: '直接去',
    sourceType: 'stable-local',
    sourceLabel: 'Thai Holiday Guide 核查',
    sourceUrl: 'https://www.thaiholidayguide.com/attraction/chiang-mai-sunday-walking-street/',
    hostName: '本地市集',
    language: '泰语 / 英语',
    suitableFor: ['第一次来清迈', '晚上', '市集', '游客友好'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'stable-recurring',
    lastCheckedAt: '2026-05-19T12:35:00+07:00',
    nextCheckBefore: '2026-05-24T17:00:00+07:00',
    reliabilityNote: '稳定夜市源，适合作为周日晚上兜底；雨季和节假日需当天复核。',
    tags: ['夜市', '周末', '晚上', '古城'],
    summary: '第一次来清迈很容易理解的夜间选择，商业化但方便，适合不知道晚上去哪时作为兜底。',
  },
  {
    id: 'tong-tung-weekend-market',
    title: 'Tong Tung 周末市集',
    type: 'market',
    recurrence: {
      weekdays: [0, 6],
      startTime: '08:00',
      endTime: '16:00',
      label: '每周六、周日早上到下午',
    },
    stableSchedule: '每周六、周日 08:00-16:00',
    venueName: 'Tong Tung Market at Baan Rim Nam',
    area: 'Nong Chom / Meechok 附近',
    mapLocation: { latitude: 18.8335, longitude: 99.0234, category: '市集' },
    priceLabel: '免费入场',
    registrationLabel: '直接去',
    sourceType: 'community',
    sourceLabel: 'Citylife 核查',
    sourceUrl: 'https://www.chiangmaicitylife.com/citynow/social-life/live-events/tong-tung-market-at-baan-rim-nam/',
    hostName: 'Tong Tung Market',
    language: '泰语 / 英语',
    suitableFor: ['周末早上', '亲子', '市集', '不太游客'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'stable-recurring',
    lastCheckedAt: '2026-05-19T12:35:00+07:00',
    nextCheckBefore: '2026-05-23T08:00:00+07:00',
    reliabilityNote: 'Citylife 标注为每个周末开放；偏本地绿色市集，出发前仍建议核当天 Facebook 动态。',
    tags: ['市集', '周末', '早上', '亲子', '不太游客'],
    summary: '比古城夜市更松一点的周末绿色市集，适合想找本地摊位、早餐、家庭友好气氛的人。',
  },
  {
    id: 'chamcha-weekend-market',
    title: 'Chamcha 周末手作市集',
    type: 'market',
    recurrence: {
      weekdays: [0, 6],
      startTime: '09:00',
      endTime: '14:30',
      label: '每周六、周日白天',
    },
    stableSchedule: '每周六、周日 09:00-14:30',
    venueName: 'Chamcha Market',
    area: 'San Kamphaeng / Bo Sang 方向',
    mapLocation: { latitude: 18.7464, longitude: 99.1061, category: '市集' },
    priceLabel: '免费入场',
    registrationLabel: '直接去',
    sourceType: 'venue',
    sourceLabel: 'Chiang Mai Master 核查',
    sourceUrl: 'https://www.chiangmaimaster.com/place/chamcha-market',
    hostName: 'Chamcha Market',
    language: '泰语 / 英语',
    suitableFor: ['手作', '不太游客', '周末白天', '慢慢逛'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'stable-recurring',
    lastCheckedAt: '2026-05-19T12:35:00+07:00',
    nextCheckBefore: '2026-05-23T09:00:00+07:00',
    reliabilityNote: '多个地点目录显示为周六周日开放；离古城较远，适合和 Bo Sang / San Kamphaeng 路线一起做。',
    tags: ['市集', '周末', '手作', '不太游客', '出片'],
    summary: '偏手作、艺术和小摊的周末白天选择，比大夜市安静，适合想拍照、买手作、慢慢逛的人。',
  },
  {
    id: 'coconut-market-kad-ba-pao',
    title: 'Coconut Market 椰林市集',
    type: 'market',
    recurrence: {
      weekdays: [0, 6],
      startTime: '08:00',
      endTime: '13:00',
      label: '每周六、周日早上',
    },
    stableSchedule: '每周六、周日 08:00-13:00',
    venueName: 'Kad Ba Pao / Coconut Market',
    area: 'Fa Ham / Ruamchok 方向',
    mapLocation: { latitude: 18.8294, longitude: 99.0168, category: '市集' },
    priceLabel: '免费入场',
    registrationLabel: '直接去',
    sourceType: 'venue',
    sourceLabel: 'Chang Puak 核查',
    sourceUrl: 'https://changpuakmagazine.com/en-article/COCONUT-MARKET/531169/',
    hostName: 'Kad Ba Pao',
    language: '泰语 / 英语',
    suitableFor: ['拍照', '周末早上', '亲子', '小市集'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'stable-recurring',
    lastCheckedAt: '2026-05-19T12:35:00+07:00',
    nextCheckBefore: '2026-05-23T08:00:00+07:00',
    reliabilityNote: 'Chang Puak 标注周六周日，部分平台显示周五也可能有摊位；作为周末库可用，周五开放需单独复核。',
    tags: ['市集', '周末', '早上', '出片', '亲子'],
    summary: '在椰子树和小水道里的周末市集，食物和摊位规模不算大，但很适合拍照和轻松逛一两个小时。',
  },
  {
    id: 'baan-kang-wat-sunday-morning-market',
    title: 'Baan Kang Wat 周日晨市',
    type: 'market',
    recurrence: {
      weekdays: [0],
      startTime: '08:00',
      endTime: '14:00',
      label: '每周日早上到下午',
    },
    stableSchedule: '每周日 08:00-14:00',
    venueName: 'Baan Kang Wat',
    area: 'Wat Umong / Suthep',
    mapLocation: { latitude: 18.7896, longitude: 98.9495, category: '市集' },
    priceLabel: '免费入场',
    registrationLabel: '直接去',
    sourceType: 'community',
    sourceLabel: 'Citylife 核查',
    sourceUrl: 'https://www.chiangmaicitylife.com/citynow/social-life/live-events/sunday-morning-market-baan-kang-wat/',
    hostName: 'Baan Kang Wat',
    language: '泰语 / 英语',
    suitableFor: ['周日早上', '手作', '咖啡', '拍照'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'stable-recurring',
    lastCheckedAt: '2026-05-19T12:35:00+07:00',
    nextCheckBefore: '2026-05-24T08:00:00+07:00',
    reliabilityNote: 'Baan Kang Wat 本体并非只周日开放；这里入库的是周日 Morning Market，需要和普通艺术村开放时间分开。',
    tags: ['市集', '周末', '周日', '手作', '咖啡'],
    summary: '艺术村里的周日晨市，适合把咖啡、手作、小店和周日慢逛放在一条轻路线里。',
  },
  {
    id: 'nana-jungle-saturday-market',
    title: 'Nana Jungle 周六晨市',
    type: 'market',
    recurrence: {
      weekdays: [6],
      startTime: '07:00',
      endTime: '11:00',
      label: '每周六早上',
    },
    stableSchedule: '每周六 07:00-11:00',
    venueName: 'Bamboo Saturday Market / Nana Jungle',
    area: 'Chang Phueak / Jed Yod 方向',
    mapLocation: { latitude: 18.8167, longitude: 98.9726, category: '市集' },
    priceLabel: '免费入场',
    registrationLabel: '直接去',
    sourceType: 'stable-local',
    sourceLabel: 'Visit Thailand Today 核查',
    sourceUrl: 'https://www.visitthailandtoday.com/markets-shopping/chiang-mai/bamboo-saturday-market-nana-jungle',
    hostName: 'Nana Jungle',
    language: '泰语 / 英语',
    suitableFor: ['周六早起', '本地感', '面包', '不太游客'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'stable-recurring',
    lastCheckedAt: '2026-05-19T12:35:00+07:00',
    nextCheckBefore: '2026-05-23T07:00:00+07:00',
    reliabilityNote: '周六上午限定，时间窗口很短；需要提醒用户早去，避免卖完或收摊。',
    tags: ['市集', '周末', '早上', '不太游客', '周六'],
    summary: '很适合早起的人，偏本地晨市和面包/食物气氛，不是大游客夜市，时间窗口短。',
  },
  {
    id: 'nong-ho-weekend-flea-market',
    title: 'Nong Ho 周末旧物市集',
    type: 'market',
    recurrence: {
      weekdays: [0, 6],
      startTime: '07:00',
      endTime: '14:00',
      label: '每周六、周日早上',
    },
    stableSchedule: '每周六、周日 07:00-14:00',
    venueName: 'Nong Ho Flea Market',
    area: '古城北侧 / Chang Phueak 方向',
    mapLocation: { latitude: 18.8263, longitude: 98.9748, category: '市集' },
    priceLabel: '免费入场',
    registrationLabel: '直接去',
    sourceType: 'community',
    sourceLabel: 'When in Chiang Mai 核查',
    sourceUrl: 'https://www.wheninchiangmai.com/lb132290/nong-ho-flea-market-saturday-sunday',
    hostName: 'Nong Ho Flea Market',
    language: '泰语为主',
    suitableFor: ['二手旧物', '本地感', '周末早上', '不太游客'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'stable-recurring',
    lastCheckedAt: '2026-05-19T12:35:00+07:00',
    nextCheckBefore: '2026-05-23T07:00:00+07:00',
    reliabilityNote: '偏本地二手旧物市场，天气会影响摊位数量；适合推荐给明确想淘旧物的人。',
    tags: ['市集', '周末', '早上', '二手', '不太游客'],
    summary: '更像真正的本地跳蚤市场，适合淘旧物、二手家具、老杂货，不适合只想买精致伴手礼的人。',
  },
  {
    id: 'chiang-mai-pride-2026',
    title: 'Chiang Mai Pride 2026',
    type: 'festival',
    startAt: '2026-05-24T13:00:00+07:00',
    endAt: '2026-05-24T23:59:00+07:00',
    stableSchedule: '2026-05-24 周日 13:00-24:00',
    venueName: 'Buddhasathan / Tha Phae Gate',
    area: '古城东侧 / Tha Phae',
    mapLocation: { latitude: 18.7885, longitude: 98.9941, category: '彩蛋' },
    priceLabel: '免费',
    registrationLabel: '直接去',
    sourceType: 'official',
    sourceLabel: '主办方 / Citylife 核查',
    sourceUrl: 'https://www.adamsappleclub.com/event/chiang-mai-pride-2026/',
    hostName: 'Chiang Mai Pride / Adam’s Apple Club',
    language: '泰语 / 英语',
    suitableFor: ['本周末', '节庆', '游行', '社区活动'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-19T12:35:00+07:00',
    nextCheckBefore: '2026-05-24T10:00:00+07:00',
    reliabilityNote: '主办方公布 16:00 游行，Citylife 补充主活动 13:00 到午夜；当天路线和封路信息需上午再复核。',
    tags: ['周末', '节庆', '游行', '免费', '本周末'],
    summary: '这个周日的城市级 Pride 活动，包含游行、表演、社区市场和夜间节目，适合想赶上本周末现场氛围的人。',
  },
];

const CMI_EVENT_MARKER_ID_PREFIX = 'cmi-event:';

export const getCmiEventMarkerId = (eventId: string) => `${CMI_EVENT_MARKER_ID_PREFIX}${eventId}`;

export const getCmiEventIdFromMarkerId = (markerId: string) =>
  markerId.startsWith(CMI_EVENT_MARKER_ID_PREFIX)
    ? markerId.slice(CMI_EVENT_MARKER_ID_PREFIX.length)
    : null;

export const getCmiEventById = (eventId: string | null | undefined) =>
  eventId ? CMI_EVENTS.find(event => event.id === eventId) ?? null : null;

export const getCmiEventMapMarker = (event: CmiEvent): MapMarker | null => {
  if (!event.mapLocation) return null;

  const recommendation: Recommendation = {
    id: getCmiEventMarkerId(event.id),
    place_name: event.title,
    category: event.mapLocation.category,
    reason: event.summary,
    user_name: event.sourceLabel,
    user_id: null,
    latitude: event.mapLocation.latitude,
    longitude: event.mapLocation.longitude,
    images: [],
    created_at: event.startAt ?? event.lastCheckedAt,
    upvotes: [],
    wishlists: [],
    placed_stickers: [],
  };

  return {
    id: getCmiEventMarkerId(event.id),
    place_name: event.title,
    category: event.mapLocation.category,
    latitude: event.mapLocation.latitude,
    longitude: event.mapLocation.longitude,
    recommendations: [recommendation],
  };
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const EVENT_LOOKAHEAD_DAYS = 14;

const getEventTime = (event: CmiEvent) => (event.startAt ? new Date(event.startAt).getTime() : null);

const parseTime = (time: string) => {
  const [hour = '0', minute = '0'] = time.split(':');
  return {
    hour: Number(hour),
    minute: Number(minute),
  };
};

const getDayStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const getNextRecurringEventStart = (
  event: CmiEvent,
  referenceDate: Date = new Date()
) => {
  if (!event.recurrence) return null;

  const { hour, minute } = parseTime(event.recurrence.startTime);
  const referenceDayStart = getDayStart(referenceDate);

  for (let dayOffset = 0; dayOffset <= EVENT_LOOKAHEAD_DAYS; dayOffset += 1) {
    const candidate = new Date(referenceDayStart + dayOffset * DAY_IN_MS);
    candidate.setHours(hour, minute, 0, 0);

    if (
      event.recurrence.weekdays.includes(candidate.getDay()) &&
      candidate.getTime() >= referenceDate.getTime()
    ) {
      return candidate.getTime();
    }
  }

  return null;
};

export const getCmiEventSortTime = (
  event: CmiEvent,
  referenceDate: Date = new Date()
) => getEventTime(event) ?? getNextRecurringEventStart(event, referenceDate) ?? Number.MAX_SAFE_INTEGER;

export const isCmiEventExpired = (event: CmiEvent, referenceDate: Date = new Date()) => {
  if (!event.startAt) return false;
  const endTime = event.endAt ? new Date(event.endAt).getTime() : getEventTime(event);
  return typeof endTime === 'number' && endTime < referenceDate.getTime();
};

export const getCmiEventTimeBucket = (
  event: CmiEvent,
  referenceDate: Date = new Date()
): CmiEventTimeBucket => {
  const sortTime = getCmiEventSortTime(event, referenceDate);
  if (sortTime === Number.MAX_SAFE_INTEGER) return 'stable';

  const referenceDayStart = getDayStart(referenceDate);
  const eventDayStart = getDayStart(new Date(sortTime));
  const dayDifference = Math.round((eventDayStart - referenceDayStart) / DAY_IN_MS);
  const eventHour = new Date(sortTime).getHours();

  if (dayDifference === 0) return eventHour >= 18 ? 'tonight' : 'today-afternoon';
  if (dayDifference === 1) return 'tomorrow';
  if (dayDifference > 1 && dayDifference <= 7) return 'this-week';

  return event.recurrence ? 'stable' : 'later';
};

export const getCmiEventTimeBucketLabel = (
  event: CmiEvent,
  referenceDate: Date = new Date()
) => CMI_EVENT_TIME_BUCKET_LABELS[getCmiEventTimeBucket(event, referenceDate)];

export const getCmiEventTypeLabel = (type: CmiEventType) =>
  CMI_EVENT_TYPE_OPTIONS.find(option => option.id === type)?.label ?? type;

export const formatCmiEventTime = (
  event: CmiEvent,
  referenceDate: Date = new Date()
) => {
  const sortTime = getCmiEventSortTime(event, referenceDate);

  if (sortTime !== Number.MAX_SAFE_INTEGER) {
    const startLabel = new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok',
    }).format(new Date(sortTime));

    return event.recurrence && event.stableSchedule
      ? `${startLabel} · ${event.stableSchedule}`
      : startLabel;
  }

  return event.stableSchedule ?? '时间待确认';
};

export const formatCmiEventDateParts = (
  event: CmiEvent,
  referenceDate: Date = new Date()
) => {
  const sortTime = getCmiEventSortTime(event, referenceDate);

  if (sortTime === Number.MAX_SAFE_INTEGER) {
    return {
      monthDay: '待定',
      weekday: '',
    };
  }

  const eventDate = new Date(sortTime);

  return {
    monthDay: new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    }).format(eventDate).replace('/', '.'),
    weekday: new Intl.DateTimeFormat('zh-CN', {
      weekday: 'short',
      timeZone: 'Asia/Bangkok',
    }).format(eventDate),
  };
};

export const getUpcomingCmiEventsFromList = (
  events: CmiEvent[],
  referenceDate: Date = new Date()
) =>
  events.filter(event => !isCmiEventExpired(event, referenceDate)).sort((left, right) => {
    const timeDifference = getCmiEventSortTime(left, referenceDate) - getCmiEventSortTime(right, referenceDate);
    if (timeDifference !== 0) return timeDifference;
    if (left.isCmiRelated !== right.isCmiRelated) return left.isCmiRelated ? -1 : 1;
    return left.title.localeCompare(right.title, 'zh-CN');
  });

export const getUpcomingCmiEvents = (referenceDate: Date = new Date()) =>
  getUpcomingCmiEventsFromList(CMI_EVENTS, referenceDate);

export const getCmiEventsForSceneFromList = (
  sourceEvents: CmiEvent[],
  sceneId: CmiSceneId,
  referenceDate: Date = new Date()
) => {
  const events = getUpcomingCmiEventsFromList(sourceEvents, referenceDate);

  if (sceneId === 'tomorrow-events') {
    return events;
  }

  if (sceneId === 'night') {
    return events.filter(event =>
      event.tags.some(tag => ['夜市', '晚上', '音乐'].includes(tag)) || event.type === 'music'
    );
  }

  if (sceneId === 'weekend') {
    return events.filter(event =>
      event.tags.some(tag => ['周末', '市集', '出片'].includes(tag)) || event.type === 'market'
    );
  }

  return [];
};

export const getCmiEventsForScene = (sceneId: CmiSceneId, referenceDate: Date = new Date()) =>
  getCmiEventsForSceneFromList(CMI_EVENTS, sceneId, referenceDate);

export const getTomorrowCmiEvents = (referenceDate: Date = new Date()) => {
  const tomorrowStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + 1).getTime();
  const tomorrowEnd = tomorrowStart + DAY_IN_MS;

  return getUpcomingCmiEvents(referenceDate).filter(event => {
    const startTime = getCmiEventSortTime(event, referenceDate);
    return startTime >= tomorrowStart && startTime < tomorrowEnd;
  });
};
