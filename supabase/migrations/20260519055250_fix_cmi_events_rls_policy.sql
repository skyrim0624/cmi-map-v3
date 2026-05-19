drop policy if exists "cmi_events_select_published" on public.cmi_events;
drop policy if exists "cmi_events_admin_select" on public.cmi_events;
drop policy if exists "cmi_events_select_published_anon" on public.cmi_events;
drop policy if exists "cmi_events_select_published_or_admin" on public.cmi_events;

create policy "cmi_events_select_published_anon"
on public.cmi_events for select
to anon
using (visibility_status = 'published');

create policy "cmi_events_select_published_or_admin"
on public.cmi_events for select
to authenticated
using (visibility_status = 'published' or (select public.is_admin()));

drop policy if exists "cmi_events_admin_insert" on public.cmi_events;
drop policy if exists "cmi_events_admin_update" on public.cmi_events;
drop policy if exists "cmi_events_admin_delete" on public.cmi_events;

create policy "cmi_events_admin_insert"
on public.cmi_events for insert
to authenticated
with check ((select public.is_admin()));

create policy "cmi_events_admin_update"
on public.cmi_events for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "cmi_events_admin_delete"
on public.cmi_events for delete
to authenticated
using ((select public.is_admin()));
