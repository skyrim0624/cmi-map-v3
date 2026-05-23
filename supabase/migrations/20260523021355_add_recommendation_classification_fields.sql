alter table public.recommendations
  add column if not exists input_category_id text,
  add column if not exists primary_intent_id text,
  add column if not exists place_type_ids text[] not null default array[]::text[],
  add column if not exists detail_tag_ids text[] not null default array[]::text[],
  add column if not exists classification_status text,
  add column if not exists classification_source text,
  add column if not exists classification_confidence numeric,
  add column if not exists classified_at timestamptz;

alter table public.recommendations
  drop constraint if exists recommendations_input_category_id_check,
  drop constraint if exists recommendations_primary_intent_id_check,
  drop constraint if exists recommendations_classification_confidence_range;

alter table public.recommendations
  add constraint recommendations_input_category_id_check
  check (
    input_category_id is null
    or input_category_id = any (
      array[
        'eat',
        'play',
        'work',
        'shopping',
        'relax',
        'sport',
        'errands',
        'easter',
        'landmark',
        'cmi-inn'
      ]
    )
  ),
  add constraint recommendations_primary_intent_id_check
  check (
    primary_intent_id is null
    or primary_intent_id = any (
      array[
        'eat',
        'play',
        'work',
        'shopping',
        'relax',
        'sport',
        'errands',
        'easter'
      ]
    )
  ),
  add constraint recommendations_classification_confidence_range
  check (
    classification_confidence is null
    or (classification_confidence >= 0 and classification_confidence <= 1)
  );

update public.recommendations
set
  input_category_id = coalesce(
    input_category_id,
    case category
      when '吃饭' then 'eat'
      when '咖啡' then 'work'
      when '户外' then 'play'
      when '景点' then 'landmark'
      when '购物' then 'shopping'
      when '市集' then 'shopping'
      when '马杀鸡' then 'relax'
      when '运动' then 'sport'
      when '酒吧' then 'play'
      when '身心' then 'relax'
      when '生存指南' then 'errands'
      when '彩蛋' then 'easter'
      when '清迈客栈' then 'cmi-inn'
      else null
    end
  ),
  primary_intent_id = coalesce(
    primary_intent_id,
    case category
      when '吃饭' then 'eat'
      when '咖啡' then 'work'
      when '户外' then 'play'
      when '景点' then 'play'
      when '购物' then 'shopping'
      when '市集' then 'shopping'
      when '马杀鸡' then 'relax'
      when '运动' then 'sport'
      when '酒吧' then 'play'
      when '身心' then 'relax'
      when '生存指南' then 'errands'
      when '彩蛋' then 'easter'
      else null
    end
  )
where input_category_id is null or primary_intent_id is null;

create index if not exists recommendations_input_category_id_idx
  on public.recommendations (input_category_id);

create index if not exists recommendations_primary_intent_id_idx
  on public.recommendations (primary_intent_id);

create index if not exists recommendations_classification_status_idx
  on public.recommendations (classification_status);

create index if not exists recommendations_classified_at_idx
  on public.recommendations (classified_at desc);
