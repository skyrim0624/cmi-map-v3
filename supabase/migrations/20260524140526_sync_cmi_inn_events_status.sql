update public.cmi_events
set
  visibility_status = 'archived',
  last_checked_at = '2026-05-24T14:05:26+07:00',
  next_check_before = null,
  updated_at = timezone('utc'::text, now())
where id = 'cmi-song-of-the-sea-screening-2026-05-23'
  and is_cmi_related = true
  and coalesce(end_at, start_at) < '2026-05-24T14:05:26+07:00';

update public.cmi_events
set
  last_checked_at = '2026-05-24T14:05:26+07:00',
  next_check_before = '2026-05-24T16:00:00+07:00',
  updated_at = timezone('utc'::text, now())
where id = 'cmi-swap-market-2026-05-24'
  and visibility_status = 'published'
  and is_cmi_related = true
  and coalesce(end_at, start_at) >= '2026-05-24T14:05:26+07:00'
  and next_check_before <= '2026-05-24T14:05:26+07:00';
