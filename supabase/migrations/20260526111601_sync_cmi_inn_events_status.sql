-- CMI / 清迈客栈活动状态同步审计
-- 执行时间：2026-05-26T11:16:01+07:00。
-- 素材扫描：五月活动目录与状态快照一致，本轮无新增或更新活动材料。
-- 本迁移保持幂等：已结束的 CMI / 清迈客栈活动会归档；
-- 仍可参加且到达 next_check_before 的活动会刷新复核时间。

update public.cmi_events
set
  visibility_status = 'archived',
  last_checked_at = '2026-05-26T11:16:01+07:00',
  next_check_before = null,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and coalesce(end_at, start_at) < '2026-05-26T11:16:01+07:00'::timestamptz;

update public.cmi_events
set
  last_checked_at = '2026-05-26T11:16:01+07:00',
  next_check_before = case
    when start_at <= '2026-05-26T13:16:01+07:00'::timestamptz then start_at
    when start_at <= '2026-05-28T11:16:01+07:00'::timestamptz then start_at - interval '2 hours'
    when start_at is not null then '2026-05-28T11:16:01+07:00'::timestamptz
    else null
  end,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (is_cmi_related = true or venue_name = '清迈客栈' or source_type = 'cmi')
  and (end_at is null or end_at >= '2026-05-26T11:16:01+07:00'::timestamptz)
  and next_check_before is not null
  and next_check_before <= '2026-05-26T11:16:01+07:00'::timestamptz;
