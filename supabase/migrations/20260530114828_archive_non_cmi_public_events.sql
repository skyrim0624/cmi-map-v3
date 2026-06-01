-- 公开活动范围收窄为 CMI / 清迈客栈社区活动
-- 执行时间：2026-05-30T11:48:28+07:00。
-- 业务口径：
-- - 当前 CMI Map 活动入口只公开“我们清迈客栈 / CMI 社区”的活动。
-- - 城市活动、政府活动、场地方活动、稳定市集、普通用户发布且非清迈客栈/CMI 的活动先从公开架上移走。
-- - 这些活动保留数据库记录和审计信息，但设置为 archived，不再进入普通用户 published 活动列表。

update public.cmi_events
set
  visibility_status = 'archived',
  registration_status = 'closed',
  next_check_before = null,
  last_checked_at = '2026-05-30T11:48:28+07:00',
  raw_source_payload = coalesce(raw_source_payload, '{}'::jsonb) || jsonb_build_object(
    'publicScopePolicy', 'cmi_inn_and_cmi_community_only',
    'publicScopePolicyCheckedAt', '2026-05-30T11:48:28+07:00',
    'publicScopePolicyReason', '用户确认当前只公开清迈客栈 / CMI 社区活动，非客栈活动先从公开架上移走。'
  ),
  updated_at = timezone('utc'::text, now())
where visibility_status = 'published'
  and not (
    is_cmi_related = true
    or source_type = 'cmi'
    or venue_name ilike '%清迈客栈%'
    or area ilike '%清迈客栈%'
  );
