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

export const CMI_EVENTS_LAST_MAINTAINED_AT = '2026-05-24T19:07:13+07:00';

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
    lastCheckedAt: '2026-05-23T14:33:17+07:00',
    reliabilityNote: '来自 CMI 自有活动公告，时间和报名链接需要活动当天中午前再核一次。',
    tags: ['CMI', '分享会', '中文友好', '免费', '科技', 'AI'],
    summary: '一场围绕 AI 时代数字游民社区和真实实践展开的分享与讨论，适合想和 CMI 发生连接的人。',
  },
  {
    id: 'cmi-mindfulness-hour-2026-05-21',
    title: '正念一小时｜清迈客栈 CMI 社区',
    type: 'cmi',
    startAt: '2026-05-21T19:00:00+07:00',
    endAt: '2026-05-21T20:30:00+07:00',
    venueName: '清迈客栈',
    area: 'CMI / 清迈客栈',
    priceLabel: '免费参与',
    registrationLabel: '无需报名，直接空降即可',
    sourceType: 'cmi',
    sourceLabel: 'CMI 活动宣传内容文件夹',
    sourceUrl: 'https://mp.weixin.qq.com/s/xfYyjVtLe9yn8rt-S7YCrg',
    hostName: 'CMI 社区',
    language: '中文',
    suitableFor: ['正念练习', '冥想', '想慢下来', '社区活动'],
    isCmiRelated: true,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-23T14:33:17+07:00',
    reliabilityNote: '信息来自推文 Markdown 与海报 OCR 交叉核对，时间、地点、形式和参与方式均明确。',
    tags: ['CMI', '正念', '冥想', '免费', '中文友好'],
    summary: '一场把静坐冥想、引导练习和开放分享放在一起的晚间正念活动，适合最近想慢下来、少一点内耗的人。',
  },
  {
    id: 'cmi-friday-afternoon-yoga-2026-05-22',
    title: '清迈夏季养心｜心经阴瑜伽 · 肩颈舒缓课',
    type: 'wellness',
    startAt: '2026-05-22T17:00:00+07:00',
    endAt: '2026-05-22T18:15:00+07:00',
    venueName: '清迈客栈',
    area: 'CMI / 清迈客栈',
    priceLabel: '场地费 350 THB',
    registrationLabel: '原文未注明报名方式',
    sourceType: 'cmi',
    sourceLabel: 'CMI 活动宣传内容文件夹',
    sourceUrl: 'https://mp.weixin.qq.com/s/E1ChmH2GQkQp0K6D9DZc4A',
    hostName: '沙溪 Karen / Yoga in the Park Chiang Mai',
    language: '中文',
    suitableFor: ['肩颈紧张', '久坐人群', '睡眠不佳', '想放松身心'],
    isCmiRelated: true,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-23T14:33:17+07:00',
    reliabilityNote: '日期来自活动文件夹名称“5.22”，时间、地点、费用和导师信息来自同目录推文 Markdown；原文未提供单独报名链接或二维码说明。',
    tags: ['CMI', '瑜伽', '身心灵', '肩颈舒缓', '收费活动'],
    summary: '一节结合中医经络理论与阴瑜伽的肩颈舒缓课，适合久坐、肩颈紧张或最近睡眠偏浅的人。',
  },
  {
    id: 'cmi-kongxiang-canteen-2026-05-22',
    title: '空想食堂｜清迈客栈周五晚餐',
    type: 'cmi',
    startAt: '2026-05-22T19:00:00+07:00',
    venueName: '清迈客栈',
    area: 'CMI / 清迈客栈',
    priceLabel: '请带一道菜来和大家分享',
    registrationLabel: '直接空降即可；海报附有加群二维码',
    sourceType: 'cmi',
    sourceLabel: 'CMI 活动宣传内容文件夹',
    hostName: 'CMI 社区',
    language: '中文',
    suitableFor: ['社区晚餐', '包饺子', '轻社交', '周五晚上'],
    isCmiRelated: true,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-23T14:33:17+07:00',
    reliabilityNote: '时间信息来自推文中“5 月 22 日（周五）晚 🕖”的明确表述，其余地点、费用和参与方式来自同一份活动文案与海报。',
    tags: ['CMI', '空想食堂', '周五', '社区活动', '晚餐'],
    summary: '清迈客栈的周五空想食堂，大家带菜一起吃饭、包饺子、聊天，饭后还有小型观影活动。',
  },
  {
    id: 'cmi-song-of-the-sea-screening-2026-05-23',
    title: '清迈客栈周六观影会：《海洋之歌》',
    type: 'cmi',
    startAt: '2026-05-23T19:30:00+07:00',
    venueName: '清迈客栈',
    area: 'CMI / 清迈客栈',
    priceLabel: '免费参与',
    registrationLabel: '无需报名，直接空降',
    sourceType: 'cmi',
    sourceLabel: 'CMI 活动宣传内容文件夹',
    hostName: 'MagicLab × 清迈客栈',
    language: '中文',
    suitableFor: ['周六晚上', '电影', '想认识人', '社区活动'],
    isCmiRelated: true,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-24T14:05:26+07:00',
    reliabilityNote: '信息来自 5.23 观影会海报 OCR 与人工核对；海报明确给出时间、地点、费用和参与方式，未见单独报名链接。',
    tags: ['CMI', '观影会', 'MagicLab', '免费', '周六', '中文友好'],
    summary: 'MagicLab 和清迈客栈一起办的周六观影会，放映《海洋之歌》，适合想在社区里轻松认识人的人。',
  },
  {
    id: 'cmi-swap-market-2026-05-24',
    title: '旧物交换市集',
    type: 'market',
    startAt: '2026-05-24T14:00:00+07:00',
    endAt: '2026-05-24T17:00:00+07:00',
    venueName: '清迈客栈',
    area: 'CMI / 清迈客栈',
    priceLabel: '免费参与',
    registrationLabel: '海报附二维码，可扫码进群了解',
    sourceType: 'cmi',
    sourceLabel: 'CMI 活动宣传内容文件夹',
    hostName: 'CMI 社区',
    language: '中文',
    suitableFor: ['旧物交换', '技能分享', '才艺展示', '周日下午'],
    isCmiRelated: true,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-24T19:07:13+07:00',
    reliabilityNote:
      '信息直接来自 5.24 旧物交换市场海报；海报明确写明周日下午两点到五点、地点为清迈客栈，并附带进群二维码。',
    tags: ['CMI', '旧物交换', '市集', '技能分享', '周末'],
    summary: '把旧物、技能、才艺或一次帮助带到清迈客栈，在周日下午和社区做一场轻松的交换与认识。',
  },
  {
    id: 'cmi-ai-open-mic-vol-04-2026-05-24',
    title: 'AI 开放麦第四期｜本周 AI 使用现场交流',
    type: 'tech',
    startAt: '2026-05-24T19:00:00+07:00',
    venueName: '清迈客栈',
    area: 'CMI / 清迈客栈',
    priceLabel: '免费参与',
    registrationLabel: '无需报名，直接空降即可',
    sourceType: 'cmi',
    sourceLabel: 'CMI 活动宣传内容文件夹',
    hostName: 'CMI 社区',
    language: '中文',
    suitableFor: ['AI 使用者', '工具实践', '项目交流', '带问题来讨论'],
    isCmiRelated: true,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-24T19:07:13+07:00',
    nextCheckBefore: '2026-05-24T21:00:00+07:00',
    reliabilityNote: '信息来自 5.24 AI 开放麦 04 推文 Markdown 与海报，时间、地点、费用和参与方式均明确。',
    tags: ['CMI', 'AI开放麦', 'AI', '工具实践', '免费', '周日'],
    summary: '清迈客栈的第四期 AI 开放麦，围绕本周 AI 使用、工具、项目、案例、踩坑和问题做现场交流。',
  },
  {
    id: 'cmi-financial-literacy-sharing-2026-05-29',
    title: '穷姐姐财商分享大会｜在清迈可以“摆烂”，但钱包不能真的烂',
    type: 'cmi',
    startAt: '2026-05-29T19:00:00+07:00',
    venueName: '清迈客栈',
    area: 'CMI / 清迈客栈',
    priceLabel: '免费参与，可随喜支持',
    registrationLabel: '无需报名，直接空降即可；Luma 链接待补充',
    sourceType: 'cmi',
    sourceLabel: 'CMI 活动宣传内容文件夹',
    hostName: 'Pink × CMI 社区',
    language: '中文',
    suitableFor: ['数字游民', '自由职业者', '长期旅居者', '想理清个人财务的人'],
    isCmiRelated: true,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-24T19:07:13+07:00',
    nextCheckBefore: '2026-05-29T12:00:00+07:00',
    reliabilityNote:
      '信息来自 5.29 穷姐姐财商分享大会推文 Markdown 与同目录海报；时间、地点、费用和直接参与方式明确，Luma 链接仍待补充但不影响空降参与。',
    tags: ['CMI', '财商', '理财', '数字游民', '分享会', '免费'],
    summary: '一场面向清迈旅居者和数字游民的财商分享，围绕理财工具、收入安全垫、风险识别和个人价值展开。',
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
  {
    id: 'deja-gallery-undo-redo-2026-05-22',
    title: 'UNDO · REDO 艺术展最后一天',
    type: 'exhibition',
    startAt: '2026-05-22T08:30:00+07:00',
    endAt: '2026-05-22T17:00:00+07:00',
    stableSchedule: '展期至 2026-05-22，周五 08:30-17:00',
    venueName: 'Déjà Gallery',
    area: 'Wat Ket / Kong Sai Road',
    priceLabel: '免费',
    registrationLabel: '直接去',
    sourceType: 'venue',
    sourceLabel: 'Citylife / Time Out 核查',
    sourceUrl: 'https://www.chiangmaicitylife.com/citynow/whats-on/arts-and-exhibitions/undo-%C2%B7-redo-art-exhibition-at-deja-gallery/',
    hostName: 'Déjà Gallery',
    language: '英语 / 泰语',
    suitableFor: ['展览', '下午散步', '艺术空间', '雨天备选'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-21T09:56:00+07:00',
    nextCheckBefore: '2026-05-22T11:00:00+07:00',
    reliabilityNote: 'Citylife 核到展期至 5 月 22 日，Time Out 补充当天开放时间；作为最后一天展览推荐，出发前仍建议看场地方动态。',
    tags: ['展览', '免费', '艺术', '本周五', '雨天备选'],
    summary: '一组关于选择、记忆和人生分岔的当代艺术展，5 月 22 日是最后一天，适合想找一个安静文化场景的人。',
  },
  {
    id: 'maya-pride-cover-dance-forum-2026-05-22',
    title: 'Pride Cover Dance 与平权论坛',
    type: 'festival',
    startAt: '2026-05-22T15:30:00+07:00',
    endAt: '2026-05-22T20:00:00+07:00',
    venueName: 'MAYA Lifestyle Shopping Center',
    area: 'Nimman / Maya',
    mapLocation: { latitude: 18.8022, longitude: 98.9675, category: '彩蛋' },
    priceLabel: '免费',
    registrationLabel: '直接去',
    sourceType: 'official',
    sourceLabel: 'Time Out Pride Guide 核查',
    sourceUrl: 'https://www.timeout.com/chiang-mai/lgbtq/your-ultimate-guide-to-chiang-mai-pride-2026',
    hostName: 'Chiang Mai Pride / MAYA',
    language: '泰语 / 英语',
    suitableFor: ['Pride', '舞蹈', '论坛', '商场顺路'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-21T09:56:00+07:00',
    nextCheckBefore: '2026-05-22T12:00:00+07:00',
    reliabilityNote: 'Time Out Pride 专题核到 15:30 开始；结束时间未在公开源明确，按晚间活动估算展示，发布当天建议复核 MAYA/主办方动态。',
    tags: ['Pride', '舞蹈', '论坛', '免费', '本周五'],
    summary: 'MAYA 里的 Pride 周五活动，一边是 cover dance 比赛，一边有关于人权、平权与商业责任的论坛。',
  },
  {
    id: 'carpenter-avenue-intha-dinner-2026-05-22',
    title: 'Intha Dinner 缅甸茵达文化晚餐',
    type: 'meetup',
    startAt: '2026-05-22T17:00:00+07:00',
    endAt: '2026-05-22T21:00:00+07:00',
    venueName: 'Carpenter Avenue',
    area: 'Chang Phueak / Chotana Road',
    priceLabel: '฿1,290',
    registrationLabel: '电话预约',
    sourceType: 'venue',
    sourceLabel: 'Time Out 本周末专题',
    sourceUrl: 'https://www.timeout.com/chiang-mai/things-to-do/explore-burmese-flavours-at-intha-dinner',
    hostName: 'Carpenter Avenue',
    language: '英语 / 泰语',
    suitableFor: ['晚餐', '文化体验', '小众活动', '需要预约'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-21T09:56:00+07:00',
    nextCheckBefore: '2026-05-22T12:00:00+07:00',
    reliabilityNote: 'Time Out 核到价格、电话和开始时间；座位和菜单以场地方当天确认为准。',
    tags: ['晚餐', '文化', '缅甸', '需预约', '本周五'],
    summary: 'Carpenter Avenue 做的一晚茵达族文化晚餐，有缅甸风味、故事和传统表演，适合想把晚饭变成一次文化体验的人。',
  },
  {
    id: 'aleenta-wine-pairing-2026-05-22',
    title: 'Aleenta 五道式葡萄酒晚餐',
    type: 'meetup',
    startAt: '2026-05-22T18:30:00+07:00',
    endAt: '2026-05-22T22:00:00+07:00',
    venueName: 'The 1892 Bar, Aleenta Retreat Chiang Mai',
    area: 'Wat Umong / Suthep',
    priceLabel: '฿2,099',
    registrationLabel: '电话或 LINE 预约',
    sourceType: 'venue',
    sourceLabel: 'Citylife 核查',
    sourceUrl: 'https://www.chiangmaicitylife.com/citynow/whats-on/food-and-drink/wine-pairing-dinner-at-aleenta-retreat-chiang-mai/',
    hostName: 'Aleenta Retreat Chiang Mai',
    language: '英语 / 泰语',
    suitableFor: ['晚餐', '葡萄酒', '约会', '需预约'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-21T09:56:00+07:00',
    nextCheckBefore: '2026-05-22T12:00:00+07:00',
    reliabilityNote: 'Citylife 核到 20 个座位、价格和预约方式；高价小座位活动，发布当天应提醒用户先订位。',
    tags: ['晚餐', '葡萄酒', '现场音乐', '需预约', '本周五'],
    summary: '一场 20 个座位的小型葡萄酒配餐晚餐，适合想认真吃一顿、听现场音乐、预算更充足的人。',
  },
  {
    id: 'soul-soak-sense-dhara-dhevi-friday',
    title: 'SOUL SOAK 周五热疗与声音疗愈',
    type: 'wellness',
    recurrence: {
      weekdays: [5],
      startTime: '11:00',
      endTime: '22:00',
      label: '每周五 11:00-22:00',
    },
    stableSchedule: '每周五 11:00-22:00，2026-08-31 前',
    venueName: 'Sense Dhara Dhevi Wellness Club',
    area: 'Dhara Dhevi / Tha Sala',
    priceLabel: '฿600',
    registrationLabel: '直接去 / 先看场地方',
    sourceType: 'venue',
    sourceLabel: 'Citylife 核查',
    sourceUrl: 'https://www.chiangmaicitylife.com/citynow/whats-on/live-music/soul-soak-is-coming-back-every-friday-at-sense-dhara-dhevi-wellness-club/',
    hostName: 'Sense Dhara Dhevi Chiang Mai',
    language: '泰语 / 英语',
    suitableFor: ['周五放松', '身心灵', '热疗', '声音疗愈'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'stable-recurring',
    lastCheckedAt: '2026-05-21T09:56:00+07:00',
    nextCheckBefore: '2026-05-22T10:00:00+07:00',
    reliabilityNote: 'Citylife 核到每周五持续到 8 月底；包含热疗、sound healing、DJ 和 Yam Khang 演示，具体环节以场地方当天安排为准。',
    tags: ['身心灵', '周五', '热疗', '音乐', '放松'],
    summary: '一个偏放松和疗愈的周五去处，把热疗、声音疗愈、DJ 和兰纳火足按摩演示放在同一个晚间体验里。',
  },
  {
    id: 'do-place-opening-2026-05-22',
    title: 'Do Place 开幕夜',
    type: 'meetup',
    startAt: '2026-05-22T16:00:00+07:00',
    endAt: '2026-05-22T23:00:00+07:00',
    venueName: 'Do Place at The Goodcery',
    area: 'The Goodcery',
    priceLabel: '免费',
    registrationLabel: '直接去',
    sourceType: 'venue',
    sourceLabel: 'Time Out 本周末专题',
    sourceUrl: 'https://www.timeout.com/chiang-mai/things-to-do/weekly-event',
    hostName: 'Do Place / Tempo.wav',
    language: '英语 / 泰语',
    suitableFor: ['创意空间', '音乐', '开幕', '认识人'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-21T09:56:00+07:00',
    nextCheckBefore: '2026-05-22T12:00:00+07:00',
    reliabilityNote: 'Time Out 核到 5 月 22 日 16:00 开幕；具体演出顺序和结束时间以场地方当晚动态为准。',
    tags: ['开幕', '音乐', '创意空间', '免费', '本周五'],
    summary: '一个新创意空间的开幕夜，有 pop-up radio、DJ、艺术、食物和小型放映，适合想看看清迈新场景的人。',
  },
  {
    id: 'bboy-jammy-james-breaking-class-2026-05-23',
    title: 'Bboy Jammy James 入门 Breaking 课',
    type: 'sport',
    startAt: '2026-05-23T17:00:00+07:00',
    endAt: '2026-05-23T18:00:00+07:00',
    venueName: 'Chontana Mall',
    area: 'Chang Phueak',
    priceLabel: '免费',
    registrationLabel: '扫码报名',
    sourceType: 'venue',
    sourceLabel: 'Time Out 本周末专题',
    sourceUrl: 'https://www.timeout.com/chiang-mai/things-to-do/learn-the-breaking-basics-with-bboy-jammy-james',
    hostName: 'Breaking Chiang Mai',
    language: '英语 / 泰语',
    suitableFor: ['零基础', '运动', '舞蹈', '周六下午'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-21T09:56:00+07:00',
    nextCheckBefore: '2026-05-23T12:00:00+07:00',
    reliabilityNote: 'Time Out 核到免费、地点和 17:00-18:00；名额可能有限，建议提前通过来源页报名。',
    tags: ['运动', '舞蹈', '免费', '零基础', '本周六'],
    summary: '一小时的零基础 breaking 入门课，低门槛、免费，适合周六想动一动又不想报长期课的人。',
  },
  {
    id: 'northern-scooter-show-2026',
    title: 'Northern Scooter Show 2026',
    type: 'festival',
    startAt: '2026-05-23T12:00:00+07:00',
    endAt: '2026-05-24T21:00:00+07:00',
    stableSchedule: '2026-05-23 至 05-24 12:00-21:00',
    venueName: 'Chiangmai Hall, Central Chiangmai Airport',
    area: 'Central Chiangmai Airport',
    mapLocation: { latitude: 18.7695, longitude: 98.9758, category: '彩蛋' },
    priceLabel: '฿100',
    registrationLabel: '现场购票',
    sourceType: 'venue',
    sourceLabel: 'Citylife / Time Out 核查',
    sourceUrl: 'https://www.chiangmaicitylife.com/citynow/whats-on/clubs-and-societies/northern-scooter-show-2026-2/',
    hostName: 'Go To Scooter BKK / Northern Scooter CNX',
    language: '泰语 / 英语',
    suitableFor: ['周末', '机车', '展会', 'Central Airport'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-21T09:56:00+07:00',
    nextCheckBefore: '2026-05-23T10:00:00+07:00',
    reliabilityNote: 'Citylife 核到 5 月 23-24 日、地点、票价和主要内容；Time Out 补充 12:00-21:00 开放时间。',
    tags: ['周末', '展会', '机车', 'Central Airport', '本周末'],
    summary: '北部大型小轮径 scooter 展，有 500 多台稀有车、配件摊位、DJ/乐队和 Dyno Test Racing，适合机车爱好者或周末想看热闹的人。',
  },
  {
    id: 'som-tum-rave-828-alleyway-2026-05-23',
    title: '828 Alleyway Som Tum Rave',
    type: 'music',
    startAt: '2026-05-23T19:00:00+07:00',
    endAt: '2026-05-23T23:59:00+07:00',
    venueName: '828.Alleyway',
    area: 'Tha Phae / Chang Klan',
    priceLabel: '฿499',
    registrationLabel: '直接去 / 看场地方',
    sourceType: 'venue',
    sourceLabel: 'Time Out 本周末专题',
    sourceUrl: 'https://www.timeout.com/chiang-mai/things-to-do/turn-up-the-heat-at-828-alleyways-som-tum-rave',
    hostName: '828.Alleyway',
    language: '泰语 / 英语',
    suitableFor: ['夜生活', '音乐', '泰东北菜', '周六晚上'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-21T09:56:00+07:00',
    nextCheckBefore: '2026-05-23T15:00:00+07:00',
    reliabilityNote: 'Time Out 核到价格、地点和 19:00 开始；结束时间未公开，按夜间活动展示到当天午夜。',
    tags: ['音乐', '夜生活', '吃饭', '周六晚上', '本周末'],
    summary: '把 som tum、糯米饭、泰东北菜和 DJ 派对放在一起的周六夜活动，适合想吃点辣的再跳舞的人。',
  },
  {
    id: 'tipsy-thai-trivia-look-inside-2026-05-23',
    title: 'Tipsy Thai Trivia 泰语知识问答夜',
    type: 'meetup',
    startAt: '2026-05-23T21:00:00+07:00',
    endAt: '2026-05-23T23:00:00+07:00',
    venueName: 'Look Inside CNX',
    area: 'Chiang Mai',
    priceLabel: '฿67',
    registrationLabel: '直接去',
    sourceType: 'venue',
    sourceLabel: 'Time Out 本周末专题',
    sourceUrl: 'https://www.timeout.com/chiang-mai/things-to-do/weekly-event',
    hostName: 'Look Inside CNX',
    language: '英语 / 泰语',
    suitableFor: ['社交', '泰语学习', '酒吧', '周六晚上'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-21T09:56:00+07:00',
    nextCheckBefore: '2026-05-23T16:00:00+07:00',
    reliabilityNote: 'Time Out 核到 21:00、价格和包含饮品；适合当作线索源，出发前建议看场地方是否仍有座位。',
    tags: ['社交', '泰语', '酒吧', '周六晚上', '本周末'],
    summary: '面向初学者也能玩的泰语知识问答夜，门票含一杯饮品，适合想轻松认识人和练一点泰语的人。',
  },
  {
    id: 'chiang-mai-music-journey-9-2026-05-24',
    title: 'Chiang Mai Music Journey 9',
    type: 'music',
    startAt: '2026-05-24T15:30:00+07:00',
    endAt: '2026-05-24T23:59:00+07:00',
    venueName: 'Chiang Mai PAO Public Park',
    area: 'Chang Phueak / PAO Park',
    mapLocation: { latitude: 18.8232, longitude: 98.9737, category: '彩蛋' },
    priceLabel: '免费',
    registrationLabel: '需提前登记',
    sourceType: 'official',
    sourceLabel: 'Time Out 本周末专题',
    sourceUrl: 'https://www.timeout.com/chiang-mai/things-to-do/catch-your-favourite-thai-artists-at-the-free-chiang-mai-music-journey-9-festival',
    hostName: 'Chiang Mai Municipality',
    language: '泰语',
    suitableFor: ['演唱会', '免费', '泰国流行音乐', '周日晚上'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-21T09:56:00+07:00',
    nextCheckBefore: '2026-05-24T12:00:00+07:00',
    reliabilityNote: 'Time Out 核到免费、需登记、15:30 到午夜；大型免费音乐节可能满员，建议提醒用户先登记。',
    tags: ['音乐', '免费', '周日晚上', '需登记', '本周末'],
    summary: '一场免费的泰国流行音乐节，阵容包含 Bodyslam、Ink Waruntorn、Nont Tanont、Pixxie 等，适合想赶周日晚间城市大活动的人。',
  },
  {
    id: 'thailand-inventors-day-road-show-2026-05-24',
    title: 'Thailand Inventors’ Day Road Show 2026 清迈站',
    type: 'tech',
    startAt: '2026-05-24T09:00:00+07:00',
    endAt: '2026-05-25T18:00:00+07:00',
    stableSchedule: '2026-05-24 至 05-25，具体每日时段以报名页/主办方通知为准',
    venueName: 'Chiang Mai Grandview Hotel',
    area: 'Chang Phueak / Chiang Mai-Lampang Road',
    mapLocation: { latitude: 18.804857, longitude: 98.97007, category: '彩蛋' },
    priceLabel: '免费报名',
    registrationLabel: 'Google 表单报名',
    sourceType: 'government',
    sourceLabel: 'NRCT 宣传图 / 报名表',
    sourceUrl: 'https://forms.gle/hVNecNBySYHAdA1K6',
    hostName: 'National Research Council of Thailand (NRCT)',
    language: '泰语 / 中文资料',
    suitableFor: ['研究者', '教育工作者', '创业者', '社区项目', '创新观察'],
    isCmiRelated: false,
    isVerified: true,
    verificationStatus: 'verified',
    lastCheckedAt: '2026-05-21T10:23:00+07:00',
    nextCheckBefore: '2026-05-24T09:00:00+07:00',
    reliabilityNote: '用户提供活动文案和 NRCT 宣传图，确认日期、地点、主办方和报名表；公开材料未给出每日具体开放小时，出发前需以报名页或主办方通知为准。',
    tags: ['科技', '展览', '创新', '研究', '教育', '农业科技', 'PM2.5', '周末', '本周末', '具体时段待确认'],
    summary: 'NRCT 在清迈举办的泰国发明家日巡回展，集中展示本土研究、北部地方创新和实际应用，覆盖智慧农业、健康、能源、社区文化遗产和空气污染等主题。',
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
    if (event.stableSchedule && event.tags.includes('具体时段待确认')) {
      return event.stableSchedule;
    }

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

export const getTomorrowCmiEventsFromList = (
  events: CmiEvent[],
  referenceDate: Date = new Date()
) => {
  const tomorrowStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + 1).getTime();
  const tomorrowEnd = tomorrowStart + DAY_IN_MS;

  return getUpcomingCmiEventsFromList(events, referenceDate).filter(event => {
    const startTime = getCmiEventSortTime(event, referenceDate);
    return startTime >= tomorrowStart && startTime < tomorrowEnd;
  });
};
