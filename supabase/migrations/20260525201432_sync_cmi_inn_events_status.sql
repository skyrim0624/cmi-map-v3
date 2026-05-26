-- CMI / 清迈客栈活动状态同步审计
-- 执行时间：2026-05-25T20:14:32+07:00。
-- 本迁移保持幂等：已结束的 CMI / 清迈客栈活动会归档；
-- 仍可参加且到达 next_check_before 的活动会刷新复核时间。

update public.cmi_events
set
  visibility_status = 'archived',
  last_checked_at = '2026-05-25T20:14:32+07:00',
  next_check_before = null,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-05-25T20:14:32+07:00';

update public.cmi_events
set
  last_checked_at = '2026-05-25T20:14:32+07:00',
  next_check_before = case
    when start_at <= '2026-05-25T22:14:32+07:00'::timestamptz then start_at
    when start_at <= '2026-05-27T20:14:32+07:00'::timestamptz then start_at - interval '2 hours'
    when start_at is not null then '2026-05-27T20:14:32+07:00'::timestamptz
    else null
  end,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-05-25T20:14:32+07:00')
  and next_check_before is not null
  and next_check_before <= '2026-05-25T20:14:32+07:00';
