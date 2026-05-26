alter table public.cmi_events
  add column if not exists organizer_id uuid references auth.users(id) on delete set null,
  add column if not exists organizer_name text not null default '',
  add column if not exists organizer_email text,
  add column if not exists contact_email text,
  add column if not exists capacity integer,
  add column if not exists registration_enabled boolean not null default false,
  add column if not exists registration_status text not null default 'closed',
  add column if not exists attendee_visibility text not null default 'count-only',
  add column if not exists cover_image_url text,
  add column if not exists detail_body text not null default '';

alter table public.cmi_events
  drop constraint if exists cmi_events_capacity_check,
  add constraint cmi_events_capacity_check
    check (capacity is null or capacity > 0);

alter table public.cmi_events
  drop constraint if exists cmi_events_registration_status_check,
  add constraint cmi_events_registration_status_check
    check (registration_status in ('open', 'closed'));

alter table public.cmi_events
  drop constraint if exists cmi_events_attendee_visibility_check,
  add constraint cmi_events_attendee_visibility_check
    check (attendee_visibility in ('public', 'count-only'));

create index if not exists cmi_events_created_by_idx
  on public.cmi_events (created_by);

create index if not exists cmi_events_registration_status_idx
  on public.cmi_events (registration_enabled, registration_status);

drop policy if exists "cmi_events_owner_select" on public.cmi_events;
drop policy if exists "cmi_events_user_insert" on public.cmi_events;
drop policy if exists "cmi_events_owner_update" on public.cmi_events;

create policy "cmi_events_owner_select"
on public.cmi_events for select
to authenticated
using (
  created_by = (select auth.uid())
  or organizer_id = (select auth.uid())
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
)
with check (
  created_by = (select auth.uid())
  and (organizer_id is null or organizer_id = (select auth.uid()))
);

create table if not exists public.cmi_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.cmi_events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  attendee_name text not null,
  attendee_email text not null,
  note text not null default '',
  status text not null default 'going',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint cmi_event_registrations_name_check
    check (char_length(trim(attendee_name)) between 1 and 80),
  constraint cmi_event_registrations_email_check
    check (char_length(trim(attendee_email)) between 3 and 254 and attendee_email like '%@%'),
  constraint cmi_event_registrations_note_check
    check (char_length(note) <= 500),
  constraint cmi_event_registrations_status_check
    check (status in ('going', 'cancelled'))
);

create index if not exists cmi_event_registrations_event_idx
  on public.cmi_event_registrations (event_id, created_at);

create index if not exists cmi_event_registrations_user_idx
  on public.cmi_event_registrations (user_id)
  where user_id is not null;

create unique index if not exists cmi_event_registrations_event_email_active_idx
  on public.cmi_event_registrations (event_id, lower(attendee_email))
  where status = 'going';

drop trigger if exists touch_cmi_event_registrations_updated_at on public.cmi_event_registrations;
create trigger touch_cmi_event_registrations_updated_at
before update on public.cmi_event_registrations
for each row execute function public.touch_updated_at();

alter table public.cmi_event_registrations enable row level security;

drop policy if exists "cmi_event_registrations_insert_open_event" on public.cmi_event_registrations;
drop policy if exists "cmi_event_registrations_select_self_or_owner" on public.cmi_event_registrations;
drop policy if exists "cmi_event_registrations_owner_update" on public.cmi_event_registrations;
drop policy if exists "cmi_event_registrations_self_cancel" on public.cmi_event_registrations;

create policy "cmi_event_registrations_insert_open_event"
on public.cmi_event_registrations for insert
to anon, authenticated
with check (
  status = 'going'
  and (user_id is null or user_id = (select auth.uid()))
  and exists (
    select 1
    from public.cmi_events event
    where event.id = event_id
      and event.visibility_status = 'published'
      and event.registration_enabled = true
      and event.registration_status = 'open'
  )
);

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
        or public.is_admin()
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
        or public.is_admin()
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
        or public.is_admin()
      )
  )
);

create policy "cmi_event_registrations_self_cancel"
on public.cmi_event_registrations for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and status = 'cancelled'
);

grant insert on public.cmi_event_registrations to anon, authenticated;
grant select, update on public.cmi_event_registrations to authenticated;
grant all on public.cmi_event_registrations to service_role;

drop view if exists public.cmi_event_registration_public;
create view public.cmi_event_registration_public
with (security_invoker = true) as
select
  registration.id,
  registration.event_id,
  case
    when event.attendee_visibility = 'public' then registration.attendee_name
    else null
  end as attendee_name,
  registration.status,
  registration.created_at
from public.cmi_event_registrations registration
join public.cmi_events event on event.id = registration.event_id
where event.visibility_status = 'published'
  and registration.status = 'going';

grant select on public.cmi_event_registration_public to anon, authenticated;
grant all on public.cmi_event_registration_public to service_role;
