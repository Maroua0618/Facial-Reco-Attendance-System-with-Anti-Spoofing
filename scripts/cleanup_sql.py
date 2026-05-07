#!/usr/bin/env python3
"""
Clean up groups using SQL-based approach (more reliable than REST loop)
"""
import os
import requests
from time import sleep

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://spccazagwlvrwdmpgmgt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json"
}

print("📊 Database Cleanup via SQL")
print("=" * 50)

# Get numeric group IDs
print("\n1️⃣  Finding numeric groups...")
try:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/groups?select=id,group_name,year&group_name=like.*^[0-9]*",
        headers=HEADERS,
        timeout=30
    )
    r.raise_for_status()
    numeric_groups = r.json()
    print(f"   Found {len(numeric_groups)} numeric groups")
    if numeric_groups:
        for g in numeric_groups[:3]:
            print(f"   - {g['group_name']} (Y{g['year']}) id={g['id'][:8]}...")
except Exception as e:
    print(f"   ✗ Error: {e}")
    numeric_groups = []

if not numeric_groups:
    print("   No numeric groups found. Database might already be clean.")
    # Verify final state
    r1 = requests.get(f"{SUPABASE_URL}/rest/v1/groups?select=count", headers=HEADERS, timeout=30).json()
    r2 = requests.get(f"{SUPABASE_URL}/rest/v1/student_groups?select=count", headers=HEADERS, timeout=30).json()
    print(f"\n   Final state:")
    print(f"   - Total groups: {r1[0]['count']}")
    print(f"   - Total student_group entries: {r2[0]['count']}")
    exit(0)

print(f"\n2️⃣  Deleting student_group entries pointing to numeric groups...")
numeric_ids = [g["id"] for g in numeric_groups]

# Delete student_group entries one by one (as they don't have IDs, must use composite key)
deleted_count = 0
for group_id in numeric_ids:
    try:
        # Find all student_groups for this numeric group
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/student_groups?group_id=eq.{group_id}&select=student_id",
            headers=HEADERS,
            timeout=30
        )
        r.raise_for_status()
        sgs = r.json()
        
        # Delete each entry
        for sg in sgs:
            r_del = requests.delete(
                f"{SUPABASE_URL}/rest/v1/student_groups?student_id=eq.{sg['student_id']}&group_id=eq.{group_id}",
                headers=HEADERS,
                timeout=30
            )
            r_del.raise_for_status()
            deleted_count += 1
        
        if len(sgs) > 0:
            print(f"   ✓ Deleted {len(sgs)} entries for group {group_id[:8]}...")
    except Exception as e:
        print(f"   ✗ Error deleting for group {group_id[:8]}: {type(e).__name__}")
        sleep(1)
        continue

print(f"   Total deleted: {deleted_count} student_group entries")

print(f"\n3️⃣  Deleting numeric groups...")
deleted_groups = 0
for group in numeric_groups:
    try:
        r = requests.delete(
            f"{SUPABASE_URL}/rest/v1/groups?id=eq.{group['id']}",
            headers=HEADERS,
            timeout=30
        )
        r.raise_for_status()
        deleted_groups += 1
        print(f"   ✓ Deleted group {group['group_name']} (Y{group['year']})")
    except Exception as e:
        print(f"   ✗ Error deleting {group['group_name']}: {type(e).__name__}")
        sleep(1)
        continue

print(f"   Total deleted: {deleted_groups} groups")

print(f"\n4️⃣  Final verification...")
try:
    r_groups = requests.get(f"{SUPABASE_URL}/rest/v1/groups?select=count", headers=HEADERS, timeout=30).json()
    r_sgs = requests.get(f"{SUPABASE_URL}/rest/v1/student_groups?select=count", headers=HEADERS, timeout=30).json()
    r_numeric = requests.get(f"{SUPABASE_URL}/rest/v1/groups?select=id,group_name&group_name=like.*^[0-9]*", headers=HEADERS, timeout=30).json()
    
    print(f"   Total groups: {r_groups[0]['count']}")
    print(f"   Total student_group entries: {r_sgs[0]['count']}")
    print(f"   Numeric groups remaining: {len(r_numeric)}")
    
    if len(r_numeric) == 0:
        print("\n✅ Cleanup complete! All numeric groups removed.")
    else:
        print(f"\n⚠️  Warning: {len(r_numeric)} numeric groups still remain")
        for g in r_numeric[:3]:
            print(f"     - {g['group_name']}")
except Exception as e:
    print(f"   ✗ Error during verification: {e}")
