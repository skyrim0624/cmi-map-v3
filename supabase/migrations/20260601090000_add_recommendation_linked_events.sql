alter table public.recommendations
  add column if not exists linked_event_id text,
  add column if not exists linked_event_title text;

create index if not exists recommendations_linked_event_id_idx
  on public.recommendations (linked_event_id)
  where linked_event_id is not null;
