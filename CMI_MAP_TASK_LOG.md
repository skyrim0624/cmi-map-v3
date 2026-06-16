# CMI Map 优化任务日志

更新时间：2026-06-14 +07

## 目标

继续优化完善 CMI Map，并在项目根目录与 Obsidian 同步记录计划、执行步骤、当前状态和验证结果。

## 日志位置

- 项目根目录：`/Users/andreas/vibe coding/nomaday app!!/cmi map v3/CMI_MAP_TASK_LOG.md`
- Obsidian：`/Users/andreas/cmi社区知识库/CMI/CMI map/v3/CMI map 3.0 页面.md`

## 当前计划

1. [完成] 建立并同步任务日志
2. [部分完成] 做真实链路 QA，覆盖公开浏览、登录/注册、收藏、点赞、个人页、打点入口
3. [完成] 复查 `wishlists` 策略，决定是否公开收藏热度读取
4. [完成] 增加“快速文字推荐”入口，降低打点流程对相机/GPS/语音权限的依赖
5. [完成] 跑类型检查、构建和 lint
6. [完成] 汇总变更、剩余风险和下一步建议
7. [完成] 将 2026-04-26 产品原则收敛写入项目文档与知识库
8. [完成] 做「人的地图」与「探索感」的最小实现
9. [本地完成] 社交用户系统先修公开资料隐私隔离，避免公开暴露 `profiles.email`
10. [本地完成] 社交用户系统建立稳定身份路由，避免继续把昵称当作长期身份 ID
11. [本地完成] 优化注册 / 登录体验，主流程改为邮箱验证码
12. [本地完成] 黑板 / 论坛 MVP 追加精选、公告、信息流交互、详情页和头像显示优化
13. [进行中] 将旧域名 `cmti.uk` 改作 CMI Map 3.1 测试域名
14. [已回滚] CMI Map 3.1 主题地图拍照令 MVP
15. [完成] 6.6 会议后的统一社区入口：活动轮播、CMI Map、CMI Swap、一键入住 / 加群
16. [记录完成] 主题地图最短链路：发布主题、主题页、带主题 tag 打卡、主题帖子展示、分享卡外传
17. [完成] 回滚旧主题地图 MVP 与约搭子第一部分，准备重新开始
18. [完成] 主题地图最短链路第一版：主题页、主题 tag 打卡、投稿回流、主题分享卡
19. [完成] 神奇动物在哪里拍照识别第一版：Cloudflare Workers AI API + `/mark` 候选确认
20. [完成] `/mark` 相机页补充可见“识别动物”入口
21. [完成] 动物识别修正：主体检测优先、低置信度不硬猜、去掉“可能是”文案
22. [完成] 神奇动物打卡候选、描述和分享卡统一使用学名展示
23. [完成] 神奇动物分享卡对齐修正，并改为用户主动分享
24. [本地完成] 自托管专业物种模型服务：BioCLIP 2.5 + BioCLIP 2 + 清迈动物候选库
25. [完成] 神奇动物分享面板主视觉化，并将保存动作改为系统图片分享
26. [完成] 神奇动物图鉴卡右下角排版修正：弱化爪印、放大二维码、重排进度号
27. [完成] `/mark` 发布 tag 前台步骤退后台，默认按拍摄 / 照片坐标直接发布
28. [完成] 上传相关页面主题色统一为 CMI 绿色
29. [完成] 神奇动物贴纸改为优先使用自托管分割模型自动抠图
30. [完成] 个人主页神奇生物图鉴改为主 KV 贴画收集册
31. [完成] 精细透明抠图改走原图 URL + 自托管分割服务
32. [完成] 恢复 `species.cmimap.com` 常驻模型服务和 tunnel

## 执行记录

### 2026-06-14 神奇动物贴纸自托管分割服务恢复

- 本轮实现：
  - 新增用户级 launchd 配置：`com.andreas.cmi-species-model` 常驻运行本地物种/分割模型服务，`com.andreas.cmi-species-tunnel` 常驻运行 `species.cmimap.com` 的命名 tunnel。
  - 常驻模型服务端口改为 `8765`，避免被其他本地 FastAPI 项目的 `8000` 抢占；Cloudflare Tunnel 已同步指向 `127.0.0.1:8765`。
  - 分割前会先按主体框裁剪并把长边限制到 `896px`，保留贴纸清晰度，同时避免公网请求被 Cloudflare 100 秒超时拦截。
  - 生产 Pages secrets 已重新配置到 `https://species.cmimap.com/segment` 和 `https://species.cmimap.com/identify`，抠图优先走自托管 `rembg` / `isnet-general-use`，不是 Image Gen。
  - Cloudflare Images `segment=foreground` 代码保留为无自托管模型时的兜底；当前域名还未启用 Image Transformations，所以生产不依赖这条路。
- 验证结果：
  - `http://127.0.0.1:8765/health` 和 `https://species.cmimap.com/health` 均返回 `ok: true`。
  - launchd 当前进程：模型服务监听 `*:8765`，tunnel 已注册 Cloudflare 连接。
  - 使用 `/Users/andreas/Downloads/IMG_5991 2.jpg` 调公网 `/segment`，6 秒返回 `348 x 455` 的 `RGBA PNG`，确认存在透明 alpha。
  - `cd services/species-model && .venv/bin/python -m unittest discover -s tests` 通过，13 项测试全部通过。

### 2026-06-14 神奇动物贴纸精细透明抠图生产链路

- 本轮实现：
  - `/api/animal-segment` 保留自托管 rembg 分割模型优先级；当 Pages 未配置 `CMI_MAP_SEGMENT_MODEL_URL` 时，不再直接 503，而是尝试通过 Cloudflare Images 的 `segment: "foreground"` 做前景分割。
  - 新增 `imageUrl` 入参：旧图鉴记录直接用已有照片 URL 分割；新拍照发布时在原图上传后重新生成一次精细透明贴纸，避免只保存预览阶段的粗轮廓兜底。
  - 生产主链路是像素级前景分割，不调用 Image Gen；Cloudflare Images 兜底需要域名启用 Image Transformations 后才会生效。
- 验证结果：
  - Cloudflare Images 直连兜底在当前 `cmimap.com` zone 未启用 Image Transformations，测试会返回原图或 404，因此已改为恢复自托管模型服务并配置生产 secrets。

### 2026-06-14 个人主页神奇生物图鉴贴画册

- 本轮实现：
  - 个人主页的“神奇生物图鉴”从三列卡片改成贴画收集册：每个识别过的动物以不规则贴纸形式铺在同一张画板上，点击后仍可逐张查看。
  - 图鉴画板复用“清迈神奇动物在哪里”主 KV：奶油底、深绿边框、红色手绘圈、丛林叶片和主视觉底纹，避免变成另一套视觉。
  - 旧数据里只有原始照片、没有贴纸 URL 的动物记录，会在图鉴页自动用照片生成临时贴纸预览，不需要人工重新抠图。
  - 自动贴纸生成仍优先走 `/api/animal-segment` 的透明抠图；服务不可用时保留本地粗轮廓贴纸兜底，避免图鉴空白。
- 验证结果：
  - 本地用已有 6 条动物记录打开个人页，图鉴 tab 可见，贴纸数量正确，画板背景已加载主 KV。
  - `node --test --experimental-strip-types src/components/AnimalStickerAlbum.test.ts src/lib/cmi-wild-animal-stickers.test.ts src/pages/Profile.test.ts src/pages/PersonMap.test.ts src/features/profiles/public-profile-page.test.ts src/pages/MarkPlace.test.ts` 通过，21 项测试全部通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 复查 Cloudflare Pages production secrets：当前只有 `GOOGLE_AI_STUDIO_API_KEY`，没有 `CMI_MAP_SEGMENT_MODEL_URL` / `CMI_MAP_SPECIES_MODEL_URL`；因此线上新照片如需稳定透明抠图，还需要重新挂上可用的自托管分割服务，前端已保留兜底生成。

### 2026-06-13 神奇动物贴纸自动抠图模型链路

- 本轮实现：
  - 新增 Pages Function `/api/animal-segment`，代理自托管分割模型，返回透明 PNG，不调用 Image Gen。
  - 自托管物种模型服务新增 `/segment` 接口，使用 `rembg` 分割模型按主体框聚焦裁切并输出透明抠图。
  - 前端 `createAnimalStickerFromPhoto` 改为优先请求透明抠图，再重新加白边和阴影生成贴纸；服务不可用时回退到原粗轮廓裁切，避免发布中断。
  - README 和模型服务文档补充 `CMI_MAP_SEGMENT_MODEL_URL` / `CMI_MAP_SEGMENT_MODEL_TOKEN` 配置。
- 验证结果：
  - `node --test --experimental-strip-types functions/api/animal-segment.test.ts src/lib/cmi-wild-animal-stickers.test.ts src/services/animal-identification.test.ts src/pages/MarkPlace.test.ts src/pages/Profile.test.ts src/features/profiles/public-profile-page.test.ts` 通过，27 项测试全部通过。
  - `cd services/species-model && python3 -m unittest discover -s tests` 通过，12 项测试全部通过。
  - `python3 -m py_compile services/species-model/cmi_species_model/app.py` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint functions/api/animal-segment.ts functions/api/animal-segment.test.ts src/lib/cmi-wild-animal-stickers.ts src/lib/cmi-wild-animal-stickers.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 使用 `/Users/andreas/Downloads/IMG_5991 2.jpg` 跑模型服务分割逻辑，生成透明 cutout 和贴纸预览；本地浏览器检查 `/mark?event=cmi-wild-chiang-mai-2026-06`，页面正常渲染，生物识别入口可见。

### 2026-06-13 13:58 +07 神奇动物分享卡动态文字改为偏手写圆体

- 本轮实现：
  - 分享卡动态文字字体栈改为优先使用 `Hannotate SC` / `HanziPen SC` / `Wawati SC` / `Yuanti SC`。
  - 动物介绍、编号、时间戳字重提高到 900，并略微增大字号。
  - 动物名称最大字号从 38 提到 42，保持更厚重的图鉴卡片感。
  - 动态文字增加 1px 同色描边，避免浏览器字体回退后仍显得太细。
- 验证结果：
  - `node --test --experimental-strip-types src/lib/cmi-wild-animal-share-card.test.ts src/db/cmi-event-capture-numbers.test.ts src/pages/MarkPlace.test.ts` 通过，20 项测试全部通过。
  - `pnpm exec biome lint src/lib/cmi-wild-animal-share-card.ts src/lib/cmi-wild-animal-share-card.test.ts src/db/api.ts src/db/cmi-event-capture-numbers.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 使用 `/Users/andreas/Downloads/IMG_5991 2.jpg` 生成测试样卡 `/tmp/cmi-wild-share-card-img5991-2-readable-test.png`，检查照片裁切、模板压层和动态文字字重。

### 2026-06-13 13:25 +07 神奇动物分享卡切回装饰版模板

- 本轮实现：
  - 按用户提供的分享卡片图新增 `wild-chiang-mai-template-v4.png`。
  - 将模板照片区做成透明窗口，改为先绘制用户照片、再覆盖模板，保留红车、叶子、蝴蝶和标题装饰。
  - 重新校准照片、编号、动物名、介绍、二维码和时间戳位置，避免照片压住模板装饰。
- 验证结果：
  - `node --test --experimental-strip-types src/lib/cmi-wild-animal-share-card.test.ts src/db/cmi-event-capture-numbers.test.ts src/pages/MarkPlace.test.ts` 通过，19 项测试全部通过。
  - `pnpm exec biome lint src/lib/cmi-wild-animal-share-card.ts src/lib/cmi-wild-animal-share-card.test.ts src/db/api.ts src/db/cmi-event-capture-numbers.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地用 `wild-chiang-mai-template-v4.png` 和小狗照片合成样卡，确认模板装饰保留在照片上层，未出现上一轮的大块白底。

### 2026-06-12 12:24 +07 神奇动物分享卡切到无装饰干净模板

- 本轮实现：
  - 重新用 Image Gen 生成 `wild-chiang-mai-template-v3.png`，去掉照片四周贴纸、底部 CMI MAP、小图标、动物 / 车辆 / 花叶装饰和额外圆角信息框。
  - 分享卡改用新模板，照片区域放大，底部只叠加动物名、动物介绍、时间戳和活动二维码。
  - 简介区删除图标干扰，时间戳移到无品牌字样的左下角区域，二维码固定在右下角白色留白内。
- 验证结果：
  - `node --test --experimental-strip-types src/lib/cmi-wild-animal-share-card.test.ts src/db/cmi-event-capture-numbers.test.ts src/pages/MarkPlace.test.ts` 通过，19 项测试全部通过。
  - `pnpm exec biome lint src/lib/cmi-wild-animal-share-card.ts src/lib/cmi-wild-animal-share-card.test.ts src/db/api.ts src/db/cmi-event-capture-numbers.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地用 `wild-chiang-mai-template-v3.png` 和小狗照片合成样卡，确认照片周围无贴纸白框，简介无图标重叠，时间戳不再压底部品牌字，二维码区独立。

### 2026-06-12 11:48 +07 神奇动物分享卡改用新版 Image Gen 模板

- 本轮实现：
  - 采用用户确认的 Image Gen 模板，新增 `wild-chiang-mai-template-v2.png`，不覆盖旧模板。
  - 分享卡生成改为基于新模板直接叠加照片、编号、动物名、简介、二维码和时间戳。
  - 删除上一版贴片补装饰、底部白块覆盖、右侧面板覆盖和重复绘制 slogan 的逻辑，避免白圈、白块和文字压底图。
  - 二维码只填入模板自带白色二维码区域，`扫码探索万物` 使用模板自身文字。
- 验证结果：
  - `node --test --experimental-strip-types src/lib/cmi-wild-animal-share-card.test.ts src/db/cmi-event-capture-numbers.test.ts src/pages/MarkPlace.test.ts` 通过，19 项测试全部通过。
  - `pnpm exec biome lint src/lib/cmi-wild-animal-share-card.ts src/lib/cmi-wild-animal-share-card.test.ts src/db/api.ts src/db/cmi-event-capture-numbers.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。

### 2026-06-12 11:03 +07 神奇动物分享卡按标注图重排

- 本轮实现：
  - 右上角编号改为 `NO. 001` 格式，不再写 `CMI`；同时兼容 RPC 返回数字字符串，避免编号为空。
  - 底部信息去掉发现者、时间、地点和“介绍”标题，只保留动物介绍正文。
  - 右侧爪印区域改为活动二维码，并在二维码下方增加 `扫码探索万物`。
  - 底部左侧原 `CMI MAP` 位置改为时间戳；底部进度号不再绘制。
  - 照片绘制后补回蝴蝶、叶子、红车等模板装饰贴片，避免装饰被照片压住。
- 验证结果：
  - `node --test --experimental-strip-types src/lib/cmi-wild-animal-share-card.test.ts src/db/cmi-event-capture-numbers.test.ts src/pages/MarkPlace.test.ts` 通过，19 项测试全部通过。
  - `pnpm exec biome lint src/lib/cmi-wild-animal-share-card.ts src/lib/cmi-wild-animal-share-card.test.ts src/db/api.ts src/db/cmi-event-capture-numbers.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。

### 2026-06-11 12:56 +07 上传相关页面主题色统一为绿色

- 本轮实现：
  - 全局 `primary` / `accent` / `ring` 从薰衣草紫切到 CMI 绿色系，地图选点候选、表单聚焦和主按钮不再继承紫色。
  - `/mark` 相机页黑 / 橙主视觉改成深绿 / 亮绿；手动选点确认按钮从黑色改为深绿。
  - 共享地图准星从橙色改为绿色，旧 `/playground/mark` 上传原型的黑色主按钮也改成绿色。
  - V3 原型里旧 `--cmi-v3-purple` 变量映射为绿色，避免旧紫色继续作为页面强调色出现。
- 验证结果：
  - `node src/pages/MarkPlace.test.ts` 通过，12 项测试全部通过。
  - 旧色残留扫描通过，目标文件内未再命中旧紫色 primary、橙色上传按钮、粉色分享按钮和黑色确认按钮。
  - `npx tsgo -p tsconfig.check.json` 通过。
  - 目标 Biome lint 通过。
  - `npm run build` 通过，PWA precache 检查通过。
  - 本地应用内浏览器打开 `/v3`：全局 `primary/accent/ring` 和 V3 变量均为绿色，页面非空，无 console warn/error；真实 `/mark` 在本地按登录保护跳转 `/login`。

### 2026-06-11 12:47 +07 神奇动物图鉴卡右下角排版修正

- 本轮实现：
  - 右下角原模板里的大爪印放大镜过于抢注意力；本轮在 Canvas 生成时用奶油色贴纸底覆盖旧大图标，再重绘小号、半透明的深绿爪印放大镜。
  - 底部 `01/09` 改为独立绘制胶囊，坐标和高度重新对齐，不再沿用旧模板里的偏移文字位置。
  - 二维码从 `104px` 放大到 `150px`，并重新绘制白色底框，避免放大后贴边或压到原模板。
- 验证结果：
  - `node src/lib/cmi-wild-animal-share-card.test.ts` 通过。
  - 目标 Biome lint 通过。
  - 生产构建通过，PWA precache 检查通过。
  - 临时浏览器预览页已生成样卡并局部截图复查右下角：爪印弱化、二维码更大、`01/09` 胶囊与二维码处在同一底部区域。
  - 全量 `tsgo` 在干净远端基线上仍被 `/mark` 既有 Stage / 分类页类型错误阻断，非本轮图鉴卡改动引入。

### 2026-06-11 12:41 +07 `/mark` 发布 tag 退后台与坐标发布

- 产品决策：
  - CMI Map 不再让普通用户在发布时承担攻略式 tag / 分类整理。
  - tag 系统保留在后台整理和搜索层，例如餐厅等地点细分后续由系统 / 运营归类。
  - 发布动态默认绑定拍摄坐标或照片 EXIF 坐标；地点搜索 / 手动定点只作为定位失败或用户主动修改位置时的兜底。
- 本轮实现：
  - 去掉 `/mark` 发布前“选择发布标签”整屏步骤。
  - 实时拍照成功拿到 GPS 后，文字确认会直接发布；定位失败才进入手动定点页。
  - 相册照片优先读取 EXIF GPS；没有坐标时提示发布前手动定点。
  - 没有选中具体地点时，地点名改为 `地图坐标 · 经纬度`，不再从正文前 30 字切出伪地点名。
  - 清迈客栈、神奇动物 / 彩蛋等特殊分类仍自动写入后台字段。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/MarkPlace.test.ts` 通过，12 项测试全部通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts CMI_MAP_TASK_LOG.md` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地 `http://127.0.0.1:5187/mark?verify=tagless-location` 返回 HTTP 200；应用内浏览器打开后按登录保护跳转到 `/login`，页面非空，无框架错误遮罩和 console warn/error。

### 2026-06-11 12:35 +07 神奇动物分享面板与保存到相册

- 本轮实现：
  - `/mark` 神奇动物图鉴卡分享面板从普通白色按钮改为 CMI Map 主视觉风格：深绿主按钮、奶油纸底、黄 / 绿 / 粉三枚贴纸式动作按钮，并复用 `wild-magnifier-checkin.png`。
  - “保存图片”改为“保存到相册”，点击后不再触发浏览器下载；优先把 PNG 图鉴卡作为 `File` 交给系统分享面板，让 iOS 用户在系统菜单里选择保存到相册。
  - 微信 / 小红书入口也改走系统图片分享，不再先下载到文件夹再提示用户打开 App。
- 验证结果：
  - `node src/pages/MarkPlace.test.ts` 通过。
  - `npx tsgo -p tsconfig.check.json` 通过。
  - `npx biome lint src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts` 通过。
  - `npm run build` 通过，PWA precache 检查通过。
  - 本地应用内浏览器访问 `/mark?event=cmi-wild-chiang-mai-2026-06` 被登录页拦截，页面非空且无控制台错误；未使用测试账号向线上库造数据。

### 2026-06-10 20:35 +07 自托管专业物种模型服务

- 本轮实现：
  - 新增 `services/species-model` 独立 FastAPI 服务，接口为 `POST /identify`，返回 CMI Map 已支持的中文名、英文名、拉丁学名、分类等级和置信度字段。
  - 主模型接 `hf-hub:imageomics/bioclip-2.5-vith14`，兜底模型接 `hf-hub:imageomics/bioclip-2`；默认 BioCLIP 2.5 先判定，模糊时调用 BioCLIP 2 复核。
  - 新增清迈常见动物候选库，覆盖猫狗、鸟、壁虎/蜥蜴、蛇、蛙、常见昆虫、蜘蛛和鱼类；已包含用户实测鸟图对应的 `蓝翡翠 / Halcyon pileata`。
  - 新增 Dockerfile、运行说明和 Cloudflare Pages 环境变量接入说明，沿用既有 `CMI_MAP_SPECIES_MODEL_URL` / `CMI_MAP_SPECIES_MODEL_TOKEN`。
- 待部署：
  - 需要把 `services/species-model` 部署到一台可常驻模型的机器，再把 `/identify` 地址配置到 Cloudflare Pages。
- 验证结果：
  - 已补充不下载模型的候选库与置信度合并测试。
  - 已在 Andreas 的 MacBook Air M4 / 16GB 上完成本地安装与服务启动：Python 3.12 + PyTorch + OpenCLIP + BioCLIP 2.5。
  - 用户提供的鸟图本地复测：冷启动约 28 秒；模型热启动后约 4 秒；正常返回 `蓝翡翠 / Halcyon pileata`。
  - Cloudflare Tunnel 临时外网链路复测通过：`/health` 可访问，`/identify` 经外网 tunnel 约 4.1 秒返回 `蓝翡翠 / Halcyon pileata`。
  - 尚未把 `cmimap.com` 生产环境指向临时 tunnel，避免正式站依赖 Andreas 的电脑在线状态。
  - 本地脚本改为启动时预加载模型、默认只跑 BioCLIP 2.5；BioCLIP 2 兜底仍保留，可通过 `BIOCLIP_FALLBACK_MODE=auto` 手动开启。
  - 已创建稳定 Cloudflare named tunnel `cmi-map-species-local`，固定域名为 `https://species.cmimap.com`，并把 Pages production secret 设置为 `CMI_MAP_SPECIES_MODEL_URL=https://species.cmimap.com/identify`。
  - 正式域名 `https://cmimap.com/api/animal-identify` 已验证会调用 `self-hosted-species-model`；首次线上返回里 `蓝翡翠 / Halcyon pileata` 在候选列表第二位，因此追加“物种级结果优先展示”修正，避免粗粒度 `鸟类 / Aves` 抢默认选中。
  - 前端候选按钮、自动描述和神奇动物分享卡主标题改为中文名优先；拉丁学名保留在接口数据里用于校验，不再作为用户主展示。
  - 本机模型服务与 Cloudflare Tunnel 已改为 macOS LaunchAgent 常驻：`com.cmi.species-model`、`com.cmi.species-tunnel`；日志分别写入 `~/Library/Logs/cmi-species-model*.log` 与 `~/Library/Logs/cmi-species-tunnel*.log`。
  - launchd 接管后复测：`https://species.cmimap.com/identify` 约 2.5 秒返回 `蓝翡翠 / Halcyon pileata`；`https://cmimap.com/api/animal-identify` 约 5.3 秒返回 `self-hosted-species-model`，且 `蓝翡翠` 排第一。

### 2026-06-10 20:08 +07 小白狗被误识别成猫的纠偏

- 本轮实现：
  - 线上复测用户狗照片时，主体检测返回 `Felis catus`，但分类结果包含 `WHIPPET / ITALIAN GREYHOUND` 犬种证据。
  - 新增极窄纠偏：只在猫狗互相冲突、且分类模型给出犬种 / 猫种证据达到阈值时，用分类结果覆盖主体检测结果。
  - 犬类关键词补充 `whippet`、`greyhound`，避免小型犬照片被猫狗粗分类带偏。
- 验证结果：
  - 已补充测试锁定猫狗冲突纠偏规则。
  - `node --test --experimental-strip-types functions/api/animal-identify.test.ts src/services/animal-identification.test.ts src/pages/MarkPlace.test.ts src/lib/cmi-wild-animal-share-card.test.ts src/db/cmi-event-capture-numbers.test.ts` 通过，29 项测试全部通过。
  - `pnpm exec biome lint functions/api/animal-identify.ts functions/api/animal-identify.test.ts src/services/animal-identification.ts src/services/animal-identification.test.ts src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts src/lib/cmi-wild-animal-share-card.ts src/lib/cmi-wild-animal-share-card.test.ts CMI_MAP_TASK_LOG.md` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过。

### 2026-06-10 19:57 +07 神奇动物候选与分享卡回归学名展示

- 本轮实现：
  - 动物识别候选按钮、自动描述和分享卡主名称统一直接展示学名，不再使用“家犬 / 家猫 / 大壁虎”等中文别名。
  - 分享卡文件名也使用学名，保持导出结果和卡片展示一致。
- 验证结果：
  - 已补充测试锁定 `formatAnimalCandidateLabel` 和分享卡主名称均使用 `getAnimalScientificName`。
  - `node --test --experimental-strip-types functions/api/animal-identify.test.ts src/services/animal-identification.test.ts src/pages/MarkPlace.test.ts src/lib/cmi-wild-animal-share-card.test.ts src/db/cmi-event-capture-numbers.test.ts` 通过，28 项测试全部通过。
  - `pnpm exec biome lint src/services/animal-identification.ts src/services/animal-identification.test.ts src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts src/lib/cmi-wild-animal-share-card.ts src/lib/cmi-wild-animal-share-card.test.ts CMI_MAP_TASK_LOG.md` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过。

### 2026-06-10 19:48 +07 神奇动物分享卡对齐与主动分享

- 本轮实现：
  - 分享卡动物学名写入模板白色胶囊位，底部信息行按模板虚线重新对齐。
  - 二维码缩小并移入右下角白色二维码框内侧。
  - 发布成功后不再自动弹出系统分享面板；生成卡片后只显示“分享图鉴卡”按钮，点开后提供保存图片、微信、小红书三个动作。
  - 微信 / 小红书按钮不调用浏览器系统分享，只先保存卡片图片并提示去对应 App 发布。
- 验证结果：
  - 已补充测试锁定分享卡主展示学名、禁止系统分享函数、发布后显示主动分享按钮。

### 2026-06-10 19:25 +07 神奇动物识别学名展示上线

- 本轮实现：
  - `/mark` 动物识别候选按钮、自动填入描述和分享卡动物标题统一显示学名，不再显示“清迈小狗 / 清迈街猫 / 清迈大壁虎”这类本地化命名。
  - `/api/animal-identify` 保留具体物种识别和 GBIF 学名校验，普通识别结果不足以定到具体物种时再走学名兜底。
- 验证结果：
  - `https://cmimap.com/cmi-home/share-card-templates/wild-chiang-mai-template-v1.png` 返回 `HTTP 200`。
  - 正式域名 `/api/animal-identify` 使用用户狗照片压缩图复测，返回 `Canis lupus familiaris`。

### 2026-06-10 18:51 +07 清迈客栈动态坐标归一修复

- 背景：V3 地图“清迈客栈新动态”里，用户动态头像 marker 会沿用推荐表中保存的漂移 GPS 坐标，导致本应在清迈客栈的动态显示到古城东侧。
- 本轮实现：
  - `src/data/cmi-place-corrections.ts` 将“清迈客栈 / 清迈客栈 CMI / CMI Inn / Chiang Mai Inn”相关地点统一归一到标准坐标 `18.7932, 98.9874`。
  - 对已归类为“清迈客栈”的推荐增加读取层兜底，即使历史数据保存了漂移坐标，地图读取后也会回到清迈客栈标准坐标。
- 验证结果：
  - 新增 `src/data/cmi-place-corrections.test.ts`，先复现旧漂移坐标未被校正，再验证修复后通过。
  - `npx tsx --test src/data/cmi-place-corrections.test.ts src/pages/CmiMapV3Prototype.test.ts src/pages/CmiMapV3Prototype.map-pulse.test.ts` 通过。
  - `pnpm exec biome lint src/data/cmi-place-corrections.ts src/data/cmi-place-corrections.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过。
  - 本地 `http://127.0.0.1:5187/v3` 手机视口复查通过：页面加载、地图和“清迈客栈新动态”正常渲染，目标端口无新增 console error。
  - 已部署到 Cloudflare Pages 正式项目 `cmi-map`：`https://15f7f8c2.cmi-map.pages.dev`。
  - 正式域名 `https://cmimap.com` 已切到新入口包 `assets/index-LpCJFGxN.js`，线上包内确认包含清迈客栈标准坐标 `18.7932, 98.9874` 与相关别名修正。

### 2026-06-10 19:05 +07 神奇动物打卡分享卡闭环第一版

- 本轮实现：
  - 动物识别候选补充学名字段，分享卡不再使用“清迈小狗 / 清迈街猫 / 清迈大壁虎”这类本地化命名。
  - 将 Image Gen 生成的固定模板母版加入公开素材：`/cmi-home/share-card-templates/wild-chiang-mai-template-v1.png`。
  - 新增神奇动物分享卡 Canvas 导出：使用模板母版叠加用户原照片、学名、识别标签、时间、地点、习性介绍、活动主页二维码和活动捕获编号。
  - `/mark` 关联 `神奇动物在哪里` 发布成功后，自动生成并分享 / 下载图鉴卡；普通打卡不受影响。
- 验证结果：
  - `node --test --experimental-strip-types functions/api/animal-identify.test.ts src/services/animal-identification.test.ts src/pages/MarkPlace.test.ts src/lib/cmi-wild-animal-share-card.test.ts src/db/cmi-event-capture-numbers.test.ts` 通过。
  - `pnpm exec biome lint functions/api/animal-identify.ts functions/api/animal-identify.test.ts src/services/animal-identification.ts src/services/animal-identification.test.ts src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts src/lib/cmi-wild-animal-share-card.ts src/lib/cmi-wild-animal-share-card.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过。

### 2026-06-10 18:45 +07 动物识别主体检测修正

- 背景：用户实测短脸猫照片时，旧 ResNet 整图分类把候选排成“狗、猫”，并自动填入“可能是狗。”，体验不可接受。
- 本轮实现：
  - `/api/animal-identify` 改为 Cloudflare Workers AI `@cf/facebook/detr-resnet-50` 主体检测优先，`@cf/microsoft/resnet-50` 分类只做无检测结果时的兜底。
  - 分类兜底增加置信度阈值，低分候选不再硬猜。
  - 检测框增加主体尺寸过滤，避免整张 UI 截图里的小横条被误判成动物。
  - 关键词匹配改为单词边界匹配，避免 `potted plant` 因包含 `ant` 被误判成昆虫。
  - 自动填入文案从“可能是...”改为“这是...”；识别不清楚时不自动乱填，提示换近一点的照片或手写名称。
- 验证结果：
  - 用户提供的整张截图本地接口返回 `no-match`，不再输出“狗”。
  - 从同图裁出的照片区域返回 `猫`，耗时约 `1.40s`。
  - 从同图裁出的动物主体区域返回 `猫`，耗时约 `1.53s`。
  - 旧猫图返回 `猫`，耗时约 `1.21s`。
  - 旧壁虎图返回 `大壁虎 / Gekko gecko`，耗时约 `1.22s`。
  - 已部署到 Cloudflare Pages 项目 `cmi-map` 的 Production，预览地址 `https://16859b9d.cmi-map.pages.dev`，正式域名 `https://cmimap.com/mark?verify=b914562` 返回 `HTTP 200`。
  - 正式域名 `/api/animal-identify` 复测：用户截图返回 `no-match`，不再输出“狗”；照片区域裁剪返回 `猫`，接口总耗时约 `1.51s`；旧壁虎图返回 `大壁虎 / Gekko gecko`，接口总耗时约 `1.26s`。
  - 正式域名前端包已包含“这是 / 正在识别动物主体 / 这张没识别清楚”，不再包含“可能是 / 拍照后会先给出可能候选”。
  - `node --test --experimental-strip-types functions/api/animal-identify.test.ts src/services/animal-identification.test.ts src/pages/MarkPlace.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/services/animal-identification.ts src/services/animal-identification.test.ts src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts` 通过。
  - `npx wrangler pages functions build --outfile /tmp/cmi-map-animal-worker.js` 通过。

### 2026-06-09 16:20 +07 社区统一入口显示屏加入活动切换

- 背景：用户要求在现有参考图复刻版的显示屏上加入左右滑动或点击左右箭头切换活动 / 精选信息。
- 本轮实现：
  - 保留第 1 页母版图原样，避免破坏当前已接受的视觉。
  - 在显示屏区域叠加动态内容层，第 2-5 页展示真实活动信息、真实海报、计数和圆点。
  - 左右箭头透明热区可循环切换活动；显示屏区域支持左右滑动切换。
  - 当前活动详情链接会随切换同步变化。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `node --test --experimental-strip-types src/pages/CmiCommunityEntrance.test.ts` 通过。
  - `pnpm exec vite build --config vite.config.prod.ts && node scripts/check-pwa-precache.mjs` 通过。
  - 本地应用内浏览器 477x846 视口复查：第 1 页保持母版图；点击右箭头切到 `02/05` 章鱼观影，详情链接同步变更；点击左箭头回到 `01/05` 并恢复母版图。
  - 已部署线上预览 `https://5ba82c58.cmi-map-v3.pages.dev/community`；线上应用内浏览器复查：点击右箭头从 `01/05` 切到 `02/05`，活动标题、海报和详情链接同步切换。

### 2026-06-09 15:55 +07 社区统一入口改为参考图母版复刻

- 背景：用户明确要求不要再近似重画，必须按指定参考图 1:1 复刻视觉。
- 本轮实现：
  - 将用户指定概念图作为 `/community` 视觉母版，页面直接按母版原比例展示，避免 CSS 重画导致比例、字体、留白和按钮形态走样。
  - 在母版上叠加透明点击热区：活动详情、CMI MAP、CMI SWAP、发起活动、一键订房、相关合作。
  - 保留一键订房和相关合作二维码弹窗，不额外增加可见 UI。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `node --test --experimental-strip-types src/pages/CmiCommunityEntrance.test.ts` 通过。
  - `pnpm exec vite build --config vite.config.prod.ts && node scripts/check-pwa-precache.mjs` 通过。
  - 本地应用内浏览器 477x846 视口复查 `/community?verify=reference-plate`：加载母版图片 `941x1672`，页面视觉与参考图一致。
  - 已部署线上预览 `https://c8cb97ba.cmi-map-v3.pages.dev/community`；线上应用内浏览器复查确认母版图片加载完成，页面显示为参考图复刻版本。

### 2026-06-09 15:25 +07 社区统一入口按明亮参考图重做

- 背景：上一版明亮入口仍与用户指定概念图差距明显，需要严格按黄色竖版掌机界面重排。
- 本轮实现：
  - `/community` 顶部改为大号 CMI 标识 + 右侧“社区统一入口”，移除多余胶囊和贴纸装饰。
  - 活动屏幕按参考图做成大圆角 LCD 面板：左侧真实活动信息，右侧真实活动海报，左右箭头贴屏幕两侧，底部轮播圆点。
  - 默认精选顺序优先显示 6.6 二手物品拍卖大会，并继续轮播真实 CMI 活动。
  - CMI MAP / CMI SWAP 保留两条白色大按钮，底部保留发起活动、一键订房、相关合作三个圆形按钮。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `node --test --experimental-strip-types src/pages/CmiCommunityEntrance.test.ts` 通过。
  - `pnpm exec vite build --config vite.config.prod.ts && node scripts/check-pwa-precache.mjs` 通过。
  - 本地应用内浏览器 393x852 视口复查 `/community?verify=match-reference-local-2`：页面为明亮黄色竖版，屏幕、入口按钮和三颗圆形按钮已按参考图比例重排。
  - 已部署线上预览 `https://65d55f3b.cmi-map-v3.pages.dev/community`，并确认页面加载新包 `CmiCommunityEntrance-BMya4kf2.js` / `cmi-community-entrance-BM0hc1Hz.css`。
  - 线上应用内浏览器 393x852 视口复查：页面非空，显示新版明亮黄色掌机界面。

### 2026-06-09 14:45 +07 动态页顶部精选帖按信息流对齐

- 背景：用户进一步指出顶部精选帖外侧仍有一圈绿色，和下面普通帖子没有排列整齐。
- 本轮实现：
  - 绿色只保留在动态页标题区。
  - 顶部精选帖改成和普通信息流一致的整行白底：铺满列表宽度、取消圆角内缩、图片区使用同样的 96px 列宽。
  - 不新增页面结构、按钮或交互逻辑。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.test.ts src/pages/cmi-map-v3-prototype.css` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 应用内浏览器复查 `http://127.0.0.1:5178/?screen=feed&verify=featured-align-local`：554x699 视口下顶部精选帖和第一条普通帖子左边、宽度、图片区左边与图片区宽度一致，二者间距为 0；点击精选帖进入对应活动详情页，无框架错误遮罩和控制台警告。
  - 已部署当前提交 `d46604a`：v3 预览 `https://c66e9191.cmi-map-v3.pages.dev`，正式站预览 `https://d62fbed9.cmi-map.pages.dev`。
  - 正式域名 `https://cmimap.com/?screen=feed&verify=featured-align-d46604a` 已确认加载新资源：入口引用 `assets/index-D-EzTdjT.js`，懒加载包引用 `CmiMapV3Prototype-rOGJ-UGO.js` 和 `CmiMapV3Prototype-zJemYATv.css`。
  - 线上应用内浏览器复查 554x699 视口：顶部精选帖和第一条普通帖子左边、宽度、图片区左边与图片区宽度一致，二者间距为 0；点击精选帖进入对应活动详情页，无框架错误遮罩和控制台警告。

### 2026-06-09 14:25 +07 动态页顶部精选帖恢复白底

- 背景：用户指出动态页顶部精选帖仍显得和白底帖子不一致，需要改掉这条帖子的特殊底色。
- 本轮实现：
  - 保留动态页外层和顶部区域的活动主页绿色 `#07934d`。
  - 将顶部精选帖 `.cmi-v3-feed-featured` 从半透明白底改为纯白底。
  - 不新增页面结构、按钮或交互逻辑。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.test.ts src/pages/cmi-map-v3-prototype.css` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 应用内浏览器复查 `http://127.0.0.1:5178/?screen=feed&verify=featured-white-local`：554x699 视口下顶部精选帖背景为 `rgb(255, 255, 255)`，普通帖子背景为 `rgb(255, 255, 255)`，动态页外层和顶部区域背景为 `rgb(7, 147, 77)`；点击精选帖进入对应活动详情页，无框架错误遮罩和控制台警告。
  - 已部署当前提交 `31ecf09`：v3 预览 `https://2825aa46.cmi-map-v3.pages.dev`，正式站预览 `https://754605f8.cmi-map.pages.dev`。
  - 正式域名 `https://cmimap.com/?screen=feed&verify=featured-white-31ecf09` 已确认加载新资源：入口引用 `assets/index-BWXmQzSV.js`，懒加载包引用 `CmiMapV3Prototype-x99otJpQ.js` 和 `CmiMapV3Prototype-CwkASUs0.css`。
  - 线上应用内浏览器复查 554x699 视口：顶部精选帖背景为 `rgb(255, 255, 255)`，普通帖子背景为 `rgb(255, 255, 255)`，动态页外层和顶部区域背景为 `rgb(7, 147, 77)`；页面非空，无框架错误遮罩和控制台警告。

### 2026-06-09 13:55 +07 动态页帖子卡片恢复白底

- 背景：用户指出动态页应该是绿色背景，但帖子内部保持白色，不应把帖子卡片也染成绿色。
- 本轮实现：
  - 保留动态页外层、滚动容器、顶部精选区和列表容器的活动主页绿色 `#07934d`。
  - 将动态列表帖子卡片背景恢复为白色。
  - 不新增页面结构、按钮或交互逻辑。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 应用内浏览器复查 `http://127.0.0.1:5178/?screen=feed&verify=feed-white-posts`：554x699 视口下页面非空、无框架错误、无控制台警告；动态页容器和列表容器背景为 `rgb(7, 147, 77)`，帖子卡片背景为 `rgb(255, 255, 255)`。
  - 已部署当前分支 HEAD `58f8493`：v3 预览 `https://eb68153b.cmi-map-v3.pages.dev`，正式站预览 `https://9230f963.cmi-map.pages.dev`。
  - 正式域名 `https://cmimap.com/?screen=feed&verify=feed-white-posts-58f8493` 已确认加载新资源：入口引用 `assets/index-B3vioOwZ.js`，懒加载包引用 `CmiMapV3Prototype-C0CdV9O-.js` 和 `CmiMapV3Prototype-odldOtYj.css`。
  - 线上应用内浏览器复查 554x699 视口：页面标题为 `CMI Map`，15 张普通帖子加载完成，无框架错误和控制台警告；动态页外层、滚动容器、顶部精选区和列表容器背景为 `rgb(7, 147, 77)`，普通帖子卡片背景为 `rgb(255, 255, 255)`。

### 2026-06-09 13:30 +07 动态页底色改为神奇动物活动绿

- 背景：用户在正式站动态页评论要求把动态页面底色换成主题活动页面的绿色。
- 本轮实现：
  - 动态页外层、滚动容器、顶部精选区、列表容器和动态列表行统一使用活动主页绿色 `#07934d`。
  - 动态列表文字和操作图标改为深色，避免绿底上小字变淡。
  - 不新增页面结构、按钮或交互逻辑。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 应用内浏览器复查 `http://127.0.0.1:5178/?screen=feed&verify=feed-green-bg-final`：554x699 视口下页面非空、无框架错误、无控制台警告；动态页容器、顶部精选区、列表和动态行背景均为 `rgb(7, 147, 77)`，底部导航从地图切回动态后仍保持绿底。
  - 已部署 v3 项目 `https://8a80016a.cmi-map-v3.pages.dev` / `https://codex-cmimapv3-1.cmi-map-v3.pages.dev`，并部署正式站 `https://e5a1e913.cmi-map.pages.dev`。
  - 正式域名 `https://cmimap.com/?screen=feed&verify=feed-green-5e4eb61c` 已确认加载新资源：入口引用 `assets/index-BjeTzVZC.js`，懒加载包引用 `CmiMapV3Prototype-CexCwO1d.js` 和 `CmiMapV3Prototype-Ceg3jNpd.css`。
  - 线上应用内浏览器复查 554x699 视口：页面标题为 `CMI Map`，页面非空，无框架错误和控制台警告；动态页容器、顶部精选区、列表和动态行背景均为 `rgb(7, 147, 77)`；底部导航从地图切回动态后仍保持绿底。
- 踩坑：第一次干净 worktree 部署没有带本地前端环境文件，生产包里 Supabase 配置为空导致线上只显示空白壳；已用同一提交、补齐本地前端环境文件后重新构建并覆盖部署，最终线上复查通过。

### 2026-06-09 13:00 +07 底部拍照按钮改用圆形图鉴放大镜

- 背景：用户在正式站评论要求把底部“打卡拍照”的简化放大镜替换成参考图里的绿色圆形图鉴放大镜。
- 本轮实现：
  - 底部“打卡拍照”按钮保留原入口和尺寸，内部图标改为专用 `WildMagnifierIcon` SVG。
  - 图标包含绿色圆形底、深绿色描边、白色放大镜、叶片、黄色星点、粉色星号和左上短线装饰。
  - 移除原来围绕 lucide 放大镜的伪元素装饰，避免参考图元素重复叠加。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.test.ts src/pages/cmi-map-v3-prototype.css` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 应用内浏览器复查 `http://127.0.0.1:5178/?screen=map&verify=custom-magnifier`：按钮显示圆形图鉴放大镜 SVG，页面非空，无框架错误；点击“打卡拍照”进入未登录前置流程。
  - 已提交并推送 `e85e4bd`，本轮只纳入图标、样式、测试和任务日志。
  - 已部署 v3 项目 `https://c41125fa.cmi-map-v3.pages.dev` / `https://codex-cmimapv3-1.cmi-map-v3.pages.dev`，并部署正式站 `https://b4aa0f9d.cmi-map.pages.dev`。
  - 正式域名 `https://cmimap.com/?verify=custom-magnifier-e85e4bd` 已确认加载新资源：入口引用 `assets/index-DA4LRjKY.js`，懒加载包引用 `CmiMapV3Prototype-CvGOvWQ1.js` 和 `CmiMapV3Prototype-B3wbZS9H.css`。
  - 线上应用内浏览器复查 554x699 视口：页面标题为 `CMI Map`，页面非空，无框架错误和控制台警告；底部“打卡拍照”按钮显示绿色圆形图鉴放大镜，SVG 包含黄色星点、粉色星号和绿色叶片。

### 2026-06-09 12:40 +07 神奇动物在哪里主地图轻皮肤

- 背景：用户要求在 CMI Map 现有按钮和图标上加一点 `神奇动物在哪里` 主题皮肤，并把底部“打卡拍照”的加号换成绿色底放大镜。
- 本轮实现：
  - 底部“打卡拍照”主按钮从紫色加号改为绿色圆形放大镜。
  - 地图顶部筛选、活动入口、图层 / 定位按钮和底部导航加入轻量叶片与星点装饰。
  - 不新增主题页、任务、奖励、按钮或额外发布逻辑，只改现有入口的视觉。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.test.ts src/pages/cmi-map-v3-prototype.css` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 应用内浏览器复查 `http://localhost:5174/?screen=map&verify=wild-skin-qa`：移动视口底部主按钮为绿色放大镜，页面非空，无框架错误；点击“打卡拍照”进入未登录前置流程。
  - 应用内浏览器桌面视口复查 `http://localhost:5174/?screen=map&verify=wild-skin-desktop-clean`：页面保持 478px 容器，无横向溢出。
  - 已部署 v3 项目 `https://844b647a.cmi-map-v3.pages.dev` 和正式站 `https://2debdd43.cmi-map.pages.dev`，Source 为 `b05b7ee`。
  - 正式域名 `https://cmimap.com/?verify=wild-skin-b05b7ee` 已确认加载新资源：入口引用 `CmiMapV3Prototype-DD_PNS0U.js` 和 `CmiMapV3Prototype-DxlICJqy.css`；线上浏览器复查底部主按钮为绿色放大镜，活动筛选和定位按钮为绿色主题，无框架错误。

### 2026-06-09 11:58 +07 神奇动物分享图鉴卡编号口径

- 本轮决策：
  - 分享图鉴卡固定加入 `神奇动物在哪里` 活动主页二维码，不使用用户页或普通首页二维码。
  - 图鉴卡右上角编号使用活动内全局捕获序号：所有用户共同累加；例如前面已有 999 条活动捕获记录，下一条就是 `No.1000`。
  - 编号含义是“活动捕获记录编号”，不是按个人或按物种单独编号。
- 本轮实现：
  - `recommendations` 增加 `linked_event_capture_number` 字段。
  - 新增 `cmi_event_capture_counters` 与 `assign_cmi_event_capture_number` RPC，由数据库原子递增分配编号。
  - `/mark` 关联 `神奇动物在哪里` 活动发布成功后，为该条动态写入活动捕获编号。
- 仍未加入：
  - 不加奖励、排行榜、任务按钮、成就或额外玩法。
  - 不恢复旧主题系统。

### 2026-06-09 01:11 +07 神奇动物在哪里识别入口补充

- 本轮实现：
  - `/mark` 相机页新增可见“识别动物”按钮，点按后把当前打卡切到神奇动物活动识别模式。
  - 保持拍照后自动识别和候选确认逻辑，不恢复独立主题页、主题任务、奖励或成就。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/MarkPlace.test.ts src/services/animal-identification.test.ts` 通过。
  - `pnpm exec biome lint src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts src/services/animal-identification.ts src/services/animal-identification.test.ts` 通过。
  - `git diff --check -- src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts CMI_MAP_TASK_LOG.md` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 已部署 Cloudflare Pages：`https://51945c39.cmi-map-v3.pages.dev`，正式域名 `https://cmti.uk/mark?verify=e837fad` 返回 `HTTP 200`。
  - 线上脚本 `MarkPlace-BxJ1K2hY.js` 已包含“识别动物 / 动物识别已开启”。
  - 内置浏览器线上验证：旧 PWA 缓存首次打开仍可能短暂显示旧相机页，随后自动刷新到新构建；刷新后“识别动物”按钮可见，点击后状态变为“动物识别已开启”。
  - 线上 `/api/animal-identify` 热启动复测猫图：总耗时约 `0.95s`，模型耗时 `404ms`，返回 `猫 / TIGER CAT`。

### 2026-06-08 22:05 +07 神奇动物在哪里拍照识别第一版

- 本轮实现：
  - 新增 Pages Function `/api/animal-identify`，使用 Cloudflare Workers AI `@cf/microsoft/resnet-50` 做线上图片分类。
  - `/mark?event=cmi-wild-chiang-mai-2026-06` 拍照后会压缩图片、调用识别 API，并在文字输入页显示动物候选。
  - 识别到候选后自动预选 `彩蛋` 标签，并按候选匹配猫、狗、壁虎、小鸟、蝴蝶等现有彩蛋图标。
  - 新增 `wrangler.jsonc`，为 Pages Functions 配置 `AI` 绑定。
- 验证结果：
  - 本地 Pages + 远程 AI 绑定实测猫图：接口约 `1.50s`，返回 `cat / TIGER CAT`。
  - 本地 Pages + 远程 AI 绑定实测压缩后 Tokay gecko 图：接口约 `1.53s`，返回 `大壁虎 / Tokay gecko`。
  - `node --test --experimental-strip-types src/services/animal-identification.test.ts src/pages/MarkPlace.test.ts src/routes.test.ts src/data/cmi-events.test.ts src/pages/CmiEventDetail.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint` 通过。
  - `npx wrangler pages functions build --outfile /tmp/cmi-map-v3-functions-worker.js` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。

### 2026-06-07 13:20 +07 统一入口街机动效回滚

- 背景：用户反馈上一版 CRT / 霓虹 / 像素字图标抖动动效太夸张，不喜欢。
- 本轮回滚：
  - 移除 `/community` 的循环动效层、屏幕闪烁层、霓虹呼吸层、底部按钮发光层。
  - 移除 `CMI MAP` / `CMI SWAP` 英文像素字和图标的持续抖动层。
  - 保留原型图底图、真实点击热区和两个主入口外链。

### 2026-06-07 13:12 +07 统一入口主按钮改为独立域名

- 本轮实现：
  - `/community` 原型图上的 `CMI MAP` 热区改为跳转 `https://cmimap.com`。
  - `/community` 原型图上的 `CMI SWAP` 热区改为跳转 `https://cmiswap.com`。
  - 新增源码断言，防止两个主入口回退到站内 `/v3?screen=map` 和 `/swap`。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/CmiCommunityEntrance.test.ts src/routes.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/CmiCommunityEntrance.tsx src/pages/CmiCommunityEntrance.test.ts src/pages/cmi-community-entrance.css src/App.tsx src/routes.tsx src/routes.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 应用内浏览器复查：`CMI MAP` 点击后 URL 为 `https://cmimap.com/`；`CMI SWAP` 点击后 URL 为 `https://cmiswap.com/`。

### 2026-06-07 12:44 +07 主题地图最短链路第一版

- 本轮实现：
  - 新增主题基础路径和模型：`/themes/:themeSlug`、`getThemePath`、`getMarkPlacePath({ themeSlug, taskId })`。
  - 恢复主题最短链路数据层：读取当前主题、读取主题详情、读取主题投稿、写入主题投稿关系。
  - 新增晚于旧 rollback 的最小恢复 migration：只包含 `cmi_map_themes`、`cmi_theme_tasks`、`cmi_theme_submissions`，并种子 `wild-chiang-mai / 神奇动物在哪里`。
  - 新增公开主题页 `/themes/wild-chiang-mai`：展示主题介绍、当前任务、大家的投稿；主题投稿卡可生成分享卡。
  - `/mark?theme=wild-chiang-mai&task=...` 会显示主题标签；发布动态后写入主题投稿关系，并回到主题页。
- 明确未做：
  - 不做奖励、玩法、成就、徽章、排行榜、积分、AR 宠物。
  - 不恢复主题后台管理页。
  - 不恢复约搭子功能。
- Supabase 状态：
  - 远端公开读取已确认 `cmi_map_themes` 存在，且 `wild-chiang-mai` 为 `active`。
  - `npx supabase db push --dry-run --linked` 显示会同时推送旧 `20260607051500_rollback_theme_and_companion_features.sql` 和新恢复 migration；为避免连带旧 rollback 删表，本轮没有执行远端 `db push`。
- 验证结果：
  - `node --test --experimental-strip-types src/features/themes/cmi-themes.test.ts src/db/cmi-themes.test.ts src/lib/paths.test.ts src/lib/cmi-theme-share-card.test.ts src/pages/CmiThemeDetail.test.ts src/pages/MarkPlace.test.ts src/routes.test.ts` 通过。
  - `pnpm exec biome lint` 目标文件通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 应用内浏览器复查 `http://127.0.0.1:5176/themes/wild-chiang-mai?verify=theme-shortest-chain`：主题标题、主题介绍、当前任务、参加任务入口、大家的投稿均正常显示，页面非空，无框架错误。
  - 应用内浏览器点击 `参加任务`：链接携带 `theme=wild-chiang-mai` 和真实 task id，未登录状态按预期进入登录页。
  - 移动视口 `393x852` 复查主题页：首屏正常，无横向溢出。

### 2026-06-07 12:52 +07 统一入口改用原型图

- 背景：用户明确要求 `/community` 使用已生成的街机原型图，而不是继续用 CSS 近似拼接。
- 本轮实现：
  - 将原型图保存为 `public/brand/cmi-community-arcade-prototype.png`。
  - `/community` 改为以原型图作为可视底图，覆盖真实点击热区：近期活动、`CMI MAP`、`CMI SWAP`、`发起活动`、`一键住房`、`相关合作`。
  - 保留真实入口跳转：`CMI MAP` 到 `/v3?screen=map`，`CMI SWAP` 到 `/swap`，底部三个按钮仍进入原有对应路径。
- 验证结果：
  - `node --test --experimental-strip-types src/routes.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/CmiCommunityEntrance.tsx src/pages/cmi-community-entrance.css src/App.tsx src/routes.tsx src/routes.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 应用内浏览器 `486x777` 视口复查 `http://127.0.0.1:4773/community?verify=prototype-final-aspect`：页面显示与原型图一致，图片加载正常，无 console error / warning。
  - 点击验证：`CMI MAP` 进入 `/v3?screen=map`；`CMI SWAP` 进入 `/swap`。

### 2026-06-07 12:15 +07 回滚旧主题地图 MVP 与约搭子第一部分

- 背景：用户要求先回滚之前已经做进代码的主题地图和约搭子功能，后续重新开始。
- 本轮回滚：
  - 删除主题地图页面、主题管理页、主题分享卡、主题数据访问层、主题模型和相关测试。
  - 删除约搭子发起页、约搭子数据访问层、约搭子模型、地图 / 动态 / 申请审核接入和相关测试。
  - 恢复 `/mark`、v3 地图主页面、路径工具、marker 视觉和类型定义到旧功能接入前状态。
  - 从路由中移除 `/themes/:themeSlug`、`/admin/themes/:themeSlug` 和 `/companions/new`，保留 `/community` 与 `/swap`。
  - 保留已经应用过的旧 Supabase migration 文件作为历史记录，新增 `20260607051500_rollback_theme_and_companion_features.sql` 用于删除旧主题地图 / 约搭子表和函数。
- 说明：下方 2026-06-03 主题地图与约搭子记录保留为历史，不代表当前代码仍保留这些入口。

### 2026-06-07 12:13 +07 主题地图最短链路讨论原文记录

- 子扬原文：
  - “我们现在就做这个链路：发布主题（比如神奇动物在哪里）——有专门的活动主题页，里面有主题介绍、和大家的主题帖子展示——用户可以带着主题 tag 在 cmimap 里打卡发动态——然后后可以分享成卡片出去（分享到朋友圈或小红书之类的）我们就先做这个最短链路，把这些先做好！然后我们再一点一点往里面加入奖励、玩法、成就这些更加丰富的东西如何？我想知道你对这一点有什么看法？如果是最顶级的内容创作和运营者会怎么做？”
  - “很对！我觉得你说的很好！把我们这几轮讨论原文记录在 OB 里，记录在开发日志里，然后我们就开始做这个链路。”
  - “先记录，不急着开发”
- Codex 判断原文：
  - “这个方向是对的，而且应该就是第一阶段的主线。但它成立的前提不是‘功能链路完整’，而是它必须被当成一次内容运营活动，而不是一个新功能。”
  - “最短链路应该是：主题发布 → 主题页 → 带主题打卡 → 主题帖子展示 → 分享卡外传 → 运营精选 / 二次内容。”
  - “奖励玩法只有在用户已经愿意发、愿意分享、愿意被看见之后才有价值。否则奖励系统会变成空转装饰。”
- 本轮共识：
  - 当前只记录，不急着开发。
  - 第一阶段只做最短链路：发布主题、主题页、带主题 tag 打卡、主题帖子展示、分享卡外传、运营精选 / 二次内容。
  - 第一主题继续以 `神奇动物在哪里 / 清迈奇妙生物图鉴` 为样板。
  - 奖励、玩法、成就、徽章、排行榜、积分、AR 宠物等后置，不进入当前阶段。
- Obsidian 同步：
  - 原文记录：`/Users/andreas/cmi社区知识库/CMI/CMI map/v3.1/2026-06-07 主题地图最短链路讨论原文.md`
  - 项目页：`/Users/andreas/cmi社区知识库/CMI/Agent-Memory/CMI Map社区地图.md`
  - Shared memory：`/Users/andreas/cmi社区知识库/CMI/Agent-Memory/shared-memory/codex-updates.md`

### 2026-06-07 11:32 +07 统一社区入口网页第一版

- 本轮实现：
  - 新增公开路由 `/community`，作为 CMI 统一入口网页第一版。
  - 页面按用户草图和街机参考图实现：顶部为近期活动 / 精选内容轮播，中央为 `CMI MAP` 和 `CMI SWAP` 两个主入口，底部为 `发起活动`、`一键住房`、`相关合作` 三个街机按钮。
  - 新增公开路由 `/swap`，作为 CMI Swap 第一阶段承接页，只展示已有旧物交换 / 二手拍卖活动，不做交易系统、上架系统或额外功能。
- 亮度调整：
  - 用户反馈第一版整体偏暗压抑后，已把机身紫色、霓虹粉、青蓝入口面板、绿色 CRT 屏和底部按钮整体提亮，参考新的街机明度。
- 视觉重做：
  - 用户强烈否定蓝色空卡片版后，已废掉卡片式视觉，重做为绿色 CRT 活动屏、青色霓虹主入口、粉 / 绿 / 蓝实体按钮和 joystick 控制台。
  - `/community` 和 `/swap` 改为全屏街机页，不再被旧 480px 移动容器限制，桌面宽度下不会露出白边。
- 入口指向：
  - `CMI MAP` 跳转 `/v3?screen=map`。
  - `CMI SWAP` 跳转 `/swap`。
  - `发起活动` 跳转 `/events/new`。
  - `一键住房` 打开林可二维码 `/cmi-home/qr-linke.jpg`。
  - `相关合作` 打开子扬二维码 `/cmi-home/qr-andreas.jpg`。
- 验证结果：
  - `node --test --experimental-strip-types src/routes.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/App.tsx src/pages/CmiCommunityEntrance.tsx src/pages/CmiSwapPage.tsx src/routes.tsx src/routes.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 应用内浏览器移动视口复查 `http://127.0.0.1:4673/community?verify=mobile-final-qa`：页面非空、无框架错误，能看到 `CMI MAP`、`CMI SWAP`、`发起活动`、`一键住房`、`相关合作`。
  - 应用内浏览器桌面视口复查 `http://127.0.0.1:4673/community?verify=desktop-fullbleed-qa-new-port`：入口页全屏背景正常，不再有左右白边。
  - 应用内浏览器点击验证：`CMI MAP` 进入 `/v3?screen=map`；`CMI SWAP` 进入 `/swap`，Swap 页显示二手拍卖和旧物交换活动。
  - 本地 `4173` / `4573` 预览曾被旧 PWA / service worker 缓存带回旧包；最终换到未被旧缓存控制的 `4673` 端口复查通过。

### 2026-06-07 10:52 +07 6.6 会议方向留档与技术侧启动

- 背景：2026-06-06 中午社区讨论确认，下一阶段不把 Map、Swap、活动、内容和住宿入口继续分散运营，而是先做统一社区入口，用同一条内容主线收口。
- 原文归档：会议完整记录已保存到 `/Users/andreas/cmi社区知识库/CMI/CMI map/6.6 会议方向.md`。
- 产品方向：CMI Map 继续作为主题内容和社区动态的空间底座，承接 `神奇动物在哪里`、植物、人文建筑、寺庙佛学等主题运营线。
- Swap 边界：CMI Swap 第一阶段先作为统一入口里的固定栏目和活动 / 物品故事沉淀入口，不直接做复杂交易系统。
- 技术侧第一步：先做网页聚合入口，而不是先做小程序或独立 App；首版只收活动轮播、CMI Map 入口、CMI Swap 入口、一键入住 / 加群入口。

### 2026-06-03 23:42 +07 CMI Map 3.1 主题地图拍照令 MVP

- 背景：按批注后的 `CMI Map 3.1 主题地图开发文档` 执行，只做主题拍照令 MVP，不加入成就、进度、徽章、AR 宠物、奖励等后置玩法。
- 本轮实现：
  - 新增主题地图数据结构：`cmi_map_themes`、`cmi_theme_tasks`、`cmi_theme_submissions`；初始主题为 `神奇动物在哪里`，任务为 `上传 3 张你在清迈遇到的奇妙动物`。
  - 主题页 `/themes/wild-chiang-mai` 展示主题、当前任务、参与人数和精选投稿；主题页“参加任务”进入现有 `/mark` 发布流程。
  - `/mark` 支持主题任务参数，发布成功后写入主题投稿关系，不改变原本动态发布流程。
  - 主页地图出现当前主题入口；主题投稿仍保留在默认动态层，同时支持“主题”筛选和主题色 marker 边框。
  - 主题投稿详情只新增必要的“分享卡”入口；分享卡包含用户照片、主题名、地点名、用户昵称、CMI Map 标识、二维码 / 入口链接和主题色视觉。
  - 新增管理员主题素材页 `/admin/themes/wild-chiang-mai`，支持查看主题投稿、按日期 / 用户 / 地点筛选、标记精选、隐藏不合适内容、复制素材清单。
- 远端状态：
  - 已单独执行并修复远端 migration 历史：`20260603170000_cmi_theme_maps`。
  - 未处理本地未跟踪的 `20260603161708_cmi_companion_invites.sql`，避免把约搭子相关 migration 误推到远端。
- 验证结果：
  - `node --test` 覆盖主题模型、主题数据层、主题分享卡、主题管理页、路由、路径、地图层和发布页主题参数测试，均通过。
  - `npx tsgo -p tsconfig.check.json` 通过。
  - `npm run build` 通过，PWA precache 检查通过。
  - 本地 Chrome 复查 `http://127.0.0.1:5173/`：首页显示当前主题入口 `神奇动物在哪里`；`/themes/wild-chiang-mai` 正常显示主题页；`/admin/themes/wild-chiang-mai` 未登录状态按预期进入登录页。

### 2026-06-03 22:47 +07 CMI Map 3.1 测试域名迁移

- 背景：`cmimap.com` 已经作为 CMI Map 主站；旧主域名 `cmti.uk` 当前不再承担主站职责，用户决定把它改作 CMI Map 3.1 测试域名。`cmiti.uk` 拼写当前无法解析，历史和 Cloudflare 记录均指向 `cmti.uk`。
- 本轮完成：
  - 用当前分支 `codex/cmimapV3.1` 的 HEAD `992d21a` 重新执行生产构建，`pnpm build` 通过，PWA precache 检查通过。
  - 将 `dist` 部署到 Cloudflare Pages 项目 `cmi-map-v3`，生产部署地址为 `https://48a8d83d.cmi-map-v3.pages.dev`，Source 为 `992d21a`。
  - 通过 Cloudflare Pages API 将 `cmti.uk` 添加到 `cmi-map-v3` 自定义域名列表。
  - 复查 `cmi-map` 正式项目仍只绑定 `cmimap.com` 与 `www.cmimap.com`；`stickers.cmti.uk` 仍绑定 `cmi-photo-sticker`，本轮未触碰贴纸子域名。
- 当前卡点：
  - `https://cmti.uk/?verify=v31-992d21a` 仍 301 跳转到 `https://cmimap.com/?verify=v31-992d21a`，说明旧跳转规则仍在生效。
  - `cmti.uk` 在 `cmi-map-v3` 的 Pages 域名状态为 `pending`，Cloudflare 返回 `CNAME record not set`。
  - 当前 Wrangler OAuth 具备 Pages 写权限，但 DNS records、Page Rules 和 Rulesets 查询 / 修改返回 403；Chrome profile 打开 Cloudflare Dashboard 会跳登录页，无法自动清理旧跳转或改 DNS。
- 需要人工或更高权限完成：
  - 在 Cloudflare 的 `cmti.uk` zone 中，删除或禁用根域名旧 301 跳转：`cmti.uk/* -> https://cmimap.com/*`，不要影响 `stickers.cmti.uk`。
  - 将根域名 `cmti.uk` 的 DNS 记录改为指向 `cmi-map-v3.pages.dev` 的 proxied CNAME（Cloudflare 会对根域 CNAME flatten），或按 Pages 自定义域名提示创建等效记录。
  - 等 `cmti.uk` Pages 域名状态变为 active 后，复查 `https://cmti.uk/?verify=v31-992d21a` 返回 V3.1 页面且不再跳转到 `cmimap.com`。

### 2026-06-02 13:49 +07 打卡发布前照片预览缩小

- 背景：用户反馈相册照片进入“选择发布标签 / 关联活动”阶段后，照片仍占据过高首屏空间，导致 Tag 和活动关联只能在很小区域里上下拖动。
- 本轮实现：
  - `/mark` 发布准备阶段单独使用紧凑照片高度 `clamp(10.5rem, 28dvh, 13rem)`，只压缩已经确定照片后的预览，不影响拍照、分析和定位阶段的大图反馈。
  - 增加源码断言，防止发布前分类页之后又回到大方图占满首屏。
- 验证结果：
  - `node --test src/pages/MarkPlace.test.ts` 通过。
  - `pnpm exec biome lint src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 应用内浏览器用 393×852 移动视口打开本地 `http://127.0.0.1:5174/mark?verify=compact-photo-local`，页面被未登录保护重定向到 `/login`，因此本地浏览器未能直接进入截图里的发布准备阶段；目标布局以源码断言、构建和 lint 验证为准。

### 2026-06-02 13:44 +07 打卡发布按钮简化

- 背景：用户反馈发布分类页底部操作条太复杂，只需要固定一个发布按钮；满足条件后直接发布。
- 本轮实现：
  - 删除底部操作条里的标签摘要、地点 / 活动摘要和“发布到客栈 / 发布彩蛋 / 发布动态”差异化按钮文案。
  - 发布分类页底部改为单个全宽按钮：未选标签时显示“先选标签”并禁用；选好标签后统一显示“发布”，点击后仍走原有 `handleSubmitFinal` 提交流程。
  - 保留活动关联、清迈客栈标签自动绑定地点、彩蛋图标选择等原有功能。
- 验证结果：
  - `node --test src/pages/MarkPlace.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 应用内浏览器移动视口复查 `/mark?verify=simple-publish-button-flow`：走“直接文字推荐 -> 选择清迈客栈 -> 写体验 -> 进入分类发布 -> 选择清迈客栈标签”，选标签前底部只有灰色“先选标签”按钮，选中后变成紫色“发布”按钮；未点击最终发布，避免生成测试动态。
  - 控制台只有本地相机权限被拒绝的 warning，不是本轮按钮改动导致。
  - 已部署 v3 项目 `https://16737d34.cmi-map-v3.pages.dev` 和正式站 `https://4eb9d120.cmi-map.pages.dev`，Source 为 `8bd73c2`。
  - 正式域名 `https://cmimap.com/mark?verify=simple-publish-button-8bd73c2` 返回 200；线上 `MarkPlace-W4S-F6c7.js` 包内包含“先选标签”和“正在发布...”，不再包含“发布到客栈”“发布彩蛋”“先选一个标签”或 `publishButtonLabel`。
  - 应用内浏览器复查 `https://4eb9d120.cmi-map.pages.dev/mark?verify=simple-publish-button-clean-8bd73c2`：未登录状态按预期跳到登录页，页面非空且无框架错误；同一浏览器日志里残留的 warning 均来自此前本地 `127.0.0.1` 相机权限拒绝，不是线上页面错误。

### 2026-06-02 13:27 +07 删除旧活动列表返回界面

- 背景：用户反馈从活动发起页点击返回会进入旧 `/list?scene=tomorrow-events` 黄色活动列表界面；该界面已不需要，避免继续和 CMI Map 3.0 活动 Tab 形成双入口。
- 本轮实现：
  - 活动发起页返回按钮改为进入 CMI Map 3.0 活动 Tab：`/?screen=events`。
  - `getSceneListPath('tomorrow-events')` 和 `getSceneEntryPath(tomorrow-events)` 统一改到 CMI Map 3.0 活动 Tab，旧入口不再生成 `/list?scene=tomorrow-events`。
  - `ListView` 对 `tomorrow-events` 做重定向，并删除旧活动列表专用的活动分类筛选、黄色外壳、快速报名、取消报名、活动分享卡生成和对应后端调用。
  - 仍保留活动详情、活动发布、活动管理、V3 活动 Tab 的报名和分享能力。
- 验证结果：
  - `pnpm exec biome lint src/pages/ListView.tsx src/pages/CmiEventCreate.tsx src/pages/CmiHome.tsx src/lib/paths.ts src/lib/paths.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec vite build --config vite.config.prod.ts` 通过。
  - `node --test --experimental-strip-types src/lib/paths.test.ts` 通过。

### 2026-06-02 10:53 +07 报名成功邮件路线指引改为单张拼版图

- 背景：用户反馈报名成功邮件里的清迈客栈路线指引照片不对，且逐张长图排列太长、不便保存和转发。
- 本轮实现：
  - 使用 `/Users/andreas/Downloads/清迈客栈路线图` 中的 5 张新照片生成 9:16 单张路线指引图。
  - 版式为上方两张、中间两张、底部一张抵达图；保留所有红色路线箭头和抵达图文字，输出到 `public/cmi-home/cmi-inn-route-guide-grid.jpg`。
  - 报名成功邮件不再逐张插入入口、门口、院子照片，改为只插入这张五步路线指引图，减少邮件长度并方便用户保存分享。
- 验证结果：
  - 已视觉检查合成图，确认五张照片顺序和内容完整。
  - `deno check supabase/functions/notify-cmi-event-registration/index.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `git diff --check` 通过。
  - `deno fmt --check supabase/functions/notify-cmi-event-registration/index.ts` 未采用为通过标准：该函数目录沿用项目现有单引号风格，Deno fmt 会重排整份文件并产生大范围格式化噪音。
  - 已提交并推送：`aec7671 Update CMI inn route guide email image`。
  - 已部署 v3 项目 `https://4e27e02f.cmi-map-v3.pages.dev` 和正式站 `https://a521d7ba.cmi-map.pages.dev`。
  - Edge Function `notify-cmi-event-registration` 已部署到 Supabase 项目 `sfpcpxlxslnulzlmjcby`。
  - 正式域名 `https://cmimap.com/cmi-home/cmi-inn-route-guide-grid.jpg` 返回 200，`content-type: image/jpeg`，`content-length: 863044`。

### 2026-06-02 09:40 +07 地图动态 marker 只保留最近一周

- 背景：用户在 V3 地图页反馈，地图上的动态标识不应该一直积累、永久留在地图上；超过一周的动态仍应能搜索到，也能在个人主页看到，只是不再作为地图 marker 显示。
- 本轮实现：
  - 默认地图上的用户动态 marker 增加 7 天可见窗口，只取 `created_at` 距当前时间不超过一周的真实用户分享。
  - 搜索结果和动态数据本身仍使用完整公开动态集合，超过一周的动态不会被删除，也不会从搜索、信息流或个人主页消失。
  - 搜索点到一条超过一周的历史动态时，仍可打开动态详情；但不会把这条历史动态重新塞回 `LeafletMap` marker 列表。
- 验证结果：
  - `node --test src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过；`pnpm lint` 通过，其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 已用干净 worktree 从代码提交 `31ea2a1` 构建部署，避免混入当前工作区里的活动表单草稿。
  - 已部署 v3 项目 `https://07f33776.cmi-map-v3.pages.dev` 和正式站 `https://1beafb30.cmi-map.pages.dev`，Source 为 `31ea2a1`。
  - 正式域名 `https://cmimap.com` 服务器入口已引用新包 `index-BjZ9ohCX.js` 与 `CmiMapV3Prototype-Dxz89hnZ.js`；包内确认存在 7 天 marker 窗口与搜索结果兜底打开逻辑。
  - 应用内浏览器复查 `https://1beafb30.cmi-map.pages.dev/?verify=31ea2a1-browser2`：地图首屏非空、无框架错误；搜索“清迈客栈”会展开搜索结果并显示动态卡片。控制台只有此前旧相机页留下的权限 warning，不是当前新部署页错误。

### 2026-06-02 09:09 +07 清迈客栈打卡归入动态页

- 背景：用户反馈选择“清迈客栈”标签打卡发布后会跳入旧 `/cmi-home` 清迈客栈独立页；该页面当前用不到，应先下线，清迈客栈 Tag 的打卡动态统一进入动态页，并继续能在地图上看到。
- 本轮实现：
  - `/mark` 选择清迈客栈 Tag 发布成功后改为跳转动态页 `/?screen=feed`，成功提示改成“这张客栈现场已经放到动态里了”。
  - `/cmi-home` 不再渲染旧清迈客栈独立页，改为重定向到动态页；旧 `CmiHome` 组件与素材保留，方便以后需要时复用。
  - 清迈客栈 Tag 不再被公开地图推荐过滤排除，仍识别为清迈客栈标签，同时属于动态页和地图 marker 候选。
  - 旧首页清迈客栈入口、活动异常 fallback、发布分类说明同步改为动态页语义，避免继续把用户带回旧客栈页。
- 验证结果：
  - `node --test src/pages/MarkPlace.test.ts src/routes.test.ts` 通过。
  - `node --test --experimental-strip-types src/types/types.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts src/routes.tsx src/routes.test.ts src/types/types.ts src/types/types.test.ts src/pages/CmiEventDetail.tsx src/features/home/sections/cmi-inn-section.ts src/data/cmi-taxonomy.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过；`pnpm lint` 通过，其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地预览清理旧 PWA 缓存后访问 `/cmi-home` 会跳到 `/?screen=feed`，页面不再出现 `CMI Inn as Living Room` 和 `去客栈逛逛`，动态流中可见“清迈客栈”打卡。
  - 已用干净 worktree 从代码提交 `e264ec1` 构建部署，避免混入当前工作区里无关的活动管理草稿改动。
  - 已部署 v3 项目 `https://f059c3f0.cmi-map-v3.pages.dev` 和正式站 `https://cb83c450.cmi-map.pages.dev`，Source 为 `e264ec1`。
  - 正式域名 `https://cmimap.com` 服务器入口已引用新包 `index-Mv1ZAFbp.js` 与 `MarkPlace-Bjl9lciY.js`；包内确认 `/cmi-home` 路由仍存在但只重定向动态页，不再包含旧 `CmiHome` lazy 路由、旧客栈页 hero 文案或“留言墙”提示。应用内浏览器若仍看到旧客栈页，是旧 PWA Service Worker 缓存，需要刷新或重开页面。

### 2026-06-02 08:55 +07 打卡文字输入区去掉重复预览

- 背景：用户反馈打卡文字已经在下方输入框写完后，上方又生成一张写好内容的便签预览，信息重复；语音按钮和确认按钮也应放在输入框下面。
- 本轮实现：
  - 删除语音/文字阶段上方的描述便签预览，避免同一段打卡文字在页面里重复出现。
  - 将文字输入框前移为主控件，麦克风按钮和确认按钮固定放在输入框下面；确认按钮在未输入内容或正在听写时禁用。
  - 语音识别中的临时文本改为显示在输入框下方的小提示，不再生成上方预览卡片。
- 验证结果：
  - `node --test src/pages/MarkPlace.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地预览 `http://127.0.0.1:4173/mark?verify=voice-layout-local` 被登录保护重定向到 `/login`，无法在本地未登录会话里直接操作目标文字阶段；目标布局以源码测试、构建包和正式域名包检查为准。
  - 已部署 v3 项目 `https://2a4e518a.cmi-map-v3.pages.dev` 和正式站 `https://c3f8a480.cmi-map.pages.dev`，Source 为 `d8dea74`。
  - 正式域名 `https://cmimap.com/mark?verify=voice-layout-d8dea74` 返回 200，入口引用新包 `index-DwEIRZX7.js`；新 `MarkPlace-5gua22yM.js` 包内不含旧 `#fff9e6` 便签预览和“正在把这条清迈痕迹收进地图”文案，且确认按钮与语音临时提示均位于输入框之后。应用内浏览器已加载新 MarkPlace 包，但当前停在相机/权限阶段，未进入文字输入阶段。

### 2026-06-02 08:45 +07 打卡发布分类页滚动锁定

- 背景：用户反馈拍照后在“选择发布标签 / 关联活动”阶段向下刷时，会带动整个网页滚动，底部发布按钮被挡住。
- 本轮实现：
  - `/mark` 非相机阶段进入全视口锁定，临时关闭外层 `main` 的滚动和滚动链传递，避免 iOS Safari 把分类面板滚动传给页面壳。
  - 发布分类阶段改为“内容区独立滚动 + 底部发布条常驻”的 flex 布局，不再依赖 `fixed` 底部条。
  - 活动横向列表和彩蛋图标区补上独立滚动边界，减少横滑/下滑时的页面回弹。
- 验证结果：
  - `node --test src/pages/MarkPlace.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地浏览器移动视口 `http://127.0.0.1:5173/mark?...` 被登录保护重定向到 `/login`，无法在未登录本地会话里直接操作目标发布流；已确认页面身份、非空渲染和 console 无 warn/error，目标发布流以源码断言和构建验证为准。
  - 已部署 v3 项目 `https://7c9f013f.cmi-map-v3.pages.dev` 和正式站 `https://c4834d4b.cmi-map.pages.dev`，Source 为 `ed54a8c`。
  - 正式域名 `https://cmimap.com/mark?verify=ed54a8c` 服务端返回 200，入口引用新包 `MarkPlace-B6_XiAqY.js`；新包内包含 `closest("main")`、`overflowY="hidden"`、`overscrollBehavior="none"`、分类内容区 `overscroll-contain` 和底部 `shrink-0` 发布条。
  - 应用内浏览器复查正式域名时仍被旧 service worker 控制，加载 8 小时前的旧 `MarkPlace-B2JVbwq4.js`；服务器与新部署包均已更新，已访问过的移动浏览器若仍看到旧行为，需要刷新或重开页面切到新包。

### 2026-06-01 23:43 +07 打卡相机双指缩放与相机机身优化

- 背景：用户反馈底部“焦距 1x”滑杆不像手机相机交互，缩放应在取景框里双指捏合；同时当前相机边框缺少精致相机的仪式感。
- 本轮实现：
  - 移除打卡相机底部焦距滑杆，改为在正方形取景框内处理双指捏合缩放；原生硬件 zoom 可用时继续走 `applyConstraints`，不可用时回退网页裁切缩放。
  - 保持拍照输出正方形和高质量 JPG 参数，缩放后的画面仍按正方形中心裁切输出。
  - 用 Image Gen 生成的相机机身方向作为视觉参考，将取景区域重做为奶白相机外壳、黑色内圈、橙色状态灯/快门、CMI MAP 微标识和更清晰的对焦框；未授权提示去掉毛玻璃雾感。
- 验证结果：
  - `node --test src/pages/MarkPlace.test.ts` 通过。
  - `node --test --experimental-strip-types src/features/check-ins/camera-capture.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts src/features/check-ins/camera-capture.ts src/features/check-ins/camera-capture.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过；`pnpm lint` 通过。
  - 已部署 v3 项目 `https://ed5840bf.cmi-map-v3.pages.dev` 和正式站 `https://670e15e3.cmi-map.pages.dev`，Source 为 `13a2ce9`。
  - 正式域名服务器响应已指向新入口 `index-DYsM7hq7.js`；新 `MarkPlace-B2JVbwq4.js` 包内包含 `onTouchStart` / `touchAction: "none"` / `LIVE` / `SQ`，不再包含“焦距”滑杆文案。当前已打开过的浏览器标签如果仍拿旧相机包，属于旧 PWA Service Worker 缓存，需要刷新或重开页面后切到新包。

### 2026-06-01 活动页标题字重微调

- 用户反馈：活动页顶部标题“清迈客栈的活动！”和副标题“社区空间提供给大家使用，可以来办活动！”需要更粗一点。
- 本轮实现：只增强活动页 hero 标题和副标题字重，不改变布局和按钮位置。

### 2026-06-01 23:24 +07 打卡发布前标签与发布按钮修复

- 用户反馈：相册打卡最后一步已有活动关联很好，但看不到“清迈客栈 / 彩蛋”分类 Tag，也没有明显发布按钮，导致选完活动和标签后不知道如何发布。
- 本轮实现：
  - 发布前分类页改为独立“选择发布标签”卡片，并把“清迈客栈”和“彩蛋”置顶显示。
  - 选择“清迈客栈”标签时同步写入清迈客栈地点与坐标，发布后仍进入客栈主页留言逻辑。
  - 发布按钮改为底部固定操作栏：未选标签时显示“选标签”，选好后显示“发布动态 / 发布彩蛋 / 发布到客栈”，不再被活动卡或彩蛋图标区挤到屏幕外。
  - 底部操作栏同时显示当前标签、已关联活动或地点，减少发布前的不确定感。
- 验证：`tsgo`、目标文件 `biome lint`、`MarkPlace.test.ts`、生产构建均通过。
- 已提交并推送：`16ee29a Fix check-in publish action bar`。
- 已部署 v3 项目 `https://e74a42a8.cmi-map-v3.pages.dev` 和正式站 `https://3a53f790.cmi-map.pages.dev`，Source 为 `16ee29a`。
- 线上复查：`https://cmimap.com/mark?verify=publish-bar-16ee29a` 已进入打卡页；无照片文字推荐链路可走到发布前分类页，页面显示“清迈客栈 / 彩蛋”标签、关联活动卡和底部固定“发布彩蛋”按钮，console 无 warn/error。

### 2026-06-01 活动页发起活动入口定稿

- 用户决定：活动页专属“发起活动”按钮放在顶部黄色活动介绍卡的右上角；右下角紫色加号不再承担活动发起语义，统一作为打卡拍照入口。
- 本轮实现：
  - 在 CMI Map v3 活动页 hero 右上角增加“发起活动”按钮，使用日历加号图标和漫画强调线，点击进入现有 `/events/new` 发起流程。
  - 底部紫色加号的可见文案从“添加”改为“打卡拍照”，保持跨页面统一语义。
- 验证：类型检查、目标文件 Biome lint、生产构建通过；本地 599px 和 360px 移动视口截图检查通过，按钮不越界，点击可进入 `/events/new`。

### 2026-06-01 23:12 +07 打卡相机画质和正方形取景优化

- 用户反馈：网页打卡相机预览像“前面有一层雾”，不能缩放；产品侧希望拍照输出统一改成正方形。
- 本轮实现：
  - 打卡页相机取景框改为 1:1 正方形预览，去掉原先可能造成雾感的模糊/半透明取景容器，并轻微提升预览对比度和饱和度。
  - 拍照输出统一走正方形中心裁切，JPEG 输出质量从 0.92 提到 0.96，上传前仍沿用地点图片的高质量压缩策略。
  - 新增焦距滑杆：优先使用浏览器/设备支持的原生相机 zoom；不支持时回退为网页内数字裁切缩放。
  - 抽出 `camera-capture` 纯函数，覆盖横向/竖向视频正方形裁切、数字缩放裁切和缩放范围归一。
- 验证结果：
  - `node --test --experimental-strip-types src/features/check-ins/camera-capture.test.ts` 通过。
  - `node --test src/pages/MarkPlace.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts src/features/check-ins/camera-capture.ts src/features/check-ins/camera-capture.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地浏览器验证 `http://localhost:5173/mark`：未登录会按预期跳到 `/login`，页面无控制台错误；因没有登录态且未代用户授权相机，本轮未做真实摄像头实拍验证。
  - 已提交并推送：`f22a2cc Fix check-in camera capture helpers`、`2c04584 Tame expected camera permission logging`。
  - 已用干净 worktree 部署 v3 项目 `https://f88c7ee7.cmi-map-v3.pages.dev` 和正式站 `https://f3e5707c.cmi-map.pages.dev`，Source 为 `2c04584`。
  - 线上复查：`https://f3e5707c.cmi-map.pages.dev/mark?verify=camera-square-2c04584-fresh` 未登录会跳到 `/login` 且当前部署无匹配 console warn/error；`https://cmimap.com` 服务端入口已引用新包 `MarkPlace-DDWl3pW6.js`，已访问过的浏览器如果仍由旧 Service Worker 控制，需要刷新后切到新包。

### 2026-06-01 22:59 +07 相册旧照地点关联重做

- 用户反馈：从相册选旧照片后直接进入“手动选择地标”很怪，且该页没有搜索、拖地图时会抖、准星视觉过重。
- 产品规则调整：旧照片发动态分成两条合理路径：可以先从地点进入再发带地点标签的动态；也可以先选照片、写体验，再关联地点或活动。
- 本轮实现：
  - 相册旧照分析后先进入写体验，不再强制先拖地图。
  - 写体验页增加地点关联状态，可在发布前进入地点搜索；未关联地点时点击继续会先去关联地点。
  - 手动选点页增加地点搜索框和候选列表，优先搜已有公开地点，搜不到再查外部地点，仍保留拖地图兜底。
  - 地点候选点击后自动写入地点标签、同步地图中心；手动拖地图不再回写 Leaflet 默认中心，避免反复重建导致屏幕抖动。
  - 地图准星从大十字线改为更轻的地图图标与中心点。
- 验证：`tsgo`、目标文件 `biome lint`、`MarkPlace.test.ts`、生产构建均通过；本地 `/mark` 可视验证被登录保护拦截，已确认登录页加载无控制台错误。
- 已提交并推送：`360c6a1 Improve album check-in place binding`。
- 已部署 v3 项目 `https://1f2a69bf.cmi-map-v3.pages.dev` 和正式站 `https://1d2af6d6.cmi-map.pages.dev`，Source 为 `360c6a1`。
- 正式域名 `https://cmimap.com` 服务器资源已确认包含新地点搜索文案、地点确认文案和地点绑定逻辑；旧 PWA 缓存用户可能需要刷新后切到新包。

### 2026-06-01 活动报名统一改为 CMI Map 一键报名

- 用户决定：CMI / 清迈客栈活动不再把 Luma、微信、问卷等外部方式作为用户报名主入口；用户侧统一在 CMI Map 内一键报名。
- 产品规则：只要活动还没开始、报名状态开放、且名额未满，就允许在 CMI Map 报名；活动开始后不再接受新增报名。
- 报名成功后的连接方式改为后置通知：报名确认邮件继续附上微信群、联系人二维码、到场指引，并补充微信群二维码过期时可加微信 ID。
- 本轮实现方向：本地活动数据、活动卡片展示、列表 / 主页 / V3 原型报名点击逻辑、详情页成功提示、Supabase 报名插入策略和触发器一起收敛到这条规则。

### 2026-06-01 CMI Map v3 三个核心功能开发计划

- 用户确认今天优先把 CMI Map v3 的三个功能做扎实：活动发起、动态 / 打卡 / 活动照片一键分享、活动系统全流程优化。
- 功能一：活动发起能力要围绕“开放清迈客栈空间”设计。目标不是单纯做一个发布表单，而是让社区成员能在清迈客栈的大厅、院子、公共区域等不同空间发起白天或晚上的活动，把客栈从夜间活动场变成更高频的社区公共空间。
- 功能二：动态、打卡、活动返图、彩蛋等用户拍照后的内容，都应提供一键分享能力。分享出去的图片要自动排得好看，强化 CMI Map / 清迈客栈氛围、地点或活动信息、用户照片和可传播入口，让用户有动力转发到群、朋友圈或小红书。
- 功能三：活动系统要从“发布一个活动”到“用户报名 / 查看 / 分享 / 管理”的完整流程重做体验优化。目前现状还不够顺，下一步需要重点梳理发布字段、地点 / 区域选择、活动详情、报名入口、报名状态、发起人管理、分享卡和活动列表之间的连续体验。
- 本轮产品判断：这三个功能不是并列小需求，而是同一条主线。活动发起负责把客栈空间开放出来；活动系统优化负责让活动真的能被发起、报名和管理；照片一键分享负责把现场热闹传播出去，反过来带来下一波参与和发起。
- 下一步实现顺序建议：先做活动发布 / 报名链路盘点和表单重排，再接清迈客栈区域选择与空间展示，最后把活动返图和动态发布统一接入分享卡生成器。

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
- 已部署 Cloudflare Pages：`https://8d6ccfa2.cmi-map.pages.dev`，自定义域名 `https://cmimap.com` 返回 200。
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

### 2026-05-25 活动发布 MVP 启动

- 用户确认：第一版不要照搬 Luma，也不要做复杂票务、日历或活动页自定义；先补足 CMI Map 作为社区地图里的基本活动发起和报名能力。
- 当前产品判断：CMI Map 现在已有活动展示、活动详情、地点导航、分享卡和“一起去”黑板预填，但还不是活动发起与报名管理系统。
- 本轮 MVP 范围：
  - 登录用户可以发布公开活动。
  - 活动字段先覆盖标题、时间、地点/区域、简介、费用说明、报名说明、人数上限、发起人邮箱、报名人展示方式。
  - 任何用户可以在活动页报名，填写昵称/姓名、邮箱和备注。
  - 活动页展示报名人数；发起人允许时展示报名者昵称列表。
  - 报名成功后触发邮件通知入口，通知 CMI 管理邮箱和活动发起人邮箱。
  - 发起人拥有基础管理页，先能查看报名名单、关闭/重新开启报名。
- 暂不做：多票种、付款、候补、签到二维码、群发通知、复杂报名问题、活动主页深度自定义、前置审核流。
- 开发顺序：先补 Supabase 数据结构和 RLS，再做发布页、活动详情报名区、管理页和 Edge Function 邮件通知。
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

### 2026-05-21 V2 发布复盘：从 V1 到 V2

#### 阶段目标

- V1 是“能用的社区地图”：有地点、地图、列表、推荐、收藏、打点和基础社交痕迹。
- V2 的目标不是堆功能，而是让用户打开就知道“今天怎么用”：从首页意图进入，用分类和场景组织地图，让清迈旅行/生活的人更快找到能吃、能逛、能办公、能办事的地方。
- V2 同时把工程边界理清：V1 继续留作可回滚生产版本，V2 独立仓库 `skyrim0624/cmi-map-v2`，正式发布到 `cmimap.com` 前先用预览域名反复跑。

#### 主要问题与处理方法

| 问题 | 影响 | 处理方法 |
| --- | --- | --- |
| 首页一上来就是地图，信息量太大 | 新用户不知道先点哪里，也容易被密集 marker 压住 | 改成意图首页：吃饭、办公、学习、购物、游玩、放松、运动、办事；地图成为第二层，而不是唯一入口 |
| 场景页、地图页、列表页分类不一致 | 用户从首页点进地图后，看不到和主地图一样的一类/二类标签；切换后容易迷路 | 抽出统一的 `cmi-taxonomy`：一级 `mapFilterGroups`，二级 `placeTypeTags`；地图页和列表页都用同一套分类 |
| 地点分类和图标错配 | 例如搜索跑步却选到游玩、公园；早餐点出现 SIM 卡图标；咖啡/Brunch 被错误归类 | 增强地点类型关键词和英文短词匹配，避免 `run` 误中 `brunch`；统一 `placeTypeId -> iconUrl`；按地点类型而不是旧 category 兜底显示图标 |
| 首页直接意图进地图后缺少筛选栏 | 用户以为进入了一个“特殊地图”，不能继续按分类缩小范围 | 让直接意图地图也保留主地图同款一类/二类筛选，只是默认选中从首页带入的意图 |
| 搜索和分类状态互相污染 | 搜“跑步”后仍显示游玩；点市集后再点其它分类，列表面板可能消失 | 梳理 URL 状态：`filter` 表示一级分类，`placeType` 表示二级分类；选择一级时清空二级，选择二级时自动推断一级 |
| 场景面板占地图空间过多 | 用户从首页意图进入后，地图区域太小，尤其手机 Safari 可视区域有限 | CMI Scene 面板默认展示 2 条推荐；支持展开/收起；缩小底部“标记新地点”按钮并保留间距 |
| 地点详情页层级混乱 | 标签、类型、来源重复；底部按钮强但解释卡弱；视觉不像一个可信推荐 | 删除重复的“类型/适合/来源”小统计块，把核心内容收进“为什么值得来”卡片；顶部标签只保留可扫读的 tag |
| 地点详情页操作区不够顺手 | 导航按钮视觉权重不清，盖戳位置像一个窄条，用户想盖在整张卡上 | 导航按钮改为紫色主按钮；盖戳区域恢复为卡片内可感知的互动，不再像表格控件 |
| iOS 浏览器下滑露出底层 | 在 Safari / 微信内置浏览器里，地图页下滑会掀开浏览器底层，感觉像页面断了 | 页面容器使用 `100dvh`、内部滚动和 `overscroll-contain`，尽量把滚动限制在应用容器内 |
| 定位提示过度解释 | 定位正常时仍显示“已定位：地图以你为中心”，占空间也像报错 | 附近页只在定位失败/权限异常时显示提示和重试；正常状态不打扰用户 |
| PWA 预缓存过大 | 首次加载和安装可能把大量图片、原型图、文档图塞进缓存 | 预缓存只保留核心壳和必要 icon；图片改为运行时缓存；排除 docs、playgrounds、prototypes、graphify-out 等非线上目录 |
| 旧 PWA 缓存导致线上看起来没更新 | `cmimap.com` 服务端已是新包，但已访问过的浏览器仍可能被旧 Service Worker 控制 | 生产 PWA 开启 `skipWaiting` / `clientsClaim` / `cleanupOutdatedCaches`；部署后用刷新复验；必要时提醒老用户刷新一次 |
| Cloudflare 生产分支判断错 | 第一次用 `main` 部署只进了 Preview，正式域名仍指向旧 Production | 查 `wrangler pages deployment list`，确认 `cmi-map` 的 Production 分支是 `master`；改用 `--branch master` 部署正式站 |
| 黑板页混入测试搭子帖 | 线上出现“明天去粘粘瀑布”等假内容，用户会误以为是真实发布 | 清空硬编码 seed posts；首页入口删除假数量；无真实发布时展示空状态 |
| 活动和周末场景不能只是普通地点 | 用户点“有什么活动”“周末去哪”期待的是时间敏感内容，不是地点列表 | 建 `cmi_events` 活动库、RLS 和前端兜底；新增周末地点库文档和活动运维文档；按时间、来源、核实状态展示 |
| AI 动态路线方向太早 | 原型能跑，但当前阶段更需要稳定地点、分类、活动和基础体验 | 保留 `/ai-route-lab` 为实验入口，不继续占主线；先把人工可维护的数据底座打稳 |

#### 关键工程方法

- 分类只保留一个事实源：所有入口、地图、列表、搜索都读 `cmi-taxonomy`，避免每个页面各写一套分类。
- URL 表达用户状态：`scene` 表示场景，`filter` 表示一级分类，`placeType` 表示二级类型，`event` 表示选中的活动。
- 数据优先兜底：活动优先读 Supabase，失败时回退本地 `CMI_EVENTS`，避免公开页空白。
- 先预览、再正式：V2 先跑 `v2-preview.cmi-map.pages.dev`，确认后再发 `cmimap.com`。
- 每次改动都做三层验证：类型检查、生产构建、真实浏览器页面验证。
- 图片和 PWA 缓存分层：应用壳预缓存，图片按需缓存，减少首装负担。

#### 设计与产品方法

- 首页不做说明书，直接给任务入口；文案从“地点地图”转为更像用户脑内问题的句子，例如“吃点啥呢”“去哪儿玩”“附近有什么”。
- 地图页强调空间，控件只保留必要层级；能收起的面板就收起，能少放一条就少放一条。
- 地点详情页强调“为什么值得来”，少放重复字段，多放人的判断和来源感。
- 不做商家广告地图，不做复杂点评系统；保留社区推荐、手账感、盖戳、想去和补一句。

#### 发布状态

- 最新提交：`a5eaa22 polish CMI Map V2 production release`
- V2 公开仓库：`https://github.com/skyrim0624/cmi-map-v2`
- 正式站：`https://cmimap.com`
- Cloudflare Production 部署：`df78d8eb.cmi-map.pages.dev`
- `cmimap.com` 已确认加载新资源；黑板测试帖已消失；附近列表页已是一级/二级分类结构。

#### 当前仍需注意

- 地点数据仍是最大短板：很多地点需要人工补录照片、坐标、分类和中文经验，不能靠 UI 修掉。
- 黑板页当前只移除了测试 seed；真正的多用户持久发布还需要接数据库表和权限策略。
- 活动库需要持续维护：过期活动要归档，临时活动要核实来源，周末活动周五前要复核。
- 老用户浏览器可能短暂被旧 PWA 控制；刷新或重开后应切到新版本。
- 未来如果继续做 AI 路线，必须基于可信地点/活动底座，不要让 AI 直接替代核实。

### 2026-05-26 社交用户系统优先级调整

- 背景：论坛和活动正在变成 CMI Map 的社交入口，现有用户系统已有 Supabase Auth、`profiles`、头像昵称、角色、个人页、个人地图，以及帖子/活动的作者归属；但它还不足以支撑更公开、更长期的社交关系。
- 本轮产品判断：先聚焦两个基础问题，不先做关注、私信、复杂声誉、通知中心或完整公共主页。
- 优先级 1：公开资料隐私隔离。
  - 当前风险：`profiles` 表包含 `email`，而公开资料读取策略如果继续对整表开放，会让邮箱存在被前端 REST 直接查询的风险。
  - 目标：建立只暴露公开字段的资料读取口径，例如 `public_profiles` 视图或等价查询层，只公开 `id`、稳定身份字段、展示名、头像、简介等社交展示字段；`email` 只允许本人、活动报名管理必要场景和管理员读取。
  - 验收口径：匿名用户和普通登录用户不能通过公开 API 读取他人邮箱；现有头像、作者名、个人地图仍正常显示。
- 优先级 2：稳定用户身份与路由。
  - 当前风险：`/people/:userName` 和部分作者链接依赖昵称，昵称一改会影响旧链接、内容聚合和用户识别。
  - 目标：拆分“稳定身份”和“展示名”。稳定字段用于 URL 和内容聚合，例如 `handle` 或基于 `profile.id` 的公开路由；`display_name` / `user_name` 只作为可修改展示名。
  - 迁移方向：推荐、论坛帖、评论、活动发起人等继续以 `user_id` / `author_id` 做真实关联；前端链接逐步从昵称路由迁到稳定路由；历史昵称内容保留展示兜底。
  - 验收口径：用户改昵称后，旧内容仍归属同一个人；公共主页链接稳定；论坛、地点推荐、活动页的作者入口不会因为改名断链。
- 暂不处理：公共主页完整改版、举报/禁言/限流、站内通知、密码重置和邮箱确认策略，放到隐私隔离和稳定身份之后。

### 2026-05-26 09:35:19 +07 地图搜索与外部地点选择器 MVP

- 用户确认新的项目日志约定：后续 CMI Map 只要讨论定了方向、实现完成、验证通过或收到用户反馈，都要及时写入项目日志；成功、不成功和后续调整都要留下记录。
- 本轮产品决策：地名搜索不做“CMI 搜不到就跳去 Google Maps”，而是做“CMI 内部优先、外部地点兜底”的地点选择器。用户在 CMI Map 里输入一个库内没有的地名时，仍留在 CMI Map 内完成定位，并把这个地点用于补录、活动发布或黑板发帖。
- 本轮实现：
  - 地图页搜索先查 CMI 内部地点；内部无结果时调用 OpenStreetMap / Photon 的清迈范围搜索，展示外部候选。
  - 选中外部候选后在 CMI Map 内落临时地点 pin 和底部地点卡片，提供“补录 / 活动 / 发帖 / 导航”分流。
  - 活动发布页地点输入接入外部候选，选中后自动填入地点名、区域和坐标。
  - 补录页支持通过外部地点参数进入手动定位流程，保留地点名并作为提交地点名。
  - 黑板发帖支持从地点卡片进入预填草稿，自动带入地点名和位置标签。
- 验证结果：
  - 外部地点解析测试、活动地点绑定测试通过。
  - 类型检查、Biome lint、生产构建通过。
  - 浏览器实测 `/map` 搜索 `North Gate Jazz` 可出现 `North Gate Jazz Co-op` 外部候选；点击“定位”后候选浮层隐藏，临时地点卡片显示“补录 / 活动 / 发帖 / 导航”，地图流程无新增 console error。
- 当前边界：外部源先使用 OpenStreetMap / Photon，适合低成本验证体验；如果后续发现召回质量、命名或稳定性不够，再评估 Google Places 后端代理或其他 provider，避免在前端直接暴露密钥或触碰合规问题。
- 下一步：等待用户实际试用反馈；如果体验 OK，本次记为成功改动；如果搜索召回、地点命名或动作分流不顺，再继续调整搜索源和交互。

### 2026-05-26 09:40:36 +07 社交用户系统前两项本地实现

- 本轮处理前两个缺口：公开资料隐私隔离、稳定用户身份与路由。
- 本地实现：
  - 新增 `public_profiles` 公开资料表口径，只暴露 `id`、`handle`、`user_name`、`avatar_url`、时间字段；`profiles.email` 继续留在私有资料表。
  - `profiles` 新增稳定 `handle`，写入前自动规范化和补齐；历史数据逐行回填，避免重复 handle 造成唯一索引失败。
  - 收紧 `profiles` 读取策略：公开读取改走 `public_profiles`；完整 `profiles` 仅本人或管理员可读。
  - 前端作者链接和 `/people/:profileIdentity` 优先走稳定身份：`handle` 或 `user_id`，昵称只作为展示名和历史兜底。
- 验证结果：
  - `node --experimental-strip-types src/features/profiles/profile-identity.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - 针对改动文件的 `pnpm exec biome lint ...` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `/people/CMI社区` 可正常渲染，筛选交互可用，console 无 warn/error。
- 当前边界：
  - 代码未提交、未部署。
  - Supabase migration 已生成但尚未应用到远程数据库；本地 Supabase Postgres 未运行，无法本地执行 SQL dry-run。
  - 上线时必须让数据库 migration 和前端同批处理，否则旧前端可能还在读取 `profiles` 公开字段，收紧 RLS 后会断头像/昵称读取。

### 2026-05-26 09:58:16 +07 注册体验优化本地实现

- 背景：CMI Map 社交功能需要降低首次发帖、报名活动、补推荐前的注册摩擦；此前注册页需要邮箱、昵称、密码、确认密码和协议勾选，门槛偏重。
- 本轮实现：
  - 注册页默认从“邮箱 + 密码”改为“昵称 + 邮箱，发送加入链接”。
  - 使用 Supabase Magic Link / `signInWithOtp`，新用户通过邮箱链接完成加入；密码注册保留为备用入口。
  - 移除确认密码和假协议勾选，避免无实际页面支撑的摩擦。
  - 密码注册分支补充 `emailRedirectTo`，如果项目开启邮箱确认，会显示“去邮箱完成加入”，不再错误地假设注册后一定能自动登录。
  - 新增 `auth-flow` 辅助模块，固定快速加入校验和站内 redirect 安全规则，避免 Magic Link redirect 被外部 URL 污染。
- 验证结果：
  - `node --experimental-strip-types src/features/auth/auth-flow.test.ts` 通过。
  - `node --experimental-strip-types src/features/profiles/profile-identity.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - 针对改动文件的 `pnpm exec biome lint ...` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 浏览器实测 `/login`：登录页正常；切换到“快速加入”后只显示昵称和邮箱；切到密码注册后出现密码输入框且没有确认密码；切回邮箱链接正常；console 无 warn/error。
- 当前边界：
  - 未真实发送邮件测试，避免在本地验证中触发 Supabase 邮件发送和频率限制。
  - 上线前需要确认 Supabase Auth Redirect URLs 包含正式域名和必要预览域名；Magic Link 默认 60 秒频率限制、1 小时过期。
  - 代码未提交、未部署。

### 2026-05-26 10:25:00 +07 公共主页改为个人主页式痕迹 / 动态页

- 背景：用户明确不要旧的“TA 的清迈地图”大卡片式公共推荐人页；点击别人头像后，应进入类似当前个人主页的公共主页，并同时看到 TA 推荐过的地点和发过的动态。
- 本轮实现：
  - `/people/:profileIdentity` 改为公共个人主页结构：头像、昵称、贡献数、动态数、返回按钮；不显示头像上传、编辑昵称、退出登录等本人私有控件。
  - 公共主页新增两个 tab：`TA 的痕迹` 和 `TA 的动态`。
  - `TA 的痕迹` 展示该用户推荐过的地点，保留分类 chip，卡片样式靠近当前个人主页列表。
  - `TA 的动态` 读取该用户公开黑板帖子；帖子有关联地点时点击进地点页，否则进入黑板页。
  - 路由继续兼容稳定 `handle` / `user_id` / 历史昵称兜底，避免旧作者链接立刻断掉。
- 验证结果：
  - `node --experimental-strip-types src/features/profiles/public-profile-page.test.ts` 通过。
  - `node --experimental-strip-types src/features/profiles/profile-identity.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - 针对改动文件的 `pnpm exec biome lint ...` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 浏览器实测 `http://127.0.0.1:5176/people/CMI社区`：旧首屏文案不再出现；能看到头像、昵称、贡献数、动态数、`TA 的痕迹` / `TA 的动态`；痕迹列表和动态空态都正常，无新增 warn/error。
- 当前边界：
  - 代码未提交、未部署。
- 当前公共主页只做“痕迹 / 动态”两类内容，暂不加关注、私信、成就、想去列表或完整编辑资料，避免把个人主页过早做成复杂社交主页。

### 2026-05-26 10:24:56 +07 黑板 / 论坛 MVP 交互与运营能力本地迭代

- 背景：用户在本地论坛页连续检查移动端体验，明确希望论坛更像轻量信息流，而不是卡片边框很重、详情页很碎的后台工具。
- 本轮产品判断：
  - 帖子类型标签属于帖子属性，应放在帖子底部左侧；作者名旁边要留给后续“旅行者 / 生存大师”等用户身份称号系统，不把帖子分类和用户身份混在一起。
  - 帖子详情应该是全屏阅读页：主帖一整块、评论一条条、底部固定写评论，不额外加入点赞、收藏、举报、帮顶、马住等未确认功能。
  - 运营精选是列表筛选和管理员操作，不是普通用户可发布的帖子类型；公告是清迈客栈 / 管理员通知入口，不混进普通帖子流。
- 本轮实现：
  - 黑板筛选新增 `精选`；选中筛选按钮改用 CMI 主题紫色。
  - 数据层新增帖子精选字段、公告表、管理员精选 / 取消精选、公告发布和隐藏能力，并加入 Supabase migration。
  - 帖子卡片改为整卡可点击打开详情；头像和姓名独立跳转用户页，地点 / 活动链接不被整卡点击吞掉。
  - 帖子分类标签移动到底部左侧；评论、编辑、删除、精选等操作保留在底部右侧。
  - 帖子详情由底部 sheet 改为全屏详情页，评论列表和写评论输入框按参考 App 的轻量信息流结构收敛。
  - 作者头像从 `public_profiles` 或 `profiles` 的公开字段补齐；没有头像时才显示首字。列表、详情页和评论头像都接入。
- 验证结果：
  - `node --experimental-strip-types src/features/home/blackboard/blackboard-model.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - 针对论坛相关文件的 `pnpm exec biome lint ...` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器 / Playwright 验证：帖子卡片可打开详情；头像 / 姓名进入 `/people/...`；选中筛选为紫色；子扬头像能显示真实图片；详情页和评论输入正常。
- 当前边界：
  - 代码即将提交；暂不部署。
  - 精选 / 公告的 Supabase migration 尚未应用到远程数据库；本地页面因此会在公告读取处提示公告表不存在，属于未应用 migration 的预期边界。

### 2026-05-26 10:37:04 +07 黑板精选帖列表置顶

- 背景：用户明确要求“如果是精选的帖子，会固定停留在最上方”。
- 本轮实现：
  - 新增黑板帖子列表排序规则：所有列表先按当前筛选得到结果，再让精选帖固定排在普通帖前面。
  - 精选帖内部仍按发布时间新到旧排序；普通帖内部也保持发布时间新到旧排序。
  - 该规则同时作用于 `全部`、具体分类筛选和 `精选` 筛选，不改变发帖类型和筛选口径。
- 验证结果：
  - 先补充失败测试确认模型缺少精选置顶排序，再实现排序 helper 并接入黑板列表。
  - `blackboard-model` 单元测试通过。
  - TypeScript 检查、针对黑板相关改动文件的 Biome lint、生产构建通过。
  - 本地 `/blackboard` 路由返回 200。

### 2026-05-26 10:51:13 +07 黑板发帖地点搜索与地图选点

- 背景：用户在黑板发帖框指出地点字段不能只是文本输入；需要复用刚加入的地点搜索能力，并支持两种真实发帖情况：知道正式店名 / 华人常用俗称，以及不知道名字但知道大概位置。
- 本轮产品判断：
  - 地点选择不能强制用户跳出发帖流程；应在发帖框内完成搜索候选、外部地点兜底和地图拖拽选点。
  - “北门”这类俗称不能指望外部地图天然理解，需要 CMI 自己维护常用别名种子，后续持续扩展。
  - 黑板表当前只保存 `location_label`，本轮不扩数据库；地图拖拽确认后先保存为可读坐标文本，后续做社交地图坐标字段时再接入结构化坐标。
- 本轮实现：
  - 黑板发帖地点输入升级为地点选择器：支持输入搜索、CMI 地点候选、外部清迈地点候选和清除已选地点。
  - 未填写地点时，会从标题 / 内容中尝试识别地点候选，降低用户额外标注成本。
  - 新增地图选点入口，打开全屏地图拖拽页，确认后把中心点坐标写回地点字段。
  - 常用地点候选新增 `North Gate Jazz Co-Op`，别名包括 `北门`、`北门爵士`、`北门音乐厅`、`North Gate Jazz` 等。
- 验证结果：
  - 先用 Vite 模块加载器验证 `北门` 无法命中，再补别名种子后验证命中 `North Gate Jazz Co-Op`。
  - `blackboard-model` 单元测试通过。
  - TypeScript 检查、针对黑板和地点绑定相关文件的 Biome lint、生产构建通过。
  - 本地 `/blackboard` 路由返回 200。

### 2026-05-26 10:59:42 +07 活动发布页补地图拖拽选点

- 背景：用户要求黑板地点选择的同类能力也出现在活动发布页面。
- 本轮实现：
  - 活动发布页保留现有 CMI 地点候选、外部地点候选和标题 / 简介自动识别候选。
  - 新增 `地图选点` 入口，打开全屏地图拖拽页；确认后把中心点转成活动地点候选，并写回地点名、区域、纬度和经度。
  - 新增 `createEventPlaceCandidateFromMapPick` 纯函数，统一把地图拖拽点转为可提交的活动地点候选；如果用户已输入地点名则保留地点名，没输入则使用 `地图选点`。
  - 前一轮新增的 `北门` / `北门爵士` / `北门音乐厅` 俗称种子因复用同一地点绑定模块，已同时作用于活动发布页。
- 验证结果：
  - 先验证地图拖拽候选 helper 缺失，再补实现并通过 Vite 模块加载器断言。
  - `blackboard-model` 单元测试通过。
  - TypeScript 检查、针对活动发布 / 地点绑定 / 黑板相关文件的 Biome lint、生产构建通过。
  - 本地 `/events/new` 路由返回 200。

### 2026-05-26 11:05:24 +07 注册 / 登录主流程改为邮箱验证码

- 背景：用户明确要求注册 / 登录使用邮箱验证码，而不是继续把 Magic Link 或密码作为主流程。
- 本轮实现：
  - `/login` 登录和快速加入统一改成两步：先填邮箱发验证码，再输入 6 位邮箱验证码进入。
  - 快速加入仍要求昵称 + 邮箱；登录只要求邮箱。
  - 密码输入和“改用密码注册”从主界面移除，避免用户认为必须设置或记住密码。
  - 前端新增验证码校验 helper：只保留数字并限制 6 位；验证码不完整时本地拦截。
  - AuthContext 新增 `sendEmailCode` 和 `verifyEmailCode`，分别调用 Supabase `signInWithOtp` 和 `verifyOtp({ type: 'email' })`。
- 验证结果：
  - 先补失败测试确认旧 auth-flow 不支持邮箱验证码模型，再实现并通过 `auth-flow` 单元测试。
  - TypeScript 检查、针对登录 / AuthContext / auth-flow 文件的 Biome lint、生产构建、`git diff --check` 通过。
  - 浏览器实测 `/login`：登录页只有邮箱输入和“发送验证码”；快速加入页显示昵称 + 邮箱，无密码输入；空表单提交只出现本地“请输入邮箱”提示，没有新增 console warn/error。
- 当前边界：
  - 未真实发送邮件，避免在本地测试中触发 Supabase 邮件频率限制。
  - 上线前必须在 Supabase Auth 邮件模板里使用 `{{ .Token }}`，否则 `signInWithOtp` 仍可能发 Magic Link 邮件而不是验证码邮件。

### 2026-05-26 11:20:00 +07 邮箱验证码收不到问题排查

- 背景：群里反馈 QQ 邮箱和 Gmail 都可能收不到验证码；截图里提到“SMTP 服务被 Supabase 限流”和“发了 49 次”。
- 排查结论：
  - Supabase 官方文档确认默认 Auth 邮件服务只适合测试，默认发送服务有很低限制，不适合生产验证码。
  - 自定义 SMTP 后仍有初始保护性限流，需要到 `Authentication -> Rate Limits` 按流量调整。
  - 当前项目本地 Supabase config 没有 SMTP 配置；远程 Edge Function secrets 列表也没有看到 `RESEND_API_KEY`，活动通知函数当前看起来也未真正接入 Resend。
  - 当前连接的 Supabase MCP 没有权限读取 `sfpcpxlxslnulzlmjcby` 的 Auth logs，因此不能直接确认最近一次失败日志。
- 本轮实现：
  - 前端补 60 秒发码节流，避免用户连续点击几十次导致更快触发限流。
  - 新增文档 `docs/supabase-auth-email-otp-deliverability.md`，记录 Resend / 自定义 SMTP / `{{ .Token }}` 模板 / DNS / rate limit 检查清单。
- 当前边界：
  - 根治需要配置 Supabase Auth 自定义 SMTP；没有 SMTP provider API key / SMTP 密码时，代码侧无法替代完成。

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

### 2026-05-26 11:16:07 +07 活动列表卡片统一为清迈客栈活动卡风格

- 背景：用户在 `list?scene=tomorrow-events` 指出活动卡片太像普通信息列表，要求无论是 Agent 整理发布的清迈本地活动、官方 / 非官方活动，还是大家自己发起的活动，都用清迈客栈页面那种更强视觉识别的活动卡片形式呈现。
- 本轮产品判断：
  - 活动列表需要统一成同一种“活动内容卡”语言，不能因为来源不同而呈现成两套界面。
  - 列表卡片应借用清迈客栈活动卡的骨架：顶部视觉图、来源 / 价格贴片、强标题、摘要、标签、时间地点和费用 / 参与说明。
  - 不在列表里额外加入报名、分享、盖戳等动作按钮；这些属于活动详情或清迈客栈主页场景，列表先专注浏览和进入详情。
- 本轮实现：
  - 重写活动列表共用 `CmiEventCard`，从旧日期块信息卡改为清迈客栈风格海报卡。
  - 新增活动卡片展示 helper，统一处理封面图选择、报名说明截短和标签去重。
  - 封面图优先级为用户上传封面、CMI 活动海报、活动背景图、通用兜底图，因此用户自发活动和 Agent 整理活动都可以走同一组件。
- 验证结果：
  - 先补 `event-card-presentation` 测试确认封面图、用户上传封面优先级、参与说明截短和标签去重规则，再实现通过。
  - `blackboard-model` 单元测试通过。
  - TypeScript 检查、相关文件 Biome lint、生产构建通过。
  - 本地浏览器验证 `http://127.0.0.1:5175/list?scene=tomorrow-events`：活动卡已显示海报、来源 / 价格贴片、标签、时间地点、费用和参与信息；console 无新增 warn/error。
- 当前边界：
  - 代码本地完成，未提交、未部署。
  - 没有专属海报的本地活动会使用现有背景图或兜底图；如果希望每条官方 / 非官方活动都达到清迈客栈活动卡的丰富程度，后续需要持续补活动封面素材。

### 2026-05-26 11:20:46 +07 活动整理流程新增图片必填规则

- 背景：用户明确要求后续定期整理清迈官方、非官方、民间等各类活动时，只要活动被选中进入 CMI Map，就要给它配图片；有海报优先用海报，没有海报就用 Image Generator 生成活动海报。
- 本轮产品判断：
  - 活动列表已经改成海报式卡片后，图片不再是可选装饰，而是活动内容的基础字段。
  - 只录文字会让官方 / 民间活动在列表中显得像数据残片，和清迈客栈活动卡的视觉方向冲突。
  - 生成图只能作为缺少来源图时的补足，不能伪装成官方原海报。
- 本轮写入：
  - `docs/cmi-events-ops.md` 新增活动图片公开标准、每日维护补图步骤和正式发布图片要求。
  - `docs/cmi-event-agent-publish.md` 新增 Agent 图片 / 海报规则：发布前必须有 `coverImagePath` 或 `coverImageUrl`。
  - `chiangmai-event-scout` Skill 新增活动海报字段、图片处理规则和交付前检查项。
  - `cmi-map` 定时任务（`CMI Map 客栈活动同步`）已同步更新：活动被选中发布时图片为必填；没有来源图时必须用 Image Generator 生成海报，并在处理摘要里标明图片来源。
- 当前规则：
  - 优先使用官方海报或主办方海报。
  - 没有海报但有来源主视觉 / 现场图 / 场地方封面时，可以用作封面。
  - 没有可用图片时，必须用 Image Generator 生成活动海报，再进入发布流程。
  - 生成海报只能基于已核实的标题、时间、地点、类型、氛围和费用，不生成虚假二维码、主办方背书或赞助信息。
- 当前边界：
  - 现有已更新的是 CMI / 清迈客栈活动同步定时任务；当前自动任务列表里尚未发现单独负责“全清迈官方 / 非官方活动侦察”的定时任务。

### 2026-05-26 11:28:03 +07 大板块主题色方向

- 背景：用户提出 CMI Map 现在已有攻略、活动发布、论坛等大板块，后续这些一级板块应拥有自己的背景主题色和视觉语气，类似清迈客栈板块已经形成的黄色主题氛围。
- 本轮产品判断：
  - 主题色应服务“用户现在在哪个板块”的空间感，而不是把每个页面都刷成高饱和装饰。
  - 攻略 / 地点发现板块继续以白色为主，因为核心任务是快速看清地点、分类、推荐语和地图信息。
  - 活动板块适合更强的节庆 / 海报感背景，可延续清迈客栈卡片的暖黄、奶油纸色、黑色粗边和粉绿强调色，但需要控制信息区可读性。
  - 论坛 / 黑板板块可以有独立主题色，但应比活动板块更轻，避免背景色干扰帖文阅读；目前 CMI 紫色更适合做论坛的主强调色。
- 设计原则：
  - 每个大板块定义一套“页面底色 + 主按钮色 + 标签色 + 卡片边框语气”，而不是只改单个按钮。
  - 主题色主要作用在页面 shell、导航、分区背景、主行动按钮和少量强调元素；正文、地点信息、帖子正文仍保持高对比可读。
  - 清迈客栈板块可以继续更强品牌化；攻略板块保持白；活动板块可更像海报墙；论坛板块更像轻社区信息流。
- 当前边界：
  - 本轮只记录方向，未改代码。
  - 后续实现前应先整理成 design token / section theme，避免每个页面手写颜色导致维护困难。

### 2026-05-26 11:34:00 +07 板块主题色 HTML Playground

- 背景：用户要求不要改正式代码，也不要改本地项目代码，只做一个 HTML 实验页展示不同大板块背景色如何呈现；随后明确清迈客栈页面先不用管，因此实验页收窄到攻略、活动、论坛三块。
- 本轮实现：
  - 新增独立实验页 `cmi-section-theme-playground.html`，不接入 React、路由、构建入口或正式页面。
  - 实验页展示三个板块样张：攻略 / 地点发现、活动 / 今天去哪、论坛 / 清迈生活板。
  - 攻略样张使用白底和轻卡片；活动样张使用暖黄色背景和海报卡；论坛样张使用浅紫背景和白底信息流。
- 验证结果：
  - 本地浏览器打开 `http://127.0.0.1:5175/cmi-section-theme-playground.html` 成功。
  - DOM 检查确认攻略、活动、论坛均存在，清迈客栈样张已移除。
  - 390px 手机宽度验证第一屏排版正常，无明显重叠。
- 当前边界：
  - 这是视觉实验页，不是正式实现。
  - 下一步如果用户认可方向，再把配色抽象为正式 section theme / design token，而不是直接复制实验页 CSS。

### 2026-05-26 11:40:00 +07 攻略列表主题色实验调整

- 背景：用户说明之前说攻略白底时脑子里更多是地图界面；看到列表型攻略样张后，认为列表型攻略页也有必要加主题色，并要求继续在 playground 里用实际样张试。
- 本轮调整：
  - `cmi-section-theme-playground.html` 的攻略 / 地点发现样张从纯白主题改为浅青绿主题。
  - 攻略卡片内部仍保留白底，确保地点名、推荐理由和动作按钮清晰可读。
  - 文案调整为“地图画布可以继续白，但列表型攻略页可以有浅青绿主题”。
- 验证结果：
  - 本地浏览器刷新 playground 后，DOM 确认存在 `浅青绿，攻略列表感` 和 `地图画布保持白`。
  - 截图确认攻略区域背景已变为浅青绿，活动和论坛样张仍在。
- 当前边界：
  - 仍是独立 HTML 实验页，不进入正式代码。
  - 后续正式实现时应区分地图画布主题和攻略列表主题，不能把地图本身染成低对比背景。

### 2026-05-26 14:21:08 +07 板块主题色收束为攻略白 / 活动黄 / 论坛紫

- 背景：用户看过浅青绿攻略列表实验后，决定攻略还是白色；活动黄色、论坛紫色这个方向保留。
- 本轮结论：
  - 攻略 / 地点发现：白底，信息优先。
  - 活动 / 今天去哪：黄色主题，偏海报墙感。
  - 论坛 / 清迈生活板：紫色主题，偏轻社区感。
  - 清迈客栈：本轮不讨论。
- 本轮调整：
  - `cmi-section-theme-playground.html` 已把攻略样张从浅青绿改回白底。
  - playground 文案同步改为“攻略回到白底，活动保持黄色海报墙，论坛保持紫色社区感”。
- 验证结果：
  - 本地浏览器刷新 playground 后确认存在 `白底，信息优先`、`暖黄，海报墙感`、`轻紫，读帖不累`。
  - DOM 检查确认 `浅青绿，攻略列表感` 不存在，`清迈客栈 / CMI Home` 不存在。
- 当前边界：
  - 仍是 HTML playground，不进入正式代码。

### 2026-05-26 14:28:00 +07 Playground 标注概念样张

- 背景：用户问攻略样张是不是 CMI Map 里实际存在的页面，因为没有见过这页。
- 澄清：
  - `cmi-section-theme-playground.html` 里的攻略 / 地点发现不是现有正式页面。
  - 里面的路线、地点卡片和推荐理由是为了看板块主题色临时写的示例内容。
- 本轮调整：
  - playground 顶部说明改为：不是正式页面，内容也是概念样张，不代表 CMI Map 里已经有这些页面或数据。
  - 攻略样张内部新增 `概念样张 · 非正式页面 · 示例内容` 提示。
- 验证结果：
  - 本地浏览器刷新 playground 后确认 `概念样张`、`非正式页面`、`示例内容` 均存在。

### 2026-05-26 14:34:00 +07 Playground 改用真实存在内容

- 背景：用户明确指出 playground 不应该编一个不存在的攻略页面和路线，要求换成真实存在的 CMI Map 内容。
- 本轮调整：
  - 攻略样张改用现有 `CMI_SCENES` 里的 `coffee-work` 场景，展示口径为 `/list?scene=coffee-work`。
  - 攻略卡片改用 `place-guides.ts` 中真实存在的 `Asama Coffee & Roastery` 和 `Bays Coffee Co.`。
  - 删除此前临时编写的 `清曼寺附近晒太阳路线` 和 `适合第一次见朋友的咖啡馆`。
  - 论坛样张改用本地黑板页面已经出现过的 `测试一条`、`周二大家都做点啥？`。
- 验证结果：
  - 浏览器刷新 playground 后确认存在 `/list?scene=coffee-work`、`Asama Coffee`、`Bays Coffee`、`place-guides.ts`、`测试一条`、`周二大家都做点啥`。
  - DOM 检查确认旧假路线 `清曼寺附近晒太阳路线` 不存在。
- 当前边界：
  - playground 仍是静态 HTML 视觉实验页，不会自动跟随数据库变化。

### 2026-05-26 14:55:00 +07 板块主题色落到本地真实页面

- 背景：用户确认 playground 方向后，要求做到本地应用里看真实效果。
- 本轮实现：
  - `/list?scene=tomorrow-events` 的真实活动列表外壳改为黄色主题：页面背景、顶部栏和活动分类筛选条统一进入暖黄语气。
  - `/blackboard` 的真实论坛页改为浅紫主题：页面背景、顶部栏、筛选条和悬浮发帖按钮统一进入论坛紫语气。
  - 攻略 / 普通列表仍保持白底，不把 playground 中概念样张带入正式代码。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/pages/ListView.tsx src/pages/CmiBlackboardPage.tsx src/features/home/blackboard/cmi-blackboard.tsx` 通过。
  - 本地浏览器验证 `http://127.0.0.1:5175/list?scene=tomorrow-events`：活动页黄色背景生效，活动筛选按钮可点击，console 无 warn/error。
  - 本地浏览器验证 `http://127.0.0.1:5175/blackboard`：论坛浅紫背景、紫色筛选和紫色发帖按钮生效，帖子详情可打开，console 无 warn/error。
  - `pnpm build` 通过，PWA precache 检查通过。
- 当前边界：
  - 代码只在本地完成，未提交、未部署。
  - 这轮先用页面级颜色落地，后续如果继续扩大板块主题，应抽成统一 section theme / design token。

### 2026-05-26 11:46:39 +07 登录体验增加 Google 与密码找回兜底

- 背景：群里建议补密码找回和 Google 登录。当前产品判断是：邮箱验证码继续作为主流程；Google 登录和密码登录 / 找回只做兜底，避免重新把注册页做复杂。
- 本轮实现：
  - `AuthContext` 新增 `signInWithGoogle`、`sendPasswordResetEmail` 和 `updatePassword`，分别接 Supabase OAuth、密码找回邮件和更新密码。
  - `/login` 保留邮箱验证码登录 / 快速加入主流程；下方新增“用 Google 登录”和“使用密码登录或找回密码”入口。
  - 密码兜底支持旧密码账户登录、发送找回密码邮件、`/login?auth=reset-password` 回跳后设置新密码。
  - Google 用户的 profile 兜底昵称优先使用 `user_name`、`full_name`、`name`，再退回邮箱前缀。
- 验证结果：
  - 新增 `auth-flow` 测试覆盖密码登录、找回邮件请求和新密码确认校验。
  - `auth-flow` 测试、TypeScript 检查、相关文件 Biome lint、生产构建通过。
  - 本地浏览器验证 `http://127.0.0.1:5178/login`：主验证码入口、Google 按钮、密码登录面板、忘记密码面板和重置密码回跳页均正常渲染；空邮箱和短密码本地校验生效；console 无 warn/error。
- 当前边界：
  - 未点击 Google 登录，避免进入真实第三方登录流程。
  - 未发送真实找回邮件，避免触发 Auth 邮件额度；该功能上线可用仍依赖 Supabase Google Provider 配置和自定义 SMTP / 邮件模板配置。
  - 已提交并推送 commit `06780f0` 到 `origin/codex/cmi-map-home-sections`；最终 Production 已部署最新 HEAD `6c68dcc`：`https://ca0b0153.cmi-map.pages.dev`。

### 2026-05-26 15:11:07 +07 清迈客栈活动卡盖戳改为一键报名

- 背景：用户在 `/cmi-home` 指出活动卡底部右侧的 `盖戳` 按钮应改成报名按钮，点一下后用户就算报名。
- 本轮实现：
  - 清迈客栈活动卡右下按钮从活动盖戳改为 `报名`。
  - 按钮点击后使用当前登录用户的昵称 / 邮箱写入 `cmi_event_registrations`，备注为“从清迈客栈主页一键报名”。
  - 已报名或重复报名时按钮进入 `已报名` 状态；提交中显示 `报名中`。
  - 未登录用户点击会跳转登录页，登录后回到 `/cmi-home`。
  - 保留 `转发到群` 按钮，不再在清迈客栈活动卡上打开盖戳选择抽屉。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/pages/CmiHome.tsx src/db/cmi-events.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `http://127.0.0.1:5175/cmi-home`：活动卡 DOM 出现 `报名活动` 按钮，旧 `盖戳` 文案消失，console 无 warn/error。
- 当前边界：
  - 为避免替用户报名真实活动，本轮没有在浏览器里点击真实报名按钮；代码路径已接入真实报名表。

### 2026-05-26 15:24:00 +07 活动列表卡片对齐清迈客栈活动卡

- 背景：用户在 `/list?scene=tomorrow-events` 指出活动列表卡片和清迈客栈主页已经设计好的活动卡不一致，要求改成同款。
- 本轮实现：
  - 活动列表 `CmiEventCard` 移除左上角 `CMI EVENT` 来源贴片，保留右上角费用贴片、海报、标题、摘要、标签、时间地点和费用 / 参与信息结构。
  - 活动列表卡片底部新增和清迈客栈主页一致的 `转发到群` / `报名` 动作区。
  - 列表页卡片不再用 `<Link>` 包整张卡，改为整卡点击进入活动详情，按钮点击时阻止冒泡，避免“点报名却跳详情”的误触。
  - `报名` 接入真实活动报名表；未登录跳转登录后回到当前列表页，已报名和重复报名会显示 `已报名`。
  - `转发到群` 复用活动分享卡生成逻辑，支持系统分享，不支持时下载图片。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/components/intent/event-card.tsx src/pages/ListView.tsx src/components/intent/event-card-presentation.ts src/components/intent/event-card-presentation.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `http://127.0.0.1:5175/list?scene=tomorrow-events`：存在 13 个 `报名活动` 按钮和 13 个 `转发活动到群` 按钮，旧 `CMI EVENT` 与 `盖戳` 文案消失，console 无 warn/error。
- 当前边界：
  - 为避免替用户报名真实活动，本轮没有点击真实报名按钮。

### 2026-05-26 15:22:23 +07 活动列表卡片移除海报右上角价格贴片

- 背景：用户在 `/list?scene=tomorrow-events` 指出活动卡片海报右上角 `免费参与` 贴片可以删掉。
- 本轮实现：
  - 从活动列表共用 `CmiEventCard` 中移除海报右上角价格贴片。
  - 费用信息仍保留在卡片下方信息区，避免信息丢失。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/components/intent/event-card.tsx` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `http://127.0.0.1:5175/list?scene=tomorrow-events`：右上角价格贴片 DOM 数量为 0，费用信息仍在下方信息区，console 无 warn/error。

### 2026-05-26 15:28:14 +07 活动列表分类标签缩小

- 背景：用户在 `/list?scene=tomorrow-events` 指出顶部活动分类标签太大，要求这一串 tag 小一点。
- 本轮实现：
  - 活动列表顶部分类条高度、按钮高度、按钮间距、字号和底部分隔线都向轻量化调整。
  - 分类按钮从 `min-h-11 / text-sm / px-4` 调整为 `min-h-8 / text-xs / px-3`，避免抢活动卡片首屏空间。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/pages/ListView.tsx` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `http://127.0.0.1:5175/list?scene=tomorrow-events`：分类条高度约 43px，分类按钮约 32px 高、12px 字号；CMI / 全部筛选切换正常，console 无 warn/error。

### 2026-05-26 15:33:37 +07 活动列表分类标签回退到上一版

- 背景：用户看过缩小版后反馈“不行，还不如刚才，还是刚才好看”，要求回退。
- 本轮实现：
  - 只回退活动列表顶部分类 tag 的尺寸和分类条样式，不改活动卡片、报名按钮、分享按钮或价格贴片逻辑。
  - 分类按钮恢复为 `min-h-11 / text-sm / px-4`，分类条恢复较厚的底部分隔线、原始间距和上下留白。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/pages/ListView.tsx` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `http://127.0.0.1:5175/list?scene=tomorrow-events`：分类条高度约 62px，分类按钮约 44px 高、14px 字号，console 无 warn/error。

### 2026-05-26 15:43:47 +07 活动列表分类条去掉底部分割线

- 背景：用户指出 `/list?scene=tomorrow-events` 活动分类条下面有一条灰白线很丑，要求去掉。
- 本轮实现：
  - 去掉活动分类条本身的底部 border。
  - 保留上一轮回退后的大按钮尺寸和分类条节奏，不再缩小 tag。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/pages/ListView.tsx` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `http://127.0.0.1:5175/list?scene=tomorrow-events`：分类条 `border-bottom-width` 为 `0px`，按钮仍为约 44px 高、14px 字号，console 无 warn/error。

### 2026-05-26 17:33:17 +07 一键报名补取消报名

- 背景：用户指出报名按钮不能只报名不能取消；已报名状态下再次点击应弹出确认，确认后取消报名。
- 本轮实现：
  - 新增 `cancelCmiEventRegistration`，把当前用户对应活动的 `going` 报名记录更新为 `cancelled`，不硬删除历史记录。
  - `/list?scene=tomorrow-events` 活动卡：`已报名` 按钮不再禁用，点击后弹出“确定要取消”确认框，确认后取消报名并把按钮恢复为 `报名`。
  - `/cmi-home` 清迈客栈活动卡同步接入同样逻辑，避免两个一键报名入口行为不一致。
  - 取消逻辑放在“是否开放报名”判断之前；即使活动后来关闭报名，已报名用户仍可取消。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/db/cmi-events.ts src/components/intent/event-card.tsx src/pages/ListView.tsx src/pages/CmiHome.tsx` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `git diff --check -- src/db/cmi-events.ts src/components/intent/event-card.tsx src/pages/ListView.tsx src/pages/CmiHome.tsx` 通过。
  - 本地浏览器验证 `http://127.0.0.1:5175/list?scene=tomorrow-events`：报名按钮正常渲染且未禁用，console 无 warn/error。
- 当前边界：
  - 为避免替用户写入真实报名记录并触发通知邮件，本轮没有在浏览器里真实点击“报名 → 取消报名”的端到端数据写入流程。

### 2026-05-31 12:00:29 +07 V3 地图活动流只保留清迈客栈活动

- 背景：用户在手机截图中圈出 `/v3` 地图页“本地生活脉搏”的活动卡，要求删掉 Jing Jai、Tong Tung、Nong Ho 这类外部本地活动，只留下我们社区 / 清迈客栈的活动。
- 本轮实现：
  - 新增共用筛选函数 `isCmiInnEvent`：只保留 `isCmiRelated`、`sourceType = cmi`、地点或区域包含 `清迈客栈` 的活动。
  - V3 地图“本地生活脉搏”抽屉、地图活动 marker、底部“活动”页统一使用该筛选，不再把 `community/manual` 友推或稳定本地市集自动混入。
  - `/cmi-home` 客栈活动列表复用同一筛选函数，避免之后两个入口规则漂移。
  - 活动库本身未删除外部活动种子，保留给周末 / 夜市等其他场景继续使用。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `node --test src/data/cmi-events.test.ts src/lib/paths.test.ts` 通过，覆盖 Tong Tung 外部友推被排除、清迈客栈活动保留。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地浏览器验证 `http://127.0.0.1:5173/v3`：地图抽屉和底部“活动”页均不再出现 Jing Jai / Tong Tung / Nong Ho，WaytoAGI、CMI Talk、清迈客栈活动仍展示；点击 WaytoAGI 活动卡可打开详情，console 无 warn/error。

### 2026-06-01 12:55:57 +07 活动详情底部操作栏去掉紫色底板

- 背景：用户在 `/events/cmi-five-minute-music-kid-a-2026-06-02` 评论指出底部“分享 / 报名 / 导航”栏的紫色背景不需要，只保留按钮。
- 本轮实现：
  - 活动详情页底部固定操作区移除紫色背景和顶部黑色边线。
  - 外层透明承载层改为不拦截点击，三个操作按钮单独保留可点击状态。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地浏览器验证活动详情页：底栏背景为透明、顶部边线为 0，只剩三个按钮。
  - 已部署正式站 `https://730b7ed9.cmi-map.pages.dev` 和 v3 项目 `https://8592f055.cmi-map-v3.pages.dev`。

### 2026-06-01 13:03:18 +07 活动详情返回按钮固定在左上角

- 背景：用户在 `/events/cmi-five-minute-music-kid-a-2026-06-02` 评论指出返回按钮应固定在左上角，即便下滑也始终存在。
- 本轮实现：
  - 活动详情页头部从海报内绝对定位改为视口固定定位。
  - 头部内部仍按 `520px` 页面宽度居中，保证手机和桌面下返回按钮都贴近内容左侧。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/pages/CmiEventDetail.tsx` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证活动详情页：下滑到正文后返回按钮仍停留在左上角，坐标不变，console 无 warn/error。

### 2026-06-01 13:07:47 +07 V3 底部主导航换成线性图标

- 背景：用户在 `https://www.cmimap.com/` 评论指出底部主导航图标需要统一参考“地图”图标风格：动态改喇叭、活动保留日历、添加改加号且圆形按钮更突出。
- 本轮实现：
  - V3 底部主导航不再使用旧 PNG 图标；地图、动态、活动、添加统一改为线性 SVG 图标。
  - 动态使用喇叭图标，活动使用日历图标，添加按钮放大为 56px 圆形加号并上移凸出底栏。
  - 底栏允许图标向上溢出，避免放大的添加按钮被底栏裁切。
- 验证结果：
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地浏览器验证 `http://localhost:5173/?screen=map`：底栏显示“地图 / 动态 / 活动 / 添加”，四个入口均为 SVG 图标，添加图标为 56px 圆形凸起；点击“动态”和“活动”可切换到对应页面。
  - 已部署 v3 项目 `https://62069c7f.cmi-map-v3.pages.dev` 和正式站 `https://4230e572.cmi-map.pages.dev`，Source 为 `329901c`。
  - 正式域名 `https://www.cmimap.com/` 已确认加载新资源：底部动态 / 活动不再使用旧 PNG，添加按钮为 56px 圆形凸起；旧 PWA 会在刷新后切到新版本。

### 2026-06-01 13:09:31 +07 V3 动态盖戳刷新后保留

- 背景：用户反馈在 `/v3` 动态卡片上盖章后，刷新页面看起来会消失，怀疑数据库没有配置。
- 排查结论：
  - Supabase `stickers` / `placed_stickers` 已配置，远端已有盖戳记录；截图中的“今夜的双龙寺”也已能在数据库查到一枚 `stamp-good-lucky`。
  - 问题集中在前端回填和失败态：V3 动态流没有先稳定使用推荐数据里已返回的 `placed_stickers`，保存失败时也会留下本地临时印章，容易造成“刷新后没了”的错觉。
- 本轮实现：
  - V3 动态流加载推荐后，立即用推荐数据内的 `placed_stickers` 回填；再按当前可见动态补拉盖戳记录并合并，覆盖地图抽屉和动态页两个入口。
  - 新增盖戳状态工具函数：回填、合并、保存成功替换临时印章、保存失败移除临时印章。
  - 地点详情页同步使用同一套失败回滚逻辑，避免同类盖戳入口出现假成功。
- 验证结果：
  - `node --test --experimental-strip-types src/features/interactions/recommendation-card-interactions.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/features/interactions/recommendation-card-interactions.ts src/features/interactions/recommendation-card-interactions.test.ts src/pages/CmiMapV3Prototype.tsx src/pages/PlaceDetail.tsx` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `http://localhost:5174/v3?screen=feed`：刷新后第一条“今夜的双龙寺”仍显示 1 枚盖戳，动态页共 2 枚盖戳，console 无 warn/error。
  - 本地浏览器验证 `http://localhost:5174/v3`：展开地图底部动态后，第一条动态仍显示 1 枚盖戳，抽屉共 2 枚盖戳，console 无 warn/error。

### 2026-06-01 13:20:28 +07 活动详情海报和正文之间去掉黑线

- 背景：用户在 `/events/cmi-five-minute-music-kid-a-2026-06-02` 截图中指出海报蓝底和正文纸张之间的黑色横线需要去掉。
- 本轮实现：
  - 移除活动详情页海报区底部 `4px` 黑色边框。
  - 保留正文内部纸张样式和其他信息分隔线，不扩大改动范围。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/pages/CmiEventDetail.tsx` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证活动详情页：海报底部边框为 `0px`，蓝底与正文直接衔接，console 无 warn/error。

### 2026-06-01 13:27:51 +07 活动详情推文改为无衬线作品说明排版

- 背景：用户指出活动详情页推文正文不应使用宋体，希望改成黑体 / 无衬线，并参考艺术作品、摄影作品的展示排版。
- 本轮实现：
  - 推文标题、章节标题、正文和列表统一切换到 `PingFang SC` / `Noto Sans SC` / `Source Han Sans SC` 等无衬线字体栈。
  - 调整标题字重、正文行距、章节间距和正文网格密度，让版式更像展览说明 / 摄影作品文字，而不是宋体长文。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/pages/CmiEventDetail.tsx src/index.css` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证活动详情页：正文区字体族为无衬线黑体栈，标题字重 `900`，正文 16px / 29.12px 行高，无横向溢出，console 无 warn/error。

### 2026-06-01 13:31:19 +07 V3 添加按钮改为紫色大圆加号

- 背景：用户在正式站复核 V3 底部导航后，希望“添加”按钮改成紫色圆形，中心加号为白色，并且比上一版更大。
- 本轮实现：
  - 添加按钮圆形从 56px 放大到 64px，小屏兜底从 52px 放大到 58px。
  - 圆形背景改为 V3 主紫色，加号改为白色并放大到 36px。
  - 添加按钮整体上移到 `-24px`，让大圆形突出底栏，同时保留“添加”文字可见。
- 验证结果：
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地浏览器验证 `http://localhost:5173/?screen=map&verify=add-button-purple`：添加圆形为 `64px`，背景 `rgb(139, 107, 191)`，加号为白色 `36px`，console 无 warn/error。
  - 已部署 v3 项目 `https://15a12eba.cmi-map-v3.pages.dev` 和正式站 `https://9b9c2ace.cmi-map.pages.dev`，Source 为 `8e63ece`。
  - 正式域名 `https://www.cmimap.com/?verify=add-button-purple-8e63ece` 强刷新后已确认：添加圆形为 `64px`，背景 `rgb(139, 107, 191)`，加号为白色 `36px`。

### 2026-06-01 13:38:17 +07 活动详情推文改为白底无网格

- 背景：用户在活动详情页指出推文正文区不要网格背景，颜色太黄，需要改成白色。
- 本轮实现：
  - 移除推文正文区的网格背景图。
  - 正文区背景从暖纸色改为纯白，保留无衬线黑体排版。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec biome lint src/pages/CmiEventDetail.tsx src/index.css` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证活动详情页：正文区背景为 `rgb(255, 255, 255)`，`background-image: none`，无横向溢出，console 无 warn/error。

### 2026-06-01 13:43:36 +07 活动详情海报移动端缓存与分享卡失败修复

- 背景：用户用手机打开 `https://cmimap.com/events/cmi-five-minute-music-kid-a-2026-06-02`，发现活动海报显示为蓝底坏图图标，点击“分享”后提示“活动卡片生成失败，请稍后再试”。
- 排查结论：
  - 线上原始海报文件当前可正常返回 200 PNG，本地和桌面浏览器也能解码。
  - 生产 PWA 对同源图片使用 `CacheFirst`，手机端如果曾缓存过坏响应，会继续优先读旧坏缓存，导致详情页海报和分享卡生成器同时失败。
- 本轮实现：
  - Radiohead 活动海报 URL 增加 `?v=20260601-mobile-share`，绕开旧手机图片缓存。
  - PWA 同源图片运行时缓存从 `CacheFirst` 改为 `NetworkFirst`，并切到新缓存名 `cmi-map-runtime-images-v2`，避免坏图长期滞留。
  - 活动分享卡生成器在同源图片加载失败时自动追加一次 `cmiCardRetry` 参数重试，给旧缓存失败态加自愈路径。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/data/cmi-events.ts src/data/cmi-event-details.ts src/lib/cmi-event-share-card.ts vite.config.prod.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地生产预览 `http://127.0.0.1:4173/events/cmi-five-minute-music-kid-a-2026-06-02` 在 375px 手机视口下确认：海报 `currentSrc` 带版本号，`naturalWidth=936` / `naturalHeight=1681`，页面不再出现坏图。
  - 本地生产预览点击“分享”：未出现“活动卡片生成失败”；自动化点击触发的 `navigator.share` 用户手势限制已按现有逻辑降级处理。
  - 已部署 v3 项目 `https://fbd499fb.cmi-map-v3.pages.dev` 和正式站 `https://c39cf96a.cmi-map.pages.dev`，Source 为 `1ae4e61`。
  - 正式域名 `https://cmimap.com/sw.js` 已确认使用 `NetworkFirst` 和 `cmi-map-runtime-images-v2`；带版本号海报 URL 返回 200 PNG。
  - 新正式部署地址手机视口验证：海报 `currentSrc` 带 `?v=20260601-mobile-share`，图片尺寸正常，点击“分享”未出现卡片生成失败。
  - 注意：已被旧 service worker 控制的浏览器可能还会短时间读取旧页面包；刷新/重新打开后会切到新 service worker。

### 2026-06-01 13:57:18 +07 活动详情返回按钮直开兜底

- 背景：用户从手机相机 / 外部入口打开 `https://cmimap.com/events/cmi-five-minute-music-kid-a-2026-06-02` 后，点击左上角“返回”按钮没有反应。
- 排查结论：
  - 活动详情页原本直接调用 `navigate(-1)`。
  - 外部 App 或相机直开时没有可靠站内上一页，部分 WebView / 新标签下 `navigate(-1)` 会停在当前活动页，看起来像按钮失效。
- 本轮实现：
  - 活动详情页返回按钮新增 `handleBack`：有站内历史时先返回上一页。
  - 如果返回后 URL 仍停在当前页，自动兜底跳到 CMI Map 首页 `/`。
  - 没有可用历史时直接 `replace` 到首页，避免用户卡在详情页。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/CmiEventDetail.tsx` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地生产预览 375px 手机视口直开活动页，点击左上“返回”后从 `/events/cmi-five-minute-music-kid-a-2026-06-02?verify=back-fallback-2` 跳到 `/`，按钮不再无反应。
  - 已部署 v3 项目 `https://10742fc5.cmi-map-v3.pages.dev` 和正式站 `https://150da98b.cmi-map.pages.dev`，Source 为 `558d5f1`。
  - 新正式部署地址 375px 手机视口直开活动页，点击左上“返回”后从活动详情跳到 `/`，console 无 warn/error。

### 2026-06-01 14:11:55 +07 V3 地图 fallback 头像文字居中

- 背景：用户在 V3 地图页评论 marker，指出 fallback 头像里的文字需要放在中间。
- 本轮实现：
  - 调整 CMI Map 3.0 fallback SVG 头像文字，从固定下沉的 `y=56` 改为圆心 `y=48`。
  - 增加 `dominant-baseline="central"` 和 `alignment-baseline="middle"`，让英文、数字和中文首字在 marker 圆形中垂直居中。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.tsx` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地生产预览 `http://127.0.0.1:4173/?verify=marker-text-center` 确认：15 个 fallback SVG marker 全部包含居中基线属性，点击 fallback marker 后详情面板正常打开，当前地图页无新增 console warn/error。

### 2026-06-01 14:19:37 +07 动态页合并生活板信息流

- 背景：用户认为独立“清迈生活板”没有必要，活动招募、约搭子、求助和普通帖子应统一出现在动态页；同时希望动态页更像论坛信息流，减少大卡片、大留白和正式展陈感。
- 本轮实现：
  - `/blackboard` 旧入口改为跳转到 V3 动态页，旧发帖参数由动态页路径承接。
  - V3 动态页加载 `blackboard_posts`，与地点动态按发布时间合并为同一条信息流。
  - 去掉动态页原来的大 hero 卡片，未加入生活板顶部的“全部 / 精选 / 找搭子 / 求助”等筛选栏。
  - 动态卡片改为白底、细分割线、窄边距、左侧方图/占位图的紧凑排版；活动招募帖保留“引用活动”胶囊提示。
  - 旧首页卡片、地图外部地点“发帖”入口和个人页帖子回退入口都改为动态页语义。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/routes.tsx src/lib/paths.ts src/lib/paths.test.ts src/pages/CmiMapV3Prototype.tsx src/pages/MapView.tsx src/pages/PersonMap.tsx src/pages/SceneHome.tsx src/pages/cmi-map-v3-prototype.css` 通过。
  - `node --experimental-strip-types --test src/lib/paths.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地浏览器验证 `http://localhost:5173/?screen=feed&verify=merged-feed-local`：动态流存在 16 张卡片，其中 4 张来自生活板帖子、12 张来自地点动态；旧 hero、旧生活板标题和顶部分类筛选均不存在，console 无 warn/error。
  - 本地浏览器验证 `/blackboard?verify=redirect-check` 会跳转到 `/?screen=feed`，不再展示独立生活板页面。
  - 已部署 v3 项目 `https://51325c28.cmi-map-v3.pages.dev` 和正式站 `https://c6419907.cmi-map.pages.dev`，Source 为 `bb97ec2`。
  - 新正式 Pages 地址 `https://c6419907.cmi-map.pages.dev/?screen=feed&verify=bb97ec2` 复查通过：16 张卡片、4 张帖子、12 张地点动态；旧 hero、旧生活板标题和顶部分类筛选均不存在，console 无 warn/error。
  - 正式域名 `https://cmimap.com` 的服务器响应已指向新 bundle `CmiMapV3Prototype-By4KNvHm.js` / `CmiMapV3Prototype-0MZGr6Lr.css`，且新 JS 包内包含合并动态流逻辑；同一浏览器若仍看到旧 hero，是旧 service worker 缓存，需要刷新后切换。

### 2026-06-01 14:33:03 +07 Wrangler 固定为本地开发依赖

- 背景：用户指出部署时不应每次用临时 CLI，仓库本地应有 `wrangler` 依赖。
- 本轮实现：
  - 将 `wrangler` 加入 `devDependencies`，当前锁定解析版本为 `4.95.0`。
  - 更新 `pnpm-lock.yaml`，后续部署可直接使用 `pnpm exec wrangler ...`。
- 验证结果：
  - `pnpm exec wrangler --version` 输出 `4.95.0`。
  - `pnpm exec wrangler pages deploy --help` 正常输出 Pages 部署参数说明。
  - 本轮只暂存并提交 `package.json`、`pnpm-lock.yaml` 和本日志；工作区中既有的 marker / 定位相关未提交改动不纳入本轮。

### 2026-06-01 14:35:01 +07 V3 默认定位居中与 marker 缩小

- 背景：用户在手机打开 CMI Map 后，发现用户当前位置显示在右侧而不是地图中心；同时用户头像 marker 和地点 marker 都偏大，但彩蛋 marker 当前尺寸合适。
- 本轮实现：
  - V3 地图页首次打开即开启用户定位聚焦，不再等用户点击定位按钮。
  - 定位成功后直接把用户坐标放在地图物理中心，移除此前的纵向偏移。
  - 用户头像 marker 缩小到 48px / 热点 52px，地点 / 活动等普通 marker 缩小到 50px / 热点 54px。
  - 彩蛋 marker 仍走独立渲染分支，尺寸保持不变。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/components/map/LeafletMap.tsx src/lib/map-marker-visual.ts src/pages/CmiMapV3Prototype.tsx` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地生产预览 `http://127.0.0.1:4173/?verify=location-center-marker-size` 确认头像 marker 可见尺寸为 `60x60 / 35x35` 和热点 `64x64 / 38x38`，当前页无新增 console warn/error。
  - 可控定位验证 `http://127.0.0.1:4173/?verify=location-center-marker-size-puppeteer`：模拟清迈坐标后，用户定位点中心与地图容器中心偏差为 `x=-1px, y=-1px`。

### 2026-06-01 20:35:35 +07 动态页顶部中心区

- 背景：用户认可动态页当前密集信息流方向，但指出页面一打开如果全是帖子会缺少中心点；需要在顶部保留页面标题或社区精选内容，同时不要恢复旧的“全部 / 精选 / 找搭子 / 求助”筛选栏。
- 本轮实现：
  - 在动态页列表前新增一个紧凑顶部中心区，保留“动态”标题和 CMI MAP 标识。
  - 顶部精选优先取已精选的论坛帖；如果没有精选帖，则使用最新论坛帖；再没有帖子时才回退到最新地点动态。
  - 顶部精选内容从下面信息流中移除，避免同一条内容重复出现。
  - 顶部区域使用白底和冷灰，不使用旧生活板顶部分类标签，也不恢复独立生活板入口。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.tsx src/pages/cmi-map-v3-prototype.css` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地浏览器首次验证确认顶部中心区和“动态”标题已出现；随后 localhost 被 Browser 安全策略拦截，因此最终以 Cloudflare Pages 预览地址做线上复查。

### 2026-06-01 20:48:25 +07 删除 V3 内部活动详情页

- 背景：用户在手机截图中指出 V3 里的临时“活动详情 / 正式页”页面不需要保留。
- 本轮实现：
  - 从 V3 原型屏幕集合中移除 `eventDetail`，旧 `?screen=eventDetail` 不再渲染临时活动详情页。
  - 删除 `EventDetailMode` 组件和对应的详情页专用样式。
  - 地图活动底栏的入口改为“打开活动页”，直接指向正式 `/events/:eventId` 页面。
  - 增加回归检查，防止内部活动详情屏再次被加回。
- 验证结果：
  - `node --experimental-strip-types --test src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地浏览器验证 `http://localhost:5173/?screen=eventDetail&event=cmi-five-minute-music-kid-a-2026-06-02`：页面回到地图活动底栏，旧“活动详情”和“正式页”文案均不存在，入口 href 为 `/events/cmi-five-minute-music-kid-a-2026-06-02`，console 无 warn/error。
  - 本地浏览器直开正式活动页 `/events/cmi-five-minute-music-kid-a-2026-06-02`：Radiohead 活动正文正常渲染，console 无 warn/error。
  - 已用干净 worktree 部署 v3 项目 `https://9c73c5a8.cmi-map-v3.pages.dev` 和正式站 `https://0874dea2.cmi-map.pages.dev`，Source 为 `3bfe1f6`。
  - 正式域名 `https://cmimap.com` 服务器响应已指向新 bundle `CmiMapV3Prototype-D2mimRUH.js` / `CmiMapV3Prototype-Z789aAjj.css`；线上 JS 包内 `eventDetail` 和 `EventDetailMode` 均为 0 次，保留 `打开活动页` 入口。
  - 同一台浏览器若仍看到旧“活动详情 / 正式页”页面，是旧 PWA 缓存或旧 Service Worker 尚未切换，需要刷新后拿到新包。

### 2026-06-01 22:32:21 +07 活动页主标题压缩

- 背景：用户在手机截图中指出活动页 hero 标题“活动就来清迈客栈！”在窄屏会把“栈！”单独折到下一行，视觉上像标题拐弯。
- 本轮实现：
  - 将活动页主标题改为更短的“清迈客栈的活动！”，保留活动页定位，同时减少窄屏换行风险。
- 验证结果：
  - `git diff --check -- src/pages/CmiMapV3Prototype.tsx CMI_MAP_TASK_LOG.md` 通过。
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.tsx` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `http://127.0.0.1:5173/?screen=events&verify=event-title-copy`：390px 手机宽度下标题显示为一行“清迈客栈的活动！”，不再把末尾文字折到下一行；活动分页按钮可点击切换，console 无 warn/error。
  - 已部署 v3 项目 `https://500171a3.cmi-map-v3.pages.dev` 和正式站 `https://e0f0a71f.cmi-map.pages.dev`，Source 为 `ed93327`。
  - 线上预览 `https://e0f0a71f.cmi-map.pages.dev/?screen=events&verify=event-title-ed93327` 复查通过：390px 手机宽度下标题为一行“清迈客栈的活动！”，console 无 warn/error。
  - 正式域名 `https://cmimap.com/?screen=events&verify=event-title-ed93327` 刷新旧 PWA 缓存后复查通过：标题已切到“清迈客栈的活动！”，console 无 warn/error。

### 2026-06-01 20:57:46 +07 活动返图 Tag 与详情页汇总

- 背景：用户希望活动邀请帖之外，活动中或活动结束后的回顾/返图打卡也能关联活动；漏打活动 Tag 时可以回到自己发过的打卡补改；所有关联照片要汇总到活动详情页信息下方。
- 本轮实现：
  - 更新推荐编辑接口，当前登录用户可同时修改动态正文和活动 Tag；数据库暂缺活动字段时仍会回退到正文元数据兼容写入。
  - 地点详情页自己的打卡编辑弹窗增加“活动 Tag”选择，可补打、改绑或清除活动关联。
  - 活动详情页“基本信息”下方新增“活动返图”区块，自动收集所有关联当前活动且带照片的打卡，并保留跳转到对应地点动态的入口。
  - 活动详情页增加“返图 / 发布第一张返图”入口，直达已预选当前活动的打卡页。
- 验证结果：
  - `node --experimental-strip-types --test src/features/cmi-events/event-recaps.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/db/api.ts src/features/cmi-events/event-recaps.ts src/features/cmi-events/event-recaps.test.ts src/pages/PlaceDetail.tsx src/pages/CmiEventDetail.tsx` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地生产预览 `http://127.0.0.1:4173/events/cmi-five-minute-music-kid-a-2026-06-02?verify=event-recaps-local`：活动详情页在“基本信息”下方显示“活动返图”区块；未登录点击“返图”会进入登录页，登录后回到预选当前活动的打卡流程；console 无 warn/error。
  - 已部署 v3 项目 `https://53e82237.cmi-map-v3.pages.dev` 和正式站 `https://e81cd1ab.cmi-map.pages.dev`，Source 为 `9e72ba4`。
  - 线上预览 `https://e81cd1ab.cmi-map.pages.dev/events/cmi-five-minute-music-kid-a-2026-06-02?verify=event-recaps-9e72ba4` 复查通过：基本信息、活动返图、返图按钮均存在，console 无 warn/error。
  - 正式域名 `https://cmimap.com/events/cmi-five-minute-music-kid-a-2026-06-02?verify=event-recaps-9e72ba4-fresh` 刷新 service worker 后复查通过：基本信息、活动返图、返图按钮均存在，console 无 warn/error。

### 2026-06-01 21:27:19 +07 地图新动态隐藏已结束活动

- 背景：用户在 CMI Map 首页地图底部“清迈客栈新动态”横向活动卡片中看到已经结束的活动，要求这里不要展示已结束活动。
- 本轮实现：
  - V3 地图页新增 `upcomingCommunityEvents`，只保留未结束的清迈客栈活动。
  - 地图活动搜索、活动 filter marker 和底部“清迈客栈新动态”横向活动卡片都改用未结束活动集合。
  - 活动页本身的“已结束”分页保留，不影响历史活动归档。
- 验证结果：
  - `node --experimental-strip-types --test src/pages/CmiMapV3Prototype.test.ts src/pages/CmiMapV3Prototype.map-pulse.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.test.ts src/pages/CmiMapV3Prototype.map-pulse.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 已用干净 worktree 部署 v3 项目 `https://5268bee9.cmi-map-v3.pages.dev` 和正式站 `https://3dd36327.cmi-map.pages.dev`，Source 为 `da79d34`。
  - 线上预览 `https://3dd36327.cmi-map.pages.dev/?verify=hide-expired-da79d34` 复查通过：“清迈客栈新动态”仅展示未结束活动，当前为 Radiohead 6/2 和父亲节嘉宾招募 6/7。
  - 本地预览 `http://127.0.0.1:4173/?verify=hide-ended-events-local` 复查通过：底部“清迈客栈新动态”只展示 6/2、6/7 未结束活动，5/30 夜行活动不再出现，console 无 warn/error。

### 2026-06-01 21:24:52 +07 邮箱验证码找回密码

- 背景：一批早期用户很久没有使用 CMI Map，忘记原密码；现在产品体验变好后想回来，需要基于注册邮箱找回账号。
- 本轮实现：
  - 登录页“忘记密码？”改为邮箱验证码找回流程：输入注册邮箱、发送 6 位找回验证码、填写验证码和新密码后完成更新。
  - 继续兼容旧的重置链接回调：如果用户从邮件按钮回到 `/login?auth=reset-password`，仍可直接设置新密码。
  - Supabase Auth recovery 模板改为展示 `{{ .Token }}` 验证码，同时保留“打开重设页面”按钮。
  - 认证上下文新增 recovery OTP 校验，校验通过后再调用 Supabase `updateUser` 更新密码。
- 验证结果：
  - `node --experimental-strip-types --test src/features/auth/auth-flow.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/Login.tsx src/contexts/AuthContext.tsx src/features/auth/auth-flow.ts src/features/auth/auth-flow.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `pnpm lint` 通过；其中 `ast-grep` 未安装，项目脚本按既有逻辑跳过自定义 AST 扫描。
  - 本地浏览器验证 `http://127.0.0.1:5174/login?qa=password-reset-3`：使用本地模拟认证接口避免向真实邮箱发信；点击“忘记密码？”后可发送找回验证码，成功进入“邮箱验证码 / 新密码 / 再输入一次”表单，提交后回到首页；console 无 warn/error。

### 2026-06-01 21:12:26 +07 登录错误提示与 Google 入口隐藏

- 背景：用户反馈输错密码后页面像刷新成功一样，没有明确告诉他密码错误；当前 Google 登录不可用，继续展示按钮会误导用户。
- 本轮实现：
  - 密码登录失败时把 Supabase 的英文错误翻成明确中文，并同时显示顶部提示和密码框下方常驻错误。
  - 登录失败后留在 `/login`，不触发成功印章或跳转。
  - 暂时移除登录页的 Google 登录按钮和“其他方式”分割线。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `node --experimental-strip-types --test src/features/auth/auth-flow.test.ts` 通过。
  - `pnpm exec biome lint src/pages/Login.tsx src/features/auth/auth-flow.ts src/features/auth/auth-flow.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `http://localhost:5173/login`：输入错误密码后仍停在 `/login`，显示“邮箱或密码不正确，请检查后重新输入。”；Google 登录按钮和“其他方式”分割线均不存在，console 无 warn/error。

### 2026-06-01 21:20:10 +07 地图活动底栏直达正式详情

- 背景：用户希望从地图活动底栏点击后直接进入正式活动详情页，并且从详情页点返回时回到原来的地图活动底栏状态。
- 本轮实现：
  - 地图活动底栏主体增加正式活动详情链接，普通点击走应用内跳转，保留浏览器历史。
  - 底栏的“打开活动页”入口同步走应用内跳转，Command / Ctrl 点击等原生打开新标签行为仍保留。
  - 非链接、非按钮区域点击活动底栏时，也会进入正式 `/events/:eventId` 页面。
- 验证结果：
  - `node --experimental-strip-types --test src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.tsx src/pages/cmi-map-v3-prototype.css src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `http://localhost:5174/?event=cmi-five-minute-music-kid-a-2026-06-02&verify=sheet-link`：活动底栏存在 1 个正式详情链接；点击后进入 `/events/cmi-five-minute-music-kid-a-2026-06-02`；详情页“返回”按钮回到原地图 URL，活动底栏仍保留。
  - 本地浏览器验证 `http://localhost:5174/?event=cmi-five-minute-music-kid-a-2026-06-02&verify=sheet-body-click`：点击底栏正文非按钮区域同样进入正式详情页，返回后仍回到原地图活动底栏。
  - 已用干净 worktree 部署 v3 项目 `https://61041666.cmi-map-v3.pages.dev` 和正式站 `https://0f1a3309.cmi-map.pages.dev`，Source 为 `0c8bb00`。
  - 线上预览 `https://0f1a3309.cmi-map.pages.dev/?event=cmi-five-minute-music-kid-a-2026-06-02&verify=sheet-link-0c8bb00` 复查通过：底栏点击进入正式详情页，详情页“返回”回到原地图活动底栏。
  - 正式域名 `https://cmimap.com` 服务器响应已指向新入口 `index-C94AqMx_.js` 和新 V3 包 `CmiMapV3Prototype-DUdfP_ac.js`，线上包内已包含 `cmi-v3-selected-note-summary--link`；已访问过的浏览器若仍拿到旧 `index-DZ2-5eQZ.js`，属于旧 PWA Service Worker 缓存，需要刷新或重开页面后切到新包。

### 2026-06-02 08:20:23 +07 小程序化方向确认

- 背景：用户确认 CMI Map 仍要进入微信小程序形态，不能只停留在 PWA / 网页入口。
- 本轮决策：
  - 小程序化应先按“能不能上线”拆解，而不是只按“能不能开发”推进。
  - 前置条件至少包括：小程序主体与管理员、微信侧小程序备案、可 ICP 备案的服务域名、HTTPS API 域名、地图 / 定位相关隐私接口声明、服务类目与内容审核边界。
  - 当前更稳的技术路径仍是 `微信小程序 -> api.cmimap.com -> API/Worker -> Supabase`；小程序不应直接暴露 Supabase URL 或密钥，也不应把现有网页当作简单 web-view 外壳。
- 下一步：
  - 先确认主体和备案路径，再决定是否继续沿用 `cmimap.com` / `api.cmimap.com`，或改用更容易备案的国内云域名。
  - 工程侧随后再评估 Taro / 原生小程序 / uni-app 的实现成本，以及哪些现有 React 页面可以复用为业务模型而不是直接复用 UI。

### 2026-06-02 08:39:14 +07 活动页发起活动按钮与标题避让

- 背景：用户在手机截图中指出活动页黄色 hero 内“清迈客栈的活动！”标题和右上角“发起活动”按钮排版混乱；约束是发起活动按钮位置不变。
- 本轮实现：
  - 将活动页 hero 顶部改为左侧文案组 + 右侧按钮的网格结构，按钮仍保持右上角入口。
  - 在手机宽度下把标题固定拆成“清迈客栈的 / 活动！”两行，并为右侧按钮预留稳定列宽，避免标题随机挤到按钮下方。
- 验证结果：
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.tsx src/pages/cmi-map-v3-prototype.css` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `http://127.0.0.1:5173/?screen=events&verify=event-hero-layout`：390px 和 360px 手机视口下标题与按钮均无重叠；390px 标题稳定显示为两行，按钮仍位于黄色卡片右上角，console 无 warn/error。
  - 本地未登录状态点击“发起活动”后按既有保护逻辑进入 `/login`；点击“刚结束”分页后 `aria-pressed=true`，筛选交互正常。
  - 已部署 v3 项目 `https://50b81ec5.cmi-map-v3.pages.dev` 和正式站 `https://3a5bf16a.cmi-map.pages.dev`，Source 为 `f6d7cdc`。
  - 线上预览 `https://3a5bf16a.cmi-map.pages.dev/?screen=events&verify=event-hero-f6d7cdc` 复查通过：390px 手机宽度下标题固定两行，按钮仍在右上角，console 无 warn/error。
  - 正式域名 `https://cmimap.com/?screen=events&verify=event-hero-f6d7cdc` 普通刷新后已切到新入口 `index-C3ofkg3p.js` 和新 V3 包 `CmiMapV3Prototype-DcJwzlzJ.js` / `CmiMapV3Prototype-D8x5s38f.css`；390px 手机宽度下标题与按钮无重叠。

### 2026-06-02 08:53:22 +07 活动页发起按钮视觉降级

- 背景：用户在手机截图中指出右上角“发起活动”按钮比标题还要猛，视觉上更像主标题；期望按钮小一点、标题大一点。
- 本轮实现：
  - 440px 以下把活动页标题从 30px 提到 34px，保持两行稳定排版。
  - 440px 以下把“发起活动”按钮从 120px / 44px 降到 104px / 38px，并同步缩小图标、间距、阴影和漫画强调线。
  - 370px 以下单独收敛为 96px / 36px 按钮和 30px 标题，避免极窄屏重新拥挤。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - CSS 语法检查 `npx tailwindcss -i ./src/index.css -o /dev/null ...` 无错误输出。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `http://127.0.0.1:5173/?screen=events&verify=button-balance-local`：390px 视口下标题 34px，两行高度 67px；按钮 104px x 38px；标题与按钮无重叠，console 无 warn/error。
  - 本地浏览器验证 360px 视口：标题 30px，两行高度 59px；按钮 96px x 36px；标题与按钮无重叠，console 无 warn/error。
  - 本地未登录状态点击“发起活动”仍进入 `/login`，入口行为正常。
  - 已部署 v3 项目 `https://25ff9603.cmi-map-v3.pages.dev` 和正式站 `https://393b37a6.cmi-map.pages.dev`，Source 为 `3b96310`。
  - 线上预览 `https://393b37a6.cmi-map.pages.dev/?screen=events&verify=button-balance-3b96310` 复查通过：390px 视口标题 34px、按钮 104px x 38px，无重叠，console 无 warn/error；360px 视口按钮 96px x 36px，无重叠。
  - 正式域名 `https://cmimap.com/?screen=events&verify=button-balance-3b96310` 普通刷新后已切到新入口 `index-DwEIRZX7.js` 和新 V3 包 `CmiMapV3Prototype-C4StUDNc.js` / `CmiMapV3Prototype-DeoPRJUd.css`；390px 视口下按钮已降级为右上角辅助入口，标题重新成为主视觉。

### 2026-06-02 09:25:58 +07 活动发布说明字段合并

- 背景：用户在手机截图中指出发布活动表单里的“一句话简介”和“详细说明”重复，要求合并。
- 本轮实现：
  - 发布活动页和活动管理页都只保留一个“活动说明”大输入框。
  - 提交时用活动说明全文写入 `detailBody`，并从第一行自动生成最多 220 字的 `summary`，保证活动卡片仍有简介。
  - 编辑旧活动时将旧简介和旧详细说明合并回填到同一个输入框，避免保存时丢掉旧内容。
- 验证结果：
  - `node --experimental-strip-types --test src/features/cmi-events/event-description-merge.test.ts` 通过。
  - `pnpm exec biome lint src/pages/CmiEventCreate.tsx src/pages/CmiEventManage.tsx src/features/cmi-events/event-description.ts src/features/cmi-events/event-description-merge.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器验证 `http://127.0.0.1:5173/events/new?verify=description-merge-local-2`：页面只显示“活动说明”，不再出现“一句话简介 / 详细说明”；填写说明后输入值保持正常，console 无 warn/error。

### 2026-06-02 09:47:12 +07 活动发布说明字段合并部署

- Source commit：`60ffc26706cad0f10a6f4664e53a06b617ab1433`（`Merge event description fields`）。
- 部署结果：
  - v3 预览项目：`https://1477be3a.cmi-map-v3.pages.dev`。
  - 正式站 Pages 项目：`https://cb7abb67.cmi-map.pages.dev`。
- 线上复查：
  - 干净工作树 `/tmp/cmi-map-v3-deploy-60ffc26` 安装依赖后重新运行测试、lint、类型检查和生产构建，均通过。
  - 正式站 `https://cmimap.com/events/new?verify=description-merge-60ffc26` 在 390px 手机视口下只显示“活动说明”，不再显示“一句话简介 / 详细说明”，console 无 warn/error。
  - 正式域名 HTML 仍返回旧入口 `/assets/index-BjZ9ohCX.js`，但该入口引用的 `CmiEventCreate-tTCwpwbH.js` 已包含合并后的“活动说明”表单；新部署预览地址返回入口 `/assets/index-D8N0kw0e.js`。

### 2026-06-02 09:38:18 +07 清迈客栈区域预约与活动审核流

- 背景：用户希望发起清迈客栈活动时必须选择具体使用区域，并且同一时间段已被占用的区域不可选；普通用户发起活动需要先提交审核，管理员发起则直接发布。
- 本轮实现：
  - 活动表新增 `venue_space` 字段，区域枚举为地毯区、圆桌区、办公区、4 楼天台区、2 楼沙发区、院子凉棚区。
  - 发布活动页识别到清迈客栈后显示区域选择；区域可用性按开始 / 结束时间查询，已占用区域禁用，提交时再次校验。
  - 普通用户创建活动写入 `draft + needs-review`，审核通过前不公开；管理员创建活动写入 `published + verified`。
  - 新增 `notify-cmi-event-application` Supabase Edge Function，普通用户提交待审活动后给管理员邮箱发送审核提醒。
  - 活动管理页改为按活动 ID 读取可管理活动，支持打开待审草稿；管理员可在管理页一键“审核通过并发布”。
  - 活动详情页地点文案会显示具体客栈区域。
- 数据库 / 权限：
  - 新增 migration `20260602093000_cmi_inn_venue_space_review_flow.sql`，包含 `venue_space` 字段、区域约束、预约查询函数 `get_cmi_inn_space_reservations`、普通用户草稿待审插入策略和 owner/admin 更新策略。
- 验证结果：
  - `node --test --experimental-strip-types src/features/cmi-events/event-management.test.ts src/features/cmi-events/event-description-merge.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/CmiEventCreate.tsx src/pages/CmiEventManage.tsx src/pages/CmiEventDetail.tsx src/db/cmi-events.ts src/features/cmi-events/event-management.ts src/features/cmi-events/event-management.test.ts src/data/cmi-events.ts` 通过。
  - `deno check supabase/functions/notify-cmi-event-application/index.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - `git diff --check` 通过。
  - 本地浏览器验证 `http://localhost:5173/events/new` 被登录保护重定向到 `/login`，页面正常渲染且 console 无 warn/error；为避免复制生产站真实登录令牌到本地，本轮未在浏览器里做真实发起 / 提交 / 邮件触发。

### 2026-06-02 09:51:40 +07 清迈客栈区域预约与活动审核流部署

- Source commit：`9c1f9bd8642ff1c66fb1791c40e80eb5c4c22f2d`（`Add CMI inn venue space review flow`）。
- Supabase：
  - `supabase db push --linked --dry-run` 只检测到本轮 migration `20260602093000_cmi_inn_venue_space_review_flow.sql`。
  - `supabase db push --linked --yes` 已成功应用该 migration。
  - Edge Function `notify-cmi-event-application` 已部署到项目 `sfpcpxlxslnulzlmjcby`。
  - 远端 secrets 已存在 `RESEND_API_KEY`、`CMI_EVENT_ADMIN_EMAIL`、`CMI_EVENT_EMAIL_FROM`、`CMI_INN_DEFAULT_ORGANIZER_EMAIL` 和 `PUBLIC_SITE_URL`，邮件提醒具备发信配置。
- Cloudflare Pages：
  - v3 预览项目：`https://fe118e7b.cmi-map-v3.pages.dev`。
  - 正式站 Pages 项目：`https://32ea999b.cmi-map.pages.dev`。
- 线上复查：
  - 正式站 `https://cmimap.com/events/new?verify=venue-space-9c1f9bd` 可打开活动发布表单，console 无 warn/error。
  - 绑定“清迈客栈”后显示六个区域：地毯区、圆桌区、办公区、4 楼天台区、2 楼沙发区、院子凉棚区。
  - 点击“地毯区”后 UI 显示“已选择”；本轮未提交真实活动，避免在线上生成测试活动和触发真实邮件。

### 2026-06-02 09:57:52 +07 V3 地图活动 marker 海报封面裁切

- 背景：用户在 V3 地图页标注活动 marker，指出活动图标不应该把整张海报缩在圆形里，而应该让海报放大并占满整个圆形。
- 本轮实现：
  - `MapMarker.visualOverride` 新增 `isPoster` 视觉标记，活动 marker 明确使用海报封面模式。
  - 单个活动 marker 的图片改为圆形 `cover` 裁切，保留白色外框和地图针尾巴。
  - 聚合 marker 里的活动小海报也同步改为 `cover` 裁切，避免两个活动靠近时又退回完整缩图。
- 验证结果：
  - `node --test src/lib/map-marker-visual.test.ts src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/lib/map-marker-visual.ts src/lib/map-marker-visual.test.ts src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.map-pulse.test.ts src/types/types.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地预览 `http://127.0.0.1:4176/?verify=event-poster-marker-3` 点击“活动”筛选后，聚合活动 marker DOM 确认 `object-fit: cover`、`border-radius: 999px`、`overflow: hidden` 和 42px 海报内径；截图显示活动海报已铺满圆形。

### 2026-06-02 10:01:12 +07 V3 地图活动 marker 海报封面裁切部署

- Source commit：`27bd809`（`Cover crop event map markers`）。
- Cloudflare Pages：
  - v3 预览项目：`https://d68557f8.cmi-map-v3.pages.dev`。
  - 正式站 Pages 项目：`https://b65e9697.cmi-map.pages.dev`。
- 线上复查：
  - `https://cmimap.com/?verify=27bd809`、`https://b65e9697.cmi-map.pages.dev/?verify=27bd809` 和 `https://d68557f8.cmi-map-v3.pages.dev/?verify=27bd809` 均返回新入口 `assets/index-88K_26LK.js`。
  - 正式域名入口引用 `LeafletMap-CMo40TmL.js`、`map-marker-visual-CpBleamu.js` 和 `CmiMapV3Prototype-DqjivNan.js`。
  - `map-marker-visual-CpBleamu.js` 包含活动海报 `cover` 裁切和聚合海报 42px 内径逻辑。
  - 应用内浏览器复查 `https://b65e9697.cmi-map.pages.dev/?verify=event-poster-27bd809`：点击“活动”筛选后，活动聚合 marker DOM 确认 `object-fit: cover`、`border-radius: 999px`、`overflow: hidden` 和 42px 海报内径；页面无当前部署相关 console warn/error。

### 2026-06-02 10:09:25 +07 V3 地图 marker 整体缩小

- 背景：用户在正式地图页反馈地图上的 marker 仍偏大，希望“再小点，再小点”。
- 本轮实现：
  - 单个用户头像 / 活动 / 普通地点 marker 从约 60px 级别收小到 52-58px 级别。
  - 聚合 marker 从 72x62 收小到 62x54，内部小圆从 48px 收小到 40px。
  - 彩蛋 marker 也同步收小；右侧图层按钮、定位按钮和底部导航不变。
- 验证结果：
  - `node --test src/lib/map-marker-visual.test.ts src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/CmiMapV3Prototype.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/lib/map-marker-visual.ts src/lib/map-marker-visual.test.ts src/components/map/LeafletMap.tsx` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地预览 `http://127.0.0.1:4177/?verify=compact-markers` 复查：marker DOM 显示聚合 marker 62x54、单个头像 marker 52x52 / 56x56，截图确认地图视觉更轻。

### 2026-06-02 10:13:10 +07 V3 地图 marker 整体缩小部署

- Source commit：`032615e`（`Reduce map marker sizes`）。
- Cloudflare Pages：
  - v3 预览项目：`https://93e7c2fe.cmi-map-v3.pages.dev`。
  - 正式站 Pages 项目：`https://9d6782ca.cmi-map.pages.dev`。
- 线上复查：
  - `https://cmimap.com/?verify=032615e`、`https://9d6782ca.cmi-map.pages.dev/?verify=032615e` 和 `https://93e7c2fe.cmi-map-v3.pages.dev/?verify=032615e` 均返回新入口 `assets/index-B-Jb6Iug.js`。
  - 正式域名入口引用 `LeafletMap-Byi-qJsS.js`、`map-marker-visual-CMP2aR-V.js` 和 `CmiMapV3Prototype-CsroYJfP.js`。
  - 应用内浏览器复查 `https://9d6782ca.cmi-map.pages.dev/?verify=compact-markers-032615e`：动态同步完成后 app marker 数量 8，聚合 marker 62x54，单个 marker 52x52 / 56x56，页面无当前部署相关 console warn/error。

### 2026-06-02 13:48:29 +07 打卡文字输入步骤极简化

- 背景：用户在 `/mark` 打卡文字步骤圈出顶部提示文案和“还没有关联地点 / 关联”卡片，要求删掉，只保留文字框和下面两个按钮。
- 本轮实现：
  - 写体验阶段删除顶部提示、“关联地点”卡片和底部静态语音提示，只保留 textarea、语音按钮和确认按钮。
  - 语音识别的异常提示继续通过 toast 处理，不再占用页面布局。
  - 未关联地点时，确认按钮仍进入后续地点搜索 / 手动选点兜底，不改变发布流程。
  - 发布前分类页底部继续收敛为单个固定发布按钮，不再显示额外摘要预览。
- 验证结果：
  - `node --test src/pages/MarkPlace.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/MarkPlace.tsx src/pages/MarkPlace.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 构建后的 `MarkPlace` chunk 确认不再包含本轮删除的静态提示文案。
  - 本地浏览器预览 `http://127.0.0.1:4187/mark` 会因登录保护重定向到 `/login`，页面正常渲染且 console 无 warn/error；未复制生产登录态做真实打卡提交。

### 2026-06-02 14:02:27 +07 注册显示名称检查权限修复

- 背景：新用户扫码后反馈注册不了，进一步反馈“显示名称不行，中英数字都不行”。
- 根因：注册前的昵称可用性检查直接用匿名 Supabase 客户端读取 `profiles` 表；线上匿名角色对 `profiles` 表返回 `permission denied for table profiles`，所以任何显示名称都会被前端当作检查失败。
- 本轮实现：
  - 把昵称可用性检查抽到 `src/features/auth/user-name-availability.ts`。
  - 注册和邮箱验证码创建用户流程改为调用已授权的 `is_user_name_available` RPC，不再直接读 `profiles` 表。
  - 新增单元测试覆盖 RPC 调用、昵称已占用和 RPC 出错三种情况。
- 验证结果：
  - 线上匿名 Supabase API 复查：中文昵称、英文数字昵称、纯数字昵称都返回 `available: true` 且无权限错误。
  - `npx tsx --test src/features/auth/user-name-availability.test.ts` 通过。
  - `npx tsx --test src/features/auth/auth-flow.test.ts` 通过。
  - `pnpm lint` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器预览 `http://localhost:5173/login`：点击“我是新人”后注册表单正常出现；昵称输入框可输入中文、英文数字和纯数字；console 无 warn/error。本轮未点击“发送注册验证码”，避免创建线上测试用户。

### 2026-06-02 14:08:30 +07 注册显示名称检查修复部署

- Source commit：`402f9fe`（`Fix registration display name check`）。
- Cloudflare Pages：
  - v3 预览项目：`https://ed1f51f5.cmi-map-v3.pages.dev`。
  - 正式站 Pages 项目：`https://c1a56105.cmi-map.pages.dev`。
- 线上复查：
  - `https://cmimap.com/login?verify=402f9fe`、`https://c1a56105.cmi-map.pages.dev/login?verify=402f9fe` 和 `https://ed1f51f5.cmi-map-v3.pages.dev/login?verify=402f9fe` 均返回 200，入口均引用 `assets/index-BW-RzpYg.js`。
  - 正式域名入口包内确认注册前昵称检查调用 `rpc("is_user_name_available", { target_user_name })`，不再直接读取 `profiles` 表做新人注册前检查。
  - 应用内浏览器复查 `https://c1a56105.cmi-map.pages.dev/login?verify=402f9fe`：点击“我是新人”后注册表单正常出现；昵称输入框可输入中文、英文数字和纯数字；console 无 warn/error。本轮未点击“发送注册验证码”，避免创建线上测试用户。

### 2026-06-02 14:40:54 +07 打卡完成反馈从红章改为鼓励徽章

- 背景：用户反馈 `/mark` 完成页照片上的红色 `RECORDED` 大章不好看，观感像罚单；建议改成“大拇哥 / 功德 +1”或“掌声鼓励”这类正反馈。
- 本轮判断：
  - 问题不只是颜色，而是语义和遮挡：红色大章压在照片中心，容易把“记录完成”读成“被处罚 / 被审判”。
  - 完成态更适合轻量、社区化的鼓励反馈，同时不要遮挡照片主体。
- 本轮实现：
  - `/mark` 照片完成态改为右下角小型“已记录 / 功德 +1 / 大拇哥收到了”鼓励徽章。
  - 无照片的文字推荐完成态同步使用同一鼓励徽章。
  - `/playground/mark` 原型同步移除红色 `RECORDED` 大章，避免后续预览误回旧方案。
  - 新增 `checkin-badge-pop` 动画，强调轻量弹出，不再模拟盖章砸下去。
  - `MarkPlace.test.ts` 增加防回归检查：源码必须包含鼓励徽章文案，不能再出现 `RECORDED` 和旧红色 `#da2222`。
- 验证结果：
  - `node --test src/pages/MarkPlace.test.ts` 通过。
  - `pnpm exec tsc -p tsconfig.check.json --noEmit` 通过。
  - `pnpm exec biome check src/pages/MarkPlace.tsx src/pages/PlaygroundMarkPlace.tsx src/index.css src/pages/MarkPlace.test.ts` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 构建后的 `MarkPlace` / `PlaygroundMarkPlace` chunk 确认包含“功德 +1 / 大拇哥收到了”和新动画类；本地 `/playground/mark` 因路由登录保护重定向到 `/login`，未做真实打卡提交验证。

### 2026-06-02 14:44:56 +07 打卡完成鼓励徽章部署

- Source commit：`c62b285`（`Improve check-in completion badge`）。
- Cloudflare Pages：
  - v3 预览项目：`https://7d63f753.cmi-map-v3.pages.dev`。
  - 正式站 Pages 项目：`https://77e31a54.cmi-map.pages.dev`。
- 线上复查：
  - `https://cmimap.com/mark?verify=c62b285`、`https://77e31a54.cmi-map.pages.dev/mark?verify=c62b285` 和 `https://7d63f753.cmi-map-v3.pages.dev/mark?verify=c62b285` 均返回新入口 `assets/index-DnQu_xXa.js` 和样式 `assets/index-B3T6Ios2.css`。
  - 正式站 `MarkPlace-BkKmmGNg.js` 确认包含“功德 +1”、“大拇哥收到了”和 `checkin-badge-pop`。
  - 正式站 `MarkPlace-BkKmmGNg.js` 对 `RECORDED` 和 `#da2222` 均无匹配，旧红色罚单感大章已从线上包移除。

### 2026-06-03 11:15:55 +07 v3 公开仓库安全收紧

- 背景：v3 仓库改为公开后，用户担心朋友或其他访问者看到公开配置后误刷 API / Token。
- 本轮判断：
  - 当前仓库没有发现 Supabase service role、Resend、OpenAI、GitHub PAT 或 CMI Agent Token 这类高危服务端密钥明文。
  - 仓库里有前端可公开的 Supabase URL / publishable key；它不是服务端密钥，但公开后任何人都更容易尝试调用前端可用接口。
- 本轮实现：
  - `.env` 改为本地文件，不再进入公开仓库；新增 `.env.example` 只保留变量名。
  - 报名写入 RLS 从 `anon, authenticated` 收紧为仅 `authenticated`，且必须是登录用户本人邮箱和本人 `user_id`。
  - 活动报名通知、活动发起通知 Edge Function 增加用户 JWT 校验和归属校验，避免公开 key 被用来匿名触发邮件通知。
- 验证结果：
  - `deno check supabase/functions/notify-cmi-event-registration/index.ts supabase/functions/notify-cmi-event-application/index.ts` 通过。
  - `pnpm exec tsc -p tsconfig.check.json --noEmit` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - Supabase 远端迁移 `20260603041534_harden_public_registration_notifications` 已应用。
  - Supabase Edge Functions `notify-cmi-event-registration` 和 `notify-cmi-event-application` 已重新部署。
  - 匿名调用两个通知函数均返回 401；匿名 REST 写入 `cmi_event_registrations` 返回 401 / `permission denied`。

### 2026-06-02 14:42:37 +07 清迈客栈活动导航坐标修复

- 背景：用户反馈从活动详情页点击“导航”后，Google Maps 目的地跑到古城 TCDC / Chaivapoom Soi 2 附近；这些活动实际都在清迈客栈。
- 根因：
  - 详情页导航优先使用活动记录里的 `mapLocation`。
  - 线上部分清迈客栈活动和 Agent 发布默认模板仍带旧错误坐标 `18.7919513784612, 98.9946296215124`。
- 本轮实现：
  - 新增 `getCmiEventNavigationTarget`：清迈客栈 / CMI 活动的详情页导航统一指向清迈客栈 `18.7932, 98.9874`，即使活动记录里带了旧错误 `mapLocation` 也不会误导用户。
  - 修正 CMI 活动发布脚本和发布文档里的清迈客栈默认坐标，避免后续自动发布继续写入旧坐标。
  - 新增 Supabase 迁移 `20260602073543_fix_cmi_inn_event_coordinates.sql`，只修正带清迈客栈 / CMI 标识且仍为旧错误坐标的历史活动。
- 验证结果：
  - Supabase 远端迁移已应用；线上清迈客栈 / CMI 活动坐标复查均为 `18.7932, 98.9874`，旧错误坐标数量为 0。
  - `npx tsx --test src/features/cmi-events/event-navigation.test.ts` 通过。
  - `node --test scripts/cmi-event-publish-utils.test.mjs` 通过。
  - `pnpm lint` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地生产预览 `http://127.0.0.1:4173/events/cmi-five-minute-music-kid-a-2026-06-02` 活动详情正常渲染；内置浏览器不允许改写 `window.open` 截获外部地图 URL，导航坐标由新增单元测试和线上数据查询覆盖。

### 2026-06-02 14:42:37 +07 清迈客栈活动导航坐标修复部署

- Source commit：`3552f3d`（`Fix CMI Inn event navigation coordinates`）。
- Supabase：
  - 远端迁移 `20260602073543_fix_cmi_inn_event_coordinates` 已应用。
  - 线上 `cmi_events` 复查：当前清迈客栈 / CMI 活动均为 `18.7932, 98.9874`，旧错误坐标 `18.7919513784612, 98.9946296215124` 数量为 0。
- Cloudflare Pages：
  - v3 预览项目：`https://d1d4df43.cmi-map-v3.pages.dev`。
  - 正式站 Pages 项目：`https://3a54352f.cmi-map.pages.dev`。
- 线上复查：
  - `https://cmimap.com/events/cmi-five-minute-music-kid-a-2026-06-02?verify=3552f3d`、`https://3a54352f.cmi-map.pages.dev/events/cmi-five-minute-music-kid-a-2026-06-02?verify=3552f3d` 和 `https://d1d4df43.cmi-map-v3.pages.dev/events/cmi-five-minute-music-kid-a-2026-06-02?verify=3552f3d` 均返回 200，入口均引用 `assets/index-DXbwOuuc.js`。
  - 正式域名入口引用 `CmiEventDetail-HztAMqFP.js`；线上相关数据包包含新清迈客栈坐标，未发现旧错误坐标残留。
  - 应用内浏览器复查 `https://3a54352f.cmi-map.pages.dev/events/cmi-five-minute-music-kid-a-2026-06-02?verify=3552f3d`：活动详情正常渲染，底部“导航”按钮可见。

### 2026-06-03 23:18:00 +07 v3.1 约搭子步骤一：数据与发起基础

- 背景：根据 `CMI Map 3.1 约搭子第一部分开发文档`，第一部分先做地点 / 活动驱动的轻型约搭子闭环，不扩展成论坛或完整活动管理系统。
- 本轮实现：
  - 新增约搭子模型，覆盖发起字段、好友 / 非好友申请初始状态、批准后联系方式展示规则。
  - 新增 `cmi_companion_invites` 和 `cmi_companion_applications` 迁移；普通读取不授予 `contact_label`，避免地图公开列表泄露联系方式。
  - 新增约搭子 Supabase 数据访问层，只包含发起、列表、单条、申请和审核。
  - Obsidian 开发文档已在步骤一打勾并记录验证结果。
- 验证结果：
  - `node --test --experimental-strip-types src/features/companions/cmi-companions.test.ts src/db/cmi-companions.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/features/companions/cmi-companions.ts src/features/companions/cmi-companions.test.ts src/db/cmi-companions.ts src/db/cmi-companions.test.ts` 通过。
  - `git diff --check -- src/features/companions/cmi-companions.ts src/features/companions/cmi-companions.test.ts src/db/cmi-companions.ts src/db/cmi-companions.test.ts supabase/migrations/20260603161708_cmi_companion_invites.sql` 通过。

### 2026-06-03 23:30:00 +07 v3.1 约搭子步骤二：地图 marker 与轻卡片

- 本轮实现：
  - 约搭子公开列表接入 v3 地图。
  - 约搭子 marker 使用发起人头像，并在头像外加雷达波纹。
  - 点击约搭子 marker 只浮出轻型小卡片，不直接进入详情。
  - 点击小卡片后进入 Event Details，详情只展示当前发起字段，不加入 RSVP 额外按钮。
  - Obsidian 开发文档已在步骤二打勾并记录验证结果。
- 验证结果：
  - `node --test src/lib/map-marker-visual.test.ts src/pages/CmiMapV3Prototype.map-pulse.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/lib/map-marker-visual.ts src/lib/map-marker-visual.test.ts src/types/types.ts src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/cmi-map-v3-prototype.css` 通过。
  - `git diff --check -- src/lib/map-marker-visual.ts src/lib/map-marker-visual.test.ts src/types/types.ts src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/cmi-map-v3-prototype.css` 通过。

### 2026-06-03 23:38:02 +07 v3.1 约搭子步骤一补充：发起表单与入口

- 本轮实现：
  - 新增 `/companions/new` 登录后路由。
  - 新增约搭子发起页，只保留第一部分规定字段。
  - 地图地点卡和活动底部卡各接入一个“约搭子”发起入口，并自动带入地点 / 活动上下文。
  - Obsidian 开发文档已在步骤一补充打勾并记录验证结果。
- 验证结果：
  - `node --test --experimental-strip-types src/lib/paths.test.ts src/routes.test.ts src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/CmiCompanionCreate.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/lib/paths.ts src/lib/paths.test.ts src/routes.tsx src/routes.test.ts src/pages/CmiCompanionCreate.tsx src/pages/CmiCompanionCreate.test.ts src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/cmi-map-v3-prototype.css` 通过。
  - `git diff --check -- src/lib/paths.ts src/lib/paths.test.ts src/routes.tsx src/routes.test.ts src/pages/CmiCompanionCreate.tsx src/pages/CmiCompanionCreate.test.ts src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/cmi-map-v3-prototype.css` 通过。

### 2026-06-03 23:43:14 +07 v3.1 约搭子步骤三：动态卡片

- 本轮实现：
  - 约搭子请求接入现有动态流，不新增独立信息流结构。
  - 动态卡片展示标题、地点、时间、发起人、人数和状态。
  - 点击动态卡片进入同一套 Event Details。
  - Obsidian 开发文档已在步骤三打勾并记录验证结果。
- 验证结果：
  - `node --test src/pages/CmiMapV3Prototype.map-pulse.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/cmi-map-v3-prototype.css` 通过。
  - `git diff --check -- src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/cmi-map-v3-prototype.css` 通过。

### 2026-06-03 23:48:51 +07 v3.1 约搭子步骤四：加入申请与批准

- 本轮实现：
  - Event Details 增加唯一加入动作，不加入 Maybe、不参加、我来了等 RSVP。
  - 非好友加入后进入申请状态；发起人在 Event Details 看到申请人、主页入口、批准和拒绝。
  - 新增受限数据库函数 `get_cmi_companion_contact_label`，只有发起人或已批准申请人能读取联系方式。
  - 当前代码库没有好友关系数据源，未新增额外社交结构；好友直通由 `relationship_type='friend'` 的数据规则支撑。
  - Obsidian 开发文档已在步骤四打勾并记录验证结果。
- 验证结果：
  - `node --test --experimental-strip-types src/features/companions/cmi-companions.test.ts src/db/cmi-companions.test.ts src/pages/CmiMapV3Prototype.map-pulse.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/features/companions/cmi-companions.ts src/features/companions/cmi-companions.test.ts src/db/cmi-companions.ts src/db/cmi-companions.test.ts src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/cmi-map-v3-prototype.css` 通过。
  - `git diff --check -- src/features/companions/cmi-companions.ts src/features/companions/cmi-companions.test.ts src/db/cmi-companions.ts src/db/cmi-companions.test.ts src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/cmi-map-v3-prototype.css supabase/migrations/20260603164517_cmi_companion_join_flow.sql` 通过。

### 2026-06-03 23:53:36 +07 v3.1 约搭子第一部分最终验证

- Supabase：
  - 远端已应用 `20260603161708_cmi_companion_invites`。
  - 远端已应用 `20260603164517_cmi_companion_join_flow`。
- 验证结果：
  - `node --test --experimental-strip-types src/features/companions/cmi-companions.test.ts src/db/cmi-companions.test.ts src/lib/paths.test.ts src/routes.test.ts src/pages/CmiCompanionCreate.test.ts src/lib/map-marker-visual.test.ts src/pages/CmiMapV3Prototype.map-pulse.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/features/companions/cmi-companions.ts src/features/companions/cmi-companions.test.ts src/db/cmi-companions.ts src/db/cmi-companions.test.ts src/lib/paths.ts src/lib/paths.test.ts src/routes.tsx src/routes.test.ts src/pages/CmiCompanionCreate.tsx src/pages/CmiCompanionCreate.test.ts src/lib/map-marker-visual.ts src/lib/map-marker-visual.test.ts src/types/types.ts src/pages/CmiMapV3Prototype.tsx src/pages/CmiMapV3Prototype.map-pulse.test.ts src/pages/cmi-map-v3-prototype.css` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器检查 `http://127.0.0.1:5173/` 通过；`/companions/new` 未登录时跳转登录页；无 HTTP 4xx 和控制台错误。

### 2026-06-04 00:28:55 +07 v3.1 约搭子第一部分部署状态

- 已部署到 Cloudflare Pages 项目 `cmi-map-v3` 的 Production，部署地址为 `https://79ea7a85.cmi-map-v3.pages.dev`，Source 为 `70d4e2d`。
- 部署前 `pnpm build` 通过，PWA precache 检查通过。
- 新 Pages 部署地址返回 `HTTP 200`，页面引用新构建入口资源。
- `cmti.uk` 仍未真正指向 `cmi-map-v3`：访问 `https://cmti.uk/?verify=companion-70d4e2d` 仍会 `301` 到 `https://cmimap.com/?verify=companion-70d4e2d`。
- Cloudflare Pages 自定义域名中 `cmti.uk` 仍为 `pending`，错误为 `CNAME record not set`。
- 当前 Wrangler OAuth 权限可部署 Pages，但读取 DNS records / rulesets API 仍返回 `Authentication error`；本轮未触碰 `stickers.cmti.uk`。

### 2026-06-04 09:01:01 +07 v3.1 约搭子第一部分 cmti.uk 域名切换完成

- Cloudflare DNS：将 `cmti.uk` 根域名 CNAME 从 `cmi-map.pages.dev` 改为 `cmi-map-v3.pages.dev`，保持 Proxied。
- Cloudflare Redirect Rules：停用旧规则 `Redirect cmti.uk to cmimap.com`，该规则原先将 `cmti.uk` 301 到 `cmimap.com`。
- Cloudflare Pages：`cmi-map-v3` 的自定义域名 `cmti.uk` 已变为 `active`；verification 和 HTTP validation 均为 `active`。
- 线上验证：
  - `https://cmti.uk/?verify=companion-88946ad` 返回 `HTTP 200`，不再跳转到 `cmimap.com`。
  - 页面 HTML 引用 v3 当前构建入口资源 `/assets/index-BHR7oLpB.js`。
  - `/assets/index-BHR7oLpB.js` 返回 `HTTP 200`。
  - `https://stickers.cmti.uk/` 返回 `HTTP 200`，未被本轮修改影响。

### 2026-06-08 10:37:19 +07 社区统一入口原型图主视觉回退

- 本轮实现：
  - `/community` 入口不再用 CSS 重画游戏机屏幕、按钮、摇杆和像素文字，改为以 `cmi-community-arcade-prototype.png` 原型图作为主视觉。
  - 动效策略改为整机亮度跳帧、CRT 扫描线、灯管呼吸，以及点击时截取原图对应区域做局部帧式高亮，避免出现外来覆盖层虚影。
  - 保留 CMI MAP / CMI SWAP 跳转，CMI MAP 修正为 `https://cmimap.com`，CMI SWAP 为 `https://cmiswap.com`。
  - “一键订房”和“相关合作”保留页面风格弹窗，均展示林可微信二维码；绿色按钮文案修正为“一键订房”。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec vite build --config vite.config.prod.ts && node scripts/check-pwa-precache.mjs` 通过。
  - 已部署 Cloudflare Pages：`https://61e4fadb.cmi-map-v3.pages.dev/community`。
  - Playwright 线上验证：原型图加载成功，CSS 重绘层均为 `display: none`，CMI MAP / CMI SWAP 外链正确，订房和合作弹窗二维码加载成功。

### 2026-06-09 神奇动物在哪里活动主页首版

- 本轮实现：
  - `神奇动物在哪里` 活动详情页改为专用活动主页布局。
  - 顶部使用用户指定主 KV：`public/cmi-home/event-posters/cmi-wild-chiang-mai-2026-06.png`。
  - 页面顺序收束为：活动标题 / KV / 活动介绍入口 / 排行榜 / 大家捕获的神奇动物。
  - 排行榜只基于现有活动关联返图按用户图片数计算，不新增奖励、成就或独立主题系统。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器检查 `http://localhost:5173/events/cmi-wild-chiang-mai-2026-06`：标题、KV、活动介绍入口、排行榜、捕获列表均显示。

### 2026-06-09 神奇动物在哪里活动主页长图视觉调整

- 本轮实现：
  - 按用户给出的长图活动页参考和 Image Generate 出图方向，活动主页从白卡片 App UI 改为活动长图式落地页。
  - 顶部改为奶油底、大黑字、清迈 KV 大面积插画背景、绿色标语条和红色活动介绍入口。
  - 排行榜和捕获列表改为蓝色活动段落中的纸片式模块。
  - 保留原有功能边界：不新增奖励、成就、玩法、额外按钮或独立主题系统。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器截图检查 `http://localhost:5173/events/cmi-wild-chiang-mai-2026-06` 通过。

### 2026-06-09 神奇动物在哪里活动主页批注修正

- 本轮实现：
  - 移除页面额外绘制的大标题，直接使用 KV 图片里的标题。
  - 顶部 KV 改为完整宽度展示，避免标题被横向裁切。
  - 排行榜和捕获区继续向概念图靠拢，改为绿色活动段、撕纸面板和纸条占位。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm build` 通过，PWA precache 检查通过。
  - 本地浏览器截图检查：页面无额外 `h1` 标题节点，保留 `活动介绍` 与 `打卡` 两个入口。

### 2026-06-09 神奇动物在哪里绿色 KV 与 UI 精修

- 本轮实现：
  - 顶部活动主视觉替换为用户指定的绿色版主 KV。
  - 排行榜、捕获列表和底部 CTA 保留扁平海报风格，增加撕纸边、胶带、阴影和统一的绿色 / 奶油 / 黄色 / 粉色层次。
  - 仍只保留 `活动介绍` 与 `打卡` 两个入口，不新增玩法、奖励或额外按钮。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm build` 通过。
  - 本地浏览器截图检查：主图尺寸为 `1086x1448`，已使用绿色版 KV。

### 2026-06-09 神奇动物在哪里顶部过渡修正

- 本轮实现：
  - 去掉 KV 与排行榜之间的奶油色留白撕纸层。
  - 绿色活动段直接贴住主 KV 底部，用深绿色不规则压边做自然过渡。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm build` 通过。
  - 本地浏览器截图检查：KV 与绿色活动段顶部重叠 1px，未再出现奶油色横向空隙。

### 2026-06-10 神奇动物在哪里活动说明页

- 本轮实现：
  - 新增 `/events/cmi-wild-chiang-mai-2026-06/about` 活动说明页。
  - 说明页使用活动主页同一套绿色、奶油色、黄色、粉色海报视觉。
  - 文案收束为玩法、神奇动物定义、排行榜、分享和小提醒，不新增奖励、成就或额外玩法。
  - 活动主页 `活动介绍` 入口已接到说明页。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm build` 通过。
  - 本地开发服务 `http://127.0.0.1:5173/` 启动成功。
  - Playwright CLI 截图检查 `/events/cmi-wild-chiang-mai-2026-06/about`：首屏、完整高视口说明内容均正常显示。
  - 源码检查：活动主页 `活动介绍` 入口调用 `getCmiEventAboutPath(event.id)`，路由 `/events/:eventId/about` 已注册到说明页。

### 2026-06-10 神奇动物在哪里活动说明长图版

- 本轮实现：
  - 用 Image Generate 生成活动说明长图，背景、插画和说明文字在同一张图片内完成。
  - 说明长图保存为 `public/cmi-home/event-guides/cmi-wild-chiang-mai-2026-06-guide.png`。
  - `/events/cmi-wild-chiang-mai-2026-06/about` 改为只展示说明长图，不再使用原生 HTML 文字模块。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm build` 通过。
  - 本地 `http://127.0.0.1:5187/cmi-home/event-guides/cmi-wild-chiang-mai-2026-06-guide.png` 返回 `HTTP 200`。
  - Playwright CLI 截图检查 `/events/cmi-wild-chiang-mai-2026-06/about`：页面仅显示生成长图，无额外说明模块。

### 2026-06-10 神奇动物在哪里活动说明长图优化

- 本轮实现：
  - 按用户反馈重新生成活动说明长图，减少随机白色碎片、白色高光和白色边缘残留。
  - 将说明图放大替换为 `1728x3642` 版本，提升手机端显示清晰度。
- 验证结果：
  - `pnpm lint` 通过。
  - `pnpm build` 通过。
  - 本地图片资源返回 `HTTP 200`。
  - Playwright CLI 截图检查 `/events/cmi-wild-chiang-mai-2026-06/about`：首屏已显示优化后的长图。

### 2026-06-09 社区统一入口明亮玩具界面改版

- 本轮实现：
  - `/community` 从黑色霓虹街机视觉改为明亮黄色、规整的竖版移动端入口界面。
  - 首屏使用真实 DOM 布局，不再依赖街机原型图底图和绝对定位热区。
  - 近期活动屏幕直接读取 CMI Map 活动数据，展示真实活动信息和真实海报，点击进入对应活动详情页。
  - 保留 CMI MAP / CMI SWAP 外链、发起活动入口、一键订房弹窗和相关合作弹窗。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec vite build --config vite.config.prod.ts && node scripts/check-pwa-precache.mjs` 通过。
  - 本地浏览器检查 `/community`：移动端首屏无白边，活动海报加载，按钮排列规整；矮屏可滚动到底部按钮；订房弹窗二维码正常。

### 2026-06-09 社区入口显示屏箭头按钮放大

- 背景：用户指出显示屏左右箭头太小，桌面宽屏下几乎看不见。
- 本轮实现：
  - 将原本透明的小箭头热区改为可见的大号圆形切换按钮。
  - 按钮使用浅色圆底、黑色描边、粗箭头和实体阴影，提高可见性和点击面积。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/CmiCommunityEntrance.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec vite build --config vite.config.prod.ts && node scripts/check-pwa-precache.mjs` 通过。
  - 线上预览 `https://aa5ed505.cmi-map-v3.pages.dev/community` 验证：桌面 1440×844 视口下左右箭头约 52×52px，点击右箭头可从第一屏切换到 `02/05`。

### 2026-06-09 社区入口手机轮播交互修复

- 背景：用户反馈手机上点击箭头和滑动屏幕都无法切换展示，并希望加入轮播功能。
- 本轮实现：
  - 将左右箭头从屏幕边缘挪到显示屏内侧，并扩大为约 53×54px 的触控按钮。
  - 显示屏热区扩大到整块屏幕，补充 `touch` 事件处理，手机横向滑动可切换活动。
  - 加入 5 秒自动轮播；用户手动切换后会重新计时。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/CmiCommunityEntrance.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - 本地浏览器 390×844 手机视口验证：点击右箭头从 `01/05` 到 `02/05`，横向左滑从 `02/05` 到 `03/05`，等待 5 秒后自动从 `01/05` 到 `02/05`。
  - `pnpm exec vite build --config vite.config.prod.ts && node scripts/check-pwa-precache.mjs` 通过。

### 2026-06-09 社区入口轮播箭头视觉轻量化

- 背景：用户指出手机轮播箭头按钮过大、违和，遮挡显示屏内容。
- 本轮实现：
  - 保留手机可点击热区，将可见按钮缩成轻量半透明侧边箭头。
  - 去掉大圆盘、金色外圈和厚阴影，减少对活动标题和海报的遮挡。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/CmiCommunityEntrance.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - 本地浏览器 390×844 手机视口验证：箭头触控区约 45×49px，点击右箭头可切到 `02/05`，横向左滑可切到 `03/05`。
  - `pnpm exec vite build --config vite.config.prod.ts && node scripts/check-pwa-precache.mjs` 通过。

### 2026-06-09 社区入口使用底图原生箭头

- 背景：用户指出参考图里已经有左右箭头，不需要额外叠加圆形箭头按钮。
- 本轮实现：
  - `01/05` 默认态不再绘制任何额外箭头视觉，只保留透明点击热区覆盖底图原生箭头。
  - 将点击热区位置对齐到底图原生箭头中心，避免视觉和可点区域错位。
  - `02/05` 及之后的动态内容层会盖住底图，因此只补一个同款纯黑小箭头，不加圆底、不加阴影。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/CmiCommunityEntrance.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - 本地浏览器 390×844 手机视口验证：`01/05` 无额外按钮视觉，点击底图箭头可切到 `02/05`，横向左滑可切到 `03/05`。
  - `pnpm exec vite build --config vite.config.prod.ts && node scripts/check-pwa-precache.mjs` 通过。

### 2026-06-09 社区入口动态箭头形状调整

- 背景：用户指出动态活动页上的补充箭头形状不好看。
- 本轮实现：
  - 将动态页补充箭头从 CSS 边框折角改为圆角 SVG 笔画箭头。
  - 保持默认 `01/05` 仍只使用底图原生箭头，不叠加额外视觉。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/CmiCommunityEntrance.test.ts` 通过。
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - 本地浏览器 390×844 手机视口验证：动态页箭头为圆角单线样式，点击右箭头可切到 `03/05`，横向左滑可切到 `04/05`。
  - `pnpm exec vite build --config vite.config.prod.ts && node scripts/check-pwa-precache.mjs` 通过。

### 2026-06-10 神奇动物识别中文展示与专业模型入口

- 背景：用户反馈识别结果直接显示 `Canis lupus familiaris` 这类拉丁名，体验像英文代码；同时要求后续尽量不要依赖付费大语言模型 API。
- 本轮实现：
  - 动物识别主展示改为中文名：家犬、家猫、大壁虎、鸟类、鱼类等；发布文案不再把拉丁学名作为主句。
  - 分享卡标题和识别行改为中文名，不再写入英文原始标签。
  - 后端新增自托管专业物种模型入口 `CMI_MAP_SPECIES_MODEL_URL` / `CMI_MAP_SPECIES_MODEL_TOKEN`，优先于 Gemini / Meta Vision；返回结果仍通过 GBIF 校验后才进入前端。
  - 补充清迈常见动物中文名映射，用于专业模型只返回拉丁学名时的中文展示。
- 验证结果：
  - `node --test functions/api/animal-identify.test.ts src/services/animal-identification.test.ts src/lib/cmi-wild-animal-share-card.test.ts src/pages/MarkPlace.test.ts` 通过，26 项测试通过。
  - `pnpm exec tsgo -p tsconfig.check.json` 通过。
  - `pnpm exec vite build --config vite.config.prod.ts && node scripts/check-pwa-precache.mjs` 通过。
  - 已部署到 Cloudflare Pages production：`https://3690a2de.cmi-map.pages.dev`，正式域名 `https://cmimap.com` 已同步。
  - 线上接口验证：用户提供的整张 App 截图返回 `no-match`，不再误报成鸟；裁剪后的照片区域返回 `家犬 / Canis lupus familiaris`，接口内部耗时约 0.9-1.2 秒。
  - 线上 `/mark?event=cmi-wild-chiang-mai-2026-06` 浏览器检查：页面可见 `动物识别已开启`；测试环境未授予相机权限，控制台仅有相机权限拒绝警告。

### 2026-06-11 cmimap.com 白屏修复

- 背景：用户反馈 `cmimap.com` 在手机 Safari 只显示白屏。
- 排查结果：
  - 线上 HTML 和入口 JS 都能正常返回，但浏览器控制台报错 `supabaseUrl is required`。
  - 根因是上次使用干净临时目录构建部署时没有带入 `.env`，导致前端 Supabase URL / publishable key 被编译为空值。
- 本轮实现：
  - 在生产构建配置中加入环境变量防呆：缺少 `VITE_SUPABASE_URL` 或 `VITE_SUPABASE_ANON_KEY` 时直接中断构建，不再产出白屏包。
- 验证结果：
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过。
  - 本地生产预览 `http://127.0.0.1:4173/` 手机视口验证：根节点有内容，首屏显示地图入口和底部导航，控制台不再出现 Supabase URL 错误。

### 2026-06-13 神奇动物图鉴与贴纸化裁切

- 背景：用户希望把“神奇动物在哪里”的拍照记录沉淀到个人主页图鉴，并参考 Jungle Animals 贴纸风格，把识别到的动物自动裁成贴纸逐张收藏。
- 本轮实现：
  - Gemini 物种识别结果新增 `subjectBox` 和 `subjectPolygon`，用于返回主体框和粗轮廓点。
  - 前端用 canvas 将原照片按主体区域生成透明底、白边、阴影的贴纸文件，并在发布页显示“已剪成贴纸”预览。
  - 发布神奇动物记录时上传贴纸文件，并把贴纸 URL、中文名、学名和主体框写入推荐记录；如果表字段未同步，会把贴纸元数据写进正文兜底。
  - 个人主页和公开个人主页新增神奇动物图鉴 tab，贴纸以网格展示，点开后可全屏逐张翻看。
  - Supabase migration 新增 `animal_sticker_url`、`animal_common_name`、`animal_scientific_name`、`animal_subject_box` 字段。
- 验证结果：
  - `node --test functions/api/animal-identify.test.ts src/services/animal-identification.test.ts src/pages/MarkPlace.test.ts src/features/profiles/public-profile-page.test.ts src/pages/Profile.test.ts src/pages/PersonMap.test.ts` 通过，36 项测试通过。
  - `npm run lint` 通过，包含 TypeScript 检查、Biome、Tailwind 语法检查和 Vite build。
  - 本地浏览器 `http://localhost:5173/people/local-qa-user` 验证：公开主页显示 `TA 的图鉴`，点击后进入空图鉴状态，分类筛选隐藏；390×844 手机视口无溢出。

### 2026-06-14 神奇生物图鉴入口命名修正

- 背景：用户反馈个人主页没有看到“神奇生物图鉴”；排查发现正式站尚未加载 6 月 13 日图鉴代码，且本地入口仍写作“神奇动物图鉴”/“TA 的图鉴”，识别度不够。
- 本轮实现：
  - 个人主页 tab 统一改为“神奇生物图鉴”。
  - 公开个人主页 tab 改为“TA 的神奇生物图鉴”，空状态改为“神奇生物贴纸”。
  - 图鉴默认空状态和未命名贴纸默认名同步为“神奇生物”。
- 验证结果：
  - `node --test --experimental-strip-types src/pages/Profile.test.ts src/features/profiles/public-profile-page.test.ts src/pages/PersonMap.test.ts src/lib/cmi-wild-animal-stickers.test.ts` 通过，6 项测试通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过。

### 2026-06-14 神奇生物图鉴贴画底图重做

- 背景：用户明确不希望把主 KV 原图虚化当背景，而是要按主 KV 的轻漫、清迈、热带动物风格重新生成一张四周有元素、中间留白的贴画底图，用来凸显自动抠出的神奇生物贴纸。
- 本轮实现：
  - 新增图鉴专用留白画板 `wild-sticker-album-board-v1.webp`：四周保留卡通植物、寺庙、山、蝴蝶、壁虎等元素，中间保持干净留白，不加占位虚线。
  - 图鉴页不再引用活动主 KV 原图，只使用新生成的图鉴底图。
  - 收紧贴纸排列：缩小横纵间距、压低网格行高，并放大贴纸槽位，让已收集动物更像贴画册而不是稀疏卡片。
  - 旧照片现场生成精细贴纸期间先显示白边照片贴纸框，并以每批 3 张的小并发生成，生成失败也不再露出虚线占位圈。
- 验证结果：
  - `node --test --experimental-strip-types src/components/AnimalStickerAlbum.test.ts src/lib/cmi-wild-animal-stickers.test.ts src/pages/Profile.test.ts src/pages/PersonMap.test.ts src/features/profiles/public-profile-page.test.ts` 通过，9 项测试通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/components/AnimalStickerAlbum.tsx src/components/AnimalStickerAlbum.test.ts` 通过。
  - `pnpm build` 通过。
  - 本地浏览器验证公开个人主页：桌面和 390×844 手机视口均可看到新留白底图，6 个已识别动物贴纸集中展示在画板中。

### 2026-06-14 神奇生物图鉴底图比例修正

- 背景：用户反馈图鉴底图被显示成奇怪的宽方形，没有完整展示生成好的竖版图鉴背景。
- 本轮实现：
  - 图鉴画板外层改为 `941/1672` 原图比例，不再由贴纸网格内容撑高。
  - 底图从 `background-size: cover` 裁切层改为完整图片层，按原比例铺满整张画板。
  - 贴纸层改为覆盖在完整竖版画板上的 30 行定位网格，避免底图被宽容器裁掉。
- 验证结果：
  - `node --test --experimental-strip-types src/components/AnimalStickerAlbum.test.ts src/lib/cmi-wild-animal-stickers.test.ts src/pages/Profile.test.ts src/pages/PersonMap.test.ts src/features/profiles/public-profile-page.test.ts` 通过，9 项测试通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm exec biome lint src/components/AnimalStickerAlbum.tsx src/components/AnimalStickerAlbum.test.ts` 通过。
  - `pnpm build` 通过。
  - 本地浏览器验证：手机宽度和 1024px 宽视口下图鉴画板比例均为 `0.563`，匹配原图 `941/1672`，底图完整显示且不再使用 `cover` 裁切。

### 2026-06-16 神奇生物打卡保存失败修复

- 背景：用户反馈最近两条神奇生物打卡都提示“这条痕迹没有留下来，请再试一次”。
- 排查结果：
  - 前端拍照、定位和生物识别已完成，失败发生在最终写入 `recommendations`。
  - 线上 Supabase 缺少 `animal_sticker_url` 等贴纸字段，以及 `linked_event_capture_number` 活动编号字段；对应本地迁移未同步到线上。
  - 前端旧库兼容重试逻辑漏判 `animalSticker` 字段变化，导致字段缺失时没有进入元数据兜底重试。
- 本轮实现：
  - 线上补执行 `20260609055200_cmi_event_capture_numbers` 和 `20260613090000_add_wild_animal_stickers` 两段既有迁移，并修复迁移历史。
  - 修正 `createRecommendation` 的兼容重试判断，动物贴纸字段缺失时也能进入兜底逻辑。
  - 新增 `src/db/api.test.ts` 锁住动物贴纸字段兼容逻辑。
- 验证结果：
  - 线上 REST 只读验证已能读取 `animal_sticker_url`、`animal_common_name`、`animal_scientific_name`、`animal_subject_box`、`linked_event_capture_number`。
  - `node --test --experimental-strip-types src/db/api.test.ts src/db/cmi-event-capture-numbers.test.ts src/services/animal-identification.test.ts src/lib/cmi-wild-animal-stickers.test.ts` 通过，15 项测试通过。
  - `pnpm exec tsgo -p tsconfig.check.json --pretty false` 通过。
  - `pnpm build` 通过。
  - 旧的 `src/pages/MarkPlace.test.ts` 里有两个源码断言仍失败，原因是测试仍禁止当前已上线的贴纸预览/贴纸生成代码，不属于本轮保存失败修复。
