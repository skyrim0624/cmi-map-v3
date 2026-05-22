create table if not exists public.cmi_event_stamps (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.cmi_events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  device_id text not null,
  x_ratio real not null check (x_ratio >= 6 and x_ratio <= 94),
  y_ratio real not null check (y_ratio >= 12 and y_ratio <= 88),
  rotation real not null default 0,
  stamp_label text not null default '想去',
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint cmi_event_stamps_unique_device unique (event_id, device_id)
);

create index if not exists cmi_event_stamps_event_created_idx
  on public.cmi_event_stamps (event_id, created_at);

create index if not exists cmi_event_stamps_user_idx
  on public.cmi_event_stamps (user_id)
  where user_id is not null;

alter table public.cmi_event_stamps enable row level security;

drop policy if exists "cmi_event_stamps_select_public" on public.cmi_event_stamps;
drop policy if exists "cmi_event_stamps_insert_device" on public.cmi_event_stamps;

create policy "cmi_event_stamps_select_public"
on public.cmi_event_stamps for select
using (true);

create policy "cmi_event_stamps_insert_device"
on public.cmi_event_stamps for insert
to anon, authenticated
with check (
  length(device_id) >= 12
  and (
    (auth.uid() is null and user_id is null)
    or auth.uid() = user_id
  )
);

grant select, insert on public.cmi_event_stamps to anon, authenticated;
grant all on public.cmi_event_stamps to service_role;
