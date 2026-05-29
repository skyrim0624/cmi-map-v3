-- CMI / 清迈客栈活动状态同步 + 远程补写审计
-- 执行时间：2026-05-26T20:41:59+07:00。
-- 本轮素材扫描未发现新的活动文件夹；处理上一轮远程写入失败的 5.29 财商分享，
-- 并补齐 5.31 WaytoAGI 活动的远程 cover_image_url。

update public.cmi_events
set
  visibility_status = 'archived',
  last_checked_at = '2026-05-26T20:41:59+07:00',
  next_check_before = null,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-05-26T20:41:59+07:00'::timestamptz;

update public.cmi_events
set
  last_checked_at = '2026-05-26T20:41:59+07:00',
  next_check_before = case
    when start_at <= '2026-05-26T22:41:59+07:00'::timestamptz then start_at
    when start_at <= '2026-05-28T20:41:59+07:00'::timestamptz then start_at - interval '2 hours'
    when start_at is not null then '2026-05-28T20:41:59+07:00'::timestamptz
    else null
  end,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-05-26T20:41:59+07:00'::timestamptz)
  and next_check_before is not null
  and next_check_before <= '2026-05-26T20:41:59+07:00'::timestamptz;

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
  'cmi-financial-literacy-sharing-2026-05-29',
  '穷姐姐财商分享大会｜在清迈可以“摆烂”，但钱包不能真的烂',
  'cmi',
  '2026-05-29T19:00:00+07:00',
  null,
  null,
  null,
  '清迈客栈',
  'CMI / 清迈客栈',
  18.7919513784612,
  98.9946296215124,
  '免费参与，可随喜支持',
  'Luma 报名，也可直接空降',
  'cmi',
  'CMI 活动宣传内容文件夹',
  'https://luma.com/ahw83ofe',
  'Pink × CMI 社区',
  '中文',
  array['数字游民', '自由职业者', '长期旅居者', '想理清个人财务的人'],
  true,
  true,
  'verified',
  'published',
  '2026-05-26T20:41:59+07:00',
  '2026-05-29T12:00:00+07:00',
  '信息来自更新后的 5.29 穷姐姐财商分享大会推文 Markdown 与同目录海报；时间、地点、费用、Luma 报名链接和空降参与方式均明确。',
  array['CMI', '财商', '理财', '数字游民', '分享会', '免费'],
  '一场面向清迈旅居者和数字游民的财商分享，围绕理财工具、收入安全垫、风险识别和个人价值展开。',
  'CMI 社区',
  'events@cmimap.com',
  null,
  null,
  false,
  'closed',
  'count-only',
  '/cmi-home/event-posters/cmi-financial-literacy-sharing-2026-05-29.png',
  '这场分享会面向在清迈生活、远程工作、自由职业或长期旅居的人。

这次不卖课、不推产品，也不制造财务焦虑，只把真实踩过的坑、用过的工具和见过的套路放到桌面上聊清楚。

本次会聊：保险、基金、股票、银行理财、黄金等常见工具；收入不稳定时如何建立安全垫；宏观变化、通胀、汇率和普通人的钱包有什么关系；不上班之后如何重新理解技能、现金流和个人价值；以及常见骗局和理财陷阱。

活动信息：5 月 29 日（周五）19:00，空想食堂后；地点清迈客栈；免费参与，可随喜支持；Luma 报名，也可直接空降。',
  '{
    "sourceFiles": [
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 穷姐姐财商分享大会/公众号推文-可直接复制.md",
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 穷姐姐财商分享大会/海报-浅蓝米色拼贴版.png",
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 穷姐姐财商分享大会/海报有 二维码.png"
    ],
    "sourceFileMtimes": {
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 穷姐姐财商分享大会/公众号推文-可直接复制.md": 1779626665,
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 穷姐姐财商分享大会/海报-浅蓝米色拼贴版.png": 1779622037,
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 穷姐姐财商分享大会/海报有 二维码.png": 1779630811
    },
    "posterUrl": "/cmi-home/event-posters/cmi-financial-literacy-sharing-2026-05-29.png",
    "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-financial-literacy-sharing-2026-05-29.jpg",
    "registrationUrl": "https://luma.com/ahw83ofe",
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

update public.cmi_events
set
  cover_image_url = '/cmi-home/event-posters/cmi-waytoagi-codex-maker-lab-2026-05-31.png',
  raw_source_payload = coalesce(raw_source_payload, '{}'::jsonb) || '{
    "posterUrl": "/cmi-home/event-posters/cmi-waytoagi-codex-maker-lab-2026-05-31.png",
    "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-waytoagi-codex-maker-lab-2026-05-31.jpg",
    "imageSource": "official_poster"
  }'::jsonb,
  updated_at = timezone('utc'::text, now())
where id = 'cmi-waytoagi-codex-maker-lab-2026-05-31'
  and visibility_status = 'published';
