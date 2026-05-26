do $$
begin
  if exists (
    select 1
    from (
      select lower(btrim(user_name)) as normalized_user_name
      from public.profiles
      where user_name is not null
        and btrim(user_name) <> ''
      group by lower(btrim(user_name))
      having count(*) > 1
    ) duplicate_user_names
  ) then
    raise exception 'Cannot enforce unique profile user names while duplicates exist';
  end if;
end;
$$;

alter table public.profiles
  drop constraint if exists profiles_user_name_not_blank,
  add constraint profiles_user_name_not_blank
  check (user_name is null or btrim(user_name) <> '');

create unique index if not exists profiles_user_name_normalized_unique_idx
  on public.profiles (lower(btrim(user_name)))
  where user_name is not null and btrim(user_name) <> '';

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
      from public.profiles
      where lower(btrim(user_name)) = lower(btrim(target_user_name))
        and (current_user_id is null or id <> current_user_id)
    );
$$;

grant execute on function public.is_user_name_available(text, uuid) to anon, authenticated;

create schema if not exists private;

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

  insert into public.profiles (id, email, user_name)
  values (new.id, new.email, requested_user_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user_profile() from public, anon, authenticated;

drop trigger if exists create_profile_for_new_auth_user on auth.users;
create trigger create_profile_for_new_auth_user
after insert on auth.users
for each row execute function private.handle_new_user_profile();
