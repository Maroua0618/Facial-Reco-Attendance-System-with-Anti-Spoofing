#!/usr/bin/env python3
"""
Clean up database group inconsistencies:
- Keep only groups matching g[0-9]+ format (g1, g2, G1, G2, etc.)
- Remove groups with numeric names (1, 2, 3, etc.)
- Remove student_group entries pointing to removed groups
"""
import os
import re
import requests
from time import sleep

# Environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://spccazagwlvrwdmpgmgt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json"
}

# Retry wrapper with longer timeout
def fetch_with_retry(url, headers, timeout=30, retries=5):
    for attempt in range(retries):
        try:
            r = requests.get(url, headers=headers, timeout=timeout)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            if attempt < retries - 1:
                print(f"  ⚠️  Attempt {attempt + 1} failed: {e}. Retrying in 2s...")
                sleep(2)
            else:
                raise

def delete_with_retry(url, headers, timeout=30, retries=5):
    for attempt in range(retries):
        try:
            r = requests.delete(url, headers=headers, timeout=timeout)
            r.raise_for_status()
            return r
        except Exception as e:
            if attempt < retries - 1:
                print(f"  ⚠️  Attempt {attempt + 1} failed: {e}. Retrying in 2s...")
                sleep(2)
            else:
                raise

# Fetch all groups
print("📋 Fetching all groups...")
groups = fetch_with_retry(f"{SUPABASE_URL}/rest/v1/groups?select=*", headers=HEADERS)

# Classify groups
groups_to_keep = []
groups_to_remove = []
g_pattern = re.compile(r"^[Gg][0-9]+$")

for g in groups:
    if g_pattern.match(g["group_name"]):
        groups_to_keep.append(g)
    else:
        groups_to_remove.append(g)

print(f"  Total groups: {len(groups)}")
print(f"  ✓ Keep (g# format): {len(groups_to_keep)} groups")
for g in groups_to_keep[:10]:
    print(f"    - {g['group_name']} (Y{g['year']})")
if len(groups_to_keep) > 10:
    print(f"    ... and {len(groups_to_keep) - 10} more")

print(f"  ✗ Remove (other formats): {len(groups_to_remove)} groups")
for g in groups_to_remove:
    print(f"    - {g['group_name']} (Y{g['year']})")

# Fetch all student_groups
print(f"\n📋 Fetching student_groups entries...")
student_groups = fetch_with_retry(f"{SUPABASE_URL}/rest/v1/student_groups?select=*", headers=HEADERS)

# Build mapping: student_id -> [(group_id), ...]
student_groups_map = {}
groups_to_remove_ids = set(g["id"] for g in groups_to_remove)

for sg in student_groups:
    student_id = sg["student_id"]
    group_id = sg["group_id"]
    if student_id not in student_groups_map:
        student_groups_map[student_id] = []
    student_groups_map[student_id].append(group_id)

print(f"  Total student_group entries: {len(student_groups)}")
students_in_multiple = sum(1 for sg_list in student_groups_map.values() if len(sg_list) > 1)
print(f"  Students in multiple groups: {students_in_multiple}")

# Identify which student_group entries to delete
student_groups_to_delete = []

for student_id, group_ids in student_groups_map.items():
    # If student is in multiple groups, keep only those in g# format
    if len(group_ids) > 1:
        # Mark for deletion: entries pointing to g# format groups
        for group_id in group_ids:
            if group_id in groups_to_remove_ids:
                student_groups_to_delete.append((student_id, group_id))
    # If student is in a single non-g# group, delete it
    elif len(group_ids) == 1:
        group_id = group_ids[0]
        if group_id in groups_to_remove_ids:
            student_groups_to_delete.append((student_id, group_id))

print(f"\n🗑️  Will delete {len(student_groups_to_delete)} student_group entries")
print(f"🗑️  Will delete {len(groups_to_remove)} groups")

# Confirm
response = input(f"\n⚠️  Proceed with cleanup? (yes/no): ").strip().lower()
if response != "yes":
    print("❌ Cleanup cancelled.")
    exit(0)

# Delete student_group entries (composite key: student_id and group_id)
print(f"\n🗑️  Deleting {len(student_groups_to_delete)} student_group entries...")
for idx, (student_id, group_id) in enumerate(student_groups_to_delete, 1):
    delete_with_retry(
        f"{SUPABASE_URL}/rest/v1/student_groups?student_id=eq.{student_id}&group_id=eq.{group_id}",
        headers=HEADERS,
        timeout=30,
        retries=5
    )
    if idx % 10 == 0:
        print(f"  ✓ Deleted {idx}/{len(student_groups_to_delete)}")
    sleep(0.05)  # Rate limiting

print(f"  ✓ Deleted all {len(student_groups_to_delete)} entries")

# Delete groups
print(f"\n🗑️  Deleting {len(groups_to_remove)} groups...")
for idx, group in enumerate(groups_to_remove, 1):
    delete_with_retry(
        f"{SUPABASE_URL}/rest/v1/groups?id=eq.{group['id']}",
        headers=HEADERS,
        timeout=30,
        retries=5
    )
    if idx % 10 == 0:
        print(f"  ✓ Deleted {idx}/{len(groups_to_remove)}")
    sleep(0.05)  # Rate limiting

print(f"  ✓ Deleted all {len(groups_to_remove)} groups")
print("\n✅ Cleanup complete!")
