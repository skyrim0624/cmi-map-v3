alter table public.recommendations
  add column if not exists easter_icon_id text;

alter table public.recommendations
  drop constraint if exists recommendations_easter_icon_id_check;

alter table public.recommendations
  add constraint recommendations_easter_icon_id_check
  check (
    easter_icon_id is null
    or easter_icon_id ~ '^egg-v2-[0-9]{2}-[a-z0-9-]+$'
  );
