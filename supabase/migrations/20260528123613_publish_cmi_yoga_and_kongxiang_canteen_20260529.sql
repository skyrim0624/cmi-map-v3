-- CMI / 清迈客栈活动状态同步 + 5.29 瑜伽与空想食堂发布审计
-- 执行时间：2026-05-28T12:36:13+07:00。
-- 来源素材：
-- - /Users/andreas/CMI/活动宣传内容/五月活动/5.29 沙溪瑜伽/清迈夏季养心-心经阴瑜伽-肩颈舒缓课.md
-- - /Users/andreas/CMI/活动宣传内容/五月活动/5.29 沙溪瑜伽/海报.png
-- - /Users/andreas/CMI/活动宣传内容/五月活动/5.29 空想食堂/5.29-空想食堂推文.md
-- - /Users/andreas/CMI/活动宣传内容/五月活动/5.29 空想食堂/二维码.png
-- - /Users/andreas/CMI/活动宣传内容/五月活动/5.29 空想食堂/无二维码.png
-- 本轮扫描新增 2 个 CMI / 清迈客栈活动候选，确认后发布。
-- 同步包含：
-- - 归档已结束的 CMI / 清迈客栈已发布活动
-- - 刷新到达 next_check_before 的仍可参加活动
-- - upsert 本次新增活动

update public.cmi_events
set
  visibility_status = 'archived',
  last_checked_at = '2026-05-28T12:36:13+07:00',
  next_check_before = null,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-05-28T12:36:13+07:00'::timestamptz;

update public.cmi_events
set
  last_checked_at = '2026-05-28T12:36:13+07:00',
  next_check_before = case
    when start_at <= '2026-05-28T14:36:13+07:00'::timestamptz then start_at
    when start_at <= '2026-05-30T12:36:13+07:00'::timestamptz then start_at - interval '2 hours'
    when start_at is not null then '2026-05-30T12:36:13+07:00'::timestamptz
    else null
  end,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-05-28T12:36:13+07:00'::timestamptz)
  and next_check_before is not null
  and next_check_before <= '2026-05-28T12:36:13+07:00'::timestamptz;

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
values
  (
    'cmi-summer-heart-yin-yoga-2026-05-29',
    '清迈夏季养心｜心经阴瑜伽 · 肩颈舒缓课',
    'wellness',
    '2026-05-29T17:00:00+07:00',
    '2026-05-29T18:30:00+07:00',
    null,
    null,
    '清迈客栈',
    'CMI / 清迈客栈',
    18.7919513784612,
    98.9946296215124,
    '场地费 350 THB',
    '原文未注明报名链接，活动前建议联系清迈客栈确认',
    'cmi',
    'CMI 活动宣传内容文件夹',
    'https://mp.weixin.qq.com/s/d_4szZTwBTPu1MoTRU3mmQ',
    '沙溪 Karen / Yoga in the Park Chiang Mai',
    '中文',
    array['肩颈紧张', '久坐人群', '睡眠不佳', '想放松身心'],
    true,
    true,
    'verified',
    'published',
    '2026-05-28T12:36:13+07:00',
    '2026-05-29T15:00:00+07:00',
    '信息来自 5.29 沙溪瑜伽推文 Markdown 与同目录官方海报；时间、地点、费用、导师信息和课程内容明确。原文未提供单独报名链接，已在参与方式中保留该限制。',
    array['CMI', '瑜伽', '身心灵', '肩颈舒缓', '收费活动'],
    '一节结合中医经络理论与阴瑜伽的肩颈舒缓课，适合久坐、肩颈紧张或最近睡眠偏浅的人。',
    'CMI 社区',
    'events@cmimap.com',
    null,
    null,
    false,
    'open',
    'count-only',
    'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-summer-heart-yin-yoga-2026-05-29.png',
    '这节经络理疗阴瑜伽结合中医经络理论与深度放松练习，重点照顾肩颈、上背、胸腔和呼吸。活动时间：5 月 29 日（周五）17:00-18:30；地点：清迈客栈；场地费：350 THB；原文未注明报名链接，活动前建议确认。',
    $${
      "sourceFiles": [
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 沙溪瑜伽/清迈夏季养心-心经阴瑜伽-肩颈舒缓课.md",
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 沙溪瑜伽/海报.png"
      ],
      "sourceFileMtimes": {
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 沙溪瑜伽/清迈夏季养心-心经阴瑜伽-肩颈舒缓课.md": 1779945439,
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 沙溪瑜伽/海报.png": 1779942253
      },
      "posterUrl": "https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-summer-heart-yin-yoga-2026-05-29.png",
      "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-summer-heart-yin-yoga-2026-05-29.jpg",
      "imageSource": "official_poster",
      "manualReviewNotes": [
        "原文和海报未单列报名链接或二维码；发布口径保留活动前建议确认。"
      ]
    }$$::jsonb
  ),
  (
    'cmi-kongxiang-canteen-2026-05-29',
    '空想食堂｜清迈客栈周五晚餐',
    'cmi',
    '2026-05-29T19:00:00+07:00',
    null,
    null,
    null,
    '清迈客栈',
    'CMI / 清迈客栈',
    18.7919513784612,
    98.9946296215124,
    '免费参与，请带一道菜来分享',
    '无需报名，直接空降即可',
    'cmi',
    'CMI 活动宣传内容文件夹',
    null,
    'CMI 社区',
    '中文',
    array['社区晚餐', '包饺子', '轻社交', '周五晚上'],
    true,
    true,
    'verified',
    'published',
    '2026-05-28T12:36:13+07:00',
    '2026-05-29T17:00:00+07:00',
    '信息来自 5.29 空想食堂推文 Markdown 与同目录海报；时间、地点、费用和直接空降参与方式均明确。',
    array['CMI', '空想食堂', '周五', '社区活动', '晚餐'],
    '5 月最后一个周五的清迈客栈空想食堂，大家带一道菜来一起吃饭、聊天，用饺子送走 5 月。',
    'CMI 社区',
    'events@cmimap.com',
    null,
    null,
    false,
    'open',
    'count-only',
    'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-kongxiang-canteen-2026-05-29.png',
    '5 月最后一个周五的清迈客栈空想食堂，活动时间：5 月 29 日（周五）19:00；地点：清迈客栈；费用：免费参与，请带一道菜来分享；参与方式：无需报名，直接空降即可。',
    $${
      "sourceFiles": [
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 空想食堂/5.29-空想食堂推文.md",
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 空想食堂/二维码.png",
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 空想食堂/无二维码.png"
      ],
      "sourceFileMtimes": {
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 空想食堂/5.29-空想食堂推文.md": 1779946258,
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 空想食堂/二维码.png": 1779945693,
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.29 空想食堂/无二维码.png": 1779945717
      },
      "posterUrl": "https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-kongxiang-canteen-2026-05-29.png",
      "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-kongxiang-canteen-2026-05-29.jpg",
      "imageSource": "official_poster",
      "manualReviewNotes": []
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
