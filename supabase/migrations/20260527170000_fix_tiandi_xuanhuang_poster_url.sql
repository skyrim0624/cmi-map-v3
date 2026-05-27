-- 修复《天地玄黄》活动封面来源：改为稳定的 Supabase Storage URL
-- 执行时间：2026-05-27T17:00:00+07:00

update public.cmi_events
set
  cover_image_url = 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-tiandi-xuanhuang-baraka-2026-05-30.png',
  raw_source_payload = case
    when raw_source_payload is null then null
    else jsonb_set(
      raw_source_payload,
      '{posterUrl}',
      to_jsonb('https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-tiandi-xuanhuang-baraka-2026-05-30.png'::text),
      true
    )
  end,
  updated_at = timezone('utc'::text, now())
where id = 'cmi-tiandi-xuanhuang-baraka-2026-05-30';
