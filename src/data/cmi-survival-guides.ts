export type CmiSurvivalGuideId =
  | 'entry-tdac-visa'
  | 'tm30-registration'
  | 'sim-internet'
  | 'cash-payment'
  | 'motorbike-transport'
  | 'health-medication'
  | 'restricted-items'
  | 'smoke-season-emergency';

export interface CmiSurvivalGuideSource {
  label: string;
  url: string;
}

export interface CmiSurvivalGuideSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface CmiSurvivalGuide {
  id: CmiSurvivalGuideId;
  order: number;
  title: string;
  shortTitle: string;
  timing: string;
  urgency: '必须先做' | '落地当天' | '第一周' | '按季节';
  summary: string;
  primaryAction: string;
  keyPoints: string[];
  sections: CmiSurvivalGuideSection[];
  sourceLinks: CmiSurvivalGuideSource[];
}

export const CMI_SURVIVAL_GUIDES_LAST_REVIEWED = '2026-05-22';

export const CMI_SURVIVAL_GUIDES: CmiSurvivalGuide[] = [
  {
    id: 'entry-tdac-visa',
    order: 1,
    title: '入境前：TDAC、免签、返程票',
    shortTitle: '入境材料',
    timing: '出发前 72 小时内',
    urgency: '必须先做',
    summary: '先确认能不能顺利入境。TDAC 免费填写，免签天数以入境章为准。',
    primaryAction: '出发前 72 小时内填写 TDAC，并保存确认邮件或截图。',
    keyPoints: [
      '中国普通护照目前在泰国 60 天免签名单内，最终以入境章为准。',
      'TDAC 官方入口是 tdac.immigration.go.th，免费，不是签证。',
      '建议准备酒店订单、返程或离境机票、适量现金备查。',
    ],
    sections: [
      {
        heading: '先看护照和入境资格',
        paragraphs: [
          '中国普通护照目前在泰国 60 天免签名单内，适用于旅游和短期商务等目的。入境后要看清护照上的入境章，真正的离境日期以章上的日期为准。',
          '护照建议保持 6 个月以上有效期，且不要有明显破损。行前准备好酒店订单、返程或离境机票、适量现金，遇到抽查时可以直接出示。',
        ],
      },
      {
        heading: 'TDAC 怎么处理',
        paragraphs: [
          'TDAC 是泰国电子入境卡。所有非泰国籍旅客入境前都需要填写。填写时间通常是抵达前 72 小时内。',
          '官方入口是 tdac.immigration.go.th。提交后保存确认邮件或截图，值机和入境时都可能用到。',
        ],
      },
      {
        heading: '不要踩的坑',
        bullets: [
          '不要在收费的假 TDAC 网站提交护照和银行卡信息。',
          '不要只买单程票就直接来，入境或值机时可能被要求说明离境计划。',
          '准备长期远程工作的人，不要长期靠免签反复进出，应提前研究 DTV 等长期签证。',
        ],
      },
    ],
    sourceLinks: [
      {
        label: 'TDAC 官方说明',
        url: 'https://thailand.go.th/public/visit-thailand-detail/thailand-digital-arrival-card--tdac---2-2',
      },
      {
        label: '泰国 60 天免签名单',
        url: 'https://image.mfa.go.th/mfa/0/V6F3eUxZz5/%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3/visa_exemption_%2860_days%29.pdf',
      },
      {
        label: '中国驻清迈总领馆安全提醒',
        url: 'https://chiangmai.china-consulate.gov.cn/xwdt/zlggg/202602/t20260211_11856221.htm',
      },
    ],
  },
  {
    id: 'tm30-registration',
    order: 2,
    title: '入住后：TM30 住宿登记',
    shortTitle: 'TM30',
    timing: '入住当天',
    urgency: '落地当天',
    summary: '酒店、房东或公寓管理方应在入住后 24 小时内报备。办延期前尤其要确认。',
    primaryAction: '入住当天向酒店或房东要 TM30 截图或回执。',
    keyPoints: [
      '法律责任主要在住宿方，但影响常常落到住客身上。',
      '酒店通常自动提交，短租公寓、Airbnb、朋友家最容易漏。',
      '清迈办签证延期时，经常会需要当前住址的 TM30 记录。',
    ],
    sections: [
      {
        heading: 'TM30 是什么',
        paragraphs: [
          'TM30 是外国人住宿登记。酒店、房东、公寓管理方需要在外国人入住后 24 小时内向移民局报备。',
          '游客自己不一定要亲自提交，但要确认住宿方已经做了。尤其是之后要去清迈移民局办延期的人，最好提前拿到截图或打印件。',
        ],
      },
      {
        heading: '怎么问最简单',
        bullets: [
          '入住酒店：问前台是否已经提交 TM30，能否提供截图。',
          '住公寓或短租：入住当天就问房东，不要等到延期前一天。',
          '住朋友家：确认对方是否知道 TM30；不确定时提前咨询移民局或正规签证服务点。',
        ],
      },
      {
        heading: '最常见问题',
        paragraphs: [
          '很多人不是入境时出问题，而是办延期时才发现 TM30 缺失。到那时再找房东补，时间会比较被动。',
          '简单做法是：入住当天确认一次；准备延期前，再确认一次当前地址记录。',
        ],
      },
    ],
    sourceLinks: [
      {
        label: 'TM30 官方系统说明',
        url: 'https://tm30.immigration.go.th/TM30/Foreigner/TM30EN/index.html',
      },
      {
        label: '泰国政府 TM30 规则',
        url: 'https://www.thailand.go.th/issue-focus-detail/001_01_060?hl=en',
      },
    ],
  },
  {
    id: 'sim-internet',
    order: 3,
    title: '电话卡 / eSIM',
    shortTitle: '电话卡',
    timing: '落地第一小时',
    urgency: '落地当天',
    summary: '先让手机有网。叫车、查地图、联系房东、收邮件都要靠它。',
    primaryAction: '短住机场办，长住去 AIS 或 True/dtac 官方门店问长期预付套餐。',
    keyPoints: [
      '泰国电话卡需要实名登记，通常要护照。',
      '机场最省事，市区门店和 7-Eleven 通常更适合慢慢比较价格。',
      '出发前下载离线地图，避免落地后没有网络。',
    ],
    sections: [
      {
        heading: '怎么选',
        paragraphs: [
          '短期旅行可以直接在机场买旅游 SIM 或 eSIM，优点是落地马上能用。价格可能比市区高，但省时间。',
          '住一个月以上的人，建议去商场里的 AIS 或 True/dtac 官方门店，问 30 天或长期预付套餐。不一定要买最贵的 Tourist SIM。',
        ],
      },
      {
        heading: '需要准备什么',
        bullets: [
          '护照原件。',
          '可接收验证码的手机。',
          '如果用 eSIM，先确认手机支持 eSIM。',
        ],
      },
      {
        heading: '实用提醒',
        paragraphs: [
          '买卡时确认流量、有效期、是否可续费、是否能开热点。远程工作的人尤其要确认热点和视频会议是否够用。',
          '刚落地没有网络时，可以先用机场 Wi-Fi 联系住宿和叫车。出发前下载离线地图会更稳。',
        ],
      },
    ],
    sourceLinks: [
      {
        label: 'dtac 游客 SIM 实名说明',
        url: 'https://www.dtac.co.th/en/prepaid/touristsim-register.html',
      },
      {
        label: 'True/dtac 游客 SIM',
        url: 'https://www.true.th/en/prepaid/sim/tourist',
      },
    ],
  },
  {
    id: 'cash-payment',
    order: 4,
    title: '换钱 / 取现金 / 支付',
    shortTitle: '现金支付',
    timing: '落地第一天',
    urgency: '落地当天',
    summary: '清迈不能只靠银行卡或手机支付。现金、银行卡、支付宝/微信都要准备。',
    primaryAction: '准备少量现金入境，到正规换汇点换钱，并保留一张国际银行卡备用。',
    keyPoints: [
      '小店、市场、双条车、洗衣、打印常常需要现金。',
      '外国银行卡在泰国 ATM 取现通常有单笔手续费。',
      '中国用户可尝试支付宝、微信、银联 App 扫 Thai QR，但不是所有店都支持。',
    ],
    sections: [
      {
        heading: '现金仍然重要',
        paragraphs: [
          '清迈的商场、连锁店、部分餐厅可以刷卡或扫码，但本地小店、市场、双条车、洗衣店、打印店常常只收现金。',
          '建议随身带一点现金，不要把所有支付方式都押在手机上。',
        ],
      },
      {
        heading: 'ATM 和换汇',
        bullets: [
          '用外国卡在泰国 ATM 取现，常见有单笔手续费。',
          '取现时如果机器询问是否使用本机汇率，通常选择不要转换，让发卡行结算。',
          '去正规换汇点换钱时带护照，不要找路边不明个人换汇。',
        ],
      },
      {
        heading: '中国支付工具',
        paragraphs: [
          '泰国央行已公布中泰跨境二维码支付连接，中国用户可以尝试用支付宝、微信、银联 App 扫 Thai QR。',
          '但实际支持情况取决于商户和银行，不要默认每家店都能扫。',
        ],
      },
    ],
    sourceLinks: [
      {
        label: '中泰二维码支付公告',
        url: 'https://www.bot.or.th/content/dam/bot/documents/en/news-and-media/news/2025/news-20251030.pdf',
      },
    ],
  },
  {
    id: 'motorbike-transport',
    order: 5,
    title: '租摩托 / 交通安全',
    shortTitle: '租摩托',
    timing: '每天都要注意',
    urgency: '第一周',
    summary: '对中国公民，这是高风险项。没有合法摩托资质，不建议在清迈骑摩托。',
    primaryAction: '不会骑或证件不齐的人，优先用 Grab、Bolt、双条车或正规包车。',
    keyPoints: [
      '在泰驾驶摩托车应持泰国驾照或国际驾照。',
      '只拿中国驾照、翻译件、公证件，出事故时可能影响保险和责任认定。',
      '不要押原件护照，租车前拍车况视频。',
    ],
    sections: [
      {
        heading: '先判断自己能不能骑',
        paragraphs: [
          '清迈路况和国内不同，单行线、山路、雨天、临时检查点都很常见。不会骑摩托的人，不要在清迈练车。',
          '中国驻泰使馆和驻清迈总领馆都提醒：在泰驾驶汽车或摩托车，应持泰国驾照或国际驾照。',
        ],
      },
      {
        heading: '如果一定要租',
        bullets: [
          '不要押原件护照，尽量用现金押金。',
          '租车前拍完整车况视频，检查刹车、轮胎、灯、头盔。',
          '确认合同、保险和赔付规则。',
          '全程戴头盔，不酒驾，不超速，不骑上山练手。',
        ],
      },
      {
        heading: '真正的风险',
        paragraphs: [
          '罚款不是最大问题。真正麻烦的是事故后的医疗费、第三方赔偿和保险拒赔。',
          '如果只是日常通勤，Grab、Bolt、双条车和正规包车通常更稳。',
        ],
      },
    ],
    sourceLinks: [
      {
        label: '中国驻泰使馆摩托提醒',
        url: 'https://th.china-embassy.gov.cn/chn/zgqz/1w1/201711/t20171130_1448594.html',
      },
      {
        label: '中国驻清迈总领馆交通提醒',
        url: 'https://chiangmai.china-consulate.gov.cn/xwdt/zlggg/202602/t20260211_11856221.htm',
      },
    ],
  },
  {
    id: 'health-medication',
    order: 6,
    title: '看病 / 买药 / 保险',
    shortTitle: '医疗买药',
    timing: '出发前和落地后',
    urgency: '第一周',
    summary: '保险、常用药、医院路线要提前准备。严重症状直接去诊所或医院。',
    primaryAction: '出发前买医疗保险；带药入境前查泰国 FDA 要求。',
    keyPoints: [
      '旅行医疗保险要看是否覆盖门诊、住院、急救转运、摩托事故。',
      '普通药品个人使用通常不超过 30 天，最好保留原包装和处方。',
      '麻醉类、精神类药物要提前查 Thai FDA，可能需要许可。',
    ],
    sections: [
      {
        heading: '保险先买好',
        paragraphs: [
          '来泰国前建议买旅行医疗保险。长期住、远程工作、骑摩托、参加户外项目的人，更应该认真看保险条款。',
          '重点看是否覆盖门诊、住院、急救转运、摩托事故，以及是否需要先垫付。',
        ],
      },
      {
        heading: '小病和急病怎么处理',
        bullets: [
          '普通感冒、肠胃、蚊虫叮咬、小外伤，可以先去药店咨询。',
          '持续高烧、腹泻脱水、严重外伤、呼吸困难、过敏反应，应直接去诊所或医院。',
          '不要乱买抗生素、精神类药物或不认识的药。',
        ],
      },
      {
        heading: '带药入境',
        paragraphs: [
          '泰国 FDA 说明，普通现代药个人使用通常不超过 30 天。药品最好放在原包装里，并带处方或医生证明。',
          '麻醉类、精神类药物规则更严格，出发前要到 Thai FDA 官方系统查询。不要替别人带药，不要邮寄不明药品。',
        ],
      },
    ],
    sourceLinks: [
      {
        label: '泰国 FDA 药品说明',
        url: 'https://en.fda.moph.go.th/our-services-new/category/cat2-frequently-asked-questions',
      },
      {
        label: 'Thai FDA 药品查询',
        url: 'https://permitfortraveler.fda.moph.go.th/nct_permit_main/Main/FRM_checkdrug_index',
      },
    ],
  },
  {
    id: 'restricted-items',
    order: 7,
    title: '电子烟 / 大麻 / 违禁品',
    shortTitle: '违禁品',
    timing: '出发前清包',
    urgency: '必须先做',
    summary: '电子烟和大麻都不要按“街上有人卖”来判断安全。中国公民更要远离 THC、CBD。',
    primaryAction: '出发前清掉电子烟、大麻相关食品饮料和不明药品。',
    keyPoints: [
      '泰国官方明确提醒电子烟相关进口、销售、持有等可能违法。',
      '没有泰国执业医疗人员处方，不要购买、使用、携带或运输大麻花。',
      '中国公民不要购买带 Cannabis、THC、CBD 字样的食品、饮料、伴手礼。',
    ],
    sections: [
      {
        heading: '电子烟不要带',
        paragraphs: [
          '泰国官方明确提醒，电子烟相关进口、销售、持有等都可能涉及违法。游客不要带入境，不要在街上买，不要在公共场所使用。',
          '看到有人卖，不代表安全。执法和处罚风险都由自己承担。',
        ],
      },
      {
        heading: '大麻不要碰',
        paragraphs: [
          '泰国 2025 年后已明显收紧大麻管理。官方提醒游客：没有泰国执业医疗人员开具的有效处方，不要购买、使用、携带或运输大麻花。',
          '中国公民还要注意，中国对 THC、CBD 等大麻相关成分有严格管制语境。不要买带大麻叶标识、Cannabis、THC、CBD 字样的食品、饮料和伴手礼。',
        ],
      },
      {
        heading: '简单规则',
        bullets: [
          '电子烟不带、不买、不用。',
          '大麻不买、不吃、不带回国。',
          '不替别人携带药品、烟弹、食品或不明伴手礼。',
        ],
      },
    ],
    sourceLinks: [
      {
        label: '泰国电子烟官方提醒',
        url: 'https://thailand.go.th/useful-information-detail/009_130',
      },
      {
        label: '泰国大麻游客提醒',
        url: 'https://thailand.go.th/public/issue-focus-detail/cannabis-now-strictly-regulated-in-thailand--important-notice-for-tourists',
      },
    ],
  },
  {
    id: 'smoke-season-emergency',
    order: 8,
    title: '烟季 / 野外项目 / 紧急电话',
    shortTitle: '烟季急救',
    timing: '2 月到 4 月重点关注',
    urgency: '按季节',
    summary: '清迈烟季和户外项目要提前评估。紧急电话建议直接保存到手机。',
    primaryAction: '保存报警 191、急救 1669、旅游警察 1155、驻清迈总领馆领保电话。',
    keyPoints: [
      '清迈烟季通常集中在 2 月到 4 月，3 月和 4 月风险较高。',
      '敏感人群应提前看空气质量，准备 N95/KN95 和空气净化器。',
      '野外徒步、漂流、丛林飞跃等项目要看天气，选正规机构。',
    ],
    sections: [
      {
        heading: '烟季怎么判断',
        paragraphs: [
          '清迈烟季通常集中在 2 月到 4 月，3 月和 4 月风险较高。每年情况不同，出发前要看 Air4Thai、IQAir 等空气质量工具。',
          '哮喘、心肺问题、免疫问题、带孩子的人，尽量避开空气最差的时间段。',
        ],
      },
      {
        heading: '烟季怎么准备',
        bullets: [
          '住处尽量选择有空气净化器的房间。',
          '外出准备 N95 或 KN95 口罩。',
          '空气差时减少跑步、骑车、爬山等户外运动。',
          '出现胸闷、呼吸困难、持续咳嗽等症状，及时就医。',
        ],
      },
      {
        heading: '紧急电话',
        bullets: [
          '泰国报警电话：191。',
          '泰国急救电话：1669。',
          '泰国旅游警察热线：1155，有中文服务。',
          '中国驻清迈总领馆领保电话：081-882-3283。',
          '外交部全球领事保护与服务应急热线：+86-10-12308。',
        ],
      },
    ],
    sourceLinks: [
      {
        label: '泰国紧急电话列表',
        url: 'https://www.thailand.go.th/issue-focus-detail/003_003',
      },
      {
        label: '中国驻清迈总领馆安全提醒',
        url: 'https://chiangmai.china-consulate.gov.cn/xwdt/zlggg/202602/t20260211_11856221.htm',
      },
      {
        label: '泰国 PM2.5 官方提醒',
        url: 'https://thailand.go.th/public/issue-focus-detail/001_07_005-2',
      },
    ],
  },
];
