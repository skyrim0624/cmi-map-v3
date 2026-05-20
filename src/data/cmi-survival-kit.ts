import { getPlaceGuide } from '@/data/place-guides';
import type { Recommendation } from '@/types/types';

export type CmiSurvivalKitItemId =
  | 'sim-internet'
  | 'cash-exchange'
  | 'motorbike-transport'
  | 'pharmacy'
  | 'clinic-hospital'
  | 'visa-documents'
  | 'print-copy'
  | 'laundry-supplies'
  | 'daily-restock'
  | 'haircut-care';

export type CmiSurvivalKitIcon =
  | 'wifi'
  | 'wallet'
  | 'bike'
  | 'pill'
  | 'hospital'
  | 'file'
  | 'printer'
  | 'shirt'
  | 'bag'
  | 'scissors';

export interface CmiSurvivalKitItem {
  id: CmiSurvivalKitItemId;
  title: string;
  question: string;
  description: string;
  icon: CmiSurvivalKitIcon;
  iconUrl: string;
  urgency: '落地第一天' | '一周内会用到' | '出问题时马上要用';
  checklist: string[];
  cmiMapHint: string;
  tags: string[];
}

const CMI_FLAT_ICON_BASE = '/map-icons/cmi-flat-v2';
const cmiFlatIcon = (name: string) => `${CMI_FLAT_ICON_BASE}/${name}.png`;

export const CMI_SURVIVAL_KIT_ITEMS: CmiSurvivalKitItem[] = [
  {
    id: 'sim-internet',
    title: '电话卡 / 网络',
    question: '我要办电话卡',
    description: '先让手机能用，后面打车、付款、联系房东和查地图都靠它。',
    icon: 'wifi',
    iconUrl: cmiFlatIcon('survival-sim'),
    urgency: '落地第一天',
    checklist: ['AIS / True', '护照注册', '月流量套餐', '视频会议备用热点'],
    cmiMapHint: '优先收机场柜台、商场门店和英文沟通顺的营业点。',
    tags: ['SIM', 'eSIM', '网络'],
  },
  {
    id: 'cash-exchange',
    title: '换钱 / 取现金',
    question: '我要换钱或取现金',
    description: '清迈很多小店、市场和双条车仍然更依赖现金。',
    icon: 'wallet',
    iconUrl: cmiFlatIcon('survival-exchange'),
    urgency: '落地第一天',
    checklist: ['换汇点', 'ATM', 'Wise / Revolut', '现金使用场景'],
    cmiMapHint: '标清楚汇率是否靠谱、是否排队、附近是否方便停车。',
    tags: ['换汇', 'ATM', '现金'],
  },
  {
    id: 'motorbike-transport',
    title: '交通 / 租摩托',
    question: '我要租摩托或出行',
    description: '清迈没有地铁，交通自由度很大程度取决于你怎么移动。',
    icon: 'bike',
    iconUrl: cmiFlatIcon('survival-motorbike'),
    urgency: '落地第一天',
    checklist: ['租摩托', 'Grab', '双条车', '押金和证件', '头盔和保险'],
    cmiMapHint: '优先收不乱押护照、车况稳定、说明清楚的租车点。',
    tags: ['租摩托', 'Grab', '出行'],
  },
  {
    id: 'pharmacy',
    title: '买药 / 药店',
    question: '我要买药',
    description: '感冒、肠胃、过敏、蚊虫和小外伤，通常先从药店解决。',
    icon: 'pill',
    iconUrl: cmiFlatIcon('survival-pharmacy'),
    urgency: '出问题时马上要用',
    checklist: ['常用药', '药师沟通', '营业时间', '外伤用品'],
    cmiMapHint: '标注是否能英文沟通、是否开到较晚、是否靠近常住区域。',
    tags: ['药店', '常用药', '急用'],
  },
  {
    id: 'clinic-hospital',
    title: '诊所 / 医院',
    question: '我要看医生',
    description: '小病找诊所，严重情况直接医院；这类信息必须可信、少踩坑。',
    icon: 'hospital',
    iconUrl: cmiFlatIcon('survival-clinic'),
    urgency: '出问题时马上要用',
    checklist: ['英文诊所', '国际医院', '牙科', '疫苗 / 检测'],
    cmiMapHint: '区分普通诊所、旅行诊所、医院和急诊，不混在一个列表里。',
    tags: ['诊所', '医院', '急诊'],
  },
  {
    id: 'visa-documents',
    title: '签证 / 文件',
    question: '我要办签证文件',
    description: '延签、TM30、证件照、复印、打印，经常卡在细小材料上。',
    icon: 'file',
    iconUrl: cmiFlatIcon('survival-visa'),
    urgency: '一周内会用到',
    checklist: ['打印复印', '证件照', 'TM30', '移民局', '1900 泰铢现金'],
    cmiMapHint: '先收移民局附近和商场里好找的打印/证件照点。',
    tags: ['签证', '打印', '证件照'],
  },
  {
    id: 'print-copy',
    title: '打印 / 复印',
    question: '我要打印复印',
    description: '签证材料、合同、证件照和临时文件，最怕临门一脚找不到店。',
    icon: 'printer',
    iconUrl: cmiFlatIcon('survival-print'),
    urgency: '一周内会用到',
    checklist: ['打印', '复印', '扫描', '证件照', '文件装订'],
    cmiMapHint: '优先收移民局附近、商场里和能快速沟通需求的店。',
    tags: ['打印', '复印', '证件照'],
  },
  {
    id: 'laundry-supplies',
    title: '洗衣 / 清洁',
    question: '我要洗衣',
    description: '住一周以上就会变成刚需，尤其是自助洗衣、洗衣店和干洗。',
    icon: 'shirt',
    iconUrl: cmiFlatIcon('survival-laundry'),
    urgency: '一周内会用到',
    checklist: ['自助洗衣', '洗衣店', '干洗', '烘干机', '洗衣液'],
    cmiMapHint: '按住处附近优先推荐，别让用户跨城去洗衣。',
    tags: ['洗衣', '干洗', '清洁'],
  },
  {
    id: 'daily-restock',
    title: '日用品 / 补给',
    question: '我要买日用品',
    description: '饮用水、雨具、转换插头、洗护和基础补给，长期住的人会反复用到。',
    icon: 'bag',
    iconUrl: cmiFlatIcon('survival-daily'),
    urgency: '一周内会用到',
    checklist: ['饮用水', '超市', '便利店', '转换插头', '雨具和洗护'],
    cmiMapHint: '按住处附近优先推荐，标清楚是否好买、好停车、价格稳定。',
    tags: ['日用品', '超市', '补给'],
  },
  {
    id: 'haircut-care',
    title: '理发 / 个人护理',
    question: '我要剪头发',
    description: '长期住的人一定会遇到，关键是能不能沟通清楚、价格是否稳定。',
    icon: 'scissors',
    iconUrl: cmiFlatIcon('survival-hair'),
    urgency: '一周内会用到',
    checklist: ['理发', '英文沟通', '预约方式', '价格范围'],
    cmiMapHint: '优先收社区朋友真实去过、能沟通、不会乱报价的店。',
    tags: ['理发', '护理', '长期生活'],
  },
];

export const CMI_SURVIVAL_EMERGENCY_NUMBERS = [
  { label: '急救', value: '1669' },
  { label: '旅游警察', value: '1155' },
  { label: '紧急热线', value: '191' },
];

const normalizeSurvivalSearchValue = (value: string) =>
  value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsLatinToken = (text: string, keyword: string) => {
  const escapedKeyword = escapeRegExp(keyword).replace(/\s+/g, '\\s+');
  const tokenPattern = new RegExp(`(^|[^a-z0-9])${escapedKeyword}([^a-z0-9]|$)`, 'i');
  return tokenPattern.test(text);
};

const matchesSurvivalKeyword = (text: string, keyword: string) => {
  const normalizedKeyword = normalizeSurvivalSearchValue(keyword);
  if (!normalizedKeyword) return false;

  if (/[a-z0-9]/i.test(normalizedKeyword)) {
    return containsLatinToken(text, normalizedKeyword);
  }

  return text.includes(normalizedKeyword);
};

const containsAnySurvivalKeyword = (text: string, keywords: string[]) =>
  keywords.some(keyword => matchesSurvivalKeyword(text, keyword));

export const CMI_SURVIVAL_KIT_MATCH_KEYWORDS = [
  '电话卡',
  'sim',
  'esim',
  'ais',
  'true move',
  'dtac',
  '换汇',
  'money exchange',
  'exchange',
  'atm',
  '现金',
  '租摩托',
  '租车',
  'motorbike',
  'scooter',
  'car rental',
  '药店',
  'pharmacy',
  'drugstore',
  '诊所',
  'clinic',
  '医院',
  'hospital',
  '牙科',
  'dental',
  'dentist',
  '疫苗',
  'vaccine',
  '签证',
  'visa',
  'tm30',
  '移民局',
  'immigration',
  '证件照',
  'passport photo',
  '打印',
  'print',
  '复印',
  'copy',
  'scan',
  'copy shop',
  '洗衣',
  'laundry',
  'laundromat',
  'dry clean',
  '日用品',
  '饮用水',
  'water',
  'supermarket',
  'convenience store',
  'big c',
  'lotus',
  '7-eleven',
  '理发',
  'hair',
  'salon',
  'barber',
  'haircut',
  'beauty',
];

const CMI_SURVIVAL_KIT_EXCLUDE_KEYWORDS = [
  '餐厅',
  '小吃',
  '船面',
  '拉面',
  '甜品',
  '咖啡',
  'brunch',
  'breakfast',
  'restaurant',
  'cafe',
  'coffee',
  'no drone',
  '无人机',
  '禁飞',
];

export const matchesCmiSurvivalKitRecommendation = (recommendation: Recommendation) => {
  const guide = getPlaceGuide(recommendation.place_name, recommendation.category);
  const text = normalizeSurvivalSearchValue(
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

  if (containsAnySurvivalKeyword(text, CMI_SURVIVAL_KIT_EXCLUDE_KEYWORDS)) {
    return false;
  }

  return containsAnySurvivalKeyword(text, CMI_SURVIVAL_KIT_MATCH_KEYWORDS);
};
