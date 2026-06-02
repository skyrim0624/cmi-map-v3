# CMI 活动 Agent 发布协议

这个协议用于让 Agent 把海报、推文、群公告整理成结构化活动，再通过 CLI 发布到 CMI Map。

## 接入模式

当前先开放管理员 Agent 通道。普通用户通道保留代码入口，但不作为第一阶段产品入口。

这里分三条通道：

- 公开 Agent 通道：任何登录用户都可以接。Agent 使用这个用户自己的登录身份发布，写入 `community / needs-review` 活动，只能创建和管理自己有权限的活动。
- 团队管理员 Agent 通道：只给 CMI 团队成员使用，例如子扬、林可或其他被设为 `admin` 的社区朋友。管理员在 `/admin/agent-tokens` 生成可撤销的 Agent Token，Agent 用这个 token 发布 `cmi / verified` 活动，方便多人用 AI 管理官方活动。
- 机器后台通道：只给服务器、自动化任务或紧急运维使用。它可以使用 `SUPABASE_SERVICE_ROLE_KEY`，但不能交给任何外部 Agent 或个人日常使用。

不要把 `SUPABASE_SERVICE_ROLE_KEY` 作为开放接口的一部分。它会绕过 RLS，相当于数据库管理员权限。

## 命令

```bash
pnpm cmi:event:check -- --input ./event.json --admin-publish --strict
pnpm cmi:event:publish -- --input ./event.json
pnpm cmi:event:publish -- --input ./event.json --publish
pnpm cmi:event:publish -- --input ./event.json --admin-publish
pnpm cmi:event:publish -- --input ./event.json --service-role-publish
pnpm cmi:event:check -- --input ./event.json --admin-publish --verify-remote
```

默认是 dry-run，只输出将要写入的数据。

正式发布前先跑 `cmi:event:check`。它不写数据库，只快速检查结构化字段、发布 token、Supabase Edge Function 网络可达性、Supabase CLI 登录态提示、活动图片文件或图片 URL，以及 dry-run row。若这里已经报 `admin-function-network` 失败，就不要继续真实发布；这类失败通常是 DNS、代理、网络权限或 Supabase Functions 可达性问题，不是活动字段问题。

正式发布后再跑一次 `cmi:event:check -- --input ./event.json --admin-publish --verify-remote`。它会从公开 REST 读取 `public.cmi_events`，并对远程 `cover_image_url` 做 HEAD 检查，确认返回 `image/*`，避免迁移或本地静态路径把 CLI 上传的 Storage 海报覆盖掉。

加 `--publish` 会走公开 Agent 通道，上传海报并写入 `public.cmi_events`。它需要：

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
CMI_MAP_ACCESS_TOKEN=...
PUBLIC_SITE_URL=https://cmimap.com
```

也可以把 token 放在参数里：

```bash
pnpm cmi:event:publish -- --input ./event.json --publish --access-token "$CMI_MAP_ACCESS_TOKEN"
```

真实接入时优先用环境变量或 Agent 的 secret 管理，不建议把 token 明文写进命令历史。

加 `--admin-publish` 会走团队管理员 Agent 通道。它需要：

```bash
VITE_SUPABASE_URL=...
CMI_MAP_ADMIN_AGENT_TOKEN=...
PUBLIC_SITE_URL=https://cmimap.com
```

这个 token 由管理员在 CMI Map 里生成。Edge Function 会校验 token 是否有效、是否撤销，以及 token 所属用户是否仍是 `admin`。

加 `--service-role-publish` 会走机器后台通道。它需要：

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
PUBLIC_SITE_URL=https://cmimap.com
```

`CMI_MAP_ACCESS_TOKEN` 是当前登录用户自己的 access token。`CMI_MAP_ADMIN_AGENT_TOKEN` 是可撤销的管理员 Agent Token，只在生成时显示一次；数据库只保存哈希。

公开通道如果没有传 `id`，CLI 会把自动生成的活动 ID 加上用户范围，避免不同用户发布同名同日活动时互相撞 ID。运营同步需要稳定 ID 时，应在 JSON 里显式传 `id`。

## JSON 示例

```json
{
  "title": "周五晚 AI 工具分享",
  "type": "cmi",
  "startAt": "2026-05-29T19:00:00+07:00",
  "endAt": "2026-05-29T21:00:00+07:00",
  "organizerName": "活动发起人或主办方",
  "organizerEmail": "host@example.com",
  "summary": "一起聊最近真正有用的 AI 工具和使用经验。",
  "detailBody": "适合想认识 CMI 朋友、交流 AI 工具实践的人。活动在清迈客栈举行。",
  "priceLabel": "免费参与",
  "coverImagePath": "./poster.jpg",
  "sourceLabel": "活动海报 / 推文"
}
```

缺省地点会自动设为清迈客栈：

- `venueName`: `清迈客栈`
- `area`: `CMI / 清迈客栈`
- `latitude`: `18.7932`
- `longitude`: `98.9874`
- `registrationLabel`: `CMI Map 一键报名`

## 图片 / 海报规则

Agent 选中并准备发布一条活动时，必须同时处理活动图片。

优先级：

1. 活动来源自带官方海报时，保存原海报并填入 `coverImagePath` 或 `coverImageUrl`。
2. 来源没有海报但有可用主视觉、场地方封面或活动配图时，可以作为活动封面。
3. 来源没有可用图片时，必须用 Image Generator 生成一张活动海报，再作为发布素材上传。

生成海报时只能基于已核实字段，不要编造主办方背书、报名二维码、赞助商或不存在的视觉元素。`sourceLabel` 仍应标注真实来源；内部记录要说明封面为生成图。

## Agent 责任边界

Agent 负责把非结构化素材整理成 JSON，并在 dry-run 结果里检查时间、地点、费用、发起人邮箱和简介。

CLI 负责校验必填字段、上传海报、upsert 活动记录、输出活动页链接。

如果 dry-run 中没有 `coverImagePath` 或 `coverImageUrl`，Agent 不应直接发布；应先补官方海报、来源封面或 Image Generator 生成海报。

自动化发布顺序固定为：

1. `pnpm cmi:event:check -- --input <event.json> --admin-publish --strict`
2. `pnpm cmi:event:publish -- --input <event.json> --admin-publish`
3. `pnpm cmi:event:check -- --input <event.json> --admin-publish --verify-remote`
4. `SUPABASE_TELEMETRY_DISABLED=1 supabase db push --dry-run --linked --include-all`
5. 确认 dry-run 只有本轮预期迁移后，执行真实 `supabase db push --linked --include-all --yes`
6. 重新做远程行与 `cover_image_url` HEAD 验证；若迁移覆盖了 CLI 上传的 Storage URL，必须追加修正迁移，不改已推迁移历史。

公开通道的 Agent 不能把用户活动伪装成 CMI 官方活动，也不能写入已核实状态。需要官方背书的活动，改走团队管理员 Agent 通道。
