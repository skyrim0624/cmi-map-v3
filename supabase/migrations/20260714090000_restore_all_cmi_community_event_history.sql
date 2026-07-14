-- 恢复此前已上架的 CMI / 清迈客栈活动历史公开可见。
-- 已结束活动保留在活动页“已结束”分组和首页“CMI 社区新动态”，报名保持关闭。

update public.cmi_events
set
  visibility_status = 'published',
  registration_status = 'closed',
  next_check_before = null,
  last_checked_at = '2026-07-14T12:00:00+07:00',
  raw_source_payload = coalesce(raw_source_payload, '{}'::jsonb) || jsonb_build_object(
    'historyVisibilityRestoredAt', '2026-07-14T12:00:00+07:00',
    'historyVisibilityRestoredReason', '恢复此前已上架的 CMI 社区活动，使其可在活动页和首页社区新动态中查看。'
  ),
  updated_at = timezone('utc'::text, now())
where is_cmi_related = true
   or source_type = 'cmi'
   or venue_name = '清迈客栈'
   or venue_name = 'CMI';
