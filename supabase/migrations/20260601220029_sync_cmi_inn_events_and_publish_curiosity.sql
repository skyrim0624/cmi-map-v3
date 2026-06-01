-- CMI / 清迈客栈活动状态同步 + 古城与古寺活动发布审计
-- 执行时间：2026-06-01T22:00:29+07:00。
-- 来源素材：
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.3 好奇社活动：古城与古寺——清迈古城与佛寺文化/推文.md
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.3 好奇社活动：古城与古寺——清迈古城与佛寺文化/海报-公众号-有二维码.png
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.3 好奇社活动：古城与古寺——清迈古城与佛寺文化/无二维码.png
-- 本轮同步包含：
-- - 归档已结束的 CMI / 清迈客栈已发布活动
-- - 刷新到达 next_check_before 的仍可参加活动
-- - upsert 本次新增活动

update public.cmi_events
set
  visibility_status = 'archived',
  registration_status = 'closed',
  last_checked_at = '2026-06-01T22:00:29+07:00',
  next_check_before = null,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-06-01T22:00:29+07:00'::timestamptz;

update public.cmi_events
set
  last_checked_at = '2026-06-01T22:00:29+07:00',
  next_check_before = case
    when start_at <= '2026-06-02T00:00:29+07:00'::timestamptz then start_at
    when start_at <= '2026-06-03T22:00:29+07:00'::timestamptz then start_at - interval '2 hours'
    when start_at is not null then '2026-06-03T22:00:29+07:00'::timestamptz
    else null
  end,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-06-01T22:00:29+07:00'::timestamptz)
  and next_check_before is not null
  and next_check_before <= '2026-06-01T22:00:29+07:00'::timestamptz;

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
  'cmi-curiosity-old-city-temples-2026-06-03',
  '古城与古寺｜清迈古城与佛寺文化',
  'cmi',
  '2026-06-03T19:00:00+07:00',
  '2026-06-03T20:30:00+07:00',
  null,
  null,
  '清迈客栈',
  'CMI / 清迈客栈',
  18.7932,
  98.9874,
  '免费参与',
  'CMI Map 一键报名；海报二维码为报名入口，线上观看为腾讯会议',
  'cmi',
  'CMI 活动宣传内容文件夹',
  'https://meeting.tencent.com/dm/XamWIJ1MrYzG',
  '好奇社 × Paradornparp International House',
  '中文',
  array['清迈历史文化', '佛寺文化', '新来清迈', '人文分享'],
  true,
  true,
  'verified',
  'published',
  '2026-06-01T22:00:29+07:00',
  '2026-06-03T17:00:00+07:00',
  '信息来自 6.3 好奇社活动推文、同目录发布页和官方海报；时间、地点、费用、线上观看链接与扫码报名说明均明确，地点为清迈客栈活动空间。',
  array['CMI', '清迈客栈', '好奇社', '文化分享', '古城', '佛寺', '免费'],
  '一场在清迈客栈举办的清迈古城与佛寺文化分享，带大家从历史、信仰和寺庙建筑重新认识这座城市。',
  '好奇社 × Paradornparp International House',
  'events@cmimap.com',
  null,
  null,
  true,
  'open',
  'count-only',
  'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-curiosity-old-city-temples-2026-06-03.jpg',
  '6 月 3 日晚，清迈客栈邀请维果老师带大家走进清迈古城，理解兰纳王朝的历史脉络、佛寺建筑和日常信仰。

如果你刚到清迈，或者一直想知道古城、城墙和寺庙背后的故事，这场分享适合用一个晚上重新认识这座城市。

活动信息：2026 年 6 月 3 日（周三）19:00-20:30，地点清迈客栈（活动空间），免费参与。可通过 CMI Map 一键报名；海报二维码为报名入口，线上观看为腾讯会议：https://meeting.tencent.com/dm/XamWIJ1MrYzG，会议号 105-998-819。',
  '{
    "sourceFiles": [
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.3 好奇社活动：古城与古寺——清迈古城与佛寺文化/推文.md",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.3 好奇社活动：古城与古寺——清迈古城与佛寺文化/小红书正文.txt",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.3 好奇社活动：古城与古寺——清迈古城与佛寺文化/海报-公众号-有二维码.png",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.3 好奇社活动：古城与古寺——清迈古城与佛寺文化/无二维码.png"
    ],
    "sourceFileMtimes": {
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.3 好奇社活动：古城与古寺——清迈古城与佛寺文化/推文.md": 1780324838,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.3 好奇社活动：古城与古寺——清迈古城与佛寺文化/小红书正文.txt": 1780324848,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.3 好奇社活动：古城与古寺——清迈古城与佛寺文化/海报-公众号-有二维码.png": 1780323431,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.3 好奇社活动：古城与古寺——清迈古城与佛寺文化/无二维码.png": 1780325313
    },
    "posterUrl": "/cmi-home/event-posters/cmi-curiosity-old-city-temples-2026-06-03.jpg",
    "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-curiosity-old-city-temples-2026-06-03.jpg",
    "storagePosterUrl": "https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-curiosity-old-city-temples-2026-06-03.jpg",
    "imageSource": "official_poster",
    "onlineMeetingUrl": "https://meeting.tencent.com/dm/XamWIJ1MrYzG",
    "onlineMeetingId": "105-998-819",
    "manualReviewNotes": []
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
