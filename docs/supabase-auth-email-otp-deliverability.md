# Supabase Auth 邮箱验证码投递排查与修复

## 结论

CMI Map 当前前端已经改成邮箱验证码注册 / 登录，但验证码邮件是否稳定送达，主要取决于 Supabase Auth 的邮件发送配置。

Supabase 官方文档明确说明：默认邮件服务只适合测试，不适合作为生产发送服务。默认服务有很低的发送限制，并且不保证投递稳定性。生产环境应配置自有 SMTP，例如 Resend、Postmark、AWS SES、SendGrid、Brevo 等。

## 当前项目观察

- 前端调用 `signInWithOtp` 发送邮箱验证码，并用 `verifyOtp` 校验。
- 本地 `supabase/config.toml` 目前只有 `[auth.email] enable_confirmations = false`，没有 SMTP 配置。
- 远程 Edge Function secrets 列表里没有看到 `RESEND_API_KEY`；活动报名通知函数虽然支持 Resend，但当前远程 secrets 看起来还没配好。
- Supabase MCP 当前不能读取 `sfpcpxlxslnulzlmjcby` 项目的 Auth logs，无法直接确认最近一次失败是不是 `rate limit exceeded`、`Email address not authorized` 或 SMTP provider handoff error。

## 推荐修复

第一优先级：配置 Supabase Auth 自定义 SMTP。

以 Resend 为例：

1. 在 Resend 添加并验证发送域名，建议用 `auth.cmimap.com` 或 `mail.cmimap.com`。
2. 在 DNS 里配置 Resend 要求的 SPF、DKIM、DMARC 记录。
3. 在 Supabase Dashboard 进入 `Authentication -> Emails -> SMTP Settings`。
4. 填入：
   - Host: `smtp.resend.com`
   - Port: `587`
   - User: `resend`
   - Password: Resend API Key
   - Sender email: `no-reply@auth.cmimap.com`
   - Sender name: `CMI Map`
5. 在 Supabase `Authentication -> Rate Limits` 提高 Auth 邮件发送额度。官方默认自定义 SMTP 后仍有 30 封 / 小时的初始保护限制，需要按实际活动流量调高。
6. 在 `Authentication -> Email Templates -> Magic Link` 里把模板改成显示 OTP：

```html
<h2>CMI Map 登录验证码</h2>
<p>你的验证码是：</p>
<p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">{{ .Token }}</p>
<p>验证码 1 小时内有效。如果不是你本人操作，可以忽略这封邮件。</p>
```

## 需要避免的做法

- 不要继续依赖 Supabase 默认邮件服务跑生产注册 / 登录。
- 不要让用户反复点击发送验证码；这会更快触发 Supabase 或 SMTP provider 限流。
- 不要把活动通知、营销邮件和 Auth 验证码共用同一个发送域名。Auth 邮件最好使用独立子域名，例如 `auth.cmimap.com`。
- 不要在验证码邮件里放太多营销文案、图片或多个链接，QQ 邮箱和 Gmail 都可能提高垃圾邮件风险。

## 已做的前端兜底

- 登录和快速加入统一走邮箱验证码，不再要求用户设置密码。
- 验证码输入限制为 6 位数字。
- 同一页面发送验证码后，60 秒内再次发送会被前端拦截，减少用户连续点击导致限流。
- 登录页已补 Google 登录和密码登录 / 找回密码兜底；但找回密码邮件也依赖同一套 Supabase Auth 邮件发送配置。

## 上线前检查

- [ ] Supabase Auth 已配置自定义 SMTP。
- [ ] 发送域名 SPF / DKIM / DMARC 均通过。
- [ ] Magic Link 模板中包含 `{{ .Token }}`。
- [ ] Reset Password 模板使用 `{{ .RedirectTo }}`，且 Redirect URLs 允许 `https://cmimap.com/login?auth=reset-password` 和本地开发地址。
- [ ] Google Provider 已在 Supabase Auth 开启，Google Cloud OAuth Client 已配置生产域名 origin 与 Supabase callback URL。
- [ ] 用 Gmail、QQ 邮箱、Outlook 各测试 3 次验证码送达。
- [ ] 检查 Supabase Auth logs 和邮件服务商日志：确认邮件已从 Supabase 交给 SMTP provider，且 provider 侧没有 bounce / suppression。
- [ ] 若有公开发布或群内集中测试，提前调高 Supabase Auth Rate Limits 和 SMTP provider 发送额度。
