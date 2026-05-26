export type BlackboardPostCategory = 'companion' | 'help' | 'share';
export type BlackboardPostFilter = 'all' | 'featured' | BlackboardPostCategory;

export interface BlackboardCategoryOption {
  id: BlackboardPostCategory;
  label: string;
  description: string;
}

export interface BlackboardFeedFilterOption {
  id: BlackboardPostFilter;
  label: string;
}

export interface BlackboardFeedSortablePost {
  isFeatured: boolean;
  createdAt: string;
}

export interface BlackboardActivityStats {
  postCount: number;
  commentCount: number;
}

export interface BlackboardActivityTitleLevel {
  level: number;
  minScore: number;
  title: string;
}

export const BLACKBOARD_ACTIVITY_TITLE_LEVELS: BlackboardActivityTitleLevel[] = [
  { level: 1, minScore: 0, title: '刚落地' },
  { level: 2, minScore: 1, title: '冒泡中' },
  { level: 3, minScore: 4, title: '旅行者' },
  { level: 4, minScore: 8, title: '萨瓦迪卡' },
  { level: 5, minScore: 15, title: '老熟人' },
  { level: 6, minScore: 25, title: '“Grab”' },
  { level: 7, minScore: 40, title: '清迈土著' },
  { level: 8, minScore: 65, title: '泰北接头人' },
  { level: 9, minScore: 100, title: '清迈广播站' },
  { level: 10, minScore: 150, title: 'CMI 活地图' },
];

export const getBlackboardActivityScore = ({ postCount, commentCount }: BlackboardActivityStats) =>
  Math.max(0, postCount) * 3 + Math.max(0, commentCount);

export const getBlackboardActivityTitle = (stats: BlackboardActivityStats) => {
  const activityScore = getBlackboardActivityScore(stats);
  const matchedLevel = BLACKBOARD_ACTIVITY_TITLE_LEVELS.reduce(
    (currentLevel, candidateLevel) =>
      activityScore >= candidateLevel.minScore ? candidateLevel : currentLevel,
    BLACKBOARD_ACTIVITY_TITLE_LEVELS[0]
  );

  return {
    ...matchedLevel,
    activityScore,
  };
};

export const BLACKBOARD_CATEGORY_OPTIONS: BlackboardCategoryOption[] = [
  {
    id: 'companion',
    label: '找搭子',
    description: '约人一起去、一起逛、一起参加',
  },
  {
    id: 'help',
    label: '求助',
    description: '问问题、找帮助、确认信息',
  },
  {
    id: 'share',
    label: '分享',
    description: '随手 po 想聊的清迈生活现场',
  },
];

export const BLACKBOARD_CATEGORY_LABELS: Record<BlackboardPostCategory, string> = {
  companion: '找搭子',
  help: '求助',
  share: '分享',
};

export const getPublishableBlackboardCategories = (): BlackboardPostCategory[] =>
  BLACKBOARD_CATEGORY_OPTIONS.map(option => option.id);

export const getBlackboardFeedFilters = (): BlackboardFeedFilterOption[] => [
  { id: 'all', label: '全部' },
  { id: 'featured', label: '精选' },
  ...BLACKBOARD_CATEGORY_OPTIONS.map(({ id, label }) => ({ id, label })),
];

export const coerceBlackboardCategory = (category: string | null | undefined): BlackboardPostCategory => {
  if (category === 'companion' || category === 'help' || category === 'share') return category;
  return 'share';
};

const getPostSortTime = (value: string) => {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const sortBlackboardFeedPosts = <Post extends BlackboardFeedSortablePost>(posts: Post[]): Post[] =>
  [...posts].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return getPostSortTime(b.createdAt) - getPostSortTime(a.createdAt);
  });

const formatBangkokDateKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

export function getBlackboardDateGroupLabel(value: string, referenceDate = new Date()): string {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return '最近';

  const createdKey = formatBangkokDateKey(createdAt);
  const todayKey = formatBangkokDateKey(referenceDate);
  if (createdKey === todayKey) return '今天';

  const yesterdayKey = formatBangkokDateKey(addDays(referenceDate, -1));
  if (createdKey === yesterdayKey) return '昨天';

  const beforeYesterdayKey = formatBangkokDateKey(addDays(referenceDate, -2));
  if (createdKey === beforeYesterdayKey) return '前天';

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    timeZone: 'Asia/Bangkok',
  }).format(createdAt);
}

export function formatBlackboardCreatedLabel(value: string, referenceDate = new Date()): string {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return '刚刚';

  const diffMs = referenceDate.getTime() - createdAt.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;

  return getBlackboardDateGroupLabel(value, referenceDate);
}
