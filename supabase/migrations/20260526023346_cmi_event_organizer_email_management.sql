create index if not exists cmi_events_organizer_email_normalized_idx
  on public.cmi_events (lower(btrim(organizer_email)))
  where organizer_email is not null and btrim(organizer_email) <> '';

create or replace function private.protect_cmi_event_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if old.id is distinct from new.id then
      raise exception 'Event id cannot be changed';
    end if;

    if old.title is distinct from new.title then
      raise exception 'Event title cannot be changed after publishing';
    end if;

    if old.created_by is distinct from new.created_by then
      raise exception 'Event creator cannot be changed';
    end if;

    if old.source_type is distinct from new.source_type then
      raise exception 'Event source type cannot be changed';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_cmi_event_immutable_fields() from public, anon, authenticated;

drop trigger if exists protect_cmi_event_immutable_fields on public.cmi_events;
create trigger protect_cmi_event_immutable_fields
before update of id, title, created_by, source_type on public.cmi_events
for each row execute function private.protect_cmi_event_immutable_fields();

drop policy if exists "cmi_events_owner_select" on public.cmi_events;
drop policy if exists "cmi_events_user_insert" on public.cmi_events;
drop policy if exists "cmi_events_owner_update" on public.cmi_events;

create policy "cmi_events_owner_select"
on public.cmi_events for select
to authenticated
using (
  created_by = (select auth.uid())
  or organizer_id = (select auth.uid())
  or (
    organizer_email is not null
    and btrim(organizer_email) <> ''
    and lower(btrim(organizer_email)) = (select lower(btrim(coalesce(auth.jwt() ->> 'email', ''))))
  )
  or (select public.is_admin())
);

create policy "cmi_events_user_insert"
on public.cmi_events for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (organizer_id is null or organizer_id = (select auth.uid()))
  and visibility_status = 'published'
  and source_type = 'community'
  and verification_status = 'needs-review'
  and is_verified = false
);

create policy "cmi_events_owner_update"
on public.cmi_events for update
to authenticated
using (
  created_by = (select auth.uid())
  or organizer_id = (select auth.uid())
  or (
    organizer_email is not null
    and btrim(organizer_email) <> ''
    and lower(btrim(organizer_email)) = (select lower(btrim(coalesce(auth.jwt() ->> 'email', ''))))
  )
  or (select public.is_admin())
)
with check (
  visibility_status = 'published'
  and source_type = 'community'
  and verification_status = 'needs-review'
  and is_verified = false
  and (
    created_by = (select auth.uid())
    or organizer_id = (select auth.uid())
    or (
      organizer_email is not null
      and btrim(organizer_email) <> ''
      and lower(btrim(organizer_email)) = (select lower(btrim(coalesce(auth.jwt() ->> 'email', ''))))
    )
    or (select public.is_admin())
  )
);

drop policy if exists "cmi_event_registrations_select_self_or_owner" on public.cmi_event_registrations;
drop policy if exists "cmi_event_registrations_owner_update" on public.cmi_event_registrations;

create policy "cmi_event_registrations_select_self_or_owner"
on public.cmi_event_registrations for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.cmi_events event
    where event.id = event_id
      and (
        event.created_by = (select auth.uid())
        or event.organizer_id = (select auth.uid())
        or (
          event.organizer_email is not null
          and btrim(event.organizer_email) <> ''
          and lower(btrim(event.organizer_email)) = (select lower(btrim(coalesce(auth.jwt() ->> 'email', ''))))
        )
        or (select public.is_admin())
      )
  )
);

create policy "cmi_event_registrations_owner_update"
on public.cmi_event_registrations for update
to authenticated
using (
  exists (
    select 1
    from public.cmi_events event
    where event.id = event_id
      and (
        event.created_by = (select auth.uid())
        or event.organizer_id = (select auth.uid())
        or (
          event.organizer_email is not null
          and btrim(event.organizer_email) <> ''
          and lower(btrim(event.organizer_email)) = (select lower(btrim(coalesce(auth.jwt() ->> 'email', ''))))
        )
        or (select public.is_admin())
      )
  )
)
with check (
  exists (
    select 1
    from public.cmi_events event
    where event.id = event_id
      and (
        event.created_by = (select auth.uid())
        or event.organizer_id = (select auth.uid())
        or (
          event.organizer_email is not null
          and btrim(event.organizer_email) <> ''
          and lower(btrim(event.organizer_email)) = (select lower(btrim(coalesce(auth.jwt() ->> 'email', ''))))
        )
        or (select public.is_admin())
      )
  )
);
