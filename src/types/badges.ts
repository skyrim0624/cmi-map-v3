import { Category } from './types';

export type BadgeCategory = '品类鉴赏家' | '地图考古学家' | '手账创作者' | '互动行者' | '社区之光' | '隐藏彩蛋';

export interface Badge {
  id: string;
  name: string;
  description: string;
  system: BadgeCategory;
  conditionDescription: string;
  assetUrl: string;
}

export const BADGE_REGISTRY: Badge[] = [
  // 1. 品类鉴赏家 (Category Specific Explorers)
  { id: 'coffee_addict', name: '咖啡瘾者', description: '血管里流的不止是血，还有冰爽的Dirty。', system: '品类鉴赏家', conditionDescription: '发布 2 篇咖啡相关的日志', assetUrl: '/badges/badge_coffee_addict_1776504899075.png' },
  { id: 'food_expert', name: '在地干饭王', description: '走遍清迈大街小巷的大胃王。', system: '品类鉴赏家', conditionDescription: '发布 2 篇吃饭相关的日志', assetUrl: '/badges/badge_item_food_1776506567218.png' },
  { id: 'outdoor_explorer', name: '泰北游侠', description: '不带指南针就敢进山的勇敢灵魂。', system: '品类鉴赏家', conditionDescription: '发布 2 篇户外相关的日志', assetUrl: '/badges/badge_outdoor_explorer_1776504911663.png' },
  { id: 'photo', name: '光影捕手', description: '永远在寻找最完美的光线下按快门。', system: '品类鉴赏家', conditionDescription: '发布 2 篇拍照相关的日志', assetUrl: '/badges/badge_item_photo_1776506764558.png' },
  { id: 'market', name: '市集老饕', description: '精通清迈各种奇妙的创意周末市集。', system: '品类鉴赏家', conditionDescription: '发布 2 篇市集相关的日志', assetUrl: '/badges/badge_item_market_1776506577267.png' },
  { id: 'relax', name: '放松达人', description: '知道哪家的马杀鸡最能让肌肉尖叫和沉睡。', system: '品类鉴赏家', conditionDescription: '发布 2 篇马杀鸡相关的日志', assetUrl: '/badges/badge_item_relax_1776506776146.png' },
  { id: 'sports', name: '满级泰拳', description: '流汗是认识一座城市最原始的方式。', system: '品类鉴赏家', conditionDescription: '发布 2 篇运动相关的日志', assetUrl: '/badges/badge_item_sports_1776506792355.png' },
  { id: 'bar', name: '微醺主理', description: '夜风、爵士乐和一杯完美的鸡尾酒。', system: '品类鉴赏家', conditionDescription: '发布 2 篇酒吧相关的日志', assetUrl: '/badges/badge_item_bar_1776506591017.png' },
  { id: 'mind_body', name: '身心修行', description: '在呼吸之间找到了在世界里的位置。', system: '品类鉴赏家', conditionDescription: '发布 2 篇身心相关的日志', assetUrl: '/badges/badge_item_mindbody_1776506804204.png' },
  { id: 'survival', name: '数字游民生存王', description: '水电网签？全拿捏住了。', system: '品类鉴赏家', conditionDescription: '发布 2 篇生存指南相关的日志', assetUrl: '/badges/badge_item_survival_1776506815757.png' },
  { id: 'treasure', name: '异闻录', description: '总能发现那些不为人知的奇奇怪怪。', system: '品类鉴赏家', conditionDescription: '发布 2 篇彩蛋相关的日志', assetUrl: '/badges/badge_item_treasure_1776506829079.png' },

  // 2. 手账创作者 (Quantity based)
  { id: 'first_pin', name: '第一笔', description: '你在这张巨大的画布上留下了第一抹色彩。', system: '手账创作者', conditionDescription: '首次发布手账 (1 篇)', assetUrl: '/badges/badge_item_pencil_1776506926627.png' },
  { id: 'three_pages', name: '三页手账', description: '连续书写，渐入佳境。', system: '手账创作者', conditionDescription: '发布第 3 篇手账', assetUrl: '/badges/badge_item_notebook_1776506938237.png' },
  { id: 'painter', name: '在地绘师', description: '你在用脚步一点点勾勒清迈的面貌。', system: '手账创作者', conditionDescription: '发布第 10 篇手账', assetUrl: '/badges/badge_item_paintbrush_1776506951124.png' },
  { id: 'encyclopedia', name: '清迈百科', description: '如果有人迷路，应该打你的电话。', system: '手账创作者', conditionDescription: '发布第 25 篇手账', assetUrl: '/badges/badge_item_encyclopedia_1776506964226.png' },
  { id: 'map_soul', name: '地图之魂', description: '你这不叫探索，这叫主词条编写。', system: '手账创作者', conditionDescription: '发布第 50 篇手账', assetUrl: '/badges/badge_item_map_soul_1776506975550.png' },

  // 3. 地图考古学家 (Content Quality)
  { id: 'photos_truth', name: '有图有真相', description: '好照片是最好的安利。', system: '地图考古学家', conditionDescription: '发布 3 篇带图手账', assetUrl: '/badges/badge_item_polaroid_1776507346546.png' },
  { id: 'chronicler', name: '影像编年史', description: '厚厚的相册，记录了这座城市不同的光影。', system: '地图考古学家', conditionDescription: '发布 15 篇带图手账', assetUrl: '/badges/badge_item_polaroids_1776507361748.png' },
  { id: 'living_map', name: '清迈活地图', description: '你标记的地盘横跨了四个以上的分类领域。', system: '地图考古学家', conditionDescription: '覆盖 4 种以上不同分类', assetUrl: '/badges/badge_item_crumpledmap_1776507264277.png' },
  { id: 'writer', name: '长文匠人', description: '字斟句酌写下的攻略，是留给后人的财富。', system: '地图考古学家', conditionDescription: '发布内容长度包含长文字', assetUrl: '/badges/badge_item_manuscript_1776507278492.png' },

  // 4. 互动行者 (Liking behavior)
  { id: 'first_like', name: '举手之劳', description: '你的一个小圆心，温暖了一个创作者。', system: '互动行者', conditionDescription: '首次点赞他人的手账', assetUrl: '/badges/badge_item_oneheart_1776507291085.png' },
  { id: 'reader', name: '热心读者', description: '走走看看，看到好的也从不吝啬鼓励。', system: '互动行者', conditionDescription: '累计点赞 10 次', assetUrl: '/badges/badge_lucky_reader_1776507077604.png' },
  { id: 'warmer', name: '社区暖宝宝', description: '你是这个小酒馆里最捧场的常客。', system: '互动行者', conditionDescription: '累计点赞 30 次', assetUrl: '/badges/badge_lucky_warmer_1776507089110.png' },
  { id: 'hypeleader', name: '气氛组长', description: '有你在的地方就不会冷场。', system: '互动行者', conditionDescription: '累计点赞 60 次', assetUrl: '/badges/badge_lucky_hypeleader_1776507103941.png' },
  { id: 'watering', name: '雨露均沾', description: '连那些无人问津的冷门卡片你都送去了温暖。', system: '互动行者', conditionDescription: '累计点赞过 10 个不同的创作者', assetUrl: '/badges/badge_lucky_watering_1776507116189.png' },
  { id: 'perpetual_like', name: '点赞永动机', description: '点赞机器，永远在线。', system: '互动行者', conditionDescription: '累计点赞 150 次以上', assetUrl: '/badges/badge_lucky_perpetual_1776507128287.png' },

  // 5. 社区之光 (Received Upvotes)
  { id: 'like_received', name: '初次被赞', description: '有人喜欢你的分享！', system: '社区之光', conditionDescription: '收到了第一个赞', assetUrl: '/badges/badge_lucky_firstlike_v2_1776507064560.png' },
  { id: 'fame', name: '小有名气', description: '你的品味吸引了一票粉丝。', system: '社区之光', conditionDescription: '累计收到 15 个赞', assetUrl: '/badges/badge_item_hearts_1776507303917.png' },
  { id: 'reputation', name: '口碑担当', description: '很多人都在按照你的推荐安排行程。', system: '社区之光', conditionDescription: '累计收到 50 个赞', assetUrl: '/badges/badge_lucky_reputation_1776507391111.png' },
  { id: 'hot_maker', name: '热门制造机', description: '你每次的发帖都是社区焦点。', system: '社区之光', conditionDescription: '单篇手账收到超过 10 个赞', assetUrl: '/badges/badge_item_hotflame_1776507316884.png' },
  { id: 'kol', name: '社区 KOL', description: '顶流，不加掩饰的。', system: '社区之光', conditionDescription: '累计收到 150 个赞', assetUrl: '/badges/badge_lucky_kol_1776507406028.png' },

  // 6. 隐藏彩蛋 (Easter Eggs)
  { id: 'nightowl', name: '夜行者', description: '在大部分人熟睡时游走在星空下的灵魂。', system: '隐藏彩蛋', conditionDescription: '在深夜时段发布手账', assetUrl: '/badges/badge_item_nightowl_1776507419648.png' },
  { id: 'veteran', name: '元老', description: '旧世界的见证者。', system: '隐藏彩蛋', conditionDescription: '早期注册加入的用户', assetUrl: '/badges/badge_item_waxseal_1776507431783.png' },
  { id: 'loner', name: '独行侠', description: '远离喧嚣，寻找内心的平静。', system: '隐藏彩蛋', conditionDescription: '发布了极度冷门的无赞记录', assetUrl: '/badges/badge_item_loner_1776507443806.png' },
  { id: 'leftbehind', name: '清迈留守儿童', description: '看着别人离开，你依旧坚守阵地。', system: '隐藏彩蛋', conditionDescription: '连续数月保持打卡活跃', assetUrl: '/badges/badge_item_leftbehind_1776507454657.png' }
];

