# Feature slices

这个目录是给并行开发用的功能边界。规则很简单：

- `home/blackboard/*`：负责社区动态、黑板帖子模型和黑板页面组件。
- `home/survival-kit/survival-guide-library.tsx`：负责清迈生存指南内容展示。
- `check-ins/*`：负责打卡、补一句、图片上传后的推荐创建流程。
- `interactions/*`：负责点赞、想去、盖戳这类人与内容之间的互动。
- `achievements/*`：负责成就计算、解锁状态和本地已读记录。

共享文件要少改：

- `src/db/api.ts` 只放 Supabase 表读写，不放页面流程。
- `src/types/*` 只放跨功能契约。
- `src/lib/paths.ts` 只放路由拼接。
- `src/pages/*` 尽量只做页面编排和导航。

多个 Agent 或多个人一起写时，先认领一个 feature slice。只有新增路由、改数据库契约、改全局类型时，才需要同步其他功能组。
