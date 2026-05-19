INSERT INTO public.stickers (name, icon_url, is_native)
SELECT name, icon_url, true
FROM (
  VALUES
    ('好耶', '/stickers/stamp-good-lucky.png'),
    ('警觉', '/stickers/stamp-caution-et.png'),
    ('一般', '/stickers/stamp-neutral-milan.png'),
    ('戳一下', '/stickers/stamp-paw.png'),
    ('客栈精选', '/stickers/stamp-cmi-selected.png'),
    ('种草', '/stickers/stamp-grass.png')
) AS new_stickers(name, icon_url)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.stickers existing_sticker
  WHERE existing_sticker.icon_url = new_stickers.icon_url
);
