-- 删除旧的分类约束
ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS recommendations_category_check;

-- 添加新的分类约束（删除"涂鸦"，将"宝藏"改为"彩蛋"）
ALTER TABLE recommendations ADD CONSTRAINT recommendations_category_check 
CHECK (category IN ('吃饭', '咖啡', '户外', '拍照', '市集', '放松', '运动', '彩蛋'));

-- 更新现有数据：将"宝藏"改为"彩蛋"
UPDATE recommendations SET category = '彩蛋' WHERE category = '宝藏';

-- 删除"涂鸦"分类的数据（如果有的话）
DELETE FROM recommendations WHERE category = '涂鸦';