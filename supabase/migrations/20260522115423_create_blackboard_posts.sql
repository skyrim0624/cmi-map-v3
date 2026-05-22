create table if not exists public.blackboard_posts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('companion', 'help', 'ride')),
  title text not null check (char_length(trim(title)) between 1 and 24),
  body text not null check (char_length(trim(body)) between 1 and 120),
  time_label text not null default '时间待定',
  location_label text not null default '地点待定',
  people_label text not null default '0',
  linked_event_id text references public.cmi_events(id) on delete set null,
  linked_event_title text,
  linked_place_name text,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists blackboard_posts_created_at_idx
  on public.blackboard_posts (created_at desc);

create index if not exists blackboard_posts_category_created_at_idx
  on public.blackboard_posts (category, created_at desc);

create index if not exists blackboard_posts_author_id_idx
  on public.blackboard_posts (author_id);

drop trigger if exists touch_blackboard_posts_updated_at on public.blackboard_posts;
create trigger touch_blackboard_posts_updated_at
before update on public.blackboard_posts
for each row execute function public.touch_updated_at();

alter table public.blackboard_posts enable row level security;

drop policy if exists "blackboard_posts_select_public" on public.blackboard_posts;
drop policy if exists "blackboard_posts_insert_own" on public.blackboard_posts;
drop policy if exists "blackboard_posts_update_own_or_admin" on public.blackboard_posts;
drop policy if exists "blackboard_posts_delete_own_or_admin" on public.blackboard_posts;

create policy "blackboard_posts_select_public"
on public.blackboard_posts for select
using (true);

create policy "blackboard_posts_insert_own"
on public.blackboard_posts for insert
to authenticated
with check (auth.uid() = author_id);

create policy "blackboard_posts_update_own_or_admin"
on public.blackboard_posts for update
to authenticated
using (auth.uid() = author_id or public.is_admin())
with check (auth.uid() = author_id or public.is_admin());

create policy "blackboard_posts_delete_own_or_admin"
on public.blackboard_posts for delete
to authenticated
using (auth.uid() = author_id or public.is_admin());

grant select on public.blackboard_posts to anon, authenticated;
grant insert, update, delete on public.blackboard_posts to authenticated;
grant all on public.blackboard_posts to service_role;
