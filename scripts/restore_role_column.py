#!/usr/bin/env python3
"""
Apply SQL migration to restore role column in teachers table
"""
import os
import requests
from time import sleep

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://spccazagwlvrwdmpgmgt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    exit(1)

headers = {
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json"
}

# SQL migration
sql = """
-- Restore role column to teachers table
-- This was accidentally deleted but needed for display/filtering
ALTER TABLE public.teachers
ADD COLUMN role public.teacher_role NOT NULL DEFAULT 'teacher';

-- Ensure all existing teachers have a role assigned
UPDATE public.teachers
SET role = 'teacher'
WHERE role IS NULL;
"""

print("🔄 Applying migration: Restore teacher roles...")
print("=" * 60)

try:
    # Use the SQL endpoint to execute raw SQL
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers=headers,
        json={"sql": sql},
        timeout=30
    )
    
    if r.status_code == 200:
        print("✅ Migration applied successfully!")
        print(f"Response: {r.json()}")
    else:
        print(f"❌ Error: {r.status_code}")
        print(f"Response: {r.text}")
        
except Exception as e:
    print(f"❌ Error applying migration: {e}")
    print("\n💡 If RPC endpoint doesn't exist, try via SQL Editor in Supabase Dashboard:")
    print("   1. Open https://app.supabase.com/project/spccazagwlvrwdmpgmgt/sql/new")
    print("   2. Paste the SQL above")
    print("   3. Click 'Run'")
