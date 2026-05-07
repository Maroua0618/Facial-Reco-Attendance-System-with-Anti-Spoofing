#!/usr/bin/env python3
"""Associate all existing students with year 3 groups."""
import requests
import json

SUPABASE_URL = "https://spccazagwlvrwdmpgmgt.supabase.co"
SERVICE_KEY = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"

headers = {
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "apikey": SERVICE_KEY
}

# Step 1: Get all year 3 groups
url = f"{SUPABASE_URL}/rest/v1/groups"
resp = requests.get(f"{url}?year=eq.3&order=group_name", headers=headers)
groups = resp.json()
print(f"Found {len(groups)} year 3 groups")

y3_group_ids = [g['id'] for g in groups]
print(f"Year 3 Group IDs: {y3_group_ids}")

# Step 2: Get all students
resp = requests.get(f"{SUPABASE_URL}/rest/v1/students", headers=headers)
students = resp.json()
print(f"Found {len(students)} students")

# Step 3: Assign each student to a year 3 group
# Use modulo to distribute students evenly across groups
ok = 0
for idx, student in enumerate(students):
    group_idx = idx % len(y3_group_ids)
    group_id = y3_group_ids[group_idx]
    
    payload = {"student_id": student['id'], "group_id": group_id}
    resp = requests.post(f"{SUPABASE_URL}/rest/v1/student_groups", json=payload, headers=headers)
    
    if resp.status_code in (201, 409):
        ok += 1
    else:
        print(f"Error assigning student {student['full_name']}: {resp.status_code} - {resp.text}")

print(f"✓ Associated {ok} students with year 3 groups")
