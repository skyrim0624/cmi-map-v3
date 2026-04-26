-- Bring the profiles table in line with the fields used by the app.
alter table public.profiles
  add column if not exists email text,
  add column if not exists user_name text default '新用户',
  add column if not exists role text not null default 'user',
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

alter table public.profiles
  drop constraint if exists profiles_role_check,
  add constraint profiles_role_check check (role in ('user', 'admin'));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' and new.role <> 'user' and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can create admin profiles';
  end if;

  if TG_OP = 'UPDATE' and old.role is distinct from new.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can change profile roles';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before insert or update on public.profiles
for each row execute function public.protect_profile_role();

alter table public.profiles enable row level security;
alter table public.recommendations enable row level security;
alter table public.upvotes enable row level security;

drop policy if exists "允许所有人看配置" on public.profiles;
drop policy if exists "允许所有人修改" on public.profiles;
drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_select_public"
on public.profiles for select
using (true);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "允许所有人看地点" on public.recommendations;
drop policy if exists "允许所有人发地点" on public.recommendations;
drop policy if exists "recommendations_select_public" on public.recommendations;
drop policy if exists "recommendations_insert_own" on public.recommendations;
drop policy if exists "recommendations_update_own_or_admin" on public.recommendations;
drop policy if exists "recommendations_delete_own_or_admin" on public.recommendations;

create policy "recommendations_select_public"
on public.recommendations for select
using (true);

create policy "recommendations_insert_own"
on public.recommendations for insert
to authenticated
with check (auth.uid() = user_id);

create policy "recommendations_update_own_or_admin"
on public.recommendations for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create policy "recommendations_delete_own_or_admin"
on public.recommendations for delete
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "允许所有人看点赞" on public.upvotes;
drop policy if exists "允许所有人点赞" on public.upvotes;
drop policy if exists "upvotes_select_public" on public.upvotes;
drop policy if exists "upvotes_insert_own" on public.upvotes;
drop policy if exists "upvotes_delete_own" on public.upvotes;

create policy "upvotes_select_public"
on public.upvotes for select
using (true);

create policy "upvotes_insert_own"
on public.upvotes for insert
to authenticated
with check (auth.uid() = user_id);

create policy "upvotes_delete_own"
on public.upvotes for delete
to authenticated
using (auth.uid() = user_id);
