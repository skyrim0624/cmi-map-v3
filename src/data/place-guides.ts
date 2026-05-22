import type { Category, Recommendation } from '@/types/types';

export interface PlaceGuide {
  placeName: string;
  title: string;
  kind: string;
  summary: string;
  tags: string[];
  tip?: string;
}

const COMMUNITY_USER_NAME = 'CMI社区';
const COMMUNITY_REASON = '来自 CMI 社区的精选收藏';
const CHIANG_MAI_CENTER = { latitude: 18.7883, longitude: 98.9853 };

const normalizePlaceName = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const PLACE_GUIDE_ALIASES: Array<[string, string]> = [
  ['各种外文书', 'Suriwong Book Center'],
];

const createFallbackGuide = (placeName: string, category?: Category | string): PlaceGuide => {
  const lowerName = placeName.toLowerCase();

  if (/hair|salon|beauty/.test(lowerName)) {
    return {
      placeName,
      title: '理发店',
      kind: '理发店',
      summary: '这类点位不是景点，更多是给在清迈住一阵子的人用的。它解决的是很实际的问题：剪头发、修造型、临时整理形象。',
      tags: ['理发', '长期生活', '实用点位'],
    };
  }

  if (/exchange|money/.test(lowerName)) {
    return {
      placeName,
      title: '换汇点',
      kind: '换汇点',
      summary: '这是给刚到清迈或需要现金的人准备的实用点位。换汇这种事不需要浪漫，但需要知道哪里能办、怎么找得到。',
      tags: ['换汇', '现金', '刚到清迈'],
    };
  }

  if (/print/.test(lowerName)) {
    return {
      placeName,
      title: '打印店',
      kind: '打印店',
      summary: '适合需要打印文件、签证材料、活动物料或临时纸质资料的时候用。它不是为了打卡，而是为了让在清迈办事少卡一步。',
      tags: ['打印', '办事', '临时救急'],
    };
  }

  if (/market|bazaar|ตลาด|孟买市场/.test(lowerName)) {
    return {
      placeName,
      title: '本地市场',
      kind: '市场',
      summary: '市场类点位适合想看清迈日常生活的人：买吃的、买水果、找小东西，顺便感受这座城市真实运转的样子。',
      tags: ['市场', '本地生活', '采购'],
    };
  }

  if (/book|library|书店|买书|看书|文具/.test(lowerName) || category === '购物') {
    return {
      placeName,
      title: '书店 / 文具店',
      kind: '书店',
      summary: '适合买书、文具、学习用品或找一点纸质材料。对想读书、自习、做活动物料的人都很实用。',
      tags: ['书店', '文具', '学习用品'],
    };
  }

  if (/cafe|coffee|roastery|กาแฟ/.test(lowerName)) {
    return {
      placeName,
      title: '咖啡馆',
      kind: '咖啡馆',
      summary: '这是社区收藏里的咖啡点位。适合想找地方坐一下、见朋友、换个环境休息的人；是否适合办公，还需要到现场看插座和安静程度。',
      tags: ['咖啡', '见朋友', '休息'],
    };
  }

  if (/restaurant|kitchen|noodle|chicken|cuisine|sushi|bbq|buffet|food|beef|yakitori|raming|หมู|เป็ด|ข้าว|ครัว/.test(lowerName)) {
    return {
      placeName,
      title: '餐厅',
      kind: '餐厅',
      summary: '这是社区收藏里的吃饭点位。它适合被放进地图，不是因为名字响亮，而是因为你需要一个“今天可以去哪吃”的候选答案。',
      tags: ['吃饭', '朋友聚餐', '日常选择'],
    };
  }

  if (/waterfall|lake|hot spring|stadium|tennis|park|garden|village|ดอย|温泉/.test(lowerName) || category === '户外') {
    return {
      placeName,
      title: '户外地点',
      kind: '户外',
      summary: '这是适合从室内出来透气的地点。它更像一个出门理由：散步、看景、换空气，或者把一天从电脑前挪开一点。',
      tags: ['户外', '散步', '换空气'],
    };
  }

  return {
    placeName,
    title: placeName,
    kind: category || '地点',
    summary: '这是 CMI 社区收藏进地图的地点。它先作为清迈生活底库保留，方便后来的人知道这里存在，后续还可以继续补充更具体的体验。',
    tags: ['社区收藏', '待补充', '清迈生活'],
  };
};

export const isCommunityCuratedRecommendation = (
  recommendation: Pick<Recommendation, 'user_name' | 'reason'>
) => recommendation.user_name === COMMUNITY_USER_NAME && recommendation.reason === COMMUNITY_REASON;

export const getGuideSourceLabel = (recommendation: Pick<Recommendation, 'user_name' | 'reason'>) =>
  isCommunityCuratedRecommendation(recommendation) ? 'CMI 社区整理' : recommendation.user_name;

export const COMMUNITY_PLACE_GUIDES: PlaceGuide[] = [
  {
    placeName: '1st For Coffee (CO1FFEE)',
    title: '社区咖啡馆',
    kind: '咖啡馆',
    summary: '一个适合把节奏放慢的咖啡点位。名字不太直观，但它在地图里的价值很简单：想临时找杯咖啡、坐一会儿、和朋友碰头时，可以作为候选。',
    tags: ['咖啡', '休息', '碰头'],
  },
  {
    placeName: '20°09\'54.5"N 99°37\'54.2"E',
    title: '坐标点',
    kind: '坐标点',
    summary: '这条记录原始名称就是一组坐标，说明它更像是社区手动收藏的地点，而不是常规商家名。适合后续实地确认后补上正式名称和更准确说明。',
    tags: ['待确认', '坐标', '社区底库'],
    tip: '先不要把它当成完整推荐，更适合作为待复核点位。',
  },
  {
    placeName: '6ixcret show',
    title: '演出 / 夜间娱乐',
    kind: '演出空间',
    summary: '这是偏夜间娱乐和表演体验的点位，不是餐厅或咖啡馆。适合想找一点不一样的夜晚安排，但最好出发前确认当天是否营业、是否需要订位。',
    tags: ['演出', '夜间活动', '提前确认'],
  },
  {
    placeName: '700th Anniversary of Chiang Mai Stadium',
    title: '清迈 700 周年体育场',
    kind: '运动场',
    summary: '大型体育场区域，适合跑步、运动、看比赛或参加大型活动。它不是游客打卡点，更像住在清迈后会用到的运动和活动基础设施。',
    tags: ['运动', '跑步', '大型活动'],
  },
  {
    placeName: 'Asa Vegan Kitchen and Studio',
    title: '素食厨房',
    kind: '素食餐厅',
    summary: '适合想吃得轻一点、干净一点的人。素食餐厅在清迈不稀缺，但这类点位对长期生活很有用：不想每天重口味时，有一个稳定选择。',
    tags: ['素食', '轻食', '日常吃饭'],
  },
  {
    placeName: 'Asama Coffee & Roastery',
    title: '咖啡烘焙馆',
    kind: '咖啡馆',
    summary: '偏认真喝咖啡的点位，适合想试试清迈本地咖啡、手冲或烘焙风味的人。它更适合专门去喝一杯，而不是随便找个地方久坐办公。',
    tags: ['咖啡', '烘焙', '认真喝一杯'],
  },
  {
    placeName: 'Auf der Au Garden German buffet',
    title: '德式花园自助餐',
    kind: '餐厅',
    summary: '一个偏“换口味”的餐厅点位。适合不想继续吃泰餐、想找德式食物或自助餐氛围的时候去；更像朋友聚餐选择，不是精致约会餐厅。',
    tags: ['德餐', '自助', '朋友聚餐'],
  },
  {
    placeName: 'Baan Kang Wat',
    title: '艺术家小村',
    kind: '艺术社区',
    summary: '由小店、手作工作室、咖啡和展览空间组成的慢生活艺术社区。适合下午去闲逛，买小东西、看手作、坐下来喝一杯，比起景点更像一片可以慢慢晃的社区。',
    tags: ['手作', '艺术社区', '慢逛'],
  },
  {
    placeName: 'Baan Mae Café & Restaurant',
    title: '花园餐厅',
    kind: '餐厅 / 咖啡',
    summary: '偏氛围型的餐厅咖啡点位，适合不赶时间地吃饭、聊天、拍照。它的价值不是效率，而是让一顿饭多一点“坐下来”的感觉。',
    tags: ['花园氛围', '聊天', '拍照'],
  },
  {
    placeName: 'Bar Fine - บ่าฟาย',
    title: '酒吧餐厅',
    kind: '酒吧 / 餐厅',
    summary: '名字看不出太多，但它更接近晚上和朋友坐一坐的地方。适合想喝点东西、吃点简单食物、把一天收尾的人。',
    tags: ['酒吧', '晚间', '朋友小聚'],
  },
  {
    placeName: 'Bays Coffee Co.',
    title: '社区咖啡馆',
    kind: '咖啡馆',
    summary: '适合日常喝咖啡、短暂停留、和朋友简单见面。不是每个咖啡馆都需要成为网红点，有些点位的意义就是稳定、顺路、好用。',
    tags: ['咖啡', '日常', '见朋友'],
  },
  {
    placeName: 'Big Tree',
    title: '大树餐厅',
    kind: '餐厅',
    summary: '偏自然氛围的餐厅点位，适合想找一个不那么商场化、能坐得舒服一点的地方吃饭。推荐它不是因为惊艳，而是因为清迈很多好地方都藏在这种朴素名字后面。',
    tags: ['自然氛围', '吃饭', '放松'],
  },
  {
    placeName: 'Brewginning Coffee',
    title: '咖啡馆',
    kind: '咖啡馆',
    summary: '一个适合认真喝咖啡或短暂坐下来的咖啡点位。名字是英文双关，用户第一次看到可能不明白，把它理解成“清迈咖啡清单的一站”就够了。',
    tags: ['咖啡', '短坐', '清迈咖啡'],
  },
  {
    placeName: 'Bushido Japanese Restaurant',
    title: '日料餐厅',
    kind: '餐厅',
    summary: '适合想换成日料口味的时候去。对长期住清迈的人来说，这类点位很实用：不是每天都想吃泰餐，偶尔需要稳定的米饭、寿司或日式热食。',
    tags: ['日料', '换口味', '日常吃饭'],
  },
  {
    placeName: 'Central Chiangmai',
    title: '大型商场',
    kind: '商场',
    summary: '清迈的大型综合商场，适合买东西、吃饭、看电影、避暑或处理一些生活采购。它不浪漫，但非常实用，尤其适合刚到清迈还不知道去哪补齐生活用品的人。',
    tags: ['商场', '采购', '避暑'],
  },
  {
    placeName: 'Cherng Doi Roast Chicken',
    title: '烤鸡餐厅',
    kind: '餐厅',
    summary: '主打泰北烤鸡和本地家常菜的吃饭点位。适合想吃一顿有清迈风味、但又不会太复杂的饭，尤其适合几个人一起点菜分享。',
    tags: ['泰北菜', '烤鸡', '多人吃饭'],
  },
  {
    placeName: 'Chiang Dao Hot Springs',
    title: '清道温泉',
    kind: '温泉',
    summary: '在清迈北边的温泉点位，适合和清道一日游或短途旅行放在一起。它不是市区随手去的地方，更适合想离开城市、泡一会儿热水、换个环境的人。',
    tags: ['温泉', '清道', '短途旅行'],
  },
  {
    placeName: 'Chiang Mai Night Bazaar',
    title: '清迈夜市',
    kind: '夜市',
    summary: '清迈最容易被游客遇到的夜市区域之一，适合第一次来清迈的人晚上随便逛逛、吃点东西、买小商品。它商业化，但也方便。',
    tags: ['夜市', '游客友好', '晚上逛'],
  },
  {
    placeName: 'Chiang Mai OriginaLive - The First Indie Livehouse in Chiang Mai',
    title: '独立音乐现场',
    kind: 'Livehouse',
    summary: '适合想听现场音乐、找清迈夜晚另一面的朋友。它不是普通酒吧，更像本地独立音乐和演出聚集点，出发前最好确认当天节目。',
    tags: ['Livehouse', '独立音乐', '夜晚'],
  },
  {
    placeName: 'Chiang Mai P.A.O. Public Park',
    title: '公共公园',
    kind: '公园',
    summary: '适合散步、慢跑、晒太阳或让自己从室内出来透口气。它不是景点型公园，更像日常生活里可以重复使用的户外空间。',
    tags: ['公园', '散步', '慢跑'],
  },
  {
    placeName: 'Chiangmai Yunnan Market',
    title: '云南市场',
    kind: '市场',
    summary: '适合找云南风味、小吃、杂货和带一点华人生活气息的东西。它的好处是亲切，不是精致，适合想看看清迈多元生活层次的人。',
    tags: ['云南风味', '市场', '华人生活'],
  },
  {
    placeName: 'Chom Cafe and Restaurant',
    title: '瀑布花园餐厅',
    kind: '餐厅 / 咖啡',
    summary: '主打热带花园、雾气和瀑布景观的氛围型餐厅。适合带朋友拍照、吃饭、体验“清迈网红花园感”；如果只是想快速吃顿饭，它可能不是最高效的选择。',
    tags: ['花园景观', '拍照', '带朋友'],
  },
  {
    placeName: 'ClayCraft Coffee Gallery Homestay เครคราฟทโฮมสเตย์',
    title: '陶艺咖啡民宿',
    kind: '咖啡 / 手作空间',
    summary: '名字里已经藏着重点：陶艺、咖啡、画廊和民宿。适合想找一点手作气质、慢慢坐、顺便看看空间布置的人。',
    tags: ['陶艺', '咖啡', '慢空间'],
  },
  {
    placeName: 'Coffee Telling',
    title: '社区咖啡馆',
    kind: '咖啡馆',
    summary: '一个适合日常喝咖啡的点位。它被放进地图不是为了制造惊喜，而是当你在附近需要坐一下、喝一杯时，多一个可信选择。',
    tags: ['咖啡', '日常', '附近可去'],
  },
  {
    placeName: 'Dao Chinese Restaurant',
    title: '中餐馆',
    kind: '餐厅',
    summary: '适合想吃中餐、带长辈吃饭，或者连续几天泰餐后想换回熟悉口味的时候去。清迈长期生活里，中餐馆是很实用的安全牌。',
    tags: ['中餐', '熟悉口味', '多人吃饭'],
  },
  {
    placeName: 'Doi Saket Lakes',
    title: 'Doi Saket 湖区',
    kind: '湖边户外',
    summary: '适合骑车、开车出去透气，看看水面和远处山景。它更像一个“从市区抽离一下”的地点，不是精心包装的景区。',
    tags: ['湖边', '短途', '透气'],
  },
  {
    placeName: 'Dubai Chicken & Rice',
    title: '鸡饭店',
    kind: '餐厅',
    summary: '适合想吃简单、直接、有饱腹感的一餐。鸡饭这类店不需要复杂描述，关键是解决“今天吃什么”的现实问题。',
    tags: ['鸡饭', '简单一餐', '日常'],
  },
  {
    placeName: 'Ekachan The Wisdom of Ethnic Thai Cuisine',
    title: '民族风味泰餐',
    kind: '餐厅',
    summary: '偏泰国民族和地方风味的餐厅，适合不满足于普通游客菜单、想吃一点更有地域感的泰餐的人。适合慢慢点菜，不适合赶时间。',
    tags: ['泰餐', '地方风味', '慢慢吃'],
  },
  {
    placeName: 'Erang Korean Restaurant',
    title: '韩餐馆',
    kind: '餐厅',
    summary: '适合想吃韩餐、烤肉或泡菜锅一类熟悉口味的时候去。长期住清迈的人会需要这种换口味点位，它的价值很实际。',
    tags: ['韩餐', '换口味', '聚餐'],
  },
  {
    placeName: 'FFparking',
    title: '停车点',
    kind: '停车场',
    summary: '这是一个偏功能性的停车点。它不会是旅行目的地，但当你开车或骑车去附近办事、吃饭、逛街时，知道哪里能停反而很重要。',
    tags: ['停车', '办事', '实用'],
  },
  {
    placeName: 'Galae Restaurant',
    title: '湖边花园餐厅',
    kind: '餐厅',
    summary: '靠近水边和自然环境的餐厅，适合想找一个比普通饭馆更有景观感的吃饭地点。适合带朋友或家人，不适合只想十分钟解决一餐。',
    tags: ['湖边', '花园', '家人朋友'],
  },
  {
    placeName: 'Hair Duu beauty & salon',
    title: '理发店',
    kind: '理发店',
    summary: '这就是理发店。适合在清迈住久了需要剪头发、修发型、做基础整理的时候用；不是景点，也不需要包装成景点。',
    tags: ['理发', '美发', '长期生活'],
  },
  {
    placeName: 'Hakata Yakitori Bariuma',
    title: '日式串烧 / 拉面',
    kind: '餐厅',
    summary: '适合想吃日式热食、串烧或拉面的时候去。它是那种晚上不知道吃什么时可以考虑的换口味餐厅。',
    tags: ['日料', '串烧', '晚餐'],
  },
  {
    placeName: 'Have-A-Hug Fusion Farm Chiangmai',
    title: '农场风餐厅',
    kind: '餐厅',
    summary: '偏农场和户外氛围的吃饭点位，适合带小朋友、朋友聚餐，或者想离开商场和街边店，找一个更开阔的地方坐坐。',
    tags: ['农场', '亲子', '朋友聚餐'],
  },
  {
    placeName: 'Hear Tong Food Shop',
    title: '本地小吃店',
    kind: '餐厅',
    summary: '名字不太能说明菜系，但它属于日常吃饭点位。适合在附近时解决一餐，重点是实用，不是专门绕远路打卡。',
    tags: ['本地小吃', '日常饭', '附近可吃'],
  },
  {
    placeName: 'HomNoey Thai BBQ',
    title: '泰式烧烤',
    kind: '餐厅',
    summary: '适合晚上和朋友一起吃的泰式烧烤点位。烧烤的优势在氛围：边烤边聊，适合多人，不适合一个人匆匆吃完就走。',
    tags: ['泰式烧烤', '多人', '晚餐'],
  },
  {
    placeName: 'Hummus Garden Chiang Mai',
    title: '中东风味餐厅',
    kind: '餐厅',
    summary: '适合想吃鹰嘴豆泥、皮塔、沙拉和中东风味的人。清迈餐饮很多元，这类点位的好处是给素食者和想吃清爽口味的人更多选择。',
    tags: ['中东风味', '素食友好', '清爽'],
  },
  {
    placeName: 'Im Yakiniku & Sushi Buffet Kadtaweechok',
    title: '烤肉寿司自助',
    kind: '餐厅',
    summary: '适合想吃饱、想热闹、想多人一起点一桌的时候去。自助餐的价值很明确：不追求精致，但适合聚餐和大食量。',
    tags: ['自助', '烤肉', '多人聚餐'],
  },
  {
    placeName: 'Jarus Print Shop',
    title: '打印店',
    kind: '打印店',
    summary: '适合打印文件、资料、活动物料或临时纸质内容。它不是让人专程打卡的点，但在清迈办事、做活动、处理签证材料时会很有用。',
    tags: ['打印', '文件', '办事'],
  },
  {
    placeName: 'Jok Somphet Restaurant',
    title: '粥和本地简餐',
    kind: '餐厅',
    summary: '适合想吃热粥、简单本地饭或早晚都能接受的轻负担餐。它不是惊艳型餐厅，更像身体累了、想吃点温热东西时的选择。',
    tags: ['粥', '简餐', '舒服一餐'],
  },
  {
    placeName: 'Joost Smoothies drink healthy',
    title: '健康果昔店',
    kind: '饮品店',
    summary: '适合想喝果昔、果汁或吃得轻一点的时候去。清迈天气热，果昔店的实用性很高，尤其适合运动后或午后补一杯。',
    tags: ['果昔', '健康饮品', '热天'],
  },
  {
    placeName: 'Kanomwan Chang Moi',
    title: '甜品小吃店',
    kind: '甜品店',
    summary: '适合想找泰式甜品、小吃或饭后加一点甜味的时候去。这类店的乐趣不在豪华，而在本地味道和便宜的小满足。',
    tags: ['甜品', '小吃', '本地味道'],
  },
  {
    placeName: 'Kasem beef noodle shop',
    title: '牛肉粉店',
    kind: '餐厅',
    summary: '适合想吃一碗热乎、直接、有肉味的牛肉粉。它不是复杂体验，但很适合日常：一个人也能去，饿的时候很有确定性。',
    tags: ['牛肉粉', '一人食', '日常'],
  },
  {
    placeName: 'Kati Breakfast and Brunch',
    title: '早餐早午餐',
    kind: '餐厅',
    summary: '适合上午慢一点开始的一天：早餐、早午餐、咖啡和轻食。比起重口味正餐，它更适合聊天、醒脑、安排一天。',
    tags: ['早餐', '早午餐', '慢上午'],
  },
  {
    placeName: 'Kuaytiaw 3 Baht',
    title: '3 泰铢船面',
    kind: '餐厅',
    summary: '主打小碗面，适合想尝本地平价小吃、一次多吃几碗的人。它的趣味在“小份、多碗、便宜”，不是精致用餐。',
    tags: ['船面', '平价', '本地小吃'],
  },
  {
    placeName: "L'Opéra",
    title: '法式甜点 / 西餐',
    kind: '餐厅',
    summary: '适合想吃甜点、面包、咖啡或偏法式口味的时候去。它更像一个换气口：当你想从泰北味道切到欧洲风味，可以考虑这里。',
    tags: ['法式', '甜点', '换口味'],
  },
  {
    placeName: 'Living The Dream Cafe & Playground Chiang Mai',
    title: '亲子咖啡馆',
    kind: '咖啡 / 亲子空间',
    summary: '适合带小朋友的家庭，或者需要孩子能玩、大人能坐下来的场景。它的重点不是咖啡本身，而是“孩子有地方消耗精力”。',
    tags: ['亲子', '咖啡', '儿童活动'],
  },
  {
    placeName: 'Maadae Slow Fish Kitchen',
    title: '慢食海鲜厨房',
    kind: '餐厅',
    summary: '适合想吃更认真一点的鱼和海鲜料理的人。名字里的 Slow Fish 已经说明它不是快餐，更适合留出时间好好吃一顿。',
    tags: ['海鲜', '慢食', '认真吃饭'],
  },
  {
    placeName: 'Mae Kampong Village',
    title: '湄康蓬山村',
    kind: '山村短途',
    summary: '清迈周边很受欢迎的山村，适合一日游或住一晚，喝咖啡、看山、走小路。它的好处是离城市不算太远，却能明显换一种空气。',
    tags: ['山村', '一日游', '看山'],
  },
  {
    placeName: 'Maerim Bee Garden',
    title: '蜂园',
    kind: '户外 / 农场',
    summary: '适合对蜂蜜、农场和轻户外感兴趣的人。它不是强刺激景点，更像一个顺路停靠、买点蜂蜜、看看小环境的地方。',
    tags: ['蜂蜜', '农场', '顺路停靠'],
  },
  {
    placeName: 'Magokoro Teahouse by มีใจให้มัทฉะ',
    title: '日式茶屋',
    kind: '茶屋',
    summary: '适合喜欢抹茶、日式茶点和安静空间的人。它不是随便解渴的饮品店，而是更适合慢慢坐、认真喝一杯茶。',
    tags: ['抹茶', '日式', '安静'],
  },
  {
    placeName: 'MARS.cnx',
    title: '宇宙主题咖啡馆',
    kind: '咖啡 / 拍照',
    summary: '偏视觉和拍照体验的咖啡馆，空间主题感强。适合想拍照、带朋友看一个有设计感的地方；如果只在乎咖啡效率，预期要放低一点。',
    tags: ['主题空间', '拍照', '咖啡'],
  },
  {
    placeName: 'Meet Lalada',
    title: '花园甜点咖啡',
    kind: '咖啡 / 甜点',
    summary: '适合喜欢花园、甜点和漂亮空间的人。它更偏轻松约会或朋友下午茶，不是严肃办公点。',
    tags: ['甜点', '花园', '下午茶'],
  },
  {
    placeName: 'MENSHO TOKYO',
    title: '拉面店',
    kind: '餐厅',
    summary: '适合想吃一碗比较正式的日式拉面时去。清迈有很多轻食和泰餐，拉面店的价值就是在想吃热汤面时给你一个确定答案。',
    tags: ['拉面', '日料', '热汤面'],
  },
  {
    placeName: 'MITTE MITTE Chiangmai - Cafe & Brunch',
    title: '咖啡早午餐',
    kind: '咖啡 / 早午餐',
    summary: '适合早餐、早午餐、咖啡和聊天。它的使用场景很明确：上午不知道去哪坐，或者想找一个舒服但不太正式的见面地点。',
    tags: ['早午餐', '咖啡', '见面'],
  },
  {
    placeName: 'mr.pierre money exchange',
    title: '换汇点',
    kind: '换汇点',
    summary: '这是换现金的地方。适合刚到清迈、需要泰铢现金，或者不想临时到处找 ATM 的时候用；出发前可以顺手确认营业时间。',
    tags: ['换汇', '现金', '刚到清迈'],
  },
  {
    placeName: 'Much Room Cafe',
    title: '空间感咖啡馆',
    kind: '咖啡馆',
    summary: '适合想找一个空间宽一点、能坐下来聊事或休息的咖啡馆。名字里的 Much Room 很直白，重点就是空间感。',
    tags: ['咖啡', '空间感', '聊天'],
  },
  {
    placeName: 'Mueang Mai Market',
    title: '孟买 / Muang Mai 生鲜市场',
    kind: '市场',
    summary: '偏本地采购和生鲜批发的市场，适合买水果、蔬菜、食材，也适合想看清迈真实日常的人。它不是精致夜市，环境会更市井。',
    tags: ['生鲜', '水果', '本地市场'],
  },
  {
    placeName: 'Nakara Cafe & Restaurant',
    title: '河边咖啡餐厅',
    kind: '咖啡 / 餐厅',
    summary: '适合想找一个环境舒服、能吃饭也能喝东西的地方。它更偏慢坐和聊天，不是只为了快速买杯咖啡。',
    tags: ['河边', '咖啡', '聊天吃饭'],
  },
  {
    placeName: 'Nawarath Tennis Club',
    title: '网球俱乐部',
    kind: '网球场',
    summary: '适合想在清迈打网球的人。它是很明确的运动点位，不是观光地点；对长期住清迈的人，比很多景点更有用。',
    tags: ['网球', '运动', '长期生活'],
  },
  {
    placeName: 'Ohkajhu Organic Farm Sansai',
    title: '有机农场餐厅',
    kind: '餐厅',
    summary: '适合想吃蔬菜、沙拉、烤肉和更健康一点的餐。它的特点是份量和菜品选择都比较适合多人，也适合不想吃太油的人。',
    tags: ['有机', '沙拉', '多人吃饭'],
  },
  {
    placeName: 'OL Beef Noodle',
    title: '牛肉粉店',
    kind: '餐厅',
    summary: '适合想快速吃一碗热汤面或牛肉粉的时候去。它属于日常可重复使用的吃饭点，不需要复杂仪式感。',
    tags: ['牛肉粉', '热汤', '日常'],
  },
  {
    placeName: 'Patongo Ko Neng (Praisanee Road Branch)',
    title: '油条早餐店',
    kind: '早餐小吃',
    summary: '主打泰式油条和早餐小吃，适合早上去吃点热乎、简单又有本地感的东西。它的乐趣在街头早餐氛围。',
    tags: ['早餐', '油条', '本地小吃'],
  },
  {
    placeName: 'Raming Tea House Siam Celadon , ระมิงค์ทีเฮาส์ สยามศิลาดล',
    title: '茶馆和青瓷空间',
    kind: '茶馆 / 餐厅',
    summary: '适合想喝茶、吃饭、看一点老建筑和青瓷器物氛围的人。它比普通餐厅更有文化空间感，适合慢一点的下午。',
    tags: ['茶馆', '青瓷', '老建筑'],
  },
  {
    placeName: 'Royal Project Shop 2',
    title: '皇家项目商店',
    kind: '商店',
    summary: '适合买泰北农产品、果干、茶、咖啡或伴手礼。它不是旅游纪念品店那种热闹，而是偏实用、稳定、适合采购。',
    tags: ['伴手礼', '农产品', '采购'],
  },
  {
    placeName: 'S&P Rimping Chiang Mai',
    title: '商场简餐甜点',
    kind: '餐厅 / 甜点',
    summary: '适合在商场或超市附近需要吃点稳定东西的时候去。它不是惊喜型推荐，但胜在好找、选择稳定、适合临时解决一餐。',
    tags: ['简餐', '甜点', '稳定选择'],
  },
  {
    placeName: 'Samudlanna',
    title: '兰纳风餐厅',
    kind: '餐厅',
    summary: '适合想吃带一点北泰/兰纳风味和空间感的饭。它更适合带外地朋友体验清迈气质，而不是随便十分钟解决午饭。',
    tags: ['兰纳风味', '空间感', '带朋友'],
  },
  {
    placeName: 'Samurai Kitchen',
    title: '日式食堂',
    kind: '餐厅',
    summary: '适合想吃日式家常、盖饭、咖喱或简单热食的时候去。长期住清迈时，这种稳定换口味的小店很重要。',
    tags: ['日式食堂', '家常', '换口味'],
  },
  {
    placeName: 'SANAE • Sanae Thai Cuisine',
    title: '泰餐厅',
    kind: '餐厅',
    summary: '适合想吃一顿比路边摊更正式、但仍然是泰国味道的饭。适合带朋友、家人或刚来清迈的人体验泰餐。',
    tags: ['泰餐', '正式一点', '带朋友'],
  },
  {
    placeName: 'Sang Ga Dee Space',
    title: '社区活动空间',
    kind: '空间',
    summary: '更像一个有内容和活动气质的空间，而不是单纯餐厅。适合关注清迈本地文化、展览、社区活动的人。',
    tags: ['活动空间', '文化', '社区'],
  },
  {
    placeName: 'SINC Cafe’',
    title: '咖啡馆',
    kind: '咖啡馆',
    summary: '适合日常喝咖啡、坐一下、处理一点轻工作或见朋友。它被收进地图的价值，是给附近的人多一个可用选择。',
    tags: ['咖啡', '日常', '轻工作'],
  },
  {
    placeName: 'Soy milk store',
    title: '豆浆店',
    kind: '早餐小吃',
    summary: '适合早上或晚上想喝豆浆、吃点简单小吃的时候去。对华人来说这类点位很亲切，是清迈生活里很实际的小安慰。',
    tags: ['豆浆', '早餐', '亲切'],
  },
  {
    placeName: 'Stay Wild & Cafe',
    title: '山野咖啡馆',
    kind: '咖啡 / 户外',
    summary: '适合想把喝咖啡和自然景观放在一起的人。它更像短途出门的停靠点，不是市区里随便坐十分钟的咖啡馆。',
    tags: ['山野', '咖啡', '短途'],
  },
  {
    placeName: 'Super Money Exchange',
    title: '换汇点',
    kind: '换汇点',
    summary: '这是换泰铢现金的实用点位。适合刚到清迈、准备市集购物、或需要现金支付的时候用；汇率和营业时间建议到现场前再确认。',
    tags: ['换汇', '现金', '实用'],
  },
  {
    placeName: 'Suriwong Book Center',
    title: '书店 / 文具店',
    kind: '书店',
    summary: '适合买书、文具、学习用品或找一点纸质材料。对学生、老师、活动组织者和喜欢逛文具的人都很实用。',
    tags: ['书店', '文具', '学习用品'],
  },
  {
    placeName: 'TASANA ทสฺสน',
    title: '餐厅 / 空间',
    kind: '餐厅',
    summary: '一个名字不太容易判断的吃饭空间。适合想找不那么普通的餐厅，坐下来吃饭、聊天、看看空间氛围的人。',
    tags: ['吃饭', '空间氛围', '聊天'],
  },
  {
    placeName: 'TCDC',
    title: '泰国创意设计中心',
    kind: '设计中心',
    summary: '适合设计师、创作者、学生和想找灵感的人。这里不是普通景点，更像能看展、查资料、感受泰国创意产业的公共文化空间。',
    tags: ['设计', '展览', '灵感'],
  },
  {
    placeName: 'Thai Traditional and Complementary Medicine Center',
    title: '泰式传统医学中心',
    kind: '传统医学 / 按摩',
    summary: '适合对泰式传统医学、草药、按摩或身体调理感兴趣的人。它不是餐厅，原来的分类不够准确；更应该被理解成健康和身体护理相关点位。',
    tags: ['传统医学', '按摩', '身体调理'],
  },
  {
    placeName: 'Thamel Coffee',
    title: '咖啡馆',
    kind: '咖啡馆',
    summary: '适合喝咖啡、坐一会儿、和朋友简单见面。名字带一点尼泊尔/旅行气质，但在地图里它主要是一个可用的咖啡点位。',
    tags: ['咖啡', '见朋友', '休息'],
  },
  {
    placeName: 'The Giant Chiangmai',
    title: '树屋咖啡 / 山里餐厅',
    kind: '咖啡 / 短途',
    summary: '适合想去山里、体验树屋和自然环境的人。它更像一次小旅行，不是市区日常咖啡；去之前要给路程和天气留余量。',
    tags: ['树屋', '山里', '短途旅行'],
  },
  {
    placeName: 'The Ironwood',
    title: '花园餐厅',
    kind: '餐厅 / 咖啡',
    summary: '偏花园、美学和慢节奏的餐厅咖啡点位，适合拍照、下午茶、带朋友吃饭。它的好处是空间感，不是快速高性价比。',
    tags: ['花园', '拍照', '下午茶'],
  },
  {
    placeName: 'The Swan Burmese Cuisine',
    title: '缅甸菜餐厅',
    kind: '餐厅',
    summary: '适合想吃缅甸风味、从泰餐里换出来的人。清迈离缅甸文化很近，这类餐厅能让你看到城市饮食的另一层。',
    tags: ['缅甸菜', '换口味', '地方风味'],
  },
  {
    placeName: 'Vaanaa ​Cafe​ &​ Bistro',
    title: '咖啡小餐馆',
    kind: '咖啡 / 简餐',
    summary: '适合喝咖啡、吃轻食或和朋友坐一会儿。它不是纯咖啡馆，也不是正式大餐厅，更适合日常轻松见面。',
    tags: ['咖啡', '简餐', '轻松见面'],
  },
  {
    placeName: 'VICTORIA HAIR DESIGN',
    title: '理发店',
    kind: '理发店',
    summary: '这就是理发店。适合在清迈住一阵子、需要剪头发或做基础造型的时候去；它的价值是实用，不是旅游体验。',
    tags: ['理发', '造型', '长期生活'],
  },
  {
    placeName: 'Wachirathan Waterfall',
    title: '瓦吉拉坦瀑布',
    kind: '瀑布',
    summary: '清迈周边很有存在感的瀑布点位，通常适合和茵他侬山方向的行程放在一起。适合想看自然景观、拍照、离开城市半天的人。',
    tags: ['瀑布', '自然景观', '短途'],
  },
  {
    placeName: 'Waroros Market',
    title: '瓦洛洛市场',
    kind: '市场',
    summary: '清迈很重要的本地市场，适合买北泰小吃、果干、香料、衣物和伴手礼。它比精致夜市更生活化，也更能看见清迈人的日常。',
    tags: ['市场', '伴手礼', '本地生活'],
  },
  {
    placeName: 'Wat Kanthaprueksa (Mae Kampong)',
    title: '湄康蓬寺庙',
    kind: '寺庙',
    summary: '湄康蓬村附近的寺庙点位，适合和山村一日游一起看。它不是单独绕远路的主角，更适合放在“去湄康蓬走走”的路线里。',
    tags: ['寺庙', '湄康蓬', '顺路'],
  },
  {
    placeName: 'We-La-Dee Cafe & Restaurant',
    title: '咖啡餐厅',
    kind: '咖啡 / 餐厅',
    summary: '适合吃饭、喝咖啡、聊天，场景比较万能。它不是特别锋利的个性点位，但适合需要一个稳妥地方时使用。',
    tags: ['咖啡', '吃饭', '稳妥选择'],
  },
  {
    placeName: 'Win Cosmetics',
    title: '美妆店',
    kind: '美妆店',
    summary: '适合买化妆品、护肤品、日用品或临时补货。它不是景点，但对在清迈生活的人很有用，尤其是刚来还不知道去哪买的时候。',
    tags: ['美妆', '日用品', '补货'],
  },
  {
    placeName: 'Win Cosmetics Warorot Market',
    title: '瓦洛洛市场美妆店',
    kind: '美妆店',
    summary: '在市场区域里的美妆和日用品采购点。适合顺路买护肤、化妆、洗护类东西，比起专程打卡，更适合“逛市场时顺手补货”。',
    tags: ['美妆', '市场', '补货'],
  },
  {
    placeName: 'Wua Thong Beef Noodle',
    title: '牛肉粉店',
    kind: '餐厅',
    summary: '适合想吃一碗牛肉粉、热汤和本地小店味道的时候去。它的价值是直接、踏实、解决饥饿。',
    tags: ['牛肉粉', '本地小店', '热汤'],
  },
  {
    placeName: 'Yunnan flea Market',
    title: '云南跳蚤市场',
    kind: '市场',
    summary: '适合淘小东西、看杂货和感受一点云南/华人生活气息。它不是标准化商场，乐趣在随便逛和偶然发现。',
    tags: ['跳蚤市场', '淘东西', '华人生活'],
  },
  {
    placeName: 'Zenseiki Japanese Food and Sushi',
    title: '日料寿司店',
    kind: '餐厅',
    summary: '适合想吃寿司、日式简餐或换口味的时候去。它更像日常餐厅选择，不是非去不可的目的地。',
    tags: ['日料', '寿司', '换口味'],
  },
  {
    placeName: 'โกโก้เจ้มจ้น - เชียงใหม่ - Cocoa6',
    title: '可可饮品店',
    kind: '饮品店',
    summary: '主打可可饮品，适合不想喝咖啡、但想来一杯甜的、冰的、浓一点的东西。热天路过会很实用。',
    tags: ['可可', '饮品', '热天'],
  },
  {
    placeName: 'ข้าวเหนียวมะม่วงป้าหลอด : ตลาดวโรรส - กาดหลวงตอนกลางคืน',
    title: '瓦洛洛市场芒果糯米饭',
    kind: '小吃',
    summary: '这是市场里的芒果糯米饭点位。适合晚上逛瓦洛洛或附近市场时顺手吃一份，甜、糯、带一点游客也能理解的泰国味道。',
    tags: ['芒果糯米饭', '市场小吃', '晚上'],
  },
  {
    placeName: 'ครัวห่วงสมัย By เจ๊โบว์',
    title: '泰式家常餐厅',
    kind: '餐厅',
    summary: '适合想吃泰式家常菜的人。名字是泰文，对中文用户不直观，但可以先把它理解成一个本地吃饭选择。',
    tags: ['泰餐', '家常菜', '本地'],
  },
  {
    placeName: 'ชาตรามือ สาขาตลาดวโรรส',
    title: '瓦洛洛市场手标泰茶',
    kind: '饮品店',
    summary: '手标泰茶在泰国很常见，这个点位适合逛市场时顺手买一杯。它不需要专门绕路，但很适合作为逛街补给。',
    tags: ['泰茶', '市场', '顺手买'],
  },
  {
    placeName: 'ดอยทิพย์ญาณ Doitipyan (สาขาวัดดอยโพธิญาณ)',
    title: '山上寺庙 / 观景点',
    kind: '寺庙 / 户外',
    summary: '偏寺庙和山景体验的点位，适合想离开市区、看一点清迈周边宗教和自然环境的人。去之前最好确认交通和开放情况。',
    tags: ['寺庙', '山景', '短途'],
  },
  {
    placeName: 'เฟบริคช้าง',
    title: '布料 / 手作材料店',
    kind: '商店',
    summary: '适合买布料、手作材料或和缝纫相关的小东西。它不是景点，但对做手工、做活动布置、找材料的人很有用。',
    tags: ['布料', '手作材料', '采购'],
  },
  {
    placeName: 'รังนกไทย เจ้าเก่าตลาดอนุสาร สาขา1',
    title: '燕窝甜品店',
    kind: '甜品店',
    summary: '市场区域里的燕窝甜品点位，适合想吃一点传统甜品或夜市后收尾的人。它偏小吃体验，不是正式餐厅。',
    tags: ['燕窝', '甜品', '夜市'],
  },
  {
    placeName: 'ร้านชากูซ่า ดอยปุย',
    title: 'Doi Pui 山上茶饮店',
    kind: '茶饮 / 户外',
    summary: '位于 Doi Pui 方向的茶饮点位，适合和上山、看景、短途出行放在一起。它更像路线里的停靠点，而不是市区饮品店。',
    tags: ['茶饮', '上山', '短途'],
  },
  {
    placeName: 'สนามเทนนิสนวรัฐ',
    title: 'Nawarath 网球场',
    kind: '网球场',
    summary: '这是网球场。适合想在清迈打球、找运动伙伴或保持运动习惯的人；比起景点，它更接近生活基础设施。',
    tags: ['网球', '运动', '长期生活'],
  },
  {
    placeName: 'สากลการค้า SK Exchange',
    title: 'SK 换汇点',
    kind: '换汇点',
    summary: '这是换汇点。适合需要泰铢现金、准备去市场或小店消费的时候用；汇率会变，实际兑换前最好现场确认。',
    tags: ['换汇', '现金', '市场前'],
  },
  {
    placeName: 'หมูทอดอาม่า - Moo Tod Ama',
    title: '炸猪肉小吃',
    kind: '小吃店',
    summary: '主打炸猪肉一类的本地小吃，适合想吃香口、下饭、快速满足的一餐。它不是精致餐厅，但很适合嘴馋和随手吃。',
    tags: ['炸猪肉', '小吃', '快速一餐'],
  },
  {
    placeName: 'อาลีเป็ดย่าง ​Diannan',
    title: '滇南风味 / 烤鸭店',
    kind: '餐厅',
    summary: '名字里有 Diannan，偏云南或滇南风味线索，也有烤鸭元素。适合想吃华人熟悉口味、换掉泰餐的人。',
    tags: ['云南风味', '烤鸭', '华人口味'],
  },
  {
    placeName: '土管温泉',
    title: '土管温泉',
    kind: '温泉',
    summary: '一个很有民间感的温泉点位。适合想找更本地、更粗粝一点的泡汤体验，而不是酒店式 spa；去之前要确认交通和现场状态。',
    tags: ['温泉', '本地感', '短途'],
  },
  {
    placeName: '孟买市场',
    title: '孟买市场',
    kind: '市场',
    summary: '市场类点位，适合采购、找小吃、看本地日常。它的好处不是漂亮，而是让你知道清迈生活不是只有宁曼和咖啡馆。',
    tags: ['市场', '采购', '本地日常'],
  },
];

const inferGuideCategory = (guide: PlaceGuide): Category => {
  const text = [guide.title, guide.kind, guide.summary, ...guide.tags].join(' ').toLowerCase();
  const placeTypeText = [guide.title, guide.kind, ...guide.tags].join(' ').toLowerCase();

  if (/咖啡|coffee|cafe|roastery/.test(text)) return '咖啡';
  if (/餐|饭|小吃|甜品|noodle|food|烤鸭|炸猪肉/.test(text)) return '吃饭';
  if (/书店|文具|学习用品|bookstore|library/.test(text)) return '购物';
  if (/市场|市集|market|bazaar/.test(text)) return '市集';
  if (/景点|地标|观景点|寺庙|城门|temple|wat|landmark|viewpoint/.test(placeTypeText)) return '景点';
  if (/温泉|户外|山|短途|茶饮/.test(text)) return '户外';
  if (/按摩|spa|马杀鸡/.test(text)) return '马杀鸡';
  if (/运动|网球|球场|健身/.test(text)) return '运动';
  if (/换汇|打印|理发|诊所|医院|药店|电话卡|办事/.test(text)) return '生存指南';

  return '彩蛋';
};

export const getCommunityGuideRecommendations = (limit = 12): Recommendation[] =>
  COMMUNITY_PLACE_GUIDES.slice(0, limit).map((guide, index) => ({
    id: `community-guide-${index}`,
    place_name: guide.placeName,
    category: inferGuideCategory(guide),
    reason: COMMUNITY_REASON,
    user_name: COMMUNITY_USER_NAME,
    user_id: null,
    latitude: CHIANG_MAI_CENTER.latitude + (index % 5) * 0.003,
    longitude: CHIANG_MAI_CENTER.longitude + Math.floor(index / 5) * 0.003,
    images: [],
    created_at: '2026-05-18T00:00:00.000Z',
    upvotes: [],
    wishlists: [],
    placed_stickers: [],
  }));

const GUIDE_MAP = new Map(COMMUNITY_PLACE_GUIDES.map(guide => [normalizePlaceName(guide.placeName), guide]));
const GUIDE_ALIAS_MAP = new Map(
  PLACE_GUIDE_ALIASES.map(([alias, canonicalName]) => [
    normalizePlaceName(alias),
    normalizePlaceName(canonicalName),
  ])
);

export const getPlaceGuide = (placeName: string, category?: Category | string) =>
  GUIDE_MAP.get(normalizePlaceName(placeName))
  || GUIDE_MAP.get(GUIDE_ALIAS_MAP.get(normalizePlaceName(placeName)) ?? '')
  || createFallbackGuide(placeName, category);
