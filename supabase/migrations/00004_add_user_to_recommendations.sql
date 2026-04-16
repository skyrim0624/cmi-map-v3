-- 添加 user_id 字段到推荐表
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);

-- 删除旧的 RLS 策略
DROP POLICY IF EXISTS "Public read recommendations" ON recommendations;
DROP POLICY IF EXISTS "Public insert recommendations" ON recommendations;

-- 新的 RLS 策略：所有人可以查看推荐
CREATE POLICY "Anyone can view recommendations" ON recommendations
  FOR SELECT TO public
  USING (true);

-- 已登录用户可以创建推荐
CREATE POLICY "Authenticated users can create recommendations" ON recommendations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 用户可以删除自己的推荐
CREATE POLICY "Users can delete their own recommendations" ON recommendations
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 用户可以更新自己的推荐
CREATE POLICY "Users can update their own recommendations" ON recommendations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);