export type CmiEventDetailBlock =
  | {
      kind: 'paragraph';
      text: string;
    }
  | {
      kind: 'heading';
      text: string;
    }
  | {
      kind: 'list';
      items: string[];
    };

export interface CmiEventDetailContent {
  eventId: string;
  posterUrl: string;
  postTitle: string;
  postBlocks: CmiEventDetailBlock[];
}

export const CMI_INN_EVENT_LOCATION = {
  name: '清迈客栈',
  clipboardName: '清迈客栈 Chiang Mai Inn',
  latitude: 18.7932,
  longitude: 98.9874,
};

export const CMI_EVENT_POSTER_BY_ID: Partial<Record<string, string>> = {
  'cmi-mindfulness-hour-2026-05-21': '/cmi-home/event-posters/cmi-mindfulness-hour-2026-05-21.jpg',
  'cmi-friday-afternoon-yoga-2026-05-22': '/cmi-home/event-posters/cmi-friday-yoga-2026-05-22.jpg',
  'cmi-kongxiang-canteen-2026-05-22': '/cmi-home/event-posters/cmi-kongxiang-canteen-2026-05-22.jpg',
  'cmi-song-of-the-sea-screening-2026-05-23': '/cmi-home/event-posters/cmi-song-of-the-sea-screening-2026-05-23.jpg',
  'cmi-swap-market-2026-05-24': '/cmi-home/event-posters/cmi-swap-market-2026-05-24.jpg',
  'cmi-ai-open-mic-vol-04-2026-05-24': '/cmi-home/event-posters/cmi-ai-open-mic-vol-04-2026-05-24.jpg',
};

export const CMI_EVENT_CARD_BACKGROUND_BY_ID: Partial<Record<string, string>> = {
  'cmi-mindfulness-hour-2026-05-21': '/cmi-home/event-card-backgrounds/cmi-mindfulness-hour-2026-05-21.jpg',
  'cmi-friday-afternoon-yoga-2026-05-22': '/cmi-home/event-card-backgrounds/cmi-friday-yoga-2026-05-22.jpg',
  'cmi-kongxiang-canteen-2026-05-22': '/cmi-home/event-card-backgrounds/cmi-kongxiang-canteen-2026-05-22.jpg',
  'cmi-song-of-the-sea-screening-2026-05-23': '/cmi-home/event-card-backgrounds/cmi-song-of-the-sea-screening-2026-05-23.jpg',
  'cmi-swap-market-2026-05-24': '/cmi-home/event-card-backgrounds/cmi-swap-market-2026-05-24.jpg',
  'cmi-ai-open-mic-vol-04-2026-05-24':
    '/cmi-home/event-card-backgrounds/cmi-ai-open-mic-vol-04-2026-05-24.jpg',
};

export const CMI_EVENT_DETAIL_CONTENT_BY_ID: Record<string, CmiEventDetailContent> = {
  'cmi-mindfulness-hour-2026-05-21': {
    eventId: 'cmi-mindfulness-hour-2026-05-21',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-mindfulness-hour-2026-05-21']!,
    postTitle: '正念一小时｜清迈客栈 CMI 社区',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '这周四，我们把一小时留给“如何自洽”。',
      },
      {
        kind: 'paragraph',
        text: '不和自己较劲，也不急着把所有问题想明白，只是先坐下来，回到呼吸、身体和当下。',
      },
      {
        kind: 'paragraph',
        text: '我们会通过静坐冥想、智慧引领与开放分享，一起练习在现实生活里更温和地看见自己。',
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：5 月 21 日（周四）19:00-20:30',
          '活动地点：清迈客栈',
          '活动形式：静坐冥想｜智慧引领｜开放分享',
          '场地费用：免费参与',
          '参与方式：无需报名，直接空降即可',
        ],
      },
    ],
  },
  'cmi-friday-afternoon-yoga-2026-05-22': {
    eventId: 'cmi-friday-afternoon-yoga-2026-05-22',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-friday-afternoon-yoga-2026-05-22']!,
    postTitle: '清迈夏季养心｜心经阴瑜伽 · 肩颈舒缓课',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '在中医养生理论中，夏季属于“养心的季节”。这节课会把经络理疗和阴瑜伽结合起来，让肩颈、上背和胸腔慢慢松开。',
      },
      {
        kind: 'paragraph',
        text: '如果你最近久坐、肩颈紧张、睡眠偏浅，或者只是想在周五傍晚给身体一点安静的修复，这节课会比较适合。',
      },
      {
        kind: 'heading',
        text: '课程练习内容',
      },
      {
        kind: 'list',
        items: [
          '肩颈与上背部放松',
          '手臂心经与小肠经拉伸',
          '心包经与三焦经舒展',
          '开肩开胸体式',
          '呼吸调息与放松冥想',
        ],
      },
      {
        kind: 'heading',
        text: '课程信息',
      },
      {
        kind: 'list',
        items: [
          '带领老师：沙溪 Karen / Yoga in the Park Chiang Mai 主理人 / 经络理疗瑜伽导师',
          '时间：5 月 22 日（周五）17:00-18:15',
          '地点：清迈客栈',
          '场地费：350 THB',
          '参与方式：查看公众号原文或联系清迈客栈确认',
        ],
      },
    ],
  },
  'cmi-kongxiang-canteen-2026-05-22': {
    eventId: 'cmi-kongxiang-canteen-2026-05-22',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-kongxiang-canteen-2026-05-22']!,
    postTitle: '来清迈客栈，对美食 520！',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '昨天是 520，那今天就继续把爱留给食物、餐桌和身边的人。',
      },
      {
        kind: 'paragraph',
        text: '清迈客栈每周五都有空想食堂。大家带一道菜来，一起吃饭、聊天、包饺子，也把这一周的故事放到桌上。',
      },
      {
        kind: 'paragraph',
        text: '不需要很正式，也不需要很会做饭。你可以带一道自己喜欢的菜，也可以带一点想分享的味道。',
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：5 月 22 日（周五）19:00',
          '活动地点：清迈客栈',
          '场地费用：请带一道菜来和大家分享',
          '参与方式：直接空降即可；海报附有加群二维码',
        ],
      },
    ],
  },
  'cmi-song-of-the-sea-screening-2026-05-23': {
    eventId: 'cmi-song-of-the-sea-screening-2026-05-23',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-song-of-the-sea-screening-2026-05-23']!,
    postTitle: '清迈客栈周六观影会：《海洋之歌》',
    postBlocks: [
      {
        kind: 'paragraph',
        text: 'MagicLab × 清迈客栈，这周六晚一起看《海洋之歌》。',
      },
      {
        kind: 'paragraph',
        text: '这是一部奥斯卡最佳动画长片提名作品，画面很美，也很适合在周六晚上和大家一起安静看完。',
      },
      {
        kind: 'paragraph',
        text: '如果你这周想找一个不用用力社交、但能和社区发生连接的晚上，可以直接来。',
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：5 月 23 日（周六）19:30',
          '活动地点：清迈客栈',
          '活动主办：MagicLab × 清迈客栈',
          '场地费用：免费参与',
          '参与方式：无需报名，直接空降即可',
        ],
      },
    ],
  },
  'cmi-swap-market-2026-05-24': {
    eventId: 'cmi-swap-market-2026-05-24',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-swap-market-2026-05-24']!,
    postTitle: '旧物交换市集',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '旧物、技能、才艺、音乐、画像，甚至一次帮助，只要你愿意拿出来，都可以成为交换的开始。',
      },
      {
        kind: 'paragraph',
        text: '这不是只能带旧东西来的跳蚤市场，更像一个把自己手上有的东西和能力拿出来，顺手认识人的周日下午。',
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：5 月 24 日（周日）14:00-17:00',
          '活动地点：清迈客栈',
          '活动形式：旧物、技能、才艺、音乐、画像与互助交换',
          '场地费用：免费参与',
          '参与方式：海报附二维码，可扫码进群了解',
        ],
      },
    ],
  },
  'cmi-ai-open-mic-vol-04-2026-05-24': {
    eventId: 'cmi-ai-open-mic-vol-04-2026-05-24',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-ai-open-mic-vol-04-2026-05-24']!,
    postTitle: 'AI 开放麦第四期｜本周 AI 使用现场交流',
    postBlocks: [
      {
        kind: 'paragraph',
        text: 'AI 工具每天都在变化，真正有价值的经验，往往来自具体使用现场。',
      },
      {
        kind: 'paragraph',
        text: '这期 AI 开放麦继续围绕过去一周的 AI 使用展开交流：工具、案例、项目、问题和踩坑都可以拿出来聊。',
      },
      {
        kind: 'paragraph',
        text: '不用准备完整演讲，有一个观察、一个尝试、一个踩坑，或者一个正在推进中的想法，都可以现场分享。',
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：5 月 24 日（周日）19:00',
          '活动地点：清迈客栈',
          '活动主题：本周 AI 使用 / 工具 / 项目 / 案例 / 踩坑 / 问题',
          '场地费用：免费参与',
          '参与方式：无需报名，直接空降即可',
        ],
      },
    ],
  },
};

export const getCmiEventPosterUrl = (eventId: string | null | undefined) =>
  eventId ? CMI_EVENT_POSTER_BY_ID[eventId] : undefined;

export const getCmiEventCardBackgroundUrl = (eventId: string | null | undefined) =>
  eventId ? CMI_EVENT_CARD_BACKGROUND_BY_ID[eventId] : undefined;

export const getCmiEventDetailContent = (eventId: string | null | undefined) =>
  eventId ? CMI_EVENT_DETAIL_CONTENT_BY_ID[eventId] ?? null : null;
