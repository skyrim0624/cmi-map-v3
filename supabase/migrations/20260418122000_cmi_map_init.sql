-- 1. 建立用户头像资料表
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 建立打卡地点表
create table if not exists recommendations (
  id uuid default gen_random_uuid() primary key,
  place_name text not null,
  category text not null,
  reason text,
  user_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  images text[] default array[]::text[],
  user_id uuid,  -- 老数据暂不强制关联以免报错，兼容历史版本
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. 建立大家期待已久的“点赞热度互动表”
create table if not exists upvotes (
  id uuid default gen_random_uuid() primary key,
  recommendation_id uuid references recommendations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(recommendation_id, user_id)
);

-- 4. 建立头像图床存储桶
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
create policy "头像全网可见" on storage.objects for select using ( bucket_id = 'avatars' );
create policy "登录后可传头像" on storage.objects for insert with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- 5. 解锁所有前端的读写安全策略（内测社区，开放最高通行绿灯）
alter table profiles enable row level security;
alter table recommendations enable row level security;
alter table upvotes enable row level security;

create policy "允许所有人看配置" on profiles for select using (true);
create policy "允许所有人修改" on profiles for all using (true);
create policy "允许所有人看地点" on recommendations for select using (true);
create policy "允许所有人发地点" on recommendations for all using (true);
create policy "允许所有人看点赞" on upvotes for select using (true);
create policy "允许所有人点赞" on upvotes for all using (true);
