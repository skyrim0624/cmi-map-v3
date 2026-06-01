-- CMI / 清迈客栈活动状态同步 + 五分钟音乐会发布审计
-- 执行时间：2026-05-30T10:50:17+07:00。
-- 来源素材：
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/推文.md
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/小红书正文.txt
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/公众号推文.html
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/五分钟音乐会 radiohead kid a 最终海报.png
-- - /Users/andreas/CMI/活动宣传内容/五月活动/5.30 清迈周六夜行/海报-19点.png
-- 本轮扫描新增 1 个 CMI / 清迈客栈活动候选，确认后发布。
-- 同步包含：
-- - 归档已结束的 CMI / 清迈客栈已发布活动
-- - 刷新到达 next_check_before 的仍可参加活动
-- - 更新清迈周六夜行为最新 19:00 海报口径
-- - upsert 五分钟音乐会

update public.cmi_events
set
  visibility_status = 'archived',
  last_checked_at = '2026-05-30T10:50:17+07:00',
  next_check_before = null,
  registration_status = case
    when registration_status is not null then 'closed'
    else registration_status
  end,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-05-30T10:50:17+07:00'::timestamptz;

update public.cmi_events
set
  last_checked_at = '2026-05-30T10:50:17+07:00',
  next_check_before = case
    when start_at <= '2026-05-30T12:50:17+07:00'::timestamptz then start_at
    when start_at <= '2026-06-01T10:50:17+07:00'::timestamptz then start_at - interval '2 hours'
    when start_at is not null then '2026-06-01T10:50:17+07:00'::timestamptz
    else null
  end,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-05-30T10:50:17+07:00'::timestamptz)
  and next_check_before is not null
  and next_check_before <= '2026-05-30T10:50:17+07:00'::timestamptz;

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
    'cmi-doi-suthep-night-walk-2026-05-30',
    '清迈周六夜行｜一起走上素贴山',
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
    '19:00 清迈客栈统一出发；也可自行前往现场集合',
    'cmi',
    'CMI 活动宣传内容文件夹',
    null,
    'CMI 清迈客栈同行活动',
    '中文',
    array['清迈本地节庆', '夜行', '轻户外', '想体验素贴山传统的人'],
    true,
    true,
    'verified',
    'published',
    '2026-05-30T10:50:17+07:00',
    '2026-05-30T17:00:00+07:00',
    '信息来自 5.30 清迈周六夜行来源说明、推文与同目录最新 19 点海报；官方来源说明确认日期和路线，最新海报确认集合时间，CMI 仅组织清迈客栈同行集合，不是官方主办方。',
    array['CMI', '清迈客栈', '素贴山', '夜行', '卫塞节', '免费'],
    '5 月 30 日晚 19:00 从清迈客栈统一出发，和清迈人一起沿 Kruba Srivichai 纪念碑到素贴寺路线夜行。',
    'CMI 社区',
    'events@cmimap.com',
    null,
    null,
    true,
    'open',
    'public',
    '/cmi-home/event-posters/cmi-doi-suthep-night-walk-2026-05-30.png',
    '这是一场 CMI 清迈客栈同行活动，不是官方主办。5 月 30 日 19:00 从清迈客栈统一出发，也可自行前往现场集合；路线为 Kruba Srivichai 纪念碑到素贴寺。免费参与，建议穿好走的鞋，带水和雨具，并尊重卫塞节前夜宗教传统礼仪。',
    $${
      "sourceFiles": [
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.30 清迈周六夜行/来源说明.md",
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.30 清迈周六夜行/推文.md",
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.30 清迈周六夜行/海报-19点.png"
      ],
      "sourceFileMtimes": {
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.30 清迈周六夜行/来源说明.md": 1779959686,
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.30 清迈周六夜行/推文.md": 1779959686,
        "/Users/andreas/CMI/活动宣传内容/五月活动/5.30 清迈周六夜行/海报-19点.png": 1780066626
      },
      "posterUrl": "/cmi-home/event-posters/cmi-doi-suthep-night-walk-2026-05-30.png",
      "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-doi-suthep-night-walk-2026-05-30.jpg",
      "imageSource": "image_generator_source_poster",
      "manualReviewNotes": [
        "同目录较早推文和发布页仍写 17:00；本次按 2026-05-29 21:57 新增的海报-19点.png 更新发布口径。",
        "活动为 CMI 清迈客栈同行集合，不是官方主办方活动。"
      ]
    }$$::jsonb
  ),
  (
    'cmi-five-minute-music-kid-a-2026-06-02',
    '“五分钟”音乐会｜一起听 Radiohead 的《Kid A》',
    'music',
    '2026-06-02T19:00:00+07:00',
    null,
    null,
    null,
    '清迈客栈',
    'CMI / 清迈客栈',
    18.7919513784612,
    98.9946296215124,
    '免费参与',
    '添加微信 skyrim0216 报名',
    'cmi',
    'CMI 活动宣传内容文件夹',
    null,
    'CMI 社区',
    '中文',
    array['认真听音乐的人', 'Radiohead 听众', '想练习专注力', '音乐交流'],
    true,
    true,
    'verified',
    'published',
    '2026-05-30T10:50:17+07:00',
    '2026-06-02T17:00:00+07:00',
    '信息来自 6.2 五分钟音乐会推文 Markdown、小红书正文、公众号 HTML 与同目录最终海报；时间、地点、费用、报名微信和本期专辑均明确。',
    array['CMI', '音乐', 'Radiohead', '专辑共听', '免费', '中文友好'],
    '一场在清迈客栈围坐完整聆听 Radiohead《Kid A》的小型音乐会，边听边聊专辑背景、声音细节和经典作品为什么值得反复听。',
    'CMI 社区',
    'events@cmimap.com',
    null,
    null,
    false,
    'open',
    'count-only',
    '/cmi-home/event-posters/cmi-five-minute-music-kid-a-2026-06-02.png',
    '“五分钟”是一场很小的专辑共听活动：6 月 2 日周二晚 19:00，在清迈客栈一起完整聆听 Radiohead《Kid A》。免费参与，添加微信 skyrim0216 报名。',
    $${
      "sourceFiles": [
        "/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/推文.md",
        "/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/小红书正文.txt",
        "/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/公众号推文.html",
        "/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/五分钟音乐会 radiohead kid a 最终海报.png"
      ],
      "sourceFileMtimes": {
        "/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/推文.md": 1780075536,
        "/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/小红书正文.txt": 1780075537,
        "/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/公众号推文.html": 1780075537,
        "/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/五分钟音乐会 radiohead kid a 最终海报.png": 1780076627
      },
      "posterUrl": "/cmi-home/event-posters/cmi-five-minute-music-kid-a-2026-06-02.png",
      "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-five-minute-music-kid-a-2026-06-02.jpg",
      "imageSource": "official_or_organizer_poster",
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
