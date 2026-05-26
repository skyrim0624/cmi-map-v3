alter table public.blackboard_posts
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_at timestamp with time zone,
  add column if not exists featured_by uuid references auth.users(id) on delete set null;

create index if not exists blackboard_posts_featured_created_idx
  on public.blackboard_posts (is_featured, created_at desc);

create or replace function public.protect_blackboard_featured_fields()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    if (
      new.is_featured is distinct from false
      or new.featured_at is not null
      or new.featured_by is not null
    ) and not (select public.is_admin()) then
      raise exception 'Only admins can feature blackboard posts';
    end if;
  end if;

  if TG_OP = 'UPDATE' then
    if (
      old.is_featured is distinct from new.is_featured
      or old.featured_at is distinct from new.featured_at
      or old.featured_by is distinct from new.featured_by
    ) and not (select public.is_admin()) then
      raise exception 'Only admins can change featured blackboard fields';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_blackboard_featured_fields on public.blackboard_posts;
create trigger protect_blackboard_featured_fields
before insert or update on public.blackboard_posts
for each row execute function public.protect_blackboard_featured_fields();

create table if not exists public.blackboard_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 48),
  body text not null check (char_length(trim(body)) between 1 and 280),
  link_label text,
  link_url text,
  status text not null default 'active' check (status in ('active', 'hidden')),
  priority integer not null default 0,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists blackboard_announcements_status_priority_idx
  on public.blackboard_announcements (status, priority desc, created_at desc);

drop trigger if exists touch_blackboard_announcements_updated_at on public.blackboard_announcements;
create trigger touch_blackboard_announcements_updated_at
before update on public.blackboard_announcements
for each row execute function public.touch_updated_at();

alter table public.blackboard_announcements enable row level security;

drop policy if exists "blackboard_announcements_select_active_or_admin" on public.blackboard_announcements;
drop policy if exists "blackboard_announcements_insert_admin" on public.blackboard_announcements;
drop policy if exists "blackboard_announcements_update_admin" on public.blackboard_announcements;
drop policy if exists "blackboard_announcements_delete_admin" on public.blackboard_announcements;

create policy "blackboard_announcements_select_active_or_admin"
on public.blackboard_announcements for select
using (
  status = 'active'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
  or (select public.is_admin())
);

create policy "blackboard_announcements_insert_admin"
on public.blackboard_announcements for insert
to authenticated
with check ((select public.is_admin()));

create policy "blackboard_announcements_update_admin"
on public.blackboard_announcements for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "blackboard_announcements_delete_admin"
on public.blackboard_announcements for delete
to authenticated
using ((select public.is_admin()));

grant select on public.blackboard_announcements to anon, authenticated;
grant insert, update, delete on public.blackboard_announcements to authenticated;
grant all on public.blackboard_announcements to service_role;
