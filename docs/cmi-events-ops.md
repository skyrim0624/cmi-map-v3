# CMI Map 活动库运营说明

## 目标

`有什么活动？` 不是普通地点推荐，而是给用户一个“今天下午、今晚、明天、周末能参加什么”的入口。

排序原则：越靠近当前时间越靠前。没有当天活动时，展示未来几天活动和稳定周期活动。

## 活动来源

优先级从高到低：

1. CMI / 清迈客栈自有活动公告。
2. 官方或政府活动页，例如城市节庆、大型展览、市政活动。
3. 场所自有公告，例如音乐现场、瑜伽馆、画廊、市集、咖啡馆活动。
4. 社区成员推荐，但需要补来源链接或截图后再公开。
5. 稳定周期活动，例如固定市集、周末夜市，作为兜底源。

## 公开标准

每条活动至少要有：

- 标题
- 时间或稳定周期
- 地点
- 来源
- 核实状态
- 类型标签
- 费用和参与方式
- 活动图片

`needs-review` 只能作为运营候选，不建议公开给普通用户。公开页优先展示 `verified` 和 `stable-recurring`。

## 活动图片标准

被选入 CMI Map 的活动必须配图片，不能只录文字。

优先级：

1. 来源里有官方海报或主办方海报时，优先使用原海报。
2. 来源没有海报但有明确现场图、主视觉或封面图时，可以使用该图作为活动封面。
3. 来源没有可用图片时，必须用 Image Generator 生成一张活动海报，再作为 `coverImagePath` 或 `coverImageUrl` 写入。

生成海报时要基于已核实字段：活动标题、地点、时间、活动类型、氛围和费用信息。不要生成会误导用户以为是官方原海报的图；来源说明里应保留真实活动来源，并在内部记录该图是生成图。

## 数据库维护

正式活动表：`public.cmi_events`。

当前前端读取策略：

- 公开页优先从 Supabase `cmi_events` 读取 `published` 活动。
- 如果数据库不可用，前端回退到 `src/data/cmi-events.ts` 的本地种子数据，避免活动页空白。
- 清迈客栈主页的“客栈活动”也读取正式活动库；只展示 CMI / 清迈客栈相关的近期活动，不再把全城活动误标成客栈现场。
- 普通用户只能读取 `published` 活动。
- 登录 admin 可以新增、更新、删除活动；AI 后续可以通过服务端任务写入 `ai-candidate` 或 `draft`，再由运营核实发布。

核心状态：

- `visibility_status`：`draft` / `published` / `archived`
- `verification_status`：`verified` / `needs-review` / `stable-recurring` / `ai-candidate` / `rejected`
- `ai_payload`：给后续 AI 候选整理、标签抽取、来源评分保留的结构化字段。
- `raw_source_payload`：保存原始来源信息，方便人工复核。

## 每日维护流程

1. 上午收集候选：官网、政府活动页、场所公告、CMI 群内活动。
2. 中午核实：时间、地点、报名方式、费用、取消或改期风险。
3. 中午到下午补图片：优先保存官方海报；没有海报时，用 Image Generator 生成活动海报。
4. 下午更新：把已核实活动写入活动库，按类型打标签并写入活动图片；同步更新 `src/data/cmi-events.ts` 作为前端兜底数据。
5. 晚上复核：当天晚间活动是否仍有效。

## 正式版发布口径

正式版上线后，每次活动更新至少做三件事：

1. 更新远程 `public.cmi_events`：新增未来活动设为 `published`，已结束活动设为 `archived`。
2. 更新本地兜底：`src/data/cmi-events.ts` 保持和线上活动库同一批高可信活动，避免数据库暂不可用时页面空白。
3. 更新可审计 SQL：把当次发布动作保存到 `supabase/migrations/`，便于追溯活动来源、核查时间和发布字段。
4. 更新活动图片：每条新增公开活动都必须有官方海报、来源封面或 Image Generator 生成海报。

Time Out 的本周末专题可以作为及时线索源；如果只用 Time Out，`reliabilityNote` 必须写明“出发前仍建议复核场地方动态”。Citylife、主办方官网、场地方页面和 CMI 自有公告优先级更高。

最新一次维护：2026-06-01 22:00 ICT，本轮扫描 `五月活动` 与 `六月活动` 发现新增候选：`/Users/andreas/CMI/活动宣传内容/六月活动/6.3 好奇社活动：古城与古寺——清迈古城与佛寺文化`，核实后发布为 `cmi-curiosity-old-city-temples-2026-06-03`（发布中使用官方海报）。同时补齐 `cmi-five-minute-music-kid-a-2026-06-02` 的首页卡片背景图。

同步动作：

- 远程 `public.cmi_events` 已新增/更新：新增 `published` 活动 `cmi-curiosity-old-city-temples-2026-06-03`，并保留 `source_label = CMI 活动宣传内容文件夹`。
- 已归档已结束活动：14 条；到 `next_check_before` 需复核活动：0 条；仍可参加活动暂无需要刷新复核时间的条目。
- 本地兜底 `src/data/cmi-events.ts` 已同步更新维护时间、事件条目与 `coverImageUrl`；`src/data/cmi-event-details.ts` 已补充 6.3 详情页、首页卡片背景映射，并补齐 6.2 音乐会首页卡片背景映射。
- 已补充可审计 SQL：`supabase/migrations/20260601220029_sync_cmi_inn_events_and_publish_curiosity.sql`（同步包含状态归档/复核刷新与新增事件 upsert）。

当前远程与本地可见的 future CMI / 清迈客栈活动：
`cmi-five-minute-music-kid-a-2026-06-02`、`cmi-curiosity-old-city-temples-2026-06-03`、`cmi-talk-fathers-day-speaker-call-2026-06-07`。

类型检查和生产构建在本轮均已通过；`/cmi-home` 基础验证通过构建产物检查、远程活动条目核对和本地预览静态资源检查。

## 类型标签

当前支持：

- CMI
- 工作坊
- 身心灵
- 禅修
- 运动
- 音乐
- 科技
- 展览
- 市集
- 节庆
- 聚会
- 稳定去处

后续接 AI 时，AI 只负责提出候选和预填字段；是否公开仍需要人核实。
