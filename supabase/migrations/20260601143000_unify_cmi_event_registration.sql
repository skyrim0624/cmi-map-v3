-- 统一 CMI / 清迈客栈活动报名入口：
-- 1. 用户侧统一显示并使用 CMI Map 一键报名。
-- 2. 活动开始后不再允许新增报名。
-- 3. 名额限制继续由既有容量触发器兜底。

create schema if not exists private;

update public.cmi_events
set
  registration_label = 'CMI Map 一键报名',
  registration_enabled = true,
  registration_status = case
    when start_at is not null and start_at <= now() then 'closed'
    else 'open'
  end,
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and (
    is_cmi_related = true
    or event_type = 'cmi'
    or source_type = 'cmi'
    or venue_name ilike '%清迈客栈%'
    or area ilike '%清迈客栈%'
    or area ilike '%CMI%'
  );

drop policy if exists "cmi_event_registrations_insert_open_event" on public.cmi_event_registrations;

create policy "cmi_event_registrations_insert_open_event"
on public.cmi_event_registrations for insert
to anon, authenticated
with check (
  status = 'going'
  and (user_id is null or user_id = (select auth.uid()))
  and exists (
    select 1
    from public.cmi_events event
    where event.id = event_id
      and event.visibility_status = 'published'
      and event.registration_enabled = true
      and event.registration_status = 'open'
      and (event.start_at is null or event.start_at > now())
  )
);

create or replace function private.enforce_cmi_event_registration_window()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  event_start_at timestamp with time zone;
begin
  if new.status <> 'going' then
    return new;
  end if;

  select event.start_at
  into event_start_at
  from public.cmi_events event
  where event.id = new.event_id;

  if event_start_at is not null and event_start_at <= now() then
    raise exception '活动已经开始或结束，不能继续报名';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_cmi_event_registration_window() from public, anon, authenticated;

drop trigger if exists enforce_cmi_event_registration_window on public.cmi_event_registrations;
create trigger enforce_cmi_event_registration_window
before insert or update of event_id, status on public.cmi_event_registrations
for each row execute function private.enforce_cmi_event_registration_window();
