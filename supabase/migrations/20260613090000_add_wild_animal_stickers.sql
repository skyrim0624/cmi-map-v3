alter table public.recommendations
  add column if not exists animal_sticker_url text,
  add column if not exists animal_common_name text,
  add column if not exists animal_scientific_name text,
  add column if not exists animal_subject_box jsonb;

create index if not exists recommendations_animal_sticker_url_idx
  on public.recommendations (animal_sticker_url)
  where animal_sticker_url is not null;
