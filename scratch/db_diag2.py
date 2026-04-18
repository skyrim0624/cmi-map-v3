#!/usr/bin/env python3
"""诊断 profiles 表是否有 user_name 列，以及 auth.users 的状态"""

from supabase import create_client

SUPABASE_URL = "https://backend.appmiaoda.com/projects/supabase302739896710246400"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDkxNjA2MDE2LCJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwic3ViIjoiYW5vbiJ9.cmAsCv78AN13GSpMasknf7E55G6UUScRQqsjKHpb6O8"

client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# 1. 尝试 SELECT user_name 列 — 如果列不存在会报 400 
print("=== 1. 测试 profiles 表是否有 user_name 列 ===")
try:
    res = client.table("profiles").select("id, user_name, avatar_url").limit(1).execute()
    print(f"  ✅ user_name 列存在！数据: {res.data}")
except Exception as e:
    print(f"  ❌ user_name 列不存在: {e}")

# 2. 测试 INSERT 一条 profile 看看行为
print("\n=== 2. 测试 INSERT profiles（用假 UUID）===")
try:
    res = client.table("profiles").insert({
        "id": "11111111-1111-1111-1111-111111111111",
        "user_name": "test_user"
    }).execute()
    print(f"  结果: {res.data}")
    # 清理
    client.table("profiles").delete().eq("id", "11111111-1111-1111-1111-111111111111").execute()
    print("  清理完成")
except Exception as e:
    print(f"  插入失败: {e}")

# 3. 检查 recommendations 的 user_id 关联情况
print("\n=== 3. recommendations 中有 user_id 的记录数 ===")
try:
    res = client.table("recommendations").select("id, user_id", count="exact").not_.is_("user_id", "null").execute()
    print(f"  有 user_id 的记录: {res.count}")
    res2 = client.table("recommendations").select("id", count="exact").execute()
    print(f"  总记录数: {res2.count}")
except Exception as e:
    print(f"  查询失败: {e}")
