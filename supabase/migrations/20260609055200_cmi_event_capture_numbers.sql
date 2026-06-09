alter table public.recommendations
  add column if not exists linked_event_capture_number integer;

create unique index if not exists recommendations_linked_event_capture_number_unique_idx
  on public.recommendations (linked_event_id, linked_event_capture_number)
  where linked_event_id is not null
    and linked_event_capture_number is not null;

create table if not exists public.cmi_event_capture_counters (
  event_id text primary key,
  last_capture_number integer not null default 0 check (last_capture_number >= 0),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.cmi_event_capture_counters enable row level security;

drop policy if exists "cmi_event_capture_counters_select_public" on public.cmi_event_capture_counters;
create policy "cmi_event_capture_counters_select_public"
on public.cmi_event_capture_counters for select
using (true);

create or replace function public.assign_cmi_event_capture_number(
  target_recommendation_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event_id text;
  existing_capture_number integer;
  next_capture_number integer;
begin
  select linked_event_id, linked_event_capture_number
    into target_event_id, existing_capture_number
  from public.recommendations
  where id = target_recommendation_id
  for update;

  if target_event_id is null then
    return null;
  end if;

  if existing_capture_number is not null then
    return existing_capture_number;
  end if;

  insert into public.cmi_event_capture_counters (event_id, last_capture_number)
  values (target_event_id, 0)
  on conflict (event_id) do nothing;

  update public.cmi_event_capture_counters
  set
    last_capture_number = last_capture_number + 1,
    updated_at = timezone('utc'::text, now())
  where event_id = target_event_id
  returning last_capture_number into next_capture_number;

  update public.recommendations
  set linked_event_capture_number = next_capture_number
  where id = target_recommendation_id;

  return next_capture_number;
end;
$$;

grant select on public.cmi_event_capture_counters to anon, authenticated;
grant all on public.cmi_event_capture_counters to service_role;
grant execute on function public.assign_cmi_event_capture_number(uuid) to anon, authenticated, service_role;
