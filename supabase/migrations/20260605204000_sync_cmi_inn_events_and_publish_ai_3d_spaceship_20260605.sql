-- CMI / 清迈客栈活动状态同步 + AI + 3D 星际飞船设计工作坊发布审计
-- 执行时间：2026-06-05T20:40:13+07:00。
-- 来源素材：
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/推文.md
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/小红书正文.txt
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/发布页.html
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/公众号推文.html
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/海报无二维码.jpg
-- 本轮同步包含：
-- - 归档已结束的 CMI / 清迈客栈已发布活动
-- - 刷新到达 next_check_before 的仍可参加活动
-- - upsert 本次新增活动，并固定 CLI 上传后的 Supabase Storage 海报 URL

update public.cmi_events
set
  visibility_status = 'archived',
  registration_status = 'closed',
  last_checked_at = '2026-06-05T20:40:13+07:00',
  next_check_before = null,
  raw_source_payload = coalesce(raw_source_payload, '{}'::jsonb) || jsonb_build_object(
    'archivedByAutomationAt', '2026-06-05T20:40:13+07:00',
    'archivedByAutomationReason', '本轮自动化要求归档已结束的 CMI / 清迈客栈活动。'
  ),
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-06-05T20:40:13+07:00'::timestamptz;

update public.cmi_events
set
  last_checked_at = '2026-06-05T20:40:13+07:00',
  next_check_before = case
    when start_at <= '2026-06-05T22:40:13+07:00'::timestamptz then start_at
    when start_at <= '2026-06-07T20:40:13+07:00'::timestamptz then start_at - interval '2 hours'
    when start_at is not null then '2026-06-07T20:40:13+07:00'::timestamptz
    else null
  end,
  raw_source_payload = coalesce(raw_source_payload, '{}'::jsonb) || jsonb_build_object(
    'reviewRefreshedByAutomationAt', '2026-06-05T20:40:13+07:00'
  ),
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-06-05T20:40:13+07:00'::timestamptz)
  and next_check_before is not null
  and next_check_before <= '2026-06-05T20:40:13+07:00'::timestamptz;

insert into public.cmi_events (
  id,
  title,
  event_type,
  start_at,
  end_at,
  recurrence,
  stable_schedule,
  venue_name,
  area,
  latitude,
  longitude,
  price_label,
  registration_label,
  source_type,
  source_label,
  source_url,
  host_name,
  language,
  suitable_for,
  is_cmi_related,
  is_verified,
  verification_status,
  visibility_status,
  last_checked_at,
  next_check_before,
  reliability_note,
  tags,
  summary,
  organizer_name,
  organizer_email,
  contact_email,
  capacity,
  registration_enabled,
  registration_status,
  attendee_visibility,
  cover_image_url,
  detail_body,
  raw_source_payload
)
values (
  'cmi-ai-3d-spaceship-workshop-2026-06-07',
  'AI + 3D 青少年创意工坊：星际飞船设计工作坊',
  'workshop',
  '2026-06-07T15:00:00+07:00',
  '2026-06-07T17:00:00+07:00',
  null,
  null,
  '清迈客栈',
  'CMI / 清迈客栈',
  18.7932,
  98.9874,
  '免费参与',
  'CMI Map 一键报名',
  'cmi',
  'CMI 活动宣传内容文件夹',
  null,
  'CMI 社区',
  '中文',
  array['10-18 岁青少年', 'AI 建模新手', '3D 打印体验', '亲子活动'],
  true,
  true,
  'verified',
  'published',
  '2026-06-05T20:40:13+07:00',
  '2026-06-07T13:00:00+07:00',
  $$信息来自 6.7 AI+3D 星际飞船设计工作坊推文、同目录发布页与官方海报；时间、地点、参与方式和适合人群明确。用户补充确认费用免费，本轮通过 CMI Map CLI 管理员通道发布。$$,
  array['CMI', '清迈客栈', 'AI', '3D打印', '青少年', '工作坊', '免费'],
  '面向 10-18 岁青少年的 AI + 3D 创意工坊，用生成式 AI 与 AI 建模设计星际飞船。',
  'CMI 社区',
  'events@cmimap.com',
  null,
  10,
  true,
  'open',
  'count-only',
  'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-ai-3d-spaceship-workshop-2026-06-07-1780643940729.jpg',
  $$一颗到访地球的小行星，原来是一艘为和平而来的星际航母。

人类准备派出大使前往太空，与外星生物建立第一次外交联系。

问题来了：能载着大使往返太空的飞行器，应该长什么样？

本周日 15:00-17:00，我们会把这个问题交给孩子们：先用生成式 AI 打开想象，再用 AI 建模把飞行器一层层做出来，最后通过 VR 眼镜走进星际航母内部，体验一次沉浸式的星际外交之旅。

不需要基础，适合第一次接触 AI 建模和 3D 打印的孩子。

重点不是做一艘“标准答案”的飞船，而是把自己的想象变成看得见的作品。

活动亮点：零基础也能完成 AI 设计作品；亲手创造属于星际生物的飞行器；体验从创意到模型的完整设计流程；获得个人 AI 生成作品与 3D 模型文件；使用 VR 眼镜走进星际航母内部。

活动信息：2026 年 6 月 7 日（周日）15:00-17:00，地点清迈客栈 Chiangmai Inn Guesthouse。面向 10-18 岁青少年，新手小白友好，名额 10 人，小班教学。请自备手机、笔记本电脑，并提前用 Google 账号登录 Google Chrome 浏览器。费用免费；原始参与方式为活动报名接龙。通过 CMI Map 一键报名后，确认邮件会附上微信群、联系人二维码和到场指引。$$,
  $${
    "sourceFiles": [
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/推文.md",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/小红书正文.txt",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/小红书标题.txt",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/发布页.html",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/公众号推文.html",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/海报无二维码.jpg",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/海报有二维码.png"
    ],
    "sourceFileMtimes": {
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/推文.md": 1780639664,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/小红书正文.txt": 1780639681,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/小红书标题.txt": 1780639621,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/发布页.html": 1780639681,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/公众号推文.html": 1780639681,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/海报无二维码.jpg": 1780639603,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.7 AI+3D 星际飞船设计工作坊/海报有二维码.png": 1780639603
    },
    "posterUrl": "/cmi-home/event-posters/cmi-ai-3d-spaceship-workshop-2026-06-07.jpg",
    "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-ai-3d-spaceship-workshop-2026-06-07.jpg",
    "storagePosterUrl": "https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-ai-3d-spaceship-workshop-2026-06-07-1780643940729.jpg",
    "imageSource": "official_poster",
    "userConfirmedFields": {
      "priceLabel": "免费参与"
    }
  }$$::jsonb
)
on conflict (id) do update set
  title = excluded.title,
  event_type = excluded.event_type,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  recurrence = excluded.recurrence,
  stable_schedule = excluded.stable_schedule,
  venue_name = excluded.venue_name,
  area = excluded.area,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  price_label = excluded.price_label,
  registration_label = excluded.registration_label,
  source_type = excluded.source_type,
  source_label = excluded.source_label,
  source_url = excluded.source_url,
  host_name = excluded.host_name,
  language = excluded.language,
  suitable_for = excluded.suitable_for,
  is_cmi_related = excluded.is_cmi_related,
  is_verified = excluded.is_verified,
  verification_status = excluded.verification_status,
  visibility_status = excluded.visibility_status,
  last_checked_at = excluded.last_checked_at,
  next_check_before = excluded.next_check_before,
  reliability_note = excluded.reliability_note,
  tags = excluded.tags,
  summary = excluded.summary,
  organizer_name = excluded.organizer_name,
  organizer_email = excluded.organizer_email,
  contact_email = excluded.contact_email,
  capacity = excluded.capacity,
  registration_enabled = excluded.registration_enabled,
  registration_status = excluded.registration_status,
  attendee_visibility = excluded.attendee_visibility,
  cover_image_url = excluded.cover_image_url,
  detail_body = excluded.detail_body,
  raw_source_payload = excluded.raw_source_payload,
  updated_at = timezone('utc'::text, now());
