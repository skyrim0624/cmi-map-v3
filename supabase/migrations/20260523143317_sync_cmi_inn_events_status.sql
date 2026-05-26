update public.cmi_events
set
  visibility_status = 'archived',
  last_checked_at = '2026-05-23T14:33:17+07:00',
  next_check_before = null,
  updated_at = timezone('utc'::text, now())
where id in (
  'cmi-ai-nomad-community-2026-05-20',
  'cmi-mindfulness-hour-2026-05-21',
  'cmi-friday-afternoon-yoga-2026-05-22',
  'cmi-kongxiang-canteen-2026-05-22'
)
and is_cmi_related = true
and coalesce(end_at, start_at) < '2026-05-23T14:33:17+07:00';
