alter table public.blackboard_posts
  drop constraint if exists blackboard_posts_category_check;

update public.blackboard_posts
set category = 'share'
where category not in ('companion', 'help', 'share');

alter table public.blackboard_posts
  add constraint blackboard_posts_category_check
  check (category in ('companion', 'help', 'share'));

alter table public.blackboard_posts
  drop constraint if exists blackboard_posts_title_check;

alter table public.blackboard_posts
  add constraint blackboard_posts_title_check
  check (char_length(trim(title)) between 1 and 48);

alter table public.blackboard_posts
  drop constraint if exists blackboard_posts_body_check;

alter table public.blackboard_posts
  add constraint blackboard_posts_body_check
  check (char_length(trim(body)) between 1 and 600);

alter table public.blackboard_posts
  add column if not exists contact_label text not null default '';

alter table public.blackboard_posts
  add column if not exists image_urls text[] not null default array[]::text[];

alter table public.blackboard_posts
  alter column time_label set default '',
  alter column location_label set default '',
  alter column people_label set default '';

create table if not exists public.blackboard_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blackboard_posts(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists blackboard_comments_post_created_idx
  on public.blackboard_comments (post_id, created_at);

create index if not exists blackboard_comments_author_id_idx
  on public.blackboard_comments (author_id);

drop trigger if exists touch_blackboard_comments_updated_at on public.blackboard_comments;
create trigger touch_blackboard_comments_updated_at
before update on public.blackboard_comments
for each row execute function public.touch_updated_at();

alter table public.blackboard_comments enable row level security;

drop policy if exists "blackboard_comments_select_public" on public.blackboard_comments;
drop policy if exists "blackboard_comments_insert_own" on public.blackboard_comments;
drop policy if exists "blackboard_comments_update_own_or_admin" on public.blackboard_comments;
drop policy if exists "blackboard_comments_delete_own_or_admin" on public.blackboard_comments;

create policy "blackboard_comments_select_public"
on public.blackboard_comments for select
using (true);

create policy "blackboard_comments_insert_own"
on public.blackboard_comments for insert
to authenticated
with check (auth.uid() = author_id);

create policy "blackboard_comments_update_own_or_admin"
on public.blackboard_comments for update
to authenticated
using (auth.uid() = author_id or public.is_admin())
with check (auth.uid() = author_id or public.is_admin());

create policy "blackboard_comments_delete_own_or_admin"
on public.blackboard_comments for delete
to authenticated
using (auth.uid() = author_id or public.is_admin());

grant select on public.blackboard_comments to anon, authenticated;
grant insert, update, delete on public.blackboard_comments to authenticated;
grant all on public.blackboard_comments to service_role;
