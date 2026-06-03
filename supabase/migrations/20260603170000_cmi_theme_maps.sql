create table if not exists public.cmi_map_themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  description text,
  status text not null default 'draft',
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  cover_image_url text,
  share_template_key text,
  theme_config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint cmi_map_themes_status_check
    check (status in ('draft', 'active', 'ended', 'archived')),
  constraint cmi_map_themes_slug_check
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,80}$')
);

create table if not exists public.cmi_theme_tasks (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.cmi_map_themes(id) on delete cascade,
  title text not null,
  description text,
  target_count integer,
  requires_image boolean not null default true,
  reward_badge_id text,
  sort_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint cmi_theme_tasks_target_count_check
    check (target_count is null or target_count > 0)
);

create table if not exists public.cmi_theme_submissions (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.cmi_map_themes(id) on delete cascade,
  task_id uuid references public.cmi_theme_tasks(id) on delete set null,
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'published',
  is_featured boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_at timestamp with time zone,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint cmi_theme_submissions_status_check
    check (status in ('published', 'hidden', 'removed')),
  constraint cmi_theme_submissions_unique_recommendation
    unique (theme_id, recommendation_id)
);

create index if not exists cmi_map_themes_status_idx
  on public.cmi_map_themes (status, starts_at desc);

create index if not exists cmi_theme_tasks_theme_idx
  on public.cmi_theme_tasks (theme_id, sort_order);

create index if not exists cmi_theme_submissions_theme_idx
  on public.cmi_theme_submissions (theme_id, status, created_at desc);

create index if not exists cmi_theme_submissions_user_idx
  on public.cmi_theme_submissions (user_id, created_at desc);

drop trigger if exists touch_cmi_map_themes_updated_at on public.cmi_map_themes;
create trigger touch_cmi_map_themes_updated_at
before update on public.cmi_map_themes
for each row execute function public.touch_updated_at();

alter table public.cmi_map_themes enable row level security;
alter table public.cmi_theme_tasks enable row level security;
alter table public.cmi_theme_submissions enable row level security;

create policy "cmi_map_themes_select_public"
on public.cmi_map_themes for select
using (status in ('active', 'ended', 'archived') or (select public.is_admin()));

create policy "cmi_map_themes_manage_admin"
on public.cmi_map_themes for all
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "cmi_theme_tasks_select_public"
on public.cmi_theme_tasks for select
using (
  exists (
    select 1
    from public.cmi_map_themes theme
    where theme.id = cmi_theme_tasks.theme_id
      and (theme.status in ('active', 'ended', 'archived') or (select public.is_admin()))
  )
);

create policy "cmi_theme_tasks_manage_admin"
on public.cmi_theme_tasks for all
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "cmi_theme_submissions_select_public"
on public.cmi_theme_submissions for select
using (
  status = 'published'
  or (select public.is_admin())
);

create policy "cmi_theme_submissions_insert_own"
on public.cmi_theme_submissions for insert
with check (
  auth.uid() = user_id
  and status = 'published'
);

create policy "cmi_theme_submissions_manage_admin"
on public.cmi_theme_submissions for update
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "cmi_theme_submissions_delete_admin"
on public.cmi_theme_submissions for delete
using ((select public.is_admin()));

insert into public.cmi_map_themes (
  slug,
  title,
  summary,
  description,
  status,
  starts_at,
  ends_at,
  share_template_key,
  theme_config
)
values (
  'wild-chiang-mai',
  '神奇动物在哪里',
  '上传你在清迈遇到的奇妙动物。',
  '上传你在清迈遇到的奇妙动物。',
  'active',
  timezone('utc'::text, now()),
  timezone('utc'::text, now()) + interval '14 days',
  'wild-chiang-mai',
  jsonb_build_object(
    'primaryColor', '#4f8f5b',
    'accentColor', '#f1c64c'
  )
)
on conflict (slug) do nothing;

insert into public.cmi_theme_tasks (
  theme_id,
  title,
  description,
  target_count,
  requires_image,
  sort_order
)
select
  theme.id,
  '上传 3 张你在清迈遇到的奇妙动物',
  '上传 3 张你在清迈遇到的奇妙动物',
  3,
  true,
  1
from public.cmi_map_themes theme
where theme.slug = 'wild-chiang-mai'
on conflict do nothing;
