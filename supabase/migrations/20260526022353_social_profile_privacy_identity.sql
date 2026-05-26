create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.profiles
  add column if not exists handle text;

create or replace function private.normalize_profile_handle(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  with normalized as (
    select regexp_replace(
      left(
        regexp_replace(
          regexp_replace(
            lower(btrim(coalesce(input, ''))),
            '[^a-z0-9_-]+',
            '-',
            'g'
          ),
          '-+',
          '-',
          'g'
        ),
        32
      ),
      '(^[-_]+|[-_]+$)',
      '',
      'g'
    ) as value
  )
  select nullif(value, '') from normalized;
$$;

create or replace function private.create_profile_handle(
  target_user_id uuid,
  target_user_name text,
  target_email text
)
returns text
language plpgsql
security definer
set search_path = public, private
as $$
declare
  base_handle text;
  candidate_handle text;
  suffix integer := 0;
  suffix_text text;
begin
  base_handle := coalesce(
    private.normalize_profile_handle(target_user_name),
    private.normalize_profile_handle(split_part(coalesce(target_email, ''), '@', 1)),
    private.normalize_profile_handle('user-' || left(replace(target_user_id::text, '-', ''), 8))
  );

  if base_handle is null or char_length(base_handle) < 3 then
    base_handle := 'user-' || left(replace(target_user_id::text, '-', ''), 8);
  end if;

  candidate_handle := left(base_handle, 32);

  while exists (
    select 1
    from public.profiles
    where lower(btrim(handle)) = candidate_handle
      and id <> target_user_id
  ) loop
    suffix := suffix + 1;
    suffix_text := '-' || suffix::text;
    candidate_handle := left(base_handle, greatest(3, 32 - char_length(suffix_text))) || suffix_text;
  end loop;

  return candidate_handle;
end;
$$;

revoke all on function private.create_profile_handle(uuid, text, text) from public, anon, authenticated;

do $$
declare
  target_profile record;
  normalized_handle text;
begin
  for target_profile in
    select id, user_name, email, handle
    from public.profiles
    order by created_at, id
  loop
    normalized_handle := private.normalize_profile_handle(target_profile.handle);

    if normalized_handle is null
      or char_length(normalized_handle) < 3
      or exists (
        select 1
        from public.profiles
        where lower(btrim(handle)) = normalized_handle
          and id <> target_profile.id
      )
    then
      normalized_handle := private.create_profile_handle(target_profile.id, target_profile.user_name, target_profile.email);
    end if;

    update public.profiles
    set handle = normalized_handle
    where id = target_profile.id;
  end loop;
end;
$$;

alter table public.profiles
  alter column handle set not null;

alter table public.profiles
  drop constraint if exists profiles_handle_not_blank,
  add constraint profiles_handle_not_blank
    check (char_length(btrim(handle)) between 3 and 32);

create unique index if not exists profiles_handle_normalized_unique_idx
  on public.profiles (lower(btrim(handle)));

create or replace function private.ensure_profile_handle()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  new.handle := private.normalize_profile_handle(new.handle);

  if new.handle is null or char_length(new.handle) < 3 then
    new.handle := private.create_profile_handle(new.id, new.user_name, new.email);
  end if;

  return new;
end;
$$;

revoke all on function private.ensure_profile_handle() from public, anon, authenticated;

drop trigger if exists ensure_profiles_handle on public.profiles;
create trigger ensure_profiles_handle
before insert or update of handle, user_name, email on public.profiles
for each row execute function private.ensure_profile_handle();

create table if not exists public.public_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null,
  user_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint public_profiles_handle_not_blank
    check (char_length(btrim(handle)) between 3 and 32)
);

create unique index if not exists public_profiles_handle_normalized_unique_idx
  on public.public_profiles (lower(btrim(handle)));

insert into public.public_profiles (
  id,
  handle,
  user_name,
  avatar_url,
  created_at,
  updated_at
)
select
  id,
  handle,
  user_name,
  avatar_url,
  created_at,
  updated_at
from public.profiles
on conflict (id) do update set
  handle = excluded.handle,
  user_name = excluded.user_name,
  avatar_url = excluded.avatar_url,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

create or replace function private.sync_public_profile()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if TG_OP = 'DELETE' then
    delete from public.public_profiles
    where id = old.id;
    return old;
  end if;

  insert into public.public_profiles (
    id,
    handle,
    user_name,
    avatar_url,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.handle,
    new.user_name,
    new.avatar_url,
    new.created_at,
    new.updated_at
  )
  on conflict (id) do update set
    handle = excluded.handle,
    user_name = excluded.user_name,
    avatar_url = excluded.avatar_url,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

revoke all on function private.sync_public_profile() from public, anon, authenticated;

drop trigger if exists sync_public_profile on public.profiles;
create trigger sync_public_profile
after insert or update of handle, user_name, avatar_url, updated_at or delete on public.profiles
for each row execute function private.sync_public_profile();

alter table public.public_profiles enable row level security;

drop policy if exists "public_profiles_select_public" on public.public_profiles;
create policy "public_profiles_select_public"
on public.public_profiles for select
using (true);

revoke all on public.public_profiles from public, anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
grant all on public.public_profiles to service_role;

drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_select_self_or_admin" on public.profiles;

create policy "profiles_select_self_or_admin"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin())
);

revoke select on public.profiles from public, anon;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

create or replace function public.is_user_name_available(
  target_user_name text,
  current_user_id uuid default null
)
returns boolean
language sql
stable
set search_path = public
as $$
  select btrim(coalesce(target_user_name, '')) <> ''
    and not exists (
      select 1
      from public.public_profiles
      where lower(btrim(user_name)) = lower(btrim(target_user_name))
        and (current_user_id is null or id <> current_user_id)
    );
$$;

grant execute on function public.is_user_name_available(text, uuid) to anon, authenticated;

create or replace function private.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  requested_user_name text;
begin
  requested_user_name := btrim(coalesce(
    new.raw_user_meta_data ->> 'user_name',
    split_part(new.email, '@', 1),
    '新用户'
  ));

  if requested_user_name = '' then
    requested_user_name := '新用户';
  end if;

  insert into public.profiles (id, email, user_name, handle)
  values (
    new.id,
    new.email,
    requested_user_name,
    private.create_profile_handle(new.id, requested_user_name, new.email)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user_profile() from public, anon, authenticated;

drop trigger if exists create_profile_for_new_auth_user on auth.users;
create trigger create_profile_for_new_auth_user
after insert on auth.users
for each row execute function private.handle_new_user_profile();
