update public.cmi_events
set
  visibility_status = 'archived',
  last_checked_at = '2026-05-22T17:16:55+07:00',
  next_check_before = null,
  updated_at = timezone('utc'::text, now())
where id in (
  'cmi-ai-nomad-community-2026-05-20',
  'cmi-mindfulness-hour-2026-05-21'
);

update public.cmi_events
set
  last_checked_at = '2026-05-22T17:16:55+07:00',
  next_check_before = case id
    when 'cmi-friday-afternoon-yoga-2026-05-22' then '2026-05-22T18:30:00+07:00'
    when 'cmi-kongxiang-canteen-2026-05-22' then '2026-05-22T18:30:00+07:00'
    when 'cmi-song-of-the-sea-screening-2026-05-23' then '2026-05-23T18:00:00+07:00'
    when 'cmi-swap-market-2026-05-24' then '2026-05-24T12:00:00+07:00'
    else next_check_before
  end,
  updated_at = timezone('utc'::text, now())
where id in (
  'cmi-friday-afternoon-yoga-2026-05-22',
  'cmi-kongxiang-canteen-2026-05-22',
  'cmi-song-of-the-sea-screening-2026-05-23',
  'cmi-swap-market-2026-05-24'
);
