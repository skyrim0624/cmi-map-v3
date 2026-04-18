#!/usr/bin/env python3
"""诊断 Supabase profiles 表结构问题"""

from supabase import create_client

SUPABASE_URL = "https://backend.appmiaoda.com/projects/supabase302739896710246400"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMDkxNjA2MDE2LCJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwic3ViIjoiYW5vbiJ9.cmAsCv78AN13GSpMasknf7E55G6UUScRQqsjKHpb6O8"

client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# 1. 读取 profiles 表看看有什么列
print("=== 1. 读取 profiles 表所有数据 ===")
try:
    res = client.table("profiles").select("*").limit(5).execute()
    if res.data:
        print(f"  找到 {len(res.data)} 条记录")
        print(f"  列名: {list(res.data[0].keys())}")
        for row in res.data:
            print(f"  -> {row}")
    else:
        print("  表为空")
except Exception as e:
    print(f"  读取失败: {e}")

# 2. 尝试更新 user_name 看报什么错
print("\n=== 2. 尝试更新 user_name(预期会失败) ===")
try:
    res = client.table("profiles").update({"user_name": "test"}).eq("id", "00000000-0000-0000-0000-000000000000").execute()
    print(f"  居然成功了？: {res}")
except Exception as e:
    print(f"  错误详情: {e}")

# 3. 检查 recommendations 表
print("\n=== 3. 读取 recommendations 表看看数据 ===")
try:
    res = client.table("recommendations").select("id, place_name, user_name, user_id").limit(3).execute()
    if res.data:
        print(f"  找到数据，列名: {list(res.data[0].keys())}")
        for row in res.data:
            print(f"  -> {row}")
    else:
        print("  表为空")
except Exception as e:
    print(f"  读取失败: {e}")

# 4. 尝试通过 rpc 执行 SQL (看看 MiaoDA 有没有开放)
print("\n=== 4. 尝试 rpc 添加 user_name 列 ===")
try:
    res = client.rpc("exec_sql", {"query": "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_name text;"}).execute()
    print(f"  结果: {res}")
except Exception as e:
    print(f"  rpc 不可用: {e}")
