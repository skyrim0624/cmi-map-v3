# CMI Map 周末地点库

最后核查：2026-05-19 12:35 ICT

## 口径

这个库只收三类内容：

- 稳定周末场：只在周六、周日，或核心摊位只在周末出现的市集、步行街、晨市、旧物市集。
- 本周末活动：明确发生在本周六/周日的展会、节庆、游行、工作坊等。
- 周末维护源：每周都要查的活动发布站，不直接当成地点。

不收每日营业的普通咖啡馆、商场、夜市，除非它有明确的周末限定活动。

## 已进前端数据

| 名称 | 类型 | 时间 | 区域 | 状态 | 来源 |
| --- | --- | --- | --- | --- | --- |
| Jing Jai 周末市集 | 周末市集 | 每周六、周日 06:30-15:00 | JJ Market / Chang Phueak | 稳定周期 | [Citylife - Jing Jai](https://www.chiangmaicitylife.com/clg/our-city/how-jing-jai-market-is-paving-the-way-for-sustainable-development-in-chiang-mai/) |
| 周六步行街 | 夜市 / 步行街 | 每周六 16:00-23:00 | Wua Lai Road / 古城南侧 | 稳定周期 | [LoveThailand - Wua Lai](https://www.lovethailand.org/travel/en/1-Chiang-Mai/14-Wua-Lai-Walking-Street.html) |
| 周日步行街 | 夜市 / 步行街 | 每周日 16:00-22:00 | Tha Phae / Ratchadamnoen | 稳定周期 | [Thai Holiday Guide - Sunday Walking Street](https://www.thaiholidayguide.com/attraction/chiang-mai-sunday-walking-street/) |
| Tong Tung 周末市集 | 绿色市集 | 每周六、周日 08:00-16:00 | Nong Chom / Meechok 附近 | 稳定周期 | [Citylife - Tong Tung](https://www.chiangmaicitylife.com/citynow/social-life/live-events/tong-tung-market-at-baan-rim-nam/) |
| Chamcha 周末手作市集 | 手作市集 | 每周六、周日 09:00-14:30 | San Kamphaeng / Bo Sang 方向 | 稳定周期 | [Chiang Mai Master - Chamcha](https://www.chiangmaimaster.com/place/chamcha-market) |
| Coconut Market 椰林市集 | 拍照 / 小市集 | 每周六、周日 08:00-13:00 | Fa Ham / Ruamchok 方向 | 稳定周期，周五开放信息有冲突 | [Chang Puak - Coconut Market](https://changpuakmagazine.com/en-article/COCONUT-MARKET/531169/) |
| Baan Kang Wat 周日晨市 | 艺术村晨市 | 每周日 08:00-14:00 | Wat Umong / Suthep | 稳定周期 | [Citylife - Baan Kang Wat Sunday Market](https://www.chiangmaicitylife.com/citynow/social-life/live-events/sunday-morning-market-baan-kang-wat/) |
| Nana Jungle 周六晨市 | 本地晨市 | 每周六 07:00-11:00 | Chang Phueak / Jed Yod 方向 | 稳定周期 | [Visit Thailand Today - Nana Jungle](https://www.visitthailandtoday.com/markets-shopping/chiang-mai/bamboo-saturday-market-nana-jungle) |
| Nong Ho 周末旧物市集 | 二手 / 旧物市集 | 每周六、周日 07:00-14:00 | 古城北侧 / Chang Phueak 方向 | 稳定周期 | [When in Chiang Mai - Nong Ho](https://www.wheninchiangmai.com/lb132290/nong-ho-flea-market-saturday-sunday) |
| Chiang Mai Pride 2026 | 本周日节庆活动 | 2026-05-24 13:00-24:00，游行约 16:00 开始 | Buddhasathan / Tha Phae Gate | 已核实，本周末活动 | [Adam's Apple Club - Chiang Mai Pride 2026](https://www.adamsappleclub.com/event/chiang-mai-pride-2026/) |

## 已核查但先不进稳定地点库

| 名称 | 原因 | 来源 |
| --- | --- | --- |
| Northern Scooter Show 2026 | 明确是 2026-05-23 到 05-24 的本周末活动，但公开页没给具体每日开放时间；适合进入“本周末活动候选”，复核时间后再公开。 | [Citylife - Northern Scooter Show 2026](https://www.chiangmaicitylife.com/citynow/whats-on/clubs-and-societies/northern-scooter-show-2026-2/) |
| Rustic Market | 已包含在 Jing Jai 周末场里；如果以后要细分 Jing Jai 的 Farmers Market / Rustic Market，可以拆成独立子事件。 | [Citylife - Rustic Market](https://www.chiangmaicitylife.com/citynow/whats-on/regular-events/rustic-market/) |

## 每周维护源

| 来源 | 用途 | 维护方式 |
| --- | --- | --- |
| [CityNow / Chiang Mai Citylife](https://www.chiangmaicitylife.com/citynow/) | 本周末活动、展览、节庆、运动、社区活动 | 每周二、周五各扫一次；有日期、地点、票价再入库 |
| [Time Out Chiang Mai - This Weekend](https://www.timeout.com/chiang-mai/things-to-do/weekly-event) | 本周末灵感、临时活动、展览、夜生活 | 只当线索源，必须回主办方或场地方二次核查 |
| 场地方 Facebook / 官网 | 市集临时停开、雨季变更、特别活动 | 对已入库地点在周五下午复核 |
| CMI 社区自有公告 | CMI 活动、清迈客栈活动、社区发起外出采集 | 优先级最高，活动当天中午前再核一次 |

## 后续数据字段建议

- `sourceUrl`：公开页来源。
- `lastCheckedAt`：最后核查时间。
- `nextCheckBefore`：下次必须复核时间。
- `reliabilityNote`：告诉运营者哪里可能变，比如雨季、周五是否开放、摊位数量。
- `weekendOnlyLevel`：建议后续加字段，取值为 `strict-weekend` / `weekend-core` / `this-weekend-only`。

## 当前不足

- Facebook 和 Google Maps 的实时营业状态还没有接入，只能靠公开网页和人工复核。
- 临时活动缺少自动采集器，现在只能手动从 Citylife、Time Out、主办方页面录入。
- Coconut Market 的周五开放信息存在平台冲突，前端先按周末推荐，周五不做推荐。
- 现在只是前端本地数据，没有落数据库；后续如果要多人维护，需要后台录入和审核流。
