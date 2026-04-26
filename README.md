# CMI Map 在清迈，跟着社区走

CMI Map 是一个由清迈数字游民社区（CMI）共建的本地探索指南。主张「手绘波普风、原始生命力、反精英主义」的 Neo-Brutalist 极简地图应用。从找一家能专心敲代码的咖啡馆，到发现隐藏在街角的便宜泰餐，这里记录着数字游民最真实的足迹与偏好。

🔗 **线上地址**：[cmti.uk](https://cmti.uk)

## 特色设计与审美（Sketchbook UI）

- **极简与高饱和**：抛弃平滑渐变与高科技感，采用「手绘粗描边 + 硬阴影」的 Sticker 审美，搭配手绘分类图标。
- **手账感互动**：点赞有墨水飞溅、卡片有翻角 Peel 动效、FAB 按钮有弹性硬按压反馈。
- **情绪化与非功利**：用波普涂鸦、非对称设计来表达在清迈探索的随性。

## 功能模块

| 模块 | 路径 | 登录要求 | 说明 |
|------|------|---------|------|
| 共创探索地图 | `/` | ❌ 无需登录 | 分类标记点展示，支持 Stardust 星尘缩放切换 |
| 足迹流 | `/list` | ❌ 无需登录 | 手账风格瀑布流，浏览社区推荐图文 |
| 地点详情 | `/place/:name` | ❌ 无需登录 | 推荐理由卡片 + Google 导航 / Grab / Bolt 一键打车 |
| 打点记录 | `/mark` | ✅ 需登录 | 拍照 / 相册 / 快速文字推荐，支持语音或文字输入与手动校准坐标 |
| 个人主页 | `/profile` | ✅ 需登录 | 紧凑横排头部、我的贡献 / 想去清单 / 成就墙 |
| 🏆 成就系统 | `/profile` → 成就 Tab | ✅ 需登录 | 36 枚手绘徽章，分为品类鉴赏家、地图探索、社区影响力三大系列 |

> **设计理念**：浏览地点和列表不需要登录——允许用户把它当作一个简单的「导航推荐工具」。只有添加推荐、点赞、收藏等互动操作才需要登录。

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
