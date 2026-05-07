#!/usr/bin/env python3
"""
Clean up database group inconsistencies - FAST VERSION
Uses RPC or bulk operations for better performance
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
                print(f"  ⚠️  Attempt {attempt + 1} failed: {type(e).__name__}. Retrying...")
                sleep(1)
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
                print(f"  ⚠️  Attempt {attempt + 1} failed: {type(e).__name__}. Retrying...")
                sleep(1)
            else:
                raise

# Fetch all groups
print("📋 Fetching all groups...")
groups = fetch_with_retry(f"{SUPABASE_URL}/rest/v1/groups?select=id,group_name,year", headers=HEADERS)

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
print(f"  ✓ Keep (g# format): {len(groups_to_keep)}")
print(f"  ✗ Remove (other formats): {len(groups_to_remove)}")

# Get IDs to remove
groups_to_remove_ids = [g["id"] for g in groups_to_remove]
print(f"\n🗑️  Groups to delete (IDs): {groups_to_remove_ids[:5]}{'...' if len(groups_to_remove_ids) > 5 else ''}")

# Fetch all student_groups
print(f"\n📋 Fetching student_groups entries...")
student_groups = fetch_with_retry(f"{SUPABASE_URL}/rest/v1/student_groups?select=student_id,group_id", headers=HEADERS)

# Build mapping to find which ones to delete
student_groups_map = {}
groups_to_remove_set = set(groups_to_remove_ids)

for sg in student_groups:
    student_id = sg["student_id"]
    group_id = sg["group_id"]
    if student_id not in student_groups_map:
        student_groups_map[student_id] = []
    student_groups_map[student_id].append(group_id)

print(f"  Total student_group entries: {len(student_groups)}")

# Identify which student_group entries to delete
student_groups_to_delete = []
for student_id, group_ids in student_groups_map.items():
    if len(group_ids) > 1:
        # In multiple groups: mark for deletion those pointing to g# format groups
        for group_id in group_ids:
            if group_id in groups_to_remove_set:
                student_groups_to_delete.append((student_id, group_id))
    elif len(group_ids) == 1:
        # In single non-g# group: delete it
        group_id = group_ids[0]
        if group_id in groups_to_remove_set:
            student_groups_to_delete.append((student_id, group_id))

print(f"  Will delete: {len(student_groups_to_delete)} student_group entries")

# Confirm
print(f"\n🗑️  Will delete {len(student_groups_to_delete)} student_group entries")
print(f"🗑️  Will delete {len(groups_to_remove)} groups")

response = input(f"\n⚠️  Proceed with cleanup? (yes/no): ").strip().lower()
if response != "yes":
    print("❌ Cleanup cancelled.")
    exit(0)

# Delete student_group entries (batch in chunks to avoid timeouts)
print(f"\n🗑️  Deleting student_group entries...")
BATCH_SIZE = 5  # Delete 5 at a time
for i in range(0, len(student_groups_to_delete), BATCH_SIZE):
    batch = student_groups_to_delete[i:i+BATCH_SIZE]
    for student_id, group_id in batch:
        try:
            delete_with_retry(
                f"{SUPABASE_URL}/rest/v1/student_groups?student_id=eq.{student_id}&group_id=eq.{group_id}",
                headers=HEADERS,
                timeout=30,
                retries=3
            )
        except Exception as e:
            print(f"  ✗ Failed to delete ({student_id}, {group_id}): {e}")
            continue
    
    progress = min(i + BATCH_SIZE, len(student_groups_to_delete))
    print(f"  ✓ Deleted {progress}/{len(student_groups_to_delete)}")
    sleep(0.1)

print(f"  ✓ Completed student_group deletions")

# Delete groups (batch in chunks)
print(f"\n🗑️  Deleting groups...")
BATCH_SIZE = 5
for i in range(0, len(groups_to_remove), BATCH_SIZE):
    batch = groups_to_remove[i:i+BATCH_SIZE]
    for group in batch:
        try:
            delete_with_retry(
                f"{SUPABASE_URL}/rest/v1/groups?id=eq.{group['id']}",
                headers=HEADERS,
                timeout=30,
                retries=3
            )
        except Exception as e:
            print(f"  ✗ Failed to delete group {group['group_name']}: {e}")
            continue
    
    progress = min(i + BATCH_SIZE, len(groups_to_remove))
    print(f"  ✓ Deleted {progress}/{len(groups_to_remove)} groups")
    sleep(0.1)

print(f"\n✅ Cleanup complete!")
print("\nFinal verification:")
final_groups = fetch_with_retry(f"{SUPABASE_URL}/rest/v1/groups?select=count", headers=HEADERS)
final_sgs = fetch_with_retry(f"{SUPABASE_URL}/rest/v1/student_groups?select=count", headers=HEADERS)
print(f"  Total groups: {final_groups[0]['count']}")
print(f"  Total student_group entries: {final_sgs[0]['count']}")
