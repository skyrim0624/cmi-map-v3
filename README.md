# CMI Map 在清迈，跟着社区走

CMI Map 是一个由清迈数字游民社区（CMI）共建的本地探索指南。主张「手绘波普风、原始生命力、反精英主义」的 Neo-Brutalist 极简地图应用。从找一家能专心敲代码的咖啡馆，到发现隐藏在街角的便宜泰餐，这里记录着数字游民最真实的足迹与偏好。

🔗 **线上地址**：[cmimap.com](https://cmimap.com)

## 产品方向

CMI Map 不做广告地图，也不做 AI 行程工具；它是一张让用心生活的人彼此留下痕迹、产生默契的清迈地图。

当前 V1 首页从“地图优先”收敛为“选择优先”：用户进入后先看到 CMI Picks、今日推荐和几个高频场景入口，再决定看吃饭、咖啡、实用救急、闲逛、放松或完整地图。地图仍然重要，但它是理解空间关系的第二层，而不是把所有点位一次性压给用户。

当前产品原则记录在 [docs/product-principles.md](docs/product-principles.md)。后续功能需要先通过三个过滤问题：它会让地图更有人味，还是更像大众点评？它会让用户更想留下真实经验，还是只是在消费信息？如果一年后继续维护它，创作者会更喜欢这个产品，还是更厌烦它？

## 特色设计与审美（Sketchbook UI）

- **极简与高饱和**：抛弃平滑渐变与高科技感，采用「手绘粗描边 + 硬阴影」的 Sticker 审美，搭配手绘分类图标。
- **手账感互动**：点赞有墨水飞溅、卡片有翻角 Peel 动效、FAB 按钮有弹性硬按压反馈。
- **情绪化与非功利**：用波普涂鸦、非对称设计来表达在清迈探索的随性。
- **方向边界**：不引入普通商家广告位；AI 路线规划暂不作为核心方向，未来只能作为辅助发现工具。

## 功能模块

| 模块 | 路径 | 登录要求 | 说明 |
|------|------|---------|------|
| 共创探索地图 | `/` | ❌ 无需登录 | 默认展示 CMI Picks 精选点位和场景入口，可切换完整地图 |
| 足迹流 | `/list` | ❌ 无需登录 | 手账风格瀑布流，浏览社区推荐图文 |
| 地点详情 | `/place/:name` | ❌ 无需登录 | 推荐理由卡片 + 我也来补一句 + Google 导航 / Grab / Bolt 一键打车 |
| 补一句推荐 | `/place/:name/add-trace` | ✅ 需登录 | 给已有地点补充一句公开体验，可选照片，不重新选点 |
| TA 的清迈地图 | `/people/:userName` | ❌ 无需登录 | 推荐人的公开品味轨迹，支持跟着 TA 推荐过的地点继续探索 |
| 留一条痕迹 | `/mark` | ✅ 需登录 | 拍照 / 相册 / 快速文字推荐，支持语音或文字输入与手动校准坐标 |
| 我的清迈手账 | `/profile` | ✅ 需登录 | 紧凑横排头部、我的痕迹 / 想去清单 / 成就墙 |
| 🏆 成就系统 | `/profile` → 成就 Tab | ✅ 需登录 | 51 枚手绘徽章，分为品类鉴赏家、手账创作者、地图考古学家、互动行者、社区之光、隐藏彩蛋六大系列 |

> **设计理念**：浏览地点和列表不需要登录——允许用户把它当作一个简单的「导航推荐工具」。只有添加推荐、点赞、收藏等互动操作才需要登录。
> 首页新增轻探索入口：「今天去哪」把用户带向一条当天推荐，「最近痕迹」把用户带向刚留下推荐的人。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS
- **地图渲染**：Leaflet + React Leaflet
- **后端 / 数据库**：Supabase (PostgreSQL + Auth + Storage)
- **部署**：Cloudflare Pages（推送自动部署）

## 如何本地运行

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 生产构建
pnpm build

# 类型、Biome、样式和构建检查
pnpm lint
```

需要在项目根目录配置 `.env` 文件：
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 神奇动物物种识别

`/api/animal-identify` 支持外接自托管专业物种模型。服务实现放在 [services/species-model](services/species-model)，默认使用 BioCLIP 2.5 + BioCLIP 2 + 清迈常见动物候选库，返回中文名和拉丁学名。部署后在 Cloudflare Pages 配置：

```env
CMI_MAP_SPECIES_MODEL_URL=https://你的模型服务域名/identify
CMI_MAP_SPECIES_MODEL_TOKEN=模型服务密钥
```

数据库迁移放在 `supabase/migrations/`。新环境需要应用这些迁移来创建 `profiles`、`recommendations`、`upvotes`、`wishlists` 和贴纸相关表。当前权限策略允许公开浏览地点，登录用户只能写入自己的资料、推荐、点赞和收藏，管理员角色通过 `profiles.role = 'admin'` 控制。

## 项目结构

```
src/
├── components/       # 通用组件（RouteGuard、BadgeWall、LeafletMap 等）
├── contexts/         # AuthContext 认证上下文
├── db/               # Supabase API 交互层
├── lib/              # 工具函数（badgeUtils 等）
├── pages/            # 页面组件（MapView、ListView、PlaceDetail、Profile 等）
├── types/            # 类型定义（Recommendation、Category、Badge 等）
└── routes.tsx        # 路由配置（含 public 标记）
```

---

感谢每一位 CMI 成员用脚丈量清迈，用好奇心填满这本「清迈漫游手账」。
