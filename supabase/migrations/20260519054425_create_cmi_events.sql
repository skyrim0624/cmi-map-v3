create table if not exists public.cmi_events (
  id text primary key,
  title text not null,
  event_type text not null,
  start_at timestamp with time zone,
  end_at timestamp with time zone,
  timezone text not null default 'Asia/Bangkok',
  recurrence jsonb,
  stable_schedule text,
  venue_name text not null,
  area text not null default '',
  latitude double precision,
  longitude double precision,
  price_label text not null default '待确认',
  registration_label text not null default '待确认',
  source_type text not null,
  source_label text not null default '',
  source_url text,
  host_name text not null default '',
  language text not null default '',
  suitable_for text[] not null default array[]::text[],
  is_cmi_related boolean not null default false,
  is_verified boolean not null default false,
  verification_status text not null default 'needs-review',
  visibility_status text not null default 'draft',
  last_checked_at timestamp with time zone,
  next_check_before timestamp with time zone,
  reliability_note text not null default '',
  tags text[] not null default array[]::text[],
  summary text not null default '',
  ai_payload jsonb not null default '{}'::jsonb,
  raw_source_payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint cmi_events_event_type_check check (
    event_type in (
      'cmi',
      'workshop',
      'exhibition',
      'market',
      'music',
      'meetup',
      'festival',
      'wellness',
      'meditation',
      'sport',
      'tech',
      'stable'
    )
  ),
  constraint cmi_events_source_type_check check (
    source_type in (
      'cmi',
      'official',
      'government',
      'venue',
      'community',
      'stable-local',
      'manual',
      'ai'
    )
  ),
  constraint cmi_events_verification_status_check check (
    verification_status in (
      'verified',
      'needs-review',
      'stable-recurring',
      'ai-candidate',
      'rejected'
    )
  ),
  constraint cmi_events_visibility_status_check check (
    visibility_status in ('draft', 'published', 'archived')
  ),
  constraint cmi_events_time_range_check check (
    end_at is null or start_at is null or end_at >= start_at
  ),
  constraint cmi_events_recurrence_shape_check check (
    recurrence is null
    or (
      jsonb_typeof(recurrence) = 'object'
      and recurrence ? 'weekdays'
      and recurrence ? 'startTime'
    )
  )
);

create index if not exists cmi_events_visibility_start_idx
  on public.cmi_events (visibility_status, start_at);

create index if not exists cmi_events_type_idx
  on public.cmi_events (event_type);

create index if not exists cmi_events_verification_idx
  on public.cmi_events (verification_status);

create index if not exists cmi_events_next_check_idx
  on public.cmi_events (next_check_before)
  where next_check_before is not null;

create index if not exists cmi_events_tags_idx
  on public.cmi_events using gin (tags);

create index if not exists cmi_events_suitable_for_idx
  on public.cmi_events using gin (suitable_for);

create index if not exists cmi_events_recurrence_idx
  on public.cmi_events using gin (recurrence);

drop trigger if exists touch_cmi_events_updated_at on public.cmi_events;
create trigger touch_cmi_events_updated_at
before update on public.cmi_events
for each row execute function public.touch_updated_at();

alter table public.cmi_events enable row level security;

drop policy if exists "cmi_events_select_published" on public.cmi_events;
drop policy if exists "cmi_events_admin_select" on public.cmi_events;
drop policy if exists "cmi_events_admin_insert" on public.cmi_events;
drop policy if exists "cmi_events_admin_update" on public.cmi_events;
drop policy if exists "cmi_events_admin_delete" on public.cmi_events;

create policy "cmi_events_select_published"
on public.cmi_events for select
using (visibility_status = 'published');

create policy "cmi_events_admin_select"
on public.cmi_events for select
to authenticated
using (public.is_admin());

create policy "cmi_events_admin_insert"
on public.cmi_events for insert
to authenticated
with check (public.is_admin());

create policy "cmi_events_admin_update"
on public.cmi_events for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "cmi_events_admin_delete"
on public.cmi_events for delete
to authenticated
using (public.is_admin());

grant select on public.cmi_events to anon, authenticated;
grant insert, update, delete on public.cmi_events to authenticated;
grant all on public.cmi_events to service_role;

insert into public.cmi_events (
  id,
  title,
  event_type,
  start_at,
  end_at,
  recurrence,
  stable_schedule,
  venue_name,
  area,
  price_label,
  registration_label,
  source_type,
  source_label,
  source_url,
  host_name,
  language,
  suitable_for,
  is_cmi_related,
  is_verified,
  verification_status,
  visibility_status,
  last_checked_at,
  next_check_before,
  reliability_note,
  tags,
  summary
)
values
  (
    'cmi-ai-nomad-community-2026-05-20',
    'AI 时代，数智游民社区发展趋势探讨',
    'cmi',
    '2026-05-20T19:00:00+07:00',
    '2026-05-20T21:30:00+07:00',
    null,
    null,
    '清迈客栈',
    'CMI / 清迈客栈',
    '免费参与',
    'Luma 报名',
    'cmi',
    'CMI 活动公告',
    'https://luma.com/ztpb14f8?tk=OBPFun',
    'CMI 社区',
    '中文',
    array['想认识人', 'AI 创业者', '数字游民', '社区建设者'],
    true,
    true,
    'verified',
    'published',
    '2026-05-19T11:30:00+07:00',
    '2026-05-20T12:00:00+07:00',
    '来自 CMI 自有活动公告，时间和报名链接需要活动当天中午前再核一次。',
    array['CMI', '分享会', '中文友好', '免费', '科技', 'AI'],
    '一场围绕 AI 时代数字游民社区和真实实践展开的分享与讨论，适合想和 CMI 发生连接的人。'
  ),
  (
    'jing-jai-weekend-market',
    'Jing Jai 周末市集',
    'market',
    null,
    null,
    '{"weekdays":[0,6],"startTime":"06:30","endTime":"15:00","label":"每周六、周日早上到下午"}'::jsonb,
    '每周六、周日 06:30-15:00',
    'Jing Jai Market',
    'JJ Market / Chang Phueak',
    '免费入场',
    '直接去',
    'stable-local',
    'Citylife / Jing Jai 周末源',
    'https://www.chiangmaicitylife.com/clg/our-city/how-jing-jai-market-is-paving-the-way-for-sustainable-development-in-chiang-mai/',
    'Jing Jai Market',
    '泰语 / 英语',
    array['第一次来清迈', '周末早上', '市集', '拍照'],
    false,
    true,
    'stable-recurring',
    'published',
    '2026-05-19T12:35:00+07:00',
    '2026-05-23T08:00:00+07:00',
    'Jing Jai 项目每日有店铺，周末市集本身为周六周日开放；具体摊位和特别主题仍需每周复核。',
    array['市集', '周末', '早上', '出片'],
    '清迈周末很稳定的市集选择，适合早上去吃点东西、看手作、买小物，作为周末半天路线的起点。'
  ),
  (
    'saturday-walking-street',
    '周六步行街',
    'market',
    null,
    null,
    '{"weekdays":[6],"startTime":"16:00","endTime":"23:00","label":"每周六傍晚到晚上"}'::jsonb,
    '每周六 16:00-23:00',
    'Wua Lai Road',
    '古城南侧',
    '免费入场',
    '直接去',
    'stable-local',
    'LoveThailand 核查',
    'https://www.lovethailand.org/travel/en/1-Chiang-Mai/14-Wua-Lai-Walking-Street.html',
    '本地市集',
    '泰语 / 英语',
    array['周末', '晚上', '市集', '手作'],
    false,
    true,
    'stable-recurring',
    'published',
    '2026-05-19T12:35:00+07:00',
    '2026-05-23T17:00:00+07:00',
    '稳定夜市源，适合不知道晚上去哪时兜底；雨季和节假日需当天复核。',
    array['夜市', '周末', '手作', '晚上'],
    '如果刚好在周六晚上，这是比随机找商场更有清迈感的稳定选择。'
  ),
  (
    'sunday-walking-street',
    '周日步行街',
    'market',
    null,
    null,
    '{"weekdays":[0],"startTime":"16:00","endTime":"22:00","label":"每周日傍晚到晚上"}'::jsonb,
    '每周日 16:00-22:00',
    'Tha Phae Gate / Ratchadamnoen Road',
    '古城',
    '免费入场',
    '直接去',
    'stable-local',
    'Thai Holiday Guide 核查',
    'https://www.thaiholidayguide.com/attraction/chiang-mai-sunday-walking-street/',
    '本地市集',
    '泰语 / 英语',
    array['第一次来清迈', '晚上', '市集', '游客友好'],
    false,
    true,
    'stable-recurring',
    'published',
    '2026-05-19T12:35:00+07:00',
    '2026-05-24T17:00:00+07:00',
    '稳定夜市源，适合作为周日晚上兜底；雨季和节假日需当天复核。',
    array['夜市', '周末', '晚上', '古城'],
    '第一次来清迈很容易理解的夜间选择，商业化但方便，适合不知道晚上去哪时作为兜底。'
  ),
  (
    'tong-tung-weekend-market',
    'Tong Tung 周末市集',
    'market',
    null,
    null,
    '{"weekdays":[0,6],"startTime":"08:00","endTime":"16:00","label":"每周六、周日早上到下午"}'::jsonb,
    '每周六、周日 08:00-16:00',
    'Tong Tung Market at Baan Rim Nam',
    'Nong Chom / Meechok 附近',
    '免费入场',
    '直接去',
    'community',
    'Citylife 核查',
    'https://www.chiangmaicitylife.com/citynow/social-life/live-events/tong-tung-market-at-baan-rim-nam/',
    'Tong Tung Market',
    '泰语 / 英语',
    array['周末早上', '亲子', '市集', '不太游客'],
    false,
    true,
    'stable-recurring',
    'published',
    '2026-05-19T12:35:00+07:00',
    '2026-05-23T08:00:00+07:00',
    'Citylife 标注为每个周末开放；偏本地绿色市集，出发前仍建议核当天 Facebook 动态。',
    array['市集', '周末', '早上', '亲子', '不太游客'],
    '比古城夜市更松一点的周末绿色市集，适合想找本地摊位、早餐、家庭友好气氛的人。'
  ),
  (
    'chamcha-weekend-market',
    'Chamcha 周末手作市集',
    'market',
    null,
    null,
    '{"weekdays":[0,6],"startTime":"09:00","endTime":"14:30","label":"每周六、周日白天"}'::jsonb,
    '每周六、周日 09:00-14:30',
    'Chamcha Market',
    'San Kamphaeng / Bo Sang 方向',
    '免费入场',
    '直接去',
    'venue',
    'Chiang Mai Master 核查',
    'https://www.chiangmaimaster.com/place/chamcha-market',
    'Chamcha Market',
    '泰语 / 英语',
    array['手作', '不太游客', '周末白天', '慢慢逛'],
    false,
    true,
    'stable-recurring',
    'published',
    '2026-05-19T12:35:00+07:00',
    '2026-05-23T09:00:00+07:00',
    '多个地点目录显示为周六周日开放；离古城较远，适合和 Bo Sang / San Kamphaeng 路线一起做。',
    array['市集', '周末', '手作', '不太游客', '出片'],
    '偏手作、艺术和小摊的周末白天选择，比大夜市安静，适合想拍照、买手作、慢慢逛的人。'
  ),
  (
    'coconut-market-kad-ba-pao',
    'Coconut Market 椰林市集',
    'market',
    null,
    null,
    '{"weekdays":[0,6],"startTime":"08:00","endTime":"13:00","label":"每周六、周日早上"}'::jsonb,
    '每周六、周日 08:00-13:00',
    'Kad Ba Pao / Coconut Market',
    'Fa Ham / Ruamchok 方向',
    '免费入场',
    '直接去',
    'venue',
    'Chang Puak 核查',
    'https://changpuakmagazine.com/en-article/COCONUT-MARKET/531169/',
    'Kad Ba Pao',
    '泰语 / 英语',
    array['拍照', '周末早上', '亲子', '小市集'],
    false,
    true,
    'stable-recurring',
    'published',
    '2026-05-19T12:35:00+07:00',
    '2026-05-23T08:00:00+07:00',
    'Chang Puak 标注周六周日，部分平台显示周五也可能有摊位；作为周末库可用，周五开放需单独复核。',
    array['市集', '周末', '早上', '出片', '亲子'],
    '在椰子树和小水道里的周末市集，食物和摊位规模不算大，但很适合拍照和轻松逛一两个小时。'
  ),
  (
    'baan-kang-wat-sunday-morning-market',
    'Baan Kang Wat 周日晨市',
    'market',
    null,
    null,
    '{"weekdays":[0],"startTime":"08:00","endTime":"14:00","label":"每周日早上到下午"}'::jsonb,
    '每周日 08:00-14:00',
    'Baan Kang Wat',
    'Wat Umong / Suthep',
    '免费入场',
    '直接去',
    'community',
    'Citylife 核查',
    'https://www.chiangmaicitylife.com/citynow/social-life/live-events/sunday-morning-market-baan-kang-wat/',
    'Baan Kang Wat',
    '泰语 / 英语',
    array['周日早上', '手作', '咖啡', '拍照'],
    false,
    true,
    'stable-recurring',
    'published',
    '2026-05-19T12:35:00+07:00',
    '2026-05-24T08:00:00+07:00',
    'Baan Kang Wat 本体并非只周日开放；这里入库的是周日 Morning Market，需要和普通艺术村开放时间分开。',
    array['市集', '周末', '周日', '手作', '咖啡'],
    '艺术村里的周日晨市，适合把咖啡、手作、小店和周日慢逛放在一条轻路线里。'
  ),
  (
    'nana-jungle-saturday-market',
    'Nana Jungle 周六晨市',
    'market',
    null,
    null,
    '{"weekdays":[6],"startTime":"07:00","endTime":"11:00","label":"每周六早上"}'::jsonb,
    '每周六 07:00-11:00',
    'Bamboo Saturday Market / Nana Jungle',
    'Chang Phueak / Jed Yod 方向',
    '免费入场',
    '直接去',
    'stable-local',
    'Visit Thailand Today 核查',
    'https://www.visitthailandtoday.com/markets-shopping/chiang-mai/bamboo-saturday-market-nana-jungle',
    'Nana Jungle',
    '泰语 / 英语',
    array['周六早起', '本地感', '面包', '不太游客'],
    false,
    true,
    'stable-recurring',
    'published',
    '2026-05-19T12:35:00+07:00',
    '2026-05-23T07:00:00+07:00',
    '周六上午限定，时间窗口很短；需要提醒用户早去，避免卖完或收摊。',
    array['市集', '周末', '早上', '不太游客', '周六'],
    '很适合早起的人，偏本地晨市和面包/食物气氛，不是大游客夜市，时间窗口短。'
  ),
  (
    'nong-ho-weekend-flea-market',
    'Nong Ho 周末旧物市集',
    'market',
    null,
    null,
    '{"weekdays":[0,6],"startTime":"07:00","endTime":"14:00","label":"每周六、周日早上"}'::jsonb,
    '每周六、周日 07:00-14:00',
    'Nong Ho Flea Market',
    '古城北侧 / Chang Phueak 方向',
    '免费入场',
    '直接去',
    'community',
    'When in Chiang Mai 核查',
    'https://www.wheninchiangmai.com/lb132290/nong-ho-flea-market-saturday-sunday',
    'Nong Ho Flea Market',
    '泰语为主',
    array['二手旧物', '本地感', '周末早上', '不太游客'],
    false,
    true,
    'stable-recurring',
    'published',
    '2026-05-19T12:35:00+07:00',
    '2026-05-23T07:00:00+07:00',
    '偏本地二手旧物市场，天气会影响摊位数量；适合推荐给明确想淘旧物的人。',
    array['市集', '周末', '早上', '二手', '不太游客'],
    '更像真正的本地跳蚤市场，适合淘旧物、二手家具、老杂货，不适合只想买精致伴手礼的人。'
  ),
  (
    'chiang-mai-pride-2026',
    'Chiang Mai Pride 2026',
    'festival',
    '2026-05-24T13:00:00+07:00',
    '2026-05-24T23:59:00+07:00',
    null,
    '2026-05-24 周日 13:00-24:00',
    'Buddhasathan / Tha Phae Gate',
    '古城东侧 / Tha Phae',
    '免费',
    '直接去',
    'official',
    '主办方 / Citylife 核查',
    'https://www.adamsappleclub.com/event/chiang-mai-pride-2026/',
    'Chiang Mai Pride / Adam''s Apple Club',
    '泰语 / 英语',
    array['本周末', '节庆', '游行', '社区活动'],
    false,
    true,
    'verified',
    'published',
    '2026-05-19T12:35:00+07:00',
    '2026-05-24T10:00:00+07:00',
    '主办方公布 16:00 游行，Citylife 补充主活动 13:00 到午夜；当天路线和封路信息需上午再复核。',
    array['周末', '节庆', '游行', '免费', '本周末'],
    '这个周日的城市级 Pride 活动，包含游行、表演、社区市场和夜间节目，适合想赶上本周末现场氛围的人。'
  )
on conflict (id) do update set
  title = excluded.title,
  event_type = excluded.event_type,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  recurrence = excluded.recurrence,
  stable_schedule = excluded.stable_schedule,
  venue_name = excluded.venue_name,
  area = excluded.area,
  price_label = excluded.price_label,
  registration_label = excluded.registration_label,
  source_type = excluded.source_type,
  source_label = excluded.source_label,
  source_url = excluded.source_url,
  host_name = excluded.host_name,
  language = excluded.language,
  suitable_for = excluded.suitable_for,
  is_cmi_related = excluded.is_cmi_related,
  is_verified = excluded.is_verified,
  verification_status = excluded.verification_status,
  visibility_status = excluded.visibility_status,
  last_checked_at = excluded.last_checked_at,
  next_check_before = excluded.next_check_before,
  reliability_note = excluded.reliability_note,
  tags = excluded.tags,
  summary = excluded.summary,
  updated_at = timezone('utc'::text, now());
