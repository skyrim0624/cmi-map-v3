create table if not exists public.cmi_companion_invites (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  place_id text,
  place_name text,
  latitude double precision,
  longitude double precision,
  event_id text references public.cmi_events(id) on delete set null,
  title text not null,
  starts_at timestamp with time zone not null,
  capacity integer,
  cost_note text,
  condition_note text,
  vibe text,
  host_note text,
  contact_label text not null,
  status text not null default 'open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint cmi_companion_invites_place_or_event_check
    check (place_id is not null or event_id is not null),
  constraint cmi_companion_invites_title_check
    check (char_length(btrim(title)) between 1 and 80),
  constraint cmi_companion_invites_capacity_check
    check (capacity is null or capacity > 0),
  constraint cmi_companion_invites_contact_check
    check (char_length(btrim(contact_label)) > 0),
  constraint cmi_companion_invites_status_check
    check (status in ('open')),
  constraint cmi_companion_invites_coordinates_check
    check (
      (latitude is null and longitude is null)
      or (latitude is not null and longitude is not null)
    )
);

create table if not exists public.cmi_companion_applications (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.cmi_companion_invites(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  relationship_type text not null,
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_at timestamp with time zone,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint cmi_companion_applications_relationship_check
    check (relationship_type in ('friend', 'non_friend')),
  constraint cmi_companion_applications_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint cmi_companion_applications_unique_applicant
    unique (invite_id, applicant_id)
);

create index if not exists cmi_companion_invites_status_created_idx
  on public.cmi_companion_invites (status, created_at desc);

create index if not exists cmi_companion_invites_creator_idx
  on public.cmi_companion_invites (creator_id, created_at desc);

create index if not exists cmi_companion_invites_event_idx
  on public.cmi_companion_invites (event_id)
  where event_id is not null;

create index if not exists cmi_companion_applications_invite_idx
  on public.cmi_companion_applications (invite_id, status, created_at desc);

create index if not exists cmi_companion_applications_applicant_idx
  on public.cmi_companion_applications (applicant_id, created_at desc);

drop trigger if exists touch_cmi_companion_invites_updated_at on public.cmi_companion_invites;
create trigger touch_cmi_companion_invites_updated_at
before update on public.cmi_companion_invites
for each row execute function public.touch_updated_at();

alter table public.cmi_companion_invites enable row level security;
alter table public.cmi_companion_applications enable row level security;

create policy "cmi_companion_invites_select_open"
on public.cmi_companion_invites for select
using (status = 'open');

create policy "cmi_companion_invites_insert_own"
on public.cmi_companion_invites for insert
to authenticated
with check (auth.uid() = creator_id);

create policy "cmi_companion_applications_select_related"
on public.cmi_companion_applications for select
to authenticated
using (
  applicant_id = auth.uid()
  or exists (
    select 1
    from public.cmi_companion_invites invite
    where invite.id = cmi_companion_applications.invite_id
      and invite.creator_id = auth.uid()
  )
  or public.is_admin()
);

create policy "cmi_companion_applications_insert_own"
on public.cmi_companion_applications for insert
to authenticated
with check (
  applicant_id = auth.uid()
  and (
    status = 'pending'
    or (status = 'approved' and relationship_type = 'friend')
  )
);

create policy "cmi_companion_applications_review_by_creator"
on public.cmi_companion_applications for update
to authenticated
using (
  exists (
    select 1
    from public.cmi_companion_invites invite
    where invite.id = cmi_companion_applications.invite_id
      and (invite.creator_id = auth.uid() or public.is_admin())
  )
)
with check (
  status in ('approved', 'rejected')
  and exists (
    select 1
    from public.cmi_companion_invites invite
    where invite.id = cmi_companion_applications.invite_id
      and (invite.creator_id = auth.uid() or public.is_admin())
  )
);

grant select (
  id,
  creator_id,
  place_id,
  place_name,
  latitude,
  longitude,
  event_id,
  title,
  starts_at,
  capacity,
  cost_note,
  condition_note,
  vibe,
  host_note,
  status,
  created_at,
  updated_at
) on public.cmi_companion_invites to anon, authenticated;

grant insert (
  creator_id,
  place_id,
  place_name,
  latitude,
  longitude,
  event_id,
  title,
  starts_at,
  capacity,
  cost_note,
  condition_note,
  vibe,
  host_note,
  contact_label,
  status
) on public.cmi_companion_invites to authenticated;

grant select, insert, update on public.cmi_companion_applications to authenticated;
grant all on public.cmi_companion_invites to service_role;
grant all on public.cmi_companion_applications to service_role;
