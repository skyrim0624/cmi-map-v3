-- CMI / 清迈客栈活动状态同步 + 6 月 21 日水果朋友活动发布审计
-- 执行时间：2026-06-17T23:23:55+07:00。
-- 本轮发布素材文件夹：
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.21 水果朋友大派对
-- 本轮同步包含：
-- - 归档已结束的 CMI / 清迈客栈已发布活动
-- - 刷新到达 next_check_before 的仍可参加活动
-- - upsert 6 月 21 日水果朋友活动，并固定 CLI 上传后的 Supabase Storage 海报 URL

update public.cmi_events
set
  visibility_status = 'archived',
  registration_status = 'closed',
  last_checked_at = '2026-06-17T23:23:55+07:00',
  next_check_before = null,
  raw_source_payload = coalesce(raw_source_payload, '{}'::jsonb) || jsonb_build_object(
    'archivedByAutomationAt', '2026-06-17T23:23:55+07:00',
    'archivedByAutomationReason', '本轮自动化要求归档已结束的 CMI / 清迈客栈活动。'
  ),
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-06-17T23:23:55+07:00'::timestamptz;

update public.cmi_events
set
  last_checked_at = '2026-06-17T23:23:55+07:00',
  next_check_before = case
    when start_at <= ('2026-06-17T23:23:55+07:00'::timestamptz + interval '2 hours') then start_at
    when start_at <= ('2026-06-17T23:23:55+07:00'::timestamptz + interval '48 hours') then start_at - interval '2 hours'
    when start_at is not null then '2026-06-17T23:23:55+07:00'::timestamptz + interval '48 hours'
    else null
  end,
  raw_source_payload = coalesce(raw_source_payload, '{}'::jsonb) || jsonb_build_object(
    'reviewRefreshedByAutomationAt', '2026-06-17T23:23:55+07:00'
  ),
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-06-17T23:23:55+07:00'::timestamptz)
  and next_check_before is not null
  and next_check_before <= '2026-06-17T23:23:55+07:00'::timestamptz;

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
  'cmi-fruit-friends-ai-3d-workshop-2026-06-21',
  '水果朋友大派对｜AI + 3D 青少年创新体验活动',
  'workshop',
  '2026-06-21T15:00:00+07:00',
  '2026-06-21T17:00:00+07:00',
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
  '乐凡老师 × CMI 社区',
  '中文',
  array['10-18 岁青少年', 'AI 视觉生成', 'AI 建模新手', '3D 打印体验', '亲子活动'],
  true,
  true,
  'verified',
  'published',
  '2026-06-17T23:23:55+07:00',
  '2026-06-21T13:00:00+07:00',
  '信息来自 6.21 水果朋友大派对推文、发布页与同目录官方海报；时间、地点、费用、时长、适合人群和名额均明确。原材料未提供报名链接，本轮按 CMI Map 内置报名系统发布。',
  array['CMI', '清迈客栈', 'AI', '3D打印', '青少年', '工作坊', '免费'],
  '面向 10-18 岁青少年的 AI + 3D 创造体验，在 2 小时内完成水果朋友角色的创意构思、AI 视觉生成与 3D 模型设计。',
  'CMI 社区',
  'events@cmimap.com',
  null,
  10,
  true,
  'open',
  'count-only',
  'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-fruit-friends-ai-3d-workshop-2026-06-21-1781713505138.png',
  $$如果你的孩子喜欢画画、玩游戏、做手工，这场 AI + 3D 创造之旅会带他们完整体验一次从创意构思到 3D 模型设计的创作挑战。

本周日 6 月 21 日下午 3 点，乐凡老师将在清迈客栈带队举办「水果朋友大派对｜AI + 3D 青少年创新体验活动」。

活动面向 10-18 岁青少年，通过生成式 AI、AI 建模和 3D 打印流程，让零基础学生在 2 小时内完成一次从创意构思、AI 视觉生成到 3D 模型设计的创作挑战，亲手打造属于自己的水果朋友角色。

活动亮点：零基础也能完成 AI 设计作品；亲手创造独一无二的水果朋友；体验未来设计师的创意工作流程；获得专属 AI 创作成果。

活动信息：2026 年 6 月 21 日（周日）15:00-17:00，地点清迈客栈，全程免费，限额 10 人。参与者需自带手机和电脑。通过 CMI Map 一键报名后，确认邮件会附上微信群、联系人二维码和到场指引。$$,
  jsonb_build_object(
    'sourceFiles', to_jsonb(array[
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.21 水果朋友大派对/公众号推文.html',
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.21 水果朋友大派对/发布页.html',
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.21 水果朋友大派对/小红书标题.txt',
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.21 水果朋友大派对/小红书正文.txt',
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.21 水果朋友大派对/推文.md',
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.21 水果朋友大派对/海报-小红书-无二维码.png'
    ]),
    'sourceFileMtimes', jsonb_build_object(
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.21 水果朋友大派对/公众号推文.html', 1781711360,
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.21 水果朋友大派对/发布页.html', 1781711360,
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.21 水果朋友大派对/小红书标题.txt', 1781711360,
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.21 水果朋友大派对/小红书正文.txt', 1781711360,
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.21 水果朋友大派对/推文.md', 1781711348,
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.21 水果朋友大派对/海报-小红书-无二维码.png', 1781711360
    ),
    'extractedFields', jsonb_build_object(
      'title', '水果朋友大派对｜AI + 3D 青少年创新体验活动',
      'startAt', '2026-06-21T15:00:00+07:00',
      'endAt', '2026-06-21T17:00:00+07:00',
      'venueName', '清迈客栈',
      'priceLabel', '免费参与',
      'registrationLabel', 'CMI Map 一键报名',
      'hostName', '乐凡老师 × CMI 社区',
      'language', '中文',
      'suitableFor', to_jsonb(array['10-18 岁青少年', 'AI 视觉生成', 'AI 建模新手', '3D 打印体验', '亲子活动']),
      'summary', '面向 10-18 岁青少年的 AI + 3D 创造体验，在 2 小时内完成水果朋友角色的创意构思、AI 视觉生成与 3D 模型设计。'
    ),
    'assetSource', 'official_poster',
    'posterUrl', '/cmi-home/event-posters/cmi-fruit-friends-ai-3d-workshop-2026-06-21.png',
    'cardBackgroundUrl', '/cmi-home/event-card-backgrounds/cmi-fruit-friends-ai-3d-workshop-2026-06-21.jpg',
    'storagePosterUrl', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-fruit-friends-ai-3d-workshop-2026-06-21-1781713505138.png',
    'syncRunAt', '2026-06-17T23:23:55+07:00',
    'publicScopePolicy', 'cmi_inn_and_cmi_community_only',
    'publishedVia', 'pnpm cmi:event:publish --admin-publish',
    'detailBodySource', 'official_markdown_or_wechat_manual'
  )
)
on conflict (id) do update
set
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
  raw_source_payload = coalesce(public.cmi_events.raw_source_payload, '{}'::jsonb) || excluded.raw_source_payload,
  updated_at = timezone('utc'::text, now());
