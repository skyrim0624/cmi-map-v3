create table if not exists public.blackboard_title_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  achievement_title_id text not null check (
    achievement_title_id in (
      'sports-student',
      'sports-maniac',
      'muay-thai-fighter',
      'northern-thai-stomach',
      'coffee-lifeline',
      'survival-master'
    )
  ),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

drop trigger if exists touch_blackboard_title_preferences_updated_at on public.blackboard_title_preferences;
create trigger touch_blackboard_title_preferences_updated_at
before update on public.blackboard_title_preferences
for each row execute function public.touch_updated_at();

alter table public.blackboard_title_preferences enable row level security;

drop policy if exists "blackboard_title_preferences_select_public" on public.blackboard_title_preferences;
drop policy if exists "blackboard_title_preferences_insert_own" on public.blackboard_title_preferences;
drop policy if exists "blackboard_title_preferences_update_own" on public.blackboard_title_preferences;
drop policy if exists "blackboard_title_preferences_delete_own" on public.blackboard_title_preferences;

create policy "blackboard_title_preferences_select_public"
on public.blackboard_title_preferences for select
using (true);

create policy "blackboard_title_preferences_insert_own"
on public.blackboard_title_preferences for insert
to authenticated
with check (auth.uid() = user_id);

create policy "blackboard_title_preferences_update_own"
on public.blackboard_title_preferences for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "blackboard_title_preferences_delete_own"
on public.blackboard_title_preferences for delete
to authenticated
using (auth.uid() = user_id);

grant select on public.blackboard_title_preferences to anon, authenticated;
grant insert, update, delete on public.blackboard_title_preferences to authenticated;
grant all on public.blackboard_title_preferences to service_role;
