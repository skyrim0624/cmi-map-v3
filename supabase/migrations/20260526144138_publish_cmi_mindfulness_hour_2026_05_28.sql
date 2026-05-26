-- CMI / 清迈客栈活动状态同步 + 正念一小时发布审计
-- 执行时间：2026-05-26T14:42:45+07:00。
-- 来源素材：
-- - /Users/andreas/CMI/活动宣传内容/五月活动/5.28 正念一小时/推文.md
-- - /Users/andreas/CMI/活动宣传内容/五月活动/5.28 正念一小时/海报.png
-- 本迁移保持幂等：先归档已结束的 CMI / 清迈客栈活动，
-- 再刷新到达 next_check_before 的仍可参加活动，最后 upsert 本次新增活动。

update public.cmi_events
set
  visibility_status = 'archived',
  last_checked_at = '2026-05-26T14:42:45+07:00',
  next_check_before = null,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-05-26T14:42:45+07:00'::timestamptz;

update public.cmi_events
set
  last_checked_at = '2026-05-26T14:42:45+07:00',
  next_check_before = case
    when start_at <= '2026-05-26T16:42:45+07:00'::timestamptz then start_at
    when start_at <= '2026-05-28T14:42:45+07:00'::timestamptz then start_at - interval '2 hours'
    when start_at is not null then '2026-05-28T14:42:45+07:00'::timestamptz
    else null
  end,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-05-26T14:42:45+07:00'::timestamptz)
  and next_check_before is not null
  and next_check_before <= '2026-05-26T14:42:45+07:00'::timestamptz;

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
  'cmi-mindfulness-hour-2026-05-28',
  '正念一小时｜一切都是最好的安排',
  'meditation',
  '2026-05-28T19:00:00+07:00',
  '2026-05-28T20:30:00+07:00',
  null,
  null,
  '清迈客栈',
  'CMI / 清迈客栈',
  18.7919513784612,
  98.9946296215124,
  '免费参与',
  'CMI Map 一键报名',
  'cmi',
  'CMI 活动宣传内容文件夹',
  null,
  'CMI 社区',
  '中文',
  array['正念练习', '冥想', '面对变化', '社区分享'],
  true,
  true,
  'verified',
  'published',
  '2026-05-26T14:42:45+07:00',
  '2026-05-28T12:00:00+07:00',
  '信息来自 5.28 正念一小时推文 Markdown 与同目录官方海报；时间、地点、费用和活动内容明确，参与方式按 CMI Map 内置报名系统发布。',
  array['CMI', '正念', '冥想', '免费', '中文友好'],
  '周四晚在清迈客栈的一小时正念活动，围绕变化、焦虑和内在稳定感，通过静坐冥想、智慧引领与开放分享展开。',
  'CMI 社区',
  'events@cmimap.com',
  null,
  null,
  true,
  'open',
  'public',
  '/cmi-home/event-posters/cmi-mindfulness-hour-2026-05-28.png',
  '这周四的正念一小时，把主题放在“变化”与“稳定感”上。

为什么一变化，我们就会焦虑？无常来了，如何让心不慌？面对变化，如何找回内在的稳定感？

活动内容：静坐冥想、智慧引领、开放分享。

活动信息：5 月 28 日（周四）19:00-20:30，地点清迈客栈，免费参与，请通过 CMI Map 一键报名。',
  '{
    "sourceFiles": [
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.28 正念一小时/推文.md",
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.28 正念一小时/海报.png"
    ],
    "sourceFileMtimes": {
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.28 正念一小时/推文.md": 1779780553,
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.28 正念一小时/海报.png": 1779780383
    },
    "posterUrl": "/cmi-home/event-posters/cmi-mindfulness-hour-2026-05-28.png",
    "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-mindfulness-hour-2026-05-28.jpg",
    "imageSource": "official_poster",
    "publicationChannel": "cmi-event-publish-admin-agent",
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
