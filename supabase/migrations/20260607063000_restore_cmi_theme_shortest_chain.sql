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
  theme_config jsonb not null default '{}'::jsonb,
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
  sort_order integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.cmi_theme_submissions (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.cmi_map_themes(id) on delete cascade,
  task_id uuid references public.cmi_theme_tasks(id) on delete set null,
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint cmi_theme_submissions_unique_recommendation
    unique (theme_id, recommendation_id)
);

create index if not exists cmi_map_themes_status_idx
  on public.cmi_map_themes (status, starts_at desc);

create index if not exists cmi_theme_tasks_theme_idx
  on public.cmi_theme_tasks (theme_id, sort_order);

create index if not exists cmi_theme_submissions_theme_idx
  on public.cmi_theme_submissions (theme_id, created_at desc);

create index if not exists cmi_theme_submissions_user_idx
  on public.cmi_theme_submissions (user_id, created_at desc);

drop trigger if exists touch_cmi_map_themes_updated_at on public.cmi_map_themes;
create trigger touch_cmi_map_themes_updated_at
before update on public.cmi_map_themes
for each row execute function public.touch_updated_at();

alter table public.cmi_map_themes enable row level security;
alter table public.cmi_theme_tasks enable row level security;
alter table public.cmi_theme_submissions enable row level security;

drop policy if exists "cmi_map_themes_select_public" on public.cmi_map_themes;
create policy "cmi_map_themes_select_public"
on public.cmi_map_themes for select
using (status in ('active', 'ended', 'archived') or (select public.is_admin()));

drop policy if exists "cmi_theme_tasks_select_public" on public.cmi_theme_tasks;
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

drop policy if exists "cmi_theme_submissions_select_public" on public.cmi_theme_submissions;
create policy "cmi_theme_submissions_select_public"
on public.cmi_theme_submissions for select
using (true);

drop policy if exists "cmi_theme_submissions_insert_own" on public.cmi_theme_submissions;
create policy "cmi_theme_submissions_insert_own"
on public.cmi_theme_submissions for insert
with check (auth.uid() = user_id);

insert into public.cmi_map_themes (
  slug,
  title,
  summary,
  description,
  status,
  starts_at,
  ends_at,
  theme_config
)
values (
  'wild-chiang-mai',
  '神奇动物在哪里',
  '上传你在清迈遇到的奇妙动物。',
  '清迈奇妙生物图鉴第一期：拍下你在清迈遇到的动物，写一句你看到它时的感觉。',
  'active',
  timezone('utc'::text, now()),
  timezone('utc'::text, now()) + interval '21 days',
  jsonb_build_object(
    'primaryColor', '#4f8f5b',
    'accentColor', '#f1c64c'
  )
)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  description = excluded.description,
  status = excluded.status,
  theme_config = excluded.theme_config,
  updated_at = timezone('utc'::text, now());

insert into public.cmi_theme_tasks (
  theme_id,
  title,
  description,
  sort_order
)
select
  theme.id,
  '上传你在清迈遇到的奇妙动物',
  '拍照打卡，并写一句你看到它时的感觉。',
  1
from public.cmi_map_themes theme
where theme.slug = 'wild-chiang-mai'
  and not exists (
    select 1
    from public.cmi_theme_tasks task
    where task.theme_id = theme.id
      and task.title = '上传你在清迈遇到的奇妙动物'
  );
