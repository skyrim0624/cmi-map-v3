-- CMI / 清迈客栈已结束活动可见策略纠偏
-- 执行时间：2026-05-30T11:36:19+07:00。
-- 业务口径：
-- - 已结束活动不再自动下架到 archived。
-- - 已结束活动继续保持 published，便于用户打开详情页查看、后续补充活动照片和回顾。
-- - 已结束活动只关闭报名、清空下一次复核时间，并由前端排序下沉到未来活动之后。
-- - archived 后续保留给取消、重复、误发或明确不应公开的活动。

update public.cmi_events
set
  visibility_status = 'published',
  registration_status = 'closed',
  last_checked_at = '2026-05-30T11:36:19+07:00',
  next_check_before = null,
  raw_source_payload = coalesce(raw_source_payload, '{}'::jsonb) || jsonb_build_object(
    'endedDisplayPolicy', 'published_closed_visible_after_upcoming',
    'endedDisplayPolicyCheckedAt', '2026-05-30T11:36:19+07:00',
    'endedDisplayPolicyReason', '用户确认已结束活动应继续可见，便于后续补活动照片和回顾。'
  ),
  updated_at = timezone('utc'::text, now())
where (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-05-30T11:36:19+07:00'::timestamptz
  and (
    visibility_status = 'archived'
    or registration_status is distinct from 'closed'
    or next_check_before is not null
  );

update public.cmi_events
set
  last_checked_at = '2026-05-30T11:36:19+07:00',
  next_check_before = case
    when start_at <= '2026-05-30T13:36:19+07:00'::timestamptz then start_at
    when start_at <= '2026-06-01T11:36:19+07:00'::timestamptz then start_at - interval '2 hours'
    when start_at is not null then '2026-06-01T11:36:19+07:00'::timestamptz
    else null
  end,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-05-30T11:36:19+07:00'::timestamptz)
  and next_check_before is not null
  and next_check_before <= '2026-05-30T11:36:19+07:00'::timestamptz;

update public.cmi_events
set
  raw_source_payload = coalesce(raw_source_payload, '{}'::jsonb) || jsonb_build_object(
    'sourceFiles',
    jsonb_build_array(
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/推文.md',
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/小红书正文.txt',
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/小红书标题.txt',
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/公众号推文.html',
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/发布页.html',
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/五分钟音乐会01 radiohead kid a 最终海报.png',
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/五分钟音乐会01 radiohead kid a 小红书无二维码版.png',
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/psd-layer-inspection.txt'
    ),
    'sourceFileMtimes',
    jsonb_build_object(
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/推文.md', 1780075536,
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/小红书正文.txt', 1780075537,
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/小红书标题.txt', 1780075537,
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/公众号推文.html', 1780075537,
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/发布页.html', 1780075537,
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/五分钟音乐会01 radiohead kid a 最终海报.png', 1780112896,
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/五分钟音乐会01 radiohead kid a 小红书无二维码版.png', 1780113004,
      '/Users/andreas/CMI/活动宣传内容/六月活动/6.2 五分钟音乐会/psd-layer-inspection.txt', 1780073435
    )
  ),
  updated_at = timezone('utc'::text, now())
where id = 'cmi-five-minute-music-kid-a-2026-06-02';
