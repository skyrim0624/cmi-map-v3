-- CMI / 清迈客栈活动状态同步 + CMI Talk 父亲节特辑分享嘉宾招募发布审计
-- 执行时间：2026-05-26T17:11:56+07:00。
-- 来源素材：
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6月7日 CMI Talk父亲节特辑/公众号推文-可直接复制.md
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6月7日 CMI Talk父亲节特辑/公众号推文.html
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6月7日 CMI Talk父亲节特辑/活动海报.png
-- 注意：来源未单列收费项；本活动是分享嘉宾招募，费用字段按免费报名记录，并在 reliability_note 中保留复核说明。

update public.cmi_events
set
  visibility_status = 'archived',
  last_checked_at = '2026-05-26T17:11:56+07:00',
  next_check_before = null,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-05-26T17:11:56+07:00'::timestamptz;

update public.cmi_events
set
  last_checked_at = '2026-05-26T17:11:56+07:00',
  next_check_before = case
    when start_at <= '2026-05-26T19:11:56+07:00'::timestamptz then start_at
    when start_at <= '2026-05-28T17:11:56+07:00'::timestamptz then start_at - interval '2 hours'
    when start_at is not null then least(start_at - interval '2 hours', '2026-06-07T12:00:00+07:00'::timestamptz)
    else null
  end,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-05-26T17:11:56+07:00'::timestamptz)
  and next_check_before is not null
  and next_check_before <= '2026-05-26T17:11:56+07:00'::timestamptz;

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
  'cmi-talk-fathers-day-speaker-call-2026-06-07',
  'CMI Talk 父亲节特辑｜分享嘉宾招募',
  'cmi',
  '2026-06-07T16:30:00+07:00',
  '2026-06-07T18:30:00+07:00',
  null,
  null,
  '清迈客栈',
  'CMI / 清迈客栈',
  18.7919513784612,
  98.9946296215124,
  '免费报名',
  'CMI Map 一键报名；海报二维码为腾讯问卷',
  'cmi',
  'CMI 活动宣传内容文件夹',
  'https://mp.weixin.qq.com/s/W_3OLja85TkTw0E1eP1qgw',
  'CMI Talk',
  '中文',
  array['在清迈生活的爸爸', '亲子陪伴', '真实故事分享', 'CMI Talk 嘉宾'],
  true,
  true,
  'verified',
  'published',
  '2026-05-26T17:11:56+07:00',
  '2026-06-07T12:00:00+07:00',
  '信息来自 6 月 7 日 CMI Talk 父亲节特辑公众号推文 Markdown、离线 HTML 与同目录官方海报；时间、地点和报名方式明确。来源未单列收费项，本次按分享嘉宾招募记录为免费报名，并保留腾讯问卷链接供复核。',
  array['CMI', 'CMI Talk', '父亲节', '亲子', '嘉宾招募', '中文友好'],
  '父亲节前的 CMI Talk 分享嘉宾招募，邀请在清迈生活的爸爸聊真实的陪伴、成长和家庭选择。',
  'CMI Talk',
  'events@cmimap.com',
  null,
  null,
  true,
  'open',
  'count-only',
  '/cmi-home/event-posters/cmi-talk-fathers-day-speaker-call-2026-06-07.png',
  '这个父亲节，CMI Talk 想邀请几位在清迈生活的爸爸，聊聊真实的困惑、陪伴、成长和家庭选择。

不需要“完美父亲”的标准答案。我们更想听见那些愿意陪孩子玩、听孩子说话、和孩子一起成长的人生故事。

活动信息：6 月 7 日（周日）16:30-18:30，地点清迈客栈。想分享的爸爸们，欢迎通过 CMI Map 一键报名；也可扫描海报二维码或填写腾讯问卷：https://wj.qq.com/s2/23583596/8e2a/',
  '{
    "sourceFiles": [
      "/Users/andreas/CMI/活动宣传内容/六月活动/6月7日 CMI Talk父亲节特辑/公众号推文-可直接复制.md",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6月7日 CMI Talk父亲节特辑/公众号推文.html",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6月7日 CMI Talk父亲节特辑/活动海报.png"
    ],
    "sourceFileMtimes": {
      "/Users/andreas/CMI/活动宣传内容/六月活动/6月7日 CMI Talk父亲节特辑/公众号推文-可直接复制.md": 1779786052,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6月7日 CMI Talk父亲节特辑/公众号推文.html": 1779786052,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6月7日 CMI Talk父亲节特辑/活动海报.png": 1779786019
    },
    "posterUrl": "/cmi-home/event-posters/cmi-talk-fathers-day-speaker-call-2026-06-07.png",
    "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-talk-fathers-day-speaker-call-2026-06-07.jpg",
    "imageSource": "official_poster",
    "externalRegistrationUrl": "https://wj.qq.com/s2/23583596/8e2a/",
    "publicationChannel": "cmi-event-publish-service-role",
    "manualReviewNotes": [
      "来源未单列收费项；按分享嘉宾招募免费报名记录，活动前仍需运营复核。"
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
