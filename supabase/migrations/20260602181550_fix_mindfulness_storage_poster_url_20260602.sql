-- 修正 2026-06-02 正念一小时远程海报 URL。
-- 背景：CLI 管理员发布先上传了 Supabase Storage 海报；随后审计迁移 upsert
-- 将 cover_image_url 覆盖成了本地静态路径。远程公开库应使用已验证的 Storage URL。

update public.cmi_events
set
  cover_image_url = 'https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-mindfulness-hour-singing-bowl-2026-06-04-1780398869663.jpg',
  raw_source_payload = coalesce(raw_source_payload, '{}'::jsonb) || '{
    "storagePosterUrl": "https://sfpcpxlxslnulzlmjcby.supabase.co/storage/v1/object/public/cmi-event-posters/posters/cmi-mindfulness-hour-singing-bowl-2026-06-04-1780398869663.jpg",
    "posterUrlFix": {
      "fixedAt": "2026-06-02T18:15:50+07:00",
      "reason": "Preserve Supabase Storage poster URL after audit migration overwrote cover_image_url with local static path."
    }
  }'::jsonb,
  updated_at = timezone('utc'::text, now())
where id = 'cmi-mindfulness-hour-singing-bowl-2026-06-04';
