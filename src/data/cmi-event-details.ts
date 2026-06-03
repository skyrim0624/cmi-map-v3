import { CMI_MAP_EVENT_REGISTRATION_DETAIL_LINE } from './cmi-events';

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
  'cmi-mindfulness-hour-2026-05-28': '/cmi-home/event-posters/cmi-mindfulness-hour-2026-05-28.png',
  'cmi-financial-literacy-sharing-2026-05-29':
    '/cmi-home/event-posters/cmi-financial-literacy-sharing-2026-05-29.png',
  'cmi-tiandi-xuanhuang-baraka-2026-05-30':
    'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-tiandi-xuanhuang-baraka-2026-05-30.png',
  'cmi-waytoagi-codex-maker-lab-2026-05-31':
    '/cmi-home/event-posters/cmi-waytoagi-codex-maker-lab-2026-05-31.png',
  'cmi-five-minute-music-kid-a-2026-06-02':
    '/cmi-home/event-posters/cmi-five-minute-music-kid-a-2026-06-02.png?v=20260601-mobile-share',
  'cmi-curiosity-old-city-temples-2026-06-03':
    '/cmi-home/event-posters/cmi-curiosity-old-city-temples-2026-06-03.jpg',
  'cmi-blood-on-the-clocktower-newbie-game-2026-06-04':
    '/cmi-home/event-posters/cmi-blood-on-the-clocktower-newbie-game-2026-06-04.png',
  'cmi-mindfulness-hour-singing-bowl-2026-06-04':
    '/cmi-home/event-posters/cmi-mindfulness-hour-singing-bowl-2026-06-04.jpg',
  'cmi-ai-open-mic-vol-05-2026-06-05':
    '/cmi-home/event-posters/cmi-ai-open-mic-vol-05-2026-06-05.png',
  'cmi-kongxiang-canteen-hotpot-2026-06-05':
    '/cmi-home/event-posters/cmi-kongxiang-canteen-hotpot-2026-06-05.png',
  'cmi-secondhand-auction-2026-06-06':
    '/cmi-home/event-posters/cmi-secondhand-auction-2026-06-06.png',
  'cmi-my-octopus-teacher-screening-2026-06-06':
    '/cmi-home/event-posters/cmi-my-octopus-teacher-screening-2026-06-06.png',
  'cmi-talk-fathers-day-speaker-call-2026-06-07':
    '/cmi-home/event-posters/cmi-talk-fathers-day-speaker-call-2026-06-07.png',
};

export const CMI_EVENT_CARD_BACKGROUND_BY_ID: Partial<Record<string, string>> = {
  'cmi-mindfulness-hour-2026-05-21': '/cmi-home/event-card-backgrounds/cmi-mindfulness-hour-2026-05-21.jpg',
  'cmi-friday-afternoon-yoga-2026-05-22': '/cmi-home/event-card-backgrounds/cmi-friday-yoga-2026-05-22.jpg',
  'cmi-kongxiang-canteen-2026-05-22': '/cmi-home/event-card-backgrounds/cmi-kongxiang-canteen-2026-05-22.jpg',
  'cmi-song-of-the-sea-screening-2026-05-23': '/cmi-home/event-card-backgrounds/cmi-song-of-the-sea-screening-2026-05-23.jpg',
  'cmi-swap-market-2026-05-24': '/cmi-home/event-card-backgrounds/cmi-swap-market-2026-05-24.jpg',
  'cmi-ai-open-mic-vol-04-2026-05-24':
    '/cmi-home/event-card-backgrounds/cmi-ai-open-mic-vol-04-2026-05-24.jpg',
  'cmi-mindfulness-hour-2026-05-28':
    '/cmi-home/event-card-backgrounds/cmi-mindfulness-hour-2026-05-28.jpg',
  'cmi-financial-literacy-sharing-2026-05-29':
    '/cmi-home/event-card-backgrounds/cmi-financial-literacy-sharing-2026-05-29.jpg',
  'cmi-tiandi-xuanhuang-baraka-2026-05-30':
    '/cmi-home/event-card-backgrounds/cmi-tiandi-xuanhuang-baraka-2026-05-30.jpg',
  'cmi-waytoagi-codex-maker-lab-2026-05-31':
    '/cmi-home/event-card-backgrounds/cmi-waytoagi-codex-maker-lab-2026-05-31.jpg',
  'cmi-five-minute-music-kid-a-2026-06-02':
    '/cmi-home/event-card-backgrounds/cmi-five-minute-music-kid-a-2026-06-02.jpg',
  'cmi-curiosity-old-city-temples-2026-06-03':
    '/cmi-home/event-card-backgrounds/cmi-curiosity-old-city-temples-2026-06-03.jpg',
  'cmi-blood-on-the-clocktower-newbie-game-2026-06-04':
    '/cmi-home/event-card-backgrounds/cmi-blood-on-the-clocktower-newbie-game-2026-06-04.jpg',
  'cmi-mindfulness-hour-singing-bowl-2026-06-04':
    '/cmi-home/event-card-backgrounds/cmi-mindfulness-hour-singing-bowl-2026-06-04.jpg',
  'cmi-ai-open-mic-vol-05-2026-06-05':
    '/cmi-home/event-card-backgrounds/cmi-ai-open-mic-vol-05-2026-06-05.jpg',
  'cmi-kongxiang-canteen-hotpot-2026-06-05':
    '/cmi-home/event-card-backgrounds/cmi-kongxiang-canteen-hotpot-2026-06-05.jpg',
  'cmi-secondhand-auction-2026-06-06':
    '/cmi-home/event-card-backgrounds/cmi-secondhand-auction-2026-06-06.jpg',
  'cmi-my-octopus-teacher-screening-2026-06-06':
    '/cmi-home/event-card-backgrounds/cmi-my-octopus-teacher-screening-2026-06-06.jpg',
  'cmi-talk-fathers-day-speaker-call-2026-06-07':
    '/cmi-home/event-card-backgrounds/cmi-talk-fathers-day-speaker-call-2026-06-07.jpg',
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
  'cmi-mindfulness-hour-2026-05-28': {
    eventId: 'cmi-mindfulness-hour-2026-05-28',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-mindfulness-hour-2026-05-28']!,
    postTitle: '正念一小时｜一切都是最好的安排',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '这周四的正念一小时，把主题放在“变化”与“稳定感”上。',
      },
      {
        kind: 'paragraph',
        text: '当生活安排被打乱、变化突然出现，焦虑很容易先跑出来。这一小时会通过静坐冥想、智慧引领和开放分享，练习在无常里重新回到当下。',
      },
      {
        kind: 'heading',
        text: '本期会聊什么',
      },
      {
        kind: 'list',
        items: [
          '为什么一变化，我们就会焦虑',
          '无常来了，如何让心不慌',
          '面对变化，如何找回内在的稳定感',
        ],
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：5 月 28 日（周四）19:00-20:30',
          '活动地点：清迈客栈',
          '活动形式：静坐冥想｜智慧引领｜开放分享',
          '场地费用：免费参与',
          '参与方式：通过 CMI Map 一键报名',
        ],
      },
    ],
  },
  'cmi-financial-literacy-sharing-2026-05-29': {
    eventId: 'cmi-financial-literacy-sharing-2026-05-29',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-financial-literacy-sharing-2026-05-29']!,
    postTitle: '穷姐姐财商分享大会｜在清迈可以“摆烂”，但钱包不能真的烂',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '在清迈生活可以慢下来，但收入、汇率、保险、基金、股票、黄金和银行理财这些问题不会自动消失。',
      },
      {
        kind: 'paragraph',
        text: '这次分享会不卖课、不推产品，也不制造财务焦虑，只把真实踩过的坑、用过的工具和见过的套路放到桌面上聊清楚。',
      },
      {
        kind: 'heading',
        text: '本次会聊什么',
      },
      {
        kind: 'list',
        items: [
          '理财工具红黑榜：保险、基金、股票、银行理财、黄金等常见工具',
          '富人怎么搞钱：信息差、规则意识和游戏规则',
          '世界这么乱，跟普通人的钱包有什么关系',
          '小钱如何建立基本安全垫',
          '不上班之后，如何让自己更值钱',
          '常见骗局、理财陷阱和看起来很美的赚钱机会',
        ],
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '分享嘉宾：Pink，前全女空间创始人，随性派财迷',
          '活动时间：5 月 29 日（周五）19:00，空想食堂后',
          '活动地点：清迈客栈',
          '场地费用：免费参与，可随喜支持',
          CMI_MAP_EVENT_REGISTRATION_DETAIL_LINE,
        ],
      },
    ],
  },
  'cmi-tiandi-xuanhuang-baraka-2026-05-30': {
    eventId: 'cmi-tiandi-xuanhuang-baraka-2026-05-30',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-tiandi-xuanhuang-baraka-2026-05-30']!,
    postTitle: '《天地玄黄》Baraka 放映夜',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '这次不是热闹的派对，而是一起慢下来看一小时无对白纪录片的力量。我们不需要很多解释，只把注意力放在画面里的呼吸和关系上。',
      },
      {
        kind: 'paragraph',
        text: '《天地玄黄》适合想在周末晚点放下手机、重新看见自己和身边人的人一起。',
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：5 月 30 日（周六）19:00',
          '活动地点：清迈客栈',
          '活动形式：观影放映',
          '场地费用：免费参与',
          '参与方式：扫码进群，或现场空降',
        ],
      },
    ],
  },
  'cmi-waytoagi-codex-maker-lab-2026-05-31': {
    eventId: 'cmi-waytoagi-codex-maker-lab-2026-05-31',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-waytoagi-codex-maker-lab-2026-05-31']!,
    postTitle: '「AI切磋大会」清迈站：Codex 轻造物局',
    postBlocks: [
      {
        kind: 'paragraph',
        text: 'WaytoAGI 第24期「AI切磋大会」来到清迈，清迈客栈会作为线下站点，一起加入这场全国多城市联动的 Codex 轻造物局。',
      },
      {
        kind: 'paragraph',
        text: '这次不是只聊 AI，而是带上电脑和一个小想法，在现场用 Codex 写代码、调试、搭功能，做出一个能演示的小作品。',
      },
      {
        kind: 'heading',
        text: '现场怎么玩',
      },
      {
        kind: 'list',
        items: [
          '90 分钟自由造物：独立完成或 1-3 人自由组队，用 Codex 做小工具、小游戏、效率脚本或脑洞产品',
          '造物集市：每人或每组把作品摆出来，大家自由参观、体验和投票',
          '互助冲刺：每个人至少帮一位陌生人解决一个问题，可以 debug、给想法、提建议或给反馈',
          '现场奖项：最好玩奖、最实用奖、最脑洞奖、最佳助攻奖',
        ],
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动主题：WaytoAGI 第24期「AI切磋大会」Codex 轻造物局 · 清迈站',
          '活动时间：2026 年 5 月 31 日（周日）12:30-17:00（清迈时间）',
          '活动地点：清迈客栈',
          '活动形式：全国多城市联动 · 清迈线下动手 · 全国连线开场',
          CMI_MAP_EVENT_REGISTRATION_DETAIL_LINE,
        ],
      },
    ],
  },
  'cmi-five-minute-music-kid-a-2026-06-02': {
    eventId: 'cmi-five-minute-music-kid-a-2026-06-02',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-five-minute-music-kid-a-2026-06-02']!,
    postTitle: '🎧 “五分钟”音乐会：一起听 Radiohead 的《Kid A》',
    postBlocks: [
      {
        kind: 'heading',
        text: '❓先问一个问题',
      },
      {
        kind: 'paragraph',
        text: '你有多久没有认真听完一首歌了？',
      },
      {
        kind: 'paragraph',
        text: '不是跑步的时候放着，不是工作的时候垫着，也不是前奏响起 10 秒后觉得“不太对味”就立刻切走。',
      },
      {
        kind: 'paragraph',
        text: '而是真的坐下来，把一首歌从头听到尾。',
      },
      {
        kind: 'heading',
        text: '🌊 音乐太多之后',
      },
      {
        kind: 'paragraph',
        text: '现在听音乐太方便了。打开手机，搜索一下，就有无数首歌躺在那里。喜欢就循环，不喜欢就划走。没关系，下一首马上就来，算法已经准备好了。',
      },
      {
        kind: 'paragraph',
        text: '但这也带来一个问题：当音乐随时都可以被拥有，它好像也就不重要了。',
      },
      {
        kind: 'heading',
        text: '📻 为什么想做这件事',
      },
      {
        kind: 'paragraph',
        text: '我最近跑步时听到一期播客。主持人和嘉宾在聊他们年轻时反复听过的专辑。那种感觉很有意思，不是简单说“这首歌好听”，而是他们真的和那些音乐待了很久，反复听，反复想，像在“把玩”一件作品。',
      },
      {
        kind: 'paragraph',
        text: '我就在想，我们是不是已经很久没有这样听音乐了。',
      },
      {
        kind: 'heading',
        text: '⏱️ “五分钟”怎么玩',
      },
      {
        kind: 'paragraph',
        text: '所以我想发起一个很小的活动，叫“五分钟”。',
      },
      {
        kind: 'paragraph',
        text: '5 分钟，差不多就是一首歌的长度。',
      },
      {
        kind: 'paragraph',
        text: '所以这一次，我们先不切走。',
      },
      {
        kind: 'paragraph',
        text: '我们会一起围坐下来，按照顺序听完整张专辑。每听完一首，就停下来几分钟，给我们脆弱的专注力一点喘息的时间，也聊几句：',
      },
      {
        kind: 'list',
        items: [
          '刚刚听到了什么？',
          '哪一个声音、旋律或者细节，让你突然注意到它？',
          '为什么这首歌会被认为是经典？',
        ],
      },
      {
        kind: 'paragraph',
        text: '过程中，我们也会借助 AI，补一点专辑背景、作者信息和乐理知识。但重点不是把歌分析得很厉害，而是试试：当我们真的给一首“不顺耳”的音乐一点时间，我们到底能听到什么。',
      },
      {
        kind: 'paragraph',
        text: '如果你也觉得自己已经很久没有认真听完一首歌，如果你也想知道一张经典专辑为什么值得被反复谈起，欢迎来这场“五分钟”音乐会。',
      },
      {
        kind: 'paragraph',
        text: '我们一起从耳朵里，重新找回一点听音乐的耐心。',
      },
      {
        kind: 'heading',
        text: '💿 本期专辑',
      },
      {
        kind: 'paragraph',
        text: '本期活动，我们会一起听 Radiohead 的《Kid A》。',
      },
      {
        kind: 'paragraph',
        text: '这张专辑发行于 2000 年，是 Radiohead 在《OK Computer》之后交出的第四张录音室专辑。它没有继续做一张更“好入口”的摇滚专辑，而是转向了电子、合成器、冷感人声、破碎节奏，以及一些爵士和环境音乐的影子。它刚发行时曾让不少听众和评论者感到困惑，但后来逐渐被视为 21 世纪初最重要的专辑之一。很多人也把它看作 Radiohead 最关键的一次转向：一张不讨好耳朵，却改变了很多人听摇滚和电子音乐方式的作品。',
      },
      {
        kind: 'paragraph',
        text: '它不一定一上来就顺耳。甚至对很多第一次听的人来说，它可能有点“难听”，是那种你平时会在 10 秒内切走的音乐。',
      },
      {
        kind: 'paragraph',
        text: '但也正因为这样，它很适合作为“五分钟”音乐会的第一张专辑。',
      },
    ],
  },
  'cmi-curiosity-old-city-temples-2026-06-03': {
    eventId: 'cmi-curiosity-old-city-temples-2026-06-03',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-curiosity-old-city-temples-2026-06-03']!,
    postTitle: '🏯《古城与古寺——清迈古城与佛寺文化》',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '当塔佩门的砖墙穿越七百年的时光，\n当古寺的钟声依旧回荡在古城上空，\n你是否真正了解清迈这座城市背后的历史与信仰？',
      },
      {
        kind: 'paragraph',
        text: '6月3日晚，我们邀请到维果老师，与大家一起走进清迈古城，探寻兰纳王朝的历史脉络，解读佛寺建筑的文化密码，感受古城与古寺交织而成的独特魅力。',
      },
      {
        kind: 'heading',
        text: '🎤 分享嘉宾：维果',
      },
      {
        kind: 'list',
        items: [
          '清华大学校友会“何以中国”人文游学项目导师',
          '北京大学《北大校史与北大学脉》课程组指导教师',
          '中国人民大学全国中学历史教学创新研修班项目导师',
          '南开大学历史学科人才培养项目组核心成员',
        ],
      },
      {
        kind: 'heading',
        text: '📅 时间',
      },
      {
        kind: 'paragraph',
        text: '2026年6月3日（周三）\n19:00—20:30',
      },
      {
        kind: 'heading',
        text: '📍 地点',
      },
      {
        kind: 'paragraph',
        text: '清迈客栈（活动空间）\n清迈最大的华人社区，一个有温度的大家庭',
      },
      {
        kind: 'heading',
        text: '💻 线上观看',
      },
      {
        kind: 'paragraph',
        text: '腾讯会议直播：https://meeting.tencent.com/dm/XamWIJ1MrYzG\n会议号：105-998-819',
      },
      {
        kind: 'heading',
        text: '🖊️ 报名',
      },
      {
        kind: 'paragraph',
        text: '免费参与。名额有限，欢迎扫码报名。',
      },
      {
        kind: 'heading',
        text: '🤝 联合主办',
      },
      {
        kind: 'paragraph',
        text: 'Curionrsty × Paradornparp International House',
      },
      {
        kind: 'paragraph',
        text: '无论你是历史文化爱好者，还是刚来到清迈的新朋友，都欢迎来到现场，一起在古城与古寺之间，重新认识这座充满故事的城市。',
      },
    ],
  },
  'cmi-blood-on-the-clocktower-newbie-game-2026-06-04': {
    eventId: 'cmi-blood-on-the-clocktower-newbie-game-2026-06-04',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-blood-on-the-clocktower-newbie-game-2026-06-04']!,
    postTitle: '血染钟楼新手局：死亡不退场的社交推理',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '如果你玩过狼人杀、剧本杀，或者只是喜欢观察人、听人说话、判断谁在隐藏信息，那《血染钟楼》会是一场很适合你的游戏。',
      },
      {
        kind: 'paragraph',
        text: '这一局是新手友好局。现场会有说书人带大家进入规则、分发身份、控制节奏，你不需要提前研究复杂角色。',
      },
      {
        kind: 'heading',
        text: '为什么适合社区活动',
      },
      {
        kind: 'paragraph',
        text: '它不是单纯坐下来玩一款桌游，更像是一场自然发生的破冰：你会听到别人如何表达，看到别人如何推理，也会在怀疑和解释里认识新朋友。',
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：6 月 4 日（周四）15:00-18:00',
          '活动地点：清迈客栈',
          '场地费用：免费参与',
          '原始参与方式：无需报名，直接空降即可；名额有限，先到先得',
          CMI_MAP_EVENT_REGISTRATION_DETAIL_LINE,
        ],
      },
    ],
  },
  'cmi-mindfulness-hour-singing-bowl-2026-06-04': {
    eventId: 'cmi-mindfulness-hour-singing-bowl-2026-06-04',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-mindfulness-hour-singing-bowl-2026-06-04']!,
    postTitle: '正念一小时｜颂钵公益：让心慢慢来',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '本期正念一小时的主题是“让心慢慢来”。',
      },
      {
        kind: 'paragraph',
        text: '赴一场颂钵静修之约，绵长钵音层层震荡，拂去心头杂念，荡开内心疲惫，让心慢慢回到当下。',
      },
      {
        kind: 'heading',
        text: '活动内容',
      },
      {
        kind: 'list',
        items: ['静坐冥想', '智慧引领', '开放分享', '颂钵体验'],
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：6 月 4 日（周四）19:00-20:30（分享讨论 0.5h）',
          '活动地点：清迈客栈',
          '活动性质：纯公益活动',
          CMI_MAP_EVENT_REGISTRATION_DETAIL_LINE,
        ],
      },
    ],
  },
  'cmi-ai-open-mic-vol-05-2026-06-05': {
    eventId: 'cmi-ai-open-mic-vol-05-2026-06-05',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-ai-open-mic-vol-05-2026-06-05']!,
    postTitle: 'AI 开放麦05｜大家一起聊聊天！',
    postBlocks: [
      {
        kind: 'paragraph',
        text: 'AI 工具每天都在变化，真正有价值的经验，往往来自具体使用现场。',
      },
      {
        kind: 'paragraph',
        text: '这期 AI 开放麦，我们继续围绕过去一周的 AI 使用展开交流：你可以分享最近用到的工具、看到的有趣案例、自己正在做的项目，也可以带着问题来现场讨论。',
      },
      {
        kind: 'paragraph',
        text: '不用准备完整演讲，有一个观察、一个尝试、一个踩坑，或者一个正在推进中的想法，都可以拿出来聊。',
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：6 月 5 日（周五）19:00',
          '活动地点：清迈客栈',
          '场地费用：免费参与',
          CMI_MAP_EVENT_REGISTRATION_DETAIL_LINE,
        ],
      },
    ],
  },
  'cmi-kongxiang-canteen-hotpot-2026-06-05': {
    eventId: 'cmi-kongxiang-canteen-hotpot-2026-06-05',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-kongxiang-canteen-hotpot-2026-06-05']!,
    postTitle: '6 月第一周，空想食堂开火锅局',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '6 月第一周，我们来点不一样的。这周空想食堂不只有基本盘饺子，还有火锅。',
      },
      {
        kind: 'paragraph',
        text: '火锅适合很多人一起吃，也适合把不同的食材放到同一口锅里：蔬菜、豆腐、蘑菇、肉片、丸子、蘸料，都可以成为这一锅的一部分。',
      },
      {
        kind: 'paragraph',
        text: '这次的参与方式也很简单：每个人带一道适合火锅的食材来，大家一起煮、一起吃、一起聊。',
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：6 月 5 日（周五）19:00',
          '活动地点：清迈客栈',
          '场地费用：免费参与；请每个人带一道适合火锅的食材来和大家分享',
          CMI_MAP_EVENT_REGISTRATION_DETAIL_LINE,
        ],
      },
    ],
  },
  'cmi-secondhand-auction-2026-06-06': {
    eventId: 'cmi-secondhand-auction-2026-06-06',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-secondhand-auction-2026-06-06']!,
    postTitle: '清迈客栈 CMI 社区二手物品“拍卖”大会',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '二手物品也有义，二手物品也有情。',
      },
      {
        kind: 'paragraph',
        text: '我们身边总有一些东西：买来之后用得不多，但又舍不得扔；放在角落很久，但换到另一个人手里，可能刚好重新派上用场。',
      },
      {
        kind: 'paragraph',
        text: '这周六，CMI 第一届二手物品拍卖大会来了。我们想把这些“放错了位置的”宝物重新拿出来，让它们在现场找到新的主人。',
      },
      {
        kind: 'heading',
        text: '拍卖规则',
      },
      {
        kind: 'list',
        items: [
          '谁开的价格高，物品就给谁',
          '如果两个价格一样，就石头剪刀布，一把定输赢',
          '社区物品不用钱拍卖，可以用空想食堂带来的菜品数量或社区共建时长竞拍',
          '个人自带物品可以现场说明想换的物品方向，或需要别人帮忙的方向',
        ],
      },
      {
        kind: 'heading',
        text: '活动当天流程',
      },
      {
        kind: 'list',
        items: ['开场破冰', '社区品拍卖', '个人品拍卖', '摆摊交流会'],
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：6 月 6 日（周六）15:00',
          '活动地点：清迈客栈',
          '场地费用：免费参与',
          '原始参与方式：无需报名，直接空降即可；也可以扫描海报二维码进群',
          CMI_MAP_EVENT_REGISTRATION_DETAIL_LINE,
        ],
      },
    ],
  },
  'cmi-my-octopus-teacher-screening-2026-06-06': {
    eventId: 'cmi-my-octopus-teacher-screening-2026-06-06',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-my-octopus-teacher-screening-2026-06-06']!,
    postTitle: '《我的章鱼老师》观影：你有多久，没有真正观察过另一个生命？',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '你有多久，没有真正观察过另一个生命？',
      },
      {
        kind: 'paragraph',
        text: '《我的章鱼老师》记录了一段真实而不可思议的友谊：一位摄影师在海底与一只章鱼相伴一年。在追随它的过程中，他重新发现了自然的智慧，也慢慢找回了生命的热情。',
      },
      {
        kind: 'paragraph',
        text: '这周六晚，Magic Lab 将在 CMI 放映《我的章鱼老师》。这是一部很适合一起安静看完、再慢慢聊聊的电影。',
      },
      {
        kind: 'heading',
        text: '适合谁来',
      },
      {
        kind: 'list',
        items: ['喜欢纪录片、自然、海洋的人', '想在周六晚上安静看一部好电影的人', '对人与自然、观察、陪伴这些主题有兴趣的人'],
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：6 月 6 日（周六）19:00',
          '活动地点：CMI',
          '场地费用：免费参与',
          CMI_MAP_EVENT_REGISTRATION_DETAIL_LINE,
        ],
      },
    ],
  },
  'cmi-talk-fathers-day-speaker-call-2026-06-07': {
    eventId: 'cmi-talk-fathers-day-speaker-call-2026-06-07',
    posterUrl: CMI_EVENT_POSTER_BY_ID['cmi-talk-fathers-day-speaker-call-2026-06-07']!,
    postTitle: 'CMI Talk 「父亲节特辑」分享嘉宾招募',
    postBlocks: [
      {
        kind: 'paragraph',
        text: '这个父亲节，CMI Talk 想邀请几位在清迈生活的爸爸，聊聊真实的困惑、陪伴、成长和家庭选择。',
      },
      {
        kind: 'paragraph',
        text: '不需要“完美父亲”的标准答案。我们更想听见那些愿意陪孩子玩、听孩子说话、和孩子一起成长的人生故事。',
      },
      {
        kind: 'heading',
        text: '本期想听见什么',
      },
      {
        kind: 'list',
        items: [
          '作为父亲，你有哪些真实的困惑与成长',
          '你如何理解“陪伴”',
          '你和孩子之间有哪些特别的相处方式',
          '在事业、家庭与自我之间，你经历过怎样的选择',
          '今天这个时代，爸爸这个角色还能有哪些新的打开方式',
        ],
      },
      {
        kind: 'heading',
        text: '活动信息',
      },
      {
        kind: 'list',
        items: [
          '活动时间：6 月 7 日（周日）16:30-18:30',
          '活动地点：清迈客栈',
          '招募对象：想分享真实故事的爸爸们',
          '费用说明：来源未单列收费项，本次按免费报名记录',
          CMI_MAP_EVENT_REGISTRATION_DETAIL_LINE,
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
