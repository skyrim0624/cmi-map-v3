-- Ensure every published CMI / 清迈客栈 event has a publicly reachable cover image.
-- The previous sync left older rows with null cover_image_url and newer rows pointing at
-- local static assets that had not reached production yet.

with cover_images(id, cover_url) as (
  values
    ('cmi-ai-nomad-community-2026-05-20', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-ai-nomad-community-2026-05-20.jpg'),
    ('cmi-mindfulness-hour-2026-05-21', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-mindfulness-hour-2026-05-21.jpg'),
    ('cmi-friday-afternoon-yoga-2026-05-22', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-friday-afternoon-yoga-2026-05-22.jpg'),
    ('cmi-kongxiang-canteen-2026-05-22', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-kongxiang-canteen-2026-05-22.jpg'),
    ('cmi-song-of-the-sea-screening-2026-05-23', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-song-of-the-sea-screening-2026-05-23.jpg'),
    ('cmi-swap-market-2026-05-24', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-swap-market-2026-05-24.jpg'),
    ('cmi-ai-open-mic-vol-04-2026-05-24', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-ai-open-mic-vol-04-2026-05-24.jpg'),
    ('cmi-mindfulness-hour-2026-05-28', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-mindfulness-hour-2026-05-28.png'),
    ('cmi-summer-heart-yin-yoga-2026-05-29', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-summer-heart-yin-yoga-2026-05-29.png'),
    ('cmi-kongxiang-canteen-2026-05-29', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-kongxiang-canteen-2026-05-29.png'),
    ('cmi-financial-literacy-sharing-2026-05-29', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-financial-literacy-sharing-2026-05-29.png'),
    ('cmi-doi-suthep-night-walk-2026-05-30', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-doi-suthep-night-walk-2026-05-30.png'),
    ('cmi-tiandi-xuanhuang-baraka-2026-05-30', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-tiandi-xuanhuang-baraka-2026-05-30.png'),
    ('cmi-waytoagi-codex-maker-lab-2026-05-31', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-waytoagi-codex-maker-lab-2026-05-31.png'),
    ('cmi-five-minute-music-kid-a-2026-06-02', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-five-minute-music-kid-a-2026-06-02.png'),
    ('cmi-talk-fathers-day-speaker-call-2026-06-07', 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-map-card-fix-20260530/cmi-talk-fathers-day-speaker-call-2026-06-07.png')
)
update public.cmi_events as event
set
  cover_image_url = cover_images.cover_url,
  raw_source_payload = coalesce(event.raw_source_payload, '{}'::jsonb)
    || jsonb_build_object(
      'posterUrl', cover_images.cover_url,
      'coverImageRepair', '2026-05-30T12:14:08+07:00',
      'coverImageRepairReason', 'Ensure public activity cards load real image assets independent of frontend static deployment',
      'assetSource', 'supabase_storage_card_fix'
    ),
  updated_at = now()
from cover_images
where event.id = cover_images.id
  and event.visibility_status = 'published'
  and (
    event.is_cmi_related is true
    or event.venue_name ilike '%清迈客栈%'
    or event.source_type = 'cmi'
  );
