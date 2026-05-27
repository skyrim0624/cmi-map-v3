-- CMI / 清迈客栈活动状态同步 + 天地玄黄放映夜发布审计
-- 执行时间：2026-05-27T16:10:28+07:00。
-- 来源素材：
-- - /Users/andreas/CMI/活动宣传内容/五月活动/5.27 天地玄黄观影（Magic lab）/活动推文.md
-- - /Users/andreas/CMI/活动宣传内容/五月活动/5.27 天地玄黄观影（Magic lab）/活动海报（无二维码版）.png
-- - /Users/andreas/CMI/活动宣传内容/五月活动/5.27 天地玄黄观影（Magic lab）/活动海报（有二维码）.png
-- 本轮扫描新增 1 个 CMI / 清迈客栈活动候选，确认后发布。
-- 同步包含：
-- - 归档已结束的 CMI / 清迈客栈已发布活动
-- - 刷新到达 next_check_before 的仍可参加活动
-- - upsert 本次新增活动

update public.cmi_events
set
  visibility_status = 'archived',
  last_checked_at = '2026-05-27T16:10:28+07:00',
  next_check_before = null,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-05-27T16:10:28+07:00'::timestamptz;

update public.cmi_events
set
  last_checked_at = '2026-05-27T16:10:28+07:00',
  next_check_before = case
    when start_at <= '2026-05-27T18:10:28+07:00'::timestamptz then start_at
    when start_at <= '2026-05-29T16:10:28+07:00'::timestamptz then start_at - interval '2 hours'
    when start_at is not null then '2026-05-29T16:10:28+07:00'::timestamptz
    else null
  end,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-05-27T16:10:28+07:00'::timestamptz)
  and next_check_before is not null
  and next_check_before <= '2026-05-27T16:10:28+07:00'::timestamptz;

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
  'cmi-tiandi-xuanhuang-baraka-2026-05-30',
  '《天地玄黄》Baraka 放映夜',
  'cmi',
  '2026-05-30T19:00:00+07:00',
  null,
  null,
  null,
  '清迈客栈',
  'CMI / 清迈客栈',
  18.7919513784612,
  98.9946296215124,
  '免费参与',
  '免费参与；扫码进群，或现场空降',
  'cmi',
  'CMI 活动宣传内容文件夹',
  null,
  'MagicLab × 清迈客栈',
  '中文',
  array['在清迈客栈观影', '电影兴趣', '周末社交', '观影放映', '对话友好'],
  true,
  true,
  'verified',
  'published',
  '2026-05-27T16:10:28+07:00',
  '2026-05-30T17:00:00+07:00',
  '信息来自 5.27 天地玄黄观影推文与官方海报；时间、地点、费用和参与方式明确，活动与清迈客栈明确关联。',
  array['CMI', '观影会', '电影', '周末', '清迈客栈'],
  '无对白纪录片《天地玄黄》放映夜，围绕沉默、自然和人的关系展开，适合周六晚上在清迈客栈放慢节奏。',
  'CMI 社区',
  'events@cmimap.com',
  null,
  null,
  true,
  'open',
  'public',
  '/cmi-home/event-posters/cmi-tiandi-xuanhuang-baraka-2026-05-30.png',
  '这周六晚上在清迈客栈放映《天地玄黄》这部无对白纪录片，让你用眼睛和节奏去看“世界是如何被记录”的方式。活动信息：5月30日（周六）19:00，地点清迈客栈，免费参与，扫码进群。',
  '{
    "sourceFiles": [
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.27 天地玄黄观影（Magic lab）/活动推文.md",
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.27 天地玄黄观影（Magic lab）/活动海报（有二维码）.png",
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.27 天地玄黄观影（Magic lab）/活动海报（无二维码版）.png"
    ],
    "sourceFileMtimes": {
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.27 天地玄黄观影（Magic lab）/活动推文.md": 1779872424,
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.27 天地玄黄观影（Magic lab）/活动海报（有二维码）.png": 1779872151,
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.27 天地玄黄观影（Magic lab）/活动海报（无二维码版）.png": 1779872263
    },
    "posterUrl": "/cmi-home/event-posters/cmi-tiandi-xuanhuang-baraka-2026-05-30.png",
    "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-tiandi-xuanhuang-baraka-2026-05-30.jpg",
    "imageSource": "official_poster",
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
