-- CMI / 清迈客栈活动状态同步 + 二手物品拍卖大会发布审计
-- 执行时间：2026-06-03T18:00:49+07:00。
-- 来源素材：
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/推文.md
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/小红书正文.txt
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/发布页.html
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/公众号推文.html
-- - /Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/海报无二维码.png
-- 本轮同步包含：
-- - 归档已结束的 CMI / 清迈客栈已发布活动
-- - 刷新到达 next_check_before 的仍可参加活动
-- - upsert 本次新增活动，并固定 CLI 上传后的 Supabase Storage 海报 URL

update public.cmi_events
set
  visibility_status = 'archived',
  registration_status = 'closed',
  last_checked_at = '2026-06-03T18:00:49+07:00',
  next_check_before = null,
  raw_source_payload = coalesce(raw_source_payload, '{}'::jsonb) || jsonb_build_object(
    'archivedByAutomationAt', '2026-06-03T18:00:49+07:00',
    'archivedByAutomationReason', '本轮自动化要求归档已结束的 CMI / 清迈客栈活动。'
  ),
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-06-03T18:00:49+07:00'::timestamptz;

update public.cmi_events
set
  last_checked_at = '2026-06-03T18:00:49+07:00',
  next_check_before = case
    when start_at <= '2026-06-03T20:00:49+07:00'::timestamptz then start_at
    when start_at <= '2026-06-05T18:00:49+07:00'::timestamptz then start_at - interval '2 hours'
    when start_at is not null then '2026-06-05T18:00:49+07:00'::timestamptz
    else null
  end,
  raw_source_payload = coalesce(raw_source_payload, '{}'::jsonb) || jsonb_build_object(
    'reviewRefreshedByAutomationAt', '2026-06-03T18:00:49+07:00'
  ),
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-06-03T18:00:49+07:00'::timestamptz)
  and next_check_before is not null
  and next_check_before <= '2026-06-03T18:00:49+07:00'::timestamptz;

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
  'cmi-secondhand-auction-2026-06-06',
  '清迈客栈 CMI 社区二手物品“拍卖”大会',
  'market',
  '2026-06-06T15:00:00+07:00',
  null,
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
  array['二手交换', '社区共建', '空想食堂', '轻社交'],
  true,
  true,
  'verified',
  'published',
  '2026-06-03T18:00:49+07:00',
  '2026-06-06T13:00:00+07:00',
  '信息来自 6.6 旧物拍卖会推文、同目录发布页与官方海报；时间、地点、费用和原始参与方式均明确。本轮通过 CMI Map CLI 管理员通道发布。',
  array['CMI', '清迈客栈', '二手物品', '拍卖', '旧物交换', '社区活动', '免费'],
  '二手物品也有义，二手物品也有情。',
  'CMI 社区',
  'events@cmimap.com',
  null,
  null,
  true,
  'open',
  'count-only',
  'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-secondhand-auction-2026-06-06-1780484670189.png',
  '二手物品也有义，二手物品也有情。

我们身边总有一些东西：买来之后用得不多，但又舍不得扔；放在角落很久，但换到另一个人手里，可能刚好重新派上用场。

这周六，CMI 第一届二手物品拍卖大会来了。我们想把这些“放错了位置的”宝物重新拿出来，让它们在现场找到新的主人。

这不是一次普通的二手市集。你可以来拍，也可以来换；可以带着自己的好物来分享，也可以空手来看看有什么意外收获。

拍卖规则：谁开的价格高，物品就给谁。如果两个价格一样，就石头剪刀布，一把定输赢。

不用钱的拍卖会：清迈客栈的这场拍卖会上，我们不用钱来拍卖。社区的东西就要用独属于 CMI 社区的货币：空想食堂带来的菜品数量，或社区共建时长。

活动当天流程：开场破冰、社区品拍卖、个人品拍卖、摆摊交流会。

活动信息：2026 年 6 月 6 日（周六）15:00，地点清迈客栈，免费参与。原始参与方式为无需报名、直接空降即可；也可以扫描海报二维码进群。通过 CMI Map 一键报名后，确认邮件会附上微信群、联系人二维码和到场指引。',
  '{
    "sourceFiles": [
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/推文.md",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/小红书正文.txt",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/小红书标题.txt",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/发布页.html",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/公众号推文.html",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/海报无二维码.png",
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/海报有二维码.png"
    ],
    "sourceFileMtimes": {
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/推文.md": 1780483380,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/小红书正文.txt": 1780483380,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/小红书标题.txt": 1780482441,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/发布页.html": 1780483380,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/公众号推文.html": 1780483380,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/海报无二维码.png": 1780484198,
      "/Users/andreas/CMI/活动宣传内容/六月活动/6.6 旧物拍卖会/海报有二维码.png": 1780484159
    },
    "posterUrl": "/cmi-home/event-posters/cmi-secondhand-auction-2026-06-06.png",
    "cardBackgroundUrl": "/cmi-home/event-card-backgrounds/cmi-secondhand-auction-2026-06-06.jpg",
    "storagePosterUrl": "https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-secondhand-auction-2026-06-06-1780484670189.png",
    "imageSource": "official_poster",
    "manualReviewNotes": [
      "上一轮素材仍写具体时间待定；本轮推文和海报已确认 2026-06-06 周六下午 3 点。"
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
