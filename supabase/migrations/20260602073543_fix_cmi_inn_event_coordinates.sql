-- NOTE: 修正历史清迈客栈活动误指向古城区域的旧坐标。
update public.cmi_events
set
  latitude = 18.7932,
  longitude = 98.9874
where
  (
    venue_name ilike '%清迈客栈%'
    or area ilike '%清迈客栈%'
    or venue_name ilike '%CMI%'
    or area ilike '%CMI%'
  )
  and (
    latitude = 18.7919513784612
    and longitude = 98.9946296215124
  );
