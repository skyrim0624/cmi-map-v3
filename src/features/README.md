# Feature slices

这个目录是给并行开发用的功能边界。规则很简单：

- `home/sections/*`：首页每个区块单独一个文件；新增首页模块时先加 section 文件，再在 `home/sections/index.ts` 接入。
- `home/direct-intent/*`：只负责“我现在想做什么”的首页输入和跳转。
- `home/survival-kit/*`：只负责“清迈生存包”的首页输入和跳转。
- `check-ins/*`：负责打卡、补一句、图片上传后的推荐创建流程。
- `interactions/*`：负责点赞、想去、盖戳这类人与内容之间的互动。
- `achievements/*`：负责成就计算、解锁状态和本地已读记录。

共享文件要少改：

- `src/db/api.ts` 只放 Supabase 表读写，不放页面流程。
- `src/types/*` 只放跨功能契约。
- `src/lib/paths.ts` 只放路由拼接。
- `src/pages/*` 尽量只做页面编排和导航。

多个 Agent 或多个人一起写时，先认领一个 feature slice。只有新增路由、改数据库契约、改全局类型时，才需要同步其他功能组。
