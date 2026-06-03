drop policy if exists "cmi_event_registrations_insert_open_event"
on public.cmi_event_registrations;

revoke insert on public.cmi_event_registrations from anon;
grant insert on public.cmi_event_registrations to authenticated;

create policy "cmi_event_registrations_insert_open_event"
on public.cmi_event_registrations for insert
to authenticated
with check (
  status = 'going'
  and user_id = (select auth.uid())
  and lower(btrim(attendee_email)) = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
  and exists (
    select 1
    from public.cmi_events event
    where event.id = event_id
      and event.visibility_status = 'published'
      and event.registration_enabled = true
      and event.registration_status = 'open'
  )
);
