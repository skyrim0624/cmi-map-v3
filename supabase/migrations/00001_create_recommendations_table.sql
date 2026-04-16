-- 创建推荐表
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('吃饭', '咖啡', '户外', '拍照', '涂鸦', '市集', '放松', '运动', '宝藏')),
  reason TEXT NOT NULL,
  user_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_recommendations_place_name ON recommendations(place_name);
CREATE INDEX IF NOT EXISTS idx_recommendations_category ON recommendations(category);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_name ON recommendations(user_name);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON recommendations(created_at DESC);

-- 创建图片存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('place-images', 'place-images', true)
ON CONFLICT (id) DO NOTHING;

-- 配置存储桶策略：允许所有人读取
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'place-images');

-- 配置存储桶策略：允许所有人上传
CREATE POLICY "Public upload access"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'place-images');

-- 配置 RLS 策略：允许所有人读取推荐
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read recommendations"
ON recommendations FOR SELECT
TO public
USING (true);

-- 配置 RLS 策略：允许所有人创建推荐
CREATE POLICY "Public insert recommendations"
ON recommendations FOR INSERT
TO public
WITH CHECK (true);