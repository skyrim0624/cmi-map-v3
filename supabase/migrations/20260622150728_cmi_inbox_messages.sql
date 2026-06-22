create table if not exists public.cmi_inbox_messages (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text not null default 'CMI 朋友',
  kind text not null default 'comment',
  title text not null default '',
  body text not null check (char_length(trim(body)) between 1 and 500),
  source_type text not null default 'recommendation',
  source_id uuid,
  source_label text not null default '',
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint cmi_inbox_messages_kind_check
    check (kind in ('comment', 'reply', 'system')),
  constraint cmi_inbox_messages_source_type_check
    check (source_type in ('recommendation', 'blackboard_post', 'system')),
  constraint cmi_inbox_messages_no_self_message_check
    check (sender_id is null or sender_id <> recipient_id)
);

create index if not exists cmi_inbox_messages_recipient_created_idx
  on public.cmi_inbox_messages (recipient_id, created_at desc);

create index if not exists cmi_inbox_messages_unread_idx
  on public.cmi_inbox_messages (recipient_id, read_at)
  where read_at is null;

alter table public.cmi_inbox_messages enable row level security;

drop policy if exists "cmi_inbox_messages_select_own" on public.cmi_inbox_messages;
drop policy if exists "cmi_inbox_messages_insert_from_self" on public.cmi_inbox_messages;
drop policy if exists "cmi_inbox_messages_update_read_own" on public.cmi_inbox_messages;

create policy "cmi_inbox_messages_select_own"
on public.cmi_inbox_messages for select
to authenticated
using (auth.uid() = recipient_id);

create policy "cmi_inbox_messages_insert_from_self"
on public.cmi_inbox_messages for insert
to authenticated
with check (
  auth.uid() = sender_id
  and sender_id <> recipient_id
);

create policy "cmi_inbox_messages_update_read_own"
on public.cmi_inbox_messages for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

grant select, insert on public.cmi_inbox_messages to authenticated;
grant update (read_at) on public.cmi_inbox_messages to authenticated;
grant all on public.cmi_inbox_messages to service_role;
