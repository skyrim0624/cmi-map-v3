update public.cmi_events
set
  visibility_status = 'archived',
  last_checked_at = '2026-05-24T19:07:13+07:00',
  next_check_before = null,
  updated_at = timezone('utc'::text, now())
where id = 'cmi-swap-market-2026-05-24'
  and is_cmi_related = true
  and coalesce(end_at, start_at) < '2026-05-24T19:07:13+07:00';

update public.cmi_events
set
  last_checked_at = '2026-05-24T19:07:13+07:00',
  next_check_before = '2026-05-24T21:00:00+07:00',
  updated_at = timezone('utc'::text, now())
where id = 'cmi-ai-open-mic-vol-04-2026-05-24'
  and visibility_status = 'published'
  and is_cmi_related = true
  and (end_at is null or end_at >= '2026-05-24T19:07:13+07:00')
  and next_check_before <= '2026-05-24T19:07:13+07:00';

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
  null,
  null,
  '免费参与，可随喜支持',
  '无需报名，直接空降即可；Luma 链接待补充',
  'cmi',
  'CMI 活动宣传内容文件夹',
  null,
  'Pink × CMI 社区',
  '中文',
  array['数字游民', '自由职业者', '长期旅居者', '想理清个人财务的人'],
  true,
  true,
  'verified',
  'published',
  '2026-05-24T19:07:13+07:00',
  '2026-05-29T12:00:00+07:00',
  '信息来自 5.29 穷姐姐财商分享大会推文 Markdown 与同目录海报；时间、地点、费用和直接参与方式明确，Luma 链接仍待补充但不影响空降参与。',
  array['CMI', '财商', '理财', '数字游民', '分享会', '免费'],
  '一场面向清迈旅居者和数字游民的财商分享，围绕理财工具、收入安全垫、风险识别和个人价值展开。',
  '{
    "sourceFiles": [
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 穷姐姐财商分享大会/公众号推文-可直接复制.md",
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 穷姐姐财商分享大会/海报-浅蓝米色拼贴版.png"
    ],
    "sourceFileMtimes": {
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 穷姐姐财商分享大会/公众号推文-可直接复制.md": 1779623545,
      "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 穷姐姐财商分享大会/海报-浅蓝米色拼贴版.png": 1779622037
    },
    "posterUrl": "/cmi-home/event-posters/cmi-financial-literacy-sharing-2026-05-29.png",
    "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-financial-literacy-sharing-2026-05-29.jpg",
    "manualReviewNotes": [
      "Luma 链接待补充；材料同时写明无需报名、直接空降即可。"
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
  raw_source_payload = excluded.raw_source_payload,
  updated_at = timezone('utc'::text, now());
