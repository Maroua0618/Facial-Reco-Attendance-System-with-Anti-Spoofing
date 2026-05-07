#!/usr/bin/env python3
"""Assign modules to the current user (teacher)"""
import requests

SUPABASE_URL = 'https://spccazagwlvrwdmpgmgt.supabase.co'
SUPABASE_KEY = 'sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt'

headers = {'apikey': SUPABASE_KEY}

print("Finding current user (admin teacher)...\n")

# Get the current user's teacher record (should be the first admin with an email)
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/teachers?role=eq.admin&limit=1',
    headers=headers,
    timeout=10
)

if r.status_code != 200 or not r.json():
    print("✗ No admin teacher found")
    exit(1)

teacher = r.json()[0]
teacher_id = teacher['id']
teacher_email = teacher.get('email', 'unknown')
print(f"✓ Found admin teacher: {teacher_email}")
print(f"  ID: {teacher_id}\n")

# Get first 10 modules and assign them
print("Fetching modules to assign...\n")
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/modules?limit=10',
    headers=headers,
    timeout=10
)

if r.status_code != 200:
    print(f"✗ Failed to fetch modules: {r.status_code}")
    exit(1)

modules = r.json()
print(f"✓ Got {len(modules)} modules\n")

print("Assigning modules to teacher...\n")
assigned = 0
for i, module in enumerate(modules, 1):
    # Update module to have this teacher as lecturer
    r = requests.patch(
        f'{SUPABASE_URL}/rest/v1/modules',
        headers={**headers, 'Content-Type': 'application/json'},
        json={'lecturer_id': teacher_id},
        params={'id': f'eq.{module["id"]}'},
        timeout=10
    )
    
    if r.status_code == 204:  # No content = success
        print(f"  [{i}/{len(modules)}] ✓ {module['name']}")
        assigned += 1
    else:
        print(f"  [{i}/{len(modules)}] ✗ {module['name']} - {r.status_code}")

print(f"\n✓ Assigned {assigned}/{len(modules)} modules")
print(f"\nNow when you log in as {teacher_email}, you should see these modules in the Schedule Sessions tab.")
