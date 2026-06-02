-- CMI / 清迈客栈活动状态同步 + 正念一小时颂钵公益发布审计
-- 执行时间：2026-06-02T16:39:04+07:00。
-- 来源素材：
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/推文.md
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/小红书正文.txt
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/发布页.html
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/海报.jpg
-- 本轮同步包含：
-- - 归档已结束的 CMI / 清迈客栈已发布活动
-- - 刷新到达 next_check_before 的仍可参加活动
-- - upsert 本次新增活动

update public.cmi_events
set
  visibility_status = 'archived',
  registration_status = 'closed',
  last_checked_at = '2026-06-02T16:39:04+07:00',
  next_check_before = null,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-06-02T16:39:04+07:00'::timestamptz;

update public.cmi_events
set
  last_checked_at = '2026-06-02T16:39:04+07:00',
  next_check_before = case
    when start_at <= '2026-06-02T18:39:04+07:00'::timestamptz then start_at
    when start_at <= '2026-06-04T16:39:04+07:00'::timestamptz then start_at - interval '2 hours'
    when start_at is not null then '2026-06-04T16:39:04+07:00'::timestamptz
    else null
  end,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-06-02T16:39:04+07:00'::timestamptz)
  and next_check_before is not null
  and next_check_before <= '2026-06-02T16:39:04+07:00'::timestamptz;

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
  'cmi-mindfulness-hour-singing-bowl-2026-06-04',
  '正念一小时｜颂钵公益：让心慢慢来',
  'meditation',
  '2026-06-04T19:00:00+07:00',
  '2026-06-04T20:30:00+07:00',
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
  array['正念练习', '颂钵体验', '想慢下来', '社区分享'],
  true,
  true,
  'verified',
  'published',
  '2026-06-02T16:39:04+07:00',
  '2026-06-04T17:00:00+07:00',
  '信息来自 6.4 正念一小时推文、同目录发布页与官方海报；时间、地点、公益费用和活动内容明确。原始材料未单列报名链接或二维码，本轮按 CMI Map 内置报名系统发布。',
  array['CMI', '清迈客栈', '正念', '颂钵', '冥想', '公益', '免费'],
  '一场在清迈客栈举办的公益正念活动，通过静坐冥想、智慧引领、开放分享和颂钵体验，让心慢慢回到当下。',
  'CMI 社区',
  'events@cmimap.com',
  null,
  null,
  true,
  'open',
  'count-only',
  '/cmi-home/event-posters/cmi-mindfulness-hour-singing-bowl-2026-06-04.jpg',
  '🌿【正念一小时】颂钵公益

本期主题：【让心慢慢来】

赴一场颂钵静修之约，绵长钵音层层震荡，拂去心头杂念，荡开内心疲惫，让心，慢慢来。

活动内容：静坐冥想｜智慧引领｜开放分享｜颂钵体验。

活动信息：2026 年 6 月 4 日（周四）19:00-20:30（分享讨论 0.5h），地点清迈客栈，纯公益活动。可通过 CMI Map 一键报名；原始活动材料未单列报名链接或二维码。',
  '{
    "sourceFiles": [
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/推文.md",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/小红书正文.txt",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/发布页.html",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/公众号推文.html",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/海报.jpg",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/海报-小红书-无二维码.jpg"
    ],
    "sourceFileMtimes": {
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/推文.md": 1780392436,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/小红书正文.txt": 1780392442,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/发布页.html": 1780392442,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/公众号推文.html": 1780392442,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/海报.jpg": 1780392183,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.4 正念一小时/海报-小红书-无二维码.jpg": 1780392183
    },
    "posterUrl": "/cmi-home/event-posters/cmi-mindfulness-hour-singing-bowl-2026-06-04.jpg",
    "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-mindfulness-hour-singing-bowl-2026-06-04.jpg",
    "imageSource": "official_poster",
    "manualReviewNotes": [
      "原始活动材料未单列报名链接或二维码；本轮按 CMI Map 内置报名系统发布。"
    ]
  }'::jsonb
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
