insert into storage.buckets (id, name, public)
values ('cmi-event-posters', 'cmi-event-posters', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "cmi_event_posters_public_select" on storage.objects;
drop policy if exists "cmi_event_posters_authenticated_insert" on storage.objects;
drop policy if exists "cmi_event_posters_authenticated_update" on storage.objects;

create policy "cmi_event_posters_public_select"
on storage.objects for select
using (bucket_id = 'cmi-event-posters');

create policy "cmi_event_posters_authenticated_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'cmi-event-posters'
  and name like 'posters/%'
);

create policy "cmi_event_posters_authenticated_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'cmi-event-posters'
  and name like 'posters/%'
)
with check (
  bucket_id = 'cmi-event-posters'
  and name like 'posters/%'
);
