#!/usr/bin/env python3
"""Create groups for all years with proper naming and year values."""
import requests
import json

SUPABASE_URL = "https://spccazagwlvrwdmpgmgt.supabase.co"
SERVICE_KEY = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"

headers = {
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "apikey": SERVICE_KEY
}

# Define groups per year: {year: count}
groups_config = {
    1: 9,   # 9 groups for 1st year
    2: 12,  # 12 groups for 2nd year
    3: 12,  # 12 groups for 3rd year
    4: 10,  # 10 groups for 4th year
}

groups_to_create = []
for year, count in groups_config.items():
    for i in range(1, count + 1):
        groups_to_create.append({
            "group_name": str(i),  # groups named "1", "2", "3", etc.
            "year": year
        })

print(f"Creating {len(groups_to_create)} groups...")
for group in groups_to_create:
    url = f"{SUPABASE_URL}/rest/v1/groups"
    resp = requests.post(url, json=group, headers=headers)
    if resp.status_code in (201, 409):  # 409 = conflict (already exists)
        print(f"✓ Group {group['group_name']} (Year {group['year']})")
    else:
        print(f"✗ Group {group['group_name']} (Year {group['year']}): {resp.status_code} - {resp.text}")

print("\nDone!")
