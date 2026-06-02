alter table public.cmi_events
  add column if not exists venue_space text;

alter table public.cmi_events
  drop constraint if exists cmi_events_venue_space_check,
  add constraint cmi_events_venue_space_check
    check (
      venue_space is null
      or venue_space in (
        'rug',
        'round-table',
        'office',
        'fourth-floor-rooftop',
        'second-floor-sofa',
        'yard-canopy'
      )
    );

create index if not exists cmi_events_venue_space_time_idx
  on public.cmi_events (venue_space, start_at, end_at)
  where venue_space is not null
    and visibility_status <> 'archived'
    and verification_status <> 'rejected';

drop policy if exists "cmi_events_user_insert" on public.cmi_events;

create policy "cmi_events_user_insert"
on public.cmi_events for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (organizer_id is null or organizer_id = (select auth.uid()))
  and visibility_status = 'draft'
  and source_type = 'community'
  and verification_status = 'needs-review'
  and is_verified = false
);

drop policy if exists "cmi_events_owner_update" on public.cmi_events;

create policy "cmi_events_owner_update"
on public.cmi_events for update
to authenticated
using (private.is_cmi_event_manager(id))
with check (
  (select public.is_admin())
  or (
    visibility_status in ('draft', 'published')
    and source_type = 'community'
    and verification_status = 'needs-review'
    and is_verified = false
    and private.is_cmi_event_manager(id)
  )
);

create or replace function public.get_cmi_inn_space_reservations(
  range_start timestamp with time zone,
  range_end timestamp with time zone default null
)
returns table (
  event_id text,
  title text,
  start_at timestamp with time zone,
  end_at timestamp with time zone,
  venue_name text,
  area text,
  venue_space text,
  verification_status text,
  visibility_status text
)
language sql
security definer
set search_path = public
stable
as $$
  with input_range as (
    select
      range_start as starts_at,
      coalesce(range_end, range_start + interval '2 hours') as ends_at
  )
  select
    event.id as event_id,
    event.title,
    event.start_at,
    event.end_at,
    event.venue_name,
    event.area,
    event.venue_space,
    event.verification_status,
    event.visibility_status
  from public.cmi_events event
  cross join input_range input
  where input.starts_at is not null
    and event.start_at is not null
    and event.venue_space is not null
    and event.visibility_status <> 'archived'
    and event.verification_status <> 'rejected'
    and (
      event.is_cmi_related = true
      or event.event_type = 'cmi'
      or event.venue_name ilike '%清迈客栈%'
      or event.area ilike '%清迈客栈%'
      or event.area ilike '%CMI%'
    )
    and event.start_at < input.ends_at
    and coalesce(event.end_at, event.start_at + interval '2 hours') > input.starts_at
  order by event.start_at asc, event.venue_space asc;
$$;

revoke all on function public.get_cmi_inn_space_reservations(timestamp with time zone, timestamp with time zone)
  from public, anon, authenticated;
grant execute on function public.get_cmi_inn_space_reservations(timestamp with time zone, timestamp with time zone)
  to anon, authenticated, service_role;
