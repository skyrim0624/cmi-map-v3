create schema if not exists private;

create table if not exists public.cmi_event_managers (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.cmi_events(id) on delete cascade,
  email text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint cmi_event_managers_email_check
    check (char_length(btrim(email)) between 3 and 254 and email like '%@%')
);

create unique index if not exists cmi_event_managers_event_email_idx
  on public.cmi_event_managers (event_id, lower(btrim(email)));

create index if not exists cmi_event_managers_email_idx
  on public.cmi_event_managers (lower(btrim(email)));

drop trigger if exists touch_cmi_event_managers_updated_at on public.cmi_event_managers;
create trigger touch_cmi_event_managers_updated_at
before update on public.cmi_event_managers
for each row execute function public.touch_updated_at();

with cmi_inn_events as (
  select
    id,
    created_by,
    lower(btrim(organizer_email)) as previous_email
  from public.cmi_events
  where (
      is_cmi_related = true
      or event_type = 'cmi'
      or venue_name ilike '%清迈客栈%'
      or area ilike '%清迈客栈%'
      or area ilike '%CMI%'
    )
    and organizer_email is not null
    and btrim(organizer_email) <> ''
    and lower(btrim(organizer_email)) <> 'skyrim1179676226@gmail.com'
)
insert into public.cmi_event_managers (event_id, email, created_by)
select id, previous_email, created_by
from cmi_inn_events
on conflict do nothing;

with cmi_inn_events as (
  select id
  from public.cmi_events
  where (
      is_cmi_related = true
      or event_type = 'cmi'
      or venue_name ilike '%清迈客栈%'
      or area ilike '%清迈客栈%'
      or area ilike '%CMI%'
    )
    and (
      organizer_email is null
      or btrim(organizer_email) = ''
      or lower(btrim(organizer_email)) = 'events@cmimap.com'
    )
)
update public.cmi_events event
set
  organizer_email = 'skyrim1179676226@gmail.com',
  organizer_name = case
    when btrim(coalesce(event.organizer_name, '')) = '' then '子扬'
    else event.organizer_name
  end
from cmi_inn_events target
where event.id = target.id;

create or replace function private.is_cmi_event_manager(target_event_id text)
returns boolean
language sql
security definer
set search_path = public, private
stable
as $$
  with current_identity as (
    select
      (select auth.uid()) as user_id,
      lower(btrim(coalesce(auth.jwt() ->> 'email', ''))) as email
  )
  select coalesce((
    select
      exists (
        select 1
        from public.cmi_events event
        cross join current_identity identity
        where event.id = target_event_id
          and (
            (identity.user_id is not null and event.created_by = identity.user_id)
            or (identity.user_id is not null and event.organizer_id = identity.user_id)
            or (
              identity.email <> ''
              and event.organizer_email is not null
              and btrim(event.organizer_email) <> ''
              and lower(btrim(event.organizer_email)) = identity.email
            )
            or (select public.is_admin())
          )
      )
      or exists (
        select 1
        from public.cmi_event_managers manager
        cross join current_identity identity
        where manager.event_id = target_event_id
          and identity.email <> ''
          and lower(btrim(manager.email)) = identity.email
      )
  ), false);
$$;

revoke all on function private.is_cmi_event_manager(text) from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_cmi_event_manager(text) to authenticated, service_role;

alter table public.cmi_event_managers enable row level security;

drop policy if exists "cmi_event_managers_select_manager" on public.cmi_event_managers;
drop policy if exists "cmi_event_managers_insert_manager" on public.cmi_event_managers;
drop policy if exists "cmi_event_managers_update_manager" on public.cmi_event_managers;
drop policy if exists "cmi_event_managers_delete_manager" on public.cmi_event_managers;

create policy "cmi_event_managers_select_manager"
on public.cmi_event_managers for select
to authenticated
using (private.is_cmi_event_manager(event_id));

create policy "cmi_event_managers_insert_manager"
on public.cmi_event_managers for insert
to authenticated
with check (private.is_cmi_event_manager(event_id));

create policy "cmi_event_managers_update_manager"
on public.cmi_event_managers for update
to authenticated
using (private.is_cmi_event_manager(event_id))
with check (private.is_cmi_event_manager(event_id));

create policy "cmi_event_managers_delete_manager"
on public.cmi_event_managers for delete
to authenticated
using (private.is_cmi_event_manager(event_id));

grant select, insert, update, delete on public.cmi_event_managers to authenticated;
grant all on public.cmi_event_managers to service_role;

drop policy if exists "cmi_events_owner_select" on public.cmi_events;
drop policy if exists "cmi_events_owner_update" on public.cmi_events;

create policy "cmi_events_owner_select"
on public.cmi_events for select
to authenticated
using (private.is_cmi_event_manager(id));

create policy "cmi_events_owner_update"
on public.cmi_events for update
to authenticated
using (private.is_cmi_event_manager(id))
with check (
  (select public.is_admin())
  or (
    visibility_status = 'published'
    and source_type = 'community'
    and verification_status = 'needs-review'
    and is_verified = false
    and private.is_cmi_event_manager(id)
  )
);

drop policy if exists "cmi_event_registrations_select_self_or_owner" on public.cmi_event_registrations;
drop policy if exists "cmi_event_registrations_owner_update" on public.cmi_event_registrations;

create policy "cmi_event_registrations_select_self_or_owner"
on public.cmi_event_registrations for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_cmi_event_manager(event_id)
);

create policy "cmi_event_registrations_owner_update"
on public.cmi_event_registrations for update
to authenticated
using (private.is_cmi_event_manager(event_id))
with check (private.is_cmi_event_manager(event_id));

create or replace function private.enforce_cmi_event_registration_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  event_capacity integer;
  going_count integer;
begin
  if new.status <> 'going' then
    return new;
  end if;

  select event.capacity
  into event_capacity
  from public.cmi_events event
  where event.id = new.event_id
  for update;

  if event_capacity is null then
    return new;
  end if;

  select count(*)
  into going_count
  from public.cmi_event_registrations registration
  where registration.event_id = new.event_id
    and registration.status = 'going'
    and registration.id is distinct from new.id;

  if going_count >= event_capacity then
    raise exception '活动名额已满';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_cmi_event_registration_capacity() from public, anon, authenticated;

drop trigger if exists enforce_cmi_event_registration_capacity on public.cmi_event_registrations;
create trigger enforce_cmi_event_registration_capacity
before insert or update of event_id, status on public.cmi_event_registrations
for each row execute function private.enforce_cmi_event_registration_capacity();

drop view if exists public.cmi_event_registration_public;
create view public.cmi_event_registration_public
with (security_invoker = true) as
select
  null::uuid as id,
  null::text as event_id,
  null::text as attendee_name,
  null::text as status,
  null::timestamp with time zone as created_at
where false;

grant select on public.cmi_event_registration_public to anon, authenticated;
grant all on public.cmi_event_registration_public to service_role;
