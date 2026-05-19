# CMI Map 优化任务日志

更新时间：2026-04-26 22:49:34 +07

## 目标

继续优化完善 CMI Map，并在项目根目录与 Obsidian 同步记录计划、执行步骤、当前状态和验证结果。

## 日志位置

- 项目根目录：`/Users/andreas/vibe coding/nomaday app!!/cmi map v1/CMI_MAP_TASK_LOG.md`
- Obsidian：`/Users/andreas/cmi社区知识库/CMI/CMI map/CMI_MAP_TASK_LOG.md`

## 当前计划

1. [完成] 建立并同步任务日志
2. [部分完成] 做真实链路 QA，覆盖公开浏览、登录/注册、收藏、点赞、个人页、打点入口
3. [完成] 复查 `wishlists` 策略，决定是否公开收藏热度读取
4. [完成] 增加“快速文字推荐”入口，降低打点流程对相机/GPS/语音权限的依赖
5. [完成] 跑类型检查、构建和 lint
6. [完成] 汇总变更、剩余风险和下一步建议
7. [完成] 将 2026-04-26 产品原则收敛写入项目文档与知识库
8. [完成] 做「人的地图」与「探索感」的最小实现

## 执行记录

### 2026-04-26 15:48:17 +07

- 创建任务日志。
- 已同步到 Obsidian。
- 下一步：开始 QA 和功能优化。

### 2026-04-26 15:49:00 +07

- 开始复查现有打点页、wishlist 数据策略和可接入的快速推荐入口。

### 2026-04-26 15:54:00 +07

- `wishlists` 策略结论：暂不开放公开读取全量收藏关系。当前前端只需要当前用户收藏状态和个人页“想去”列表，保持本人可读更符合隐私边界。
- 开始实现快速文字推荐入口：从 `/mark` 的相机页增加入口，复用手动选点、文字输入、分类提交。

### 2026-04-26 15:57:00 +07

- 快速文字推荐入口已完成：相机页新增铅笔按钮和“直接文字推荐”入口。
- 快速流程路径：手动地图选点 → 文字/语音推荐 → 分类 → 提交。
- 已同步 README 和 PRD 文档。
- 已通过类型检查和生产构建，下一步跑完整 lint。

### 2026-04-26 15:59:00 +07

- 清理 `MarkPlace` 未使用的导入和状态。
- 本地 HTTP 探测 `/mark` 与 `/login` 均返回 200。
- 完整 lint 已通过。
- 浏览器自动化工具当前未暴露可用接口，未创建线上测试账号；登录后提交、收藏、点赞、盖戳仍建议人工点一遍。

### 2026-04-26 16:02:00 +07

- 用户要求提交并推送代码。
- 当前分支：`master`。
- 下一步：最终检查 → stage → commit → push。

### 2026-04-26 16:04:00 +07

- 用户反馈线上列表页在点赞/贴纸/收藏计数出现后，地点名被挤成竖排。
- 定位原因：列表卡片底部元信息和互动计数在同一 flex 行内竞争宽度。
- 修复方案：`ListView` 与 `Profile` 列表卡片改为两行布局；地点/推荐人单独一行单行截断，贴纸/点赞计数单独一行并允许换行。

### 2026-04-26 16:46:00 +07

- 用户反馈移动端列表页右侧内容被裁切，卡片边框和文字超出屏幕右边。
- 定位原因：列表容器移动端横向 padding 较大，卡片 hover 翘角/旋转效果在手机浏览器中仍参与布局视觉边界，叠加内容区未完全限制宽度。
- 修复方案：`ListView` 列表容器改为移动端安全宽度；列表卡片与右侧内容增加 `max-width`、`min-width: 0` 和溢出控制；桌面端纸张翘角/hover 效果仅在鼠标设备上启用。
- 已通过 `pnpm exec tsgo -p tsconfig.check.json`、`pnpm build`、`pnpm lint`。
- 已提交并推送：`ec84c1d Fix mobile list card overflow`。
- 已部署 Cloudflare Pages：`https://8d6ccfa2.cmi-map.pages.dev`，自定义域名 `https://cmti.uk` 返回 200。
- 线上移动端截图复验后发现仍有横向撑宽；进一步定位为 Radix `ScrollArea` 的内部包装在长内容下扩大列表宽度。
- 二次修复：列表页改用普通纵向滚动容器，并显式禁止横向滚动，保留卡片内部宽度保护。
- 本地生产包手机宽度截图复验通过：卡片右边框完整显示，长文案在卡片内截断。

### 2026-04-26 19:20:34 +07

- 用户确认 CMI Map 产品原则收敛：不做广告地图，也不做 AI 行程工具；回到干净、慢、有人味、轻社交、像手账和开放世界留言的产品气质。
- 新增 `docs/product-principles.md` 作为产品原则单一来源。
- 同步更新 README、PRD、未来更新清单、Agent-Memory 项目 Wiki 和 Codex 共享记忆。
- 功能排序调整：保留照片体验、日记模式、贴纸/盖章、探索模式、正在清迈；延后 LLM 路线规划、商家合作、复杂评论系统；谨慎处理排行榜、广告位、批量商业 POI。
- 验证：`git diff --check` 与 `pnpm lint` 均通过。

### 2026-04-26 22:49:34 +07

- 新增公开推荐人地图页 `/people/:userName`，展示 TA 的清迈地图、品味轨迹、代表性一笔和推荐列表。
- 列表页、地图预览卡片、地点详情页的推荐人名字已串到推荐人地图页，形成“人的路径”。
- 首页新增轻探索入口：「今天去哪」跳转当天推荐，「最近痕迹」跳转最近留下推荐的人。
- 已通过 `pnpm exec tsgo -p tsconfig.check.json`、`pnpm lint`。
- 浏览器复验通过：首页轻探索入口可见，最近痕迹可进入推荐人页，详情页推荐人入口可进入推荐人页。

### 2026-05-18 合并 V3 优点到当前 Scene 主线

- 保留当前 Scene 意图首页，不恢复 V3「今日痕迹卡」作为默认首页。
- 从 V3 吸收“同一地点补一句”的低门槛贡献闭环：新增 `/place/:placeName/add-trace`，自动沿用地点名、分类和坐标，只让用户补一句体验，可选照片。
- 地点详情页新增「我也来补一句」入口，补充成功后回到原地点并高亮刚补充的推荐。
- 地点详情页将收藏按钮文案收束为「想去 / 已想去」，继续复用现有 `wishlists`，不新增数据库表。
- 本轮不迁入 V2/V3 的 `meet_signals`、`visibility`、`visited_at`，避免触碰数据库结构或依赖未确认表。

### 2026-05-18 直接意图板块：搜索 + 双行横滑 Tag

- 用户在 UI playground 中更倾向第 9 种方案，并提出组合方案：上方保留意图搜索 / 自然语言入口，下方采用第 3 种双行横滑方式展示所有高频 Tag。
- 产品判断：这不是搜索优先，而是“自然语言入口 + 可扫读快捷入口”并存；知道怎么表达的用户可以输入，不想输入的用户直接点 Tag。
- 实现方向：
  - 顶部输入框用于本地轻量匹配一级意图、二级地点类型和三级判断词。
  - 下方 Tag 区采用双行横向滑动，入口更小，避免正式首页中两个大卡片占满一行。
  - 点击一级意图进入对应 Scene 结果；点击二级地点类型进入对应 Scene 并携带 `placeType` 筛选。
  - 暂不接 AI，不改数据库，先把交互和数据结构跑通。
- 本轮实现：
  - 首页直接意图板块已替换为“输入框 + 双行横滑 Tag”，不再使用两列大卡片。
  - `getSceneListPath` / `getSceneMapPath` 支持 `placeType`，并保留旧的 `filter` 参数兼容清迈生存包。
  - 列表页和地图页已读取 `placeType`，展示地点类型徽标，并在列表 / 地图之间跳转时保留该筛选。
  - 意图输入支持点击箭头和 Enter 提交；输入“我很饿”会匹配到吃饭场景。
- 本轮验证：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm build` 通过。
  - `pnpm lint` 通过。
  - `git diff --check` 通过。
  - 本地浏览器验证：首页首屏渲染正常，无 console error；输入“我很饿”可进入 `/list?scene=eat`；点击“咖啡馆”Tag 可进入 `/list?scene=coffee-work&placeType=cafe`；从列表进入地图可保留 `placeType`。

### 2026-05-18 模糊意图：AI 动态路线生成器

- 用户纠正：灵感小路线不应由人工逐条审核，也不应停留在固定模板；真正目标是 AI 根据用户当前位置、区域、偏好、预算、交通、想去点和主题即时生成个性化路线。
- 产品判断更新：人工只维护底层材料和边界，例如地点可信度、标签、活动过期、风险点和可用数据源；路线本身由 AI 随机应变生成。
- 原型接入策略：先做 Codex 本地桥，前端调用 `/api/ai-route-draft`，开发服务器再调用 `codex exec` 返回结构化 JSON。
- 速度策略：Codex 桥默认使用最快、小模型优先，当前默认 `gpt-5.3-codex-spark`，可用环境变量 `CMI_CODEX_BRIDGE_MODEL` 覆盖。
- 长期策略：后续抽象为 `CodexLocalProvider` / `OpenAIProvider` / `LocalFallbackProvider`，正式用户能力再切 API。
- 第一版实现：
  - 新增 `src/types/ai-route.ts` 和 `src/services/ai-route.ts`，定义结构化路线、候选地点、候选活动、本地兜底和桥调用。
  - 新增 `scripts/cmi-route-draft.schema.json`，要求 Codex 桥返回固定 JSON 结构。
  - 新增 Vite 开发中间件 `/api/ai-route-draft`，本地调用 `codex exec -m gpt-5.3-codex-spark`，reasoning effort 降到 `low`，禁用插件加载并忽略本机用户插件配置，默认 20 秒超时，超时后前端回落到本地兜底。
  - 新增 `/ai-route-lab` 实验页，并从 `/ops/intent` 加入口。
  - 实验页会把 CMI Map 推荐点、guide、场景标签、地点类型标签、细节标签和活动库转成候选材料，再按用户输入做初筛；为了保证速度，默认只把前 2 个候选点和截短摘要交给 Codex 桥，只有明确问活动类需求才带最多 1 个活动。

### 2026-05-18 AI 动态路线优先级调整

- 用户决定：动态路线开发可以最后再做，当前先聚焦手头功能，把模糊意图入口、活动数据、地点标签、兜底推荐和基础体验做好。
- 执行调整：
  - `/ai-route-lab` 原型保留，作为后置实验，不继续往主线推进。
  - `/ops/intent` 中的 AI 路线入口从上方主位移到页面底部，避免干扰当前运营底座。
  - 后续路线能力再做时，优先切正式 API provider，而不是继续深挖 Codex 本地桥体验。

### 2026-05-18 直接意图板块 UI/UX 收束

- 本轮只处理首页第一个“直接意图”板块，不动底部「标记新地点」按钮。
- 根据 UI/UX 审查和用户反馈，修正 6 个问题：
  - 弱化搜索框视觉权重，避免用户误以为必须输入。
  - 一级事项和二级地点类型分开：一级是「吃饭 / 办公 / 学习 / 购物 / 游玩 / 放松 / 运动 / 办事」，二级改为「常用类型」横滑。
  - 移除首页右侧由直接意图派生出来的 4 个重复快捷图标，避免两套同层级入口打架。
  - 给二级横滑增加「更多」提示和右侧渐隐，提升可发现性。
  - 结果页增加 loading 状态，避免先闪 0 处；当数据库或具体类型为空时，用已有 CMI 社区底库做只读兜底，不写数据库。
  - 去掉“可以输入一句话，也可以直接点下面分类”这类说明书文案，改为更轻的辅助输入。
- 本轮验证：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm build` 通过。
  - `pnpm lint` 通过。
  - `git diff --check` 通过。
  - 浏览器验证：首页直接意图层级正常；`/list?scene=coffee-work&placeType=cafe` 不再停在空结果；控制台无 error / warn。

### 2026-05-19 模糊意图入口与附近定位

- 用户判断：模糊意图首屏先收窄，不放太多入口；先删掉“今晚去哪”，只保留“附近逛逛 / 周末去哪 / 有什么活动”三个高频入口。
- 本轮实现：
  - 首页“主要模糊意图”只引用 `nearby-wander`、`weekend`、`tomorrow-events` 三个 scene。
  - `night` 场景保留旧链接兼容，但从首页展示池移除。
  - “明天有什么活动”改成“有什么活动”，列表标题改成“近期可以参加的事”。
  - “附近逛逛”进入地图页后会请求用户当前位置；定位成功时显示用户位置 marker，并把地图以用户当前位置为中心，附近点按距离排序。
  - 定位失败时显示明确状态和“重试”按钮，用户允许定位后可重新请求。
- 本轮验证：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm build` 通过。
  - `pnpm lint` 通过。
  - `git diff --check` 通过。
  - 浏览器验证：首页只显示“附近逛逛 / 周末去哪 / 有什么活动”，不再显示“今晚去哪”；`/map?scene=nearby-wander` 可看到定位状态，当前浏览器未授权定位时显示失败提示和“重试”按钮。

### 2026-05-19 模糊意图补入口与地图空间调整

- 用户补充：模糊意图区需要一个“看看大家都去了哪里”的入口，点击后直接进入详情列表。
- 用户反馈：`/map?scene=nearby-wander` 顶部和底部控件把地图压得太小，地图页应该让地图本身更大。
- 本轮实现：
  - 首页模糊意图区新增“大家都去了哪里”，复用 `pick-for-me` 场景，点击直接进入 `/list?scene=pick-for-me`。
  - `/ops/intent` 的模糊意图运营列表同步加入 `pick-for-me`。
  - 附近逛逛地图页先把底部大场景卡片压成轻量小条，随后根据用户反馈继续删掉这条小条，让附近页只保留顶部状态和地图本身。
  - 附近逛逛地图页顶部控件进一步精简为“完整地图 / 看清单”两个入口，移除中间的“附近逛逛 36 处”状态 pill 和右上角重复列表按钮。
- 本轮验证：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm build` 通过。
  - `pnpm lint` 通过。
  - `git diff --check` 通过。
  - 浏览器验证：首页出现四个模糊意图入口；“大家都去了哪里”点击后进入 `/list?scene=pick-for-me`；附近逛逛地图页不再显示底部场景卡片，顶部只保留两个入口，且“看清单”进入 `/list?scene=nearby-wander`，“完整地图”进入 `/map`。

### 2026-05-19 活动库运营底座

- 用户明确：“有什么活动”不应该只是地点列表，而是一个需要每日维护、核实来源、按时间展示的清迈活动库。
- 本轮实现：
  - 扩展 `src/data/cmi-events.ts`，给活动增加来源类型、核实状态、最后核实时间、下次复核时间、稳定周期活动、活动分类和时间分组。
  - “有什么活动”列表页改为按活动时间排序，越近越靠前；公开页优先展示已核实活动和稳定周期活动。
  - 活动页增加分类筛选，支持 CMI、工作坊、身心灵、禅修、运动、音乐、科技、展览、市集、节庆等后续运营分类。
  - 有活动数据时不再混入普通地点推荐卡，避免用户点“有什么活动”后看到一堆地点列表。
  - `/ops/intent` 里补充活动来源、核实状态、最后核实时间，方便后续做运营维护台。
  - 新增 `docs/cmi-events-ops.md`，记录活动来源优先级、公开标准、每日维护流程和后续 AI 接入边界。
- 当前边界：
  - 这轮只做本地活动库结构和前端展示，没有接外部抓取、没有接 AI 候选搜集、没有做后台录入，也没有动数据库。
  - 后续要补的是：来源采集器、AI 候选整理、人工核实入口、数据库落表、报名/搭子联动。
- 本轮验证：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm build` 通过。
  - `pnpm lint` 通过。
  - `git diff --check` 通过。
  - 浏览器验证：`/list?scene=tomorrow-events` 显示“今天和最近有什么活动”，活动按时间排序并提供分类筛选，console 无 error / warn。

### 2026-05-19 周末去哪地点库核查

- 用户明确：`周末去哪` 需要维护一套只在周末、周六、周日开放或发生的清迈地点/活动库，不能只放普通地点列表。
- 本轮核查：
  - 核查稳定周末场：Jing Jai 周末市集、周六步行街、周日步行街、Tong Tung 周末市集、Chamcha 周末手作市集、Coconut Market、Baan Kang Wat 周日晨市、Nana Jungle 周六晨市、Nong Ho 周末旧物市集。
  - 核查本周末活动：Chiang Mai Pride 2026 已入库；Northern Scooter Show 2026 因缺少每日具体开放时间，先放在候选清单。
  - 核查动态来源：CityNow / Chiang Mai Citylife、Time Out Chiang Mai、主办方/场地方页面适合做每周维护源。
- 本轮实现：
  - 更新 `src/data/cmi-events.ts`，给原有周末活动补 `sourceUrl`、更准确的开放时间、复核备注，并新增 7 个稳定周末场 + 1 个本周末活动。
  - 新增 `docs/cmi-weekend-place-library.md`，记录已入库、已核查但暂不入库、每周维护源、后续字段建议和当前不足。
- 当前边界：
  - 没有动数据库，只更新前端本地活动数据和文档。
  - Facebook / Google Maps 实时营业状态还未接入，周五下午仍需要人工或自动化复核。
  - 临时活动仍需要采集器和审核流，不能当成稳定地点一次性写死。
- 本轮验证：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm build` 通过。
  - `pnpm lint` 通过。
  - `git diff --check` 通过。
  - 浏览器验证：`/list?scene=weekend` 显示新增周末地点库条目；新日志窗口无 error / warn；活动卡片标签已去重，避免重复 key 警告。

### 2026-05-19 活动库数据库化

- 用户明确：活动后续需要经常更新，并且会考虑接 AI，所以不能只放本地前端文件；下一步要直接建可维护的活动库。
- 本轮实现：
  - 新增 Supabase migration：`20260519054425_create_cmi_events.sql`。
  - 新增补充 migration：`20260519055250_fix_cmi_events_rls_policy.sql`，合并 `authenticated` 的活动读取策略，消除新表 multiple permissive policy advisor 警告。
  - 新建 `public.cmi_events` 表，支持活动类型、开始/结束时间、周期规则、来源、核实状态、公开状态、复核时间、标签、AI payload 和原始来源 payload。
  - 设置 RLS：普通用户只能读取 `published` 活动；登录 admin 可以新增、更新、删除；service role 保留给后续 AI/自动化任务写入候选。
  - 显式 `grant select` 给 `anon` / `authenticated`，避免 Supabase 新表未自动暴露到 Data API 的问题。
  - 把当前 11 条活动/稳定活动源 seed 到远端 `cmi_events` 表。
  - 前端新增 `src/db/cmi-events.ts`，活动页、运营页和 AI 路线实验页都改为优先读 Supabase，数据库不可用时回退本地 `CMI_EVENTS` 种子数据。
  - 更新 `docs/cmi-events-ops.md`，补充数据库维护口径、状态字段和 AI 候选接入边界。
- 远端验证：
  - `supabase db push --yes` 已成功应用 `20260519054425` 和 `20260519055250`。
  - `supabase db query --linked` 查询 `public.cmi_events`：共 11 条，published 11 条，stable-recurring 9 条。
  - 使用前端 anon key 走 REST `/rest/v1/cmi_events`：返回 200，可读 11 条 published 活动。
  - `supabase db advisors --linked` 复查后，`cmi_events` 无新增 advisor 警告；剩余 warning 均来自旧函数、旧存储桶或旧表策略。
- 本轮验证：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm build` 通过。
  - `pnpm lint` 通过。
  - `git diff --check` 通过。

### 2026-05-19 周末活动卡片跳地图详情

- 用户指出：周末活动卡片只能看，不能点击跳转；期望点击后进入地图，并在下方出现该活动/地点的详情卡片。
- 本轮实现：
  - `getSceneMapPath` 支持 `event` 参数，用于表达地图页当前选中的活动。
  - 活动卡片改为真实路由链接，卡片可跳到 `/map?scene=weekend&event=<eventId>`。
  - 给本地周末活动种子补前端地图坐标和地图分类，并在读取远端 `cmi_events` 时按 `id/title` 合并这些前端地图元数据。
  - 地图页把活动转成临时 marker，不写入 `recommendations` 表；命中 `event` 参数时自动居中并弹出底部活动详情。
  - 底部活动详情展示标题、时间、地点、核实来源、标签和来源链接。
- 本轮验证：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm build` 通过。
  - `pnpm lint` 通过。
  - `git diff --check` 通过。
  - 浏览器验证：`/map?scene=weekend&event=jing-jai-weekend-market` 能显示地图和 Jing Jai 底部详情卡片。

## 验证记录

- `pnpm exec tsgo -p tsconfig.check.json`：通过。
- `pnpm build`：通过。
- `pnpm lint`：通过。
- `git diff --check`：通过。
- `curl -I http://127.0.0.1:5173/mark`：200。
- `curl -I http://127.0.0.1:5173/login`：200。

### 2026-05-18 AI 动态路线生成器验证

- `pnpm exec tsgo -p tsconfig.check.json`：通过。
- `pnpm build`：通过。
- `pnpm lint`：通过。
- 浏览器验证：
  - `/ops/intent` 能看到“动态路线生成器”入口。
  - `/ai-route-lab` 能加载用户条件、候选材料和生成按钮。
  - 点击“生成路线草案”后，Codex 桥成功返回 `gpt-5.3-codex-spark` 生成的 schema JSON 路线。
  - 若 Codex 桥超时，前端会展示本地兜底路线和失败原因。
  - 浏览器 console 未发现前端错误。

## 剩余人工验证清单

- 注册新用户时昵称是否进入个人页与推荐署名。
- 快速文字推荐：手动选点、填写文字、选择分类、提交后地图出现新点。
- 首次收藏、取消收藏、点赞、盖戳在远程 RLS 收紧后是否正常。
- 个人页头像上传和昵称编辑是否正常。
