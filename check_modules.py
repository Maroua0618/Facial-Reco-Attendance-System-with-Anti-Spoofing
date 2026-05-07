#!/usr/bin/env python3
"""Check modules table in database"""
import requests

SUPABASE_URL = 'https://spccazagwlvrwdmpgmgt.supabase.co'
SUPABASE_KEY = 'sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt'

headers = {'apikey': SUPABASE_KEY}

print("Checking modules table...\n")

# Check if table exists and count records
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/modules?select=count',
    headers=headers,
    timeout=10
)

if r.status_code == 200:
    try:
        count = r.json()[0]['count'] if r.json() else 0
        print(f"✓ Modules table exists")
        print(f"  Total records: {count}")
    except:
        print(f"✗ Error parsing response: {r.json()}")
elif r.status_code == 404:
    print("✗ Modules table not found (404)")
else:
    print(f"✗ Error: {r.status_code}")
    print(f"  {r.text}")

# Fetch all modules to see structure
print("\nFetching first 5 modules...")
r = requests.get(
    f'{SUPABASE_URL}/rest/v1/modules?limit=5',
    headers=headers,
    timeout=10
)

if r.status_code == 200 and r.json():
    modules = r.json()
    print(f"✓ Got {len(modules)} module(s)")
    print(f"  Columns: {list(modules[0].keys())}")
    for i, m in enumerate(modules, 1):
        print(f"  [{i}] {m.get('name', 'NO NAME')} (lecturer_id: {m.get('lecturer_id', 'null')})")
else:
    print(f"✗ No modules found or error: {r.status_code}")
    if r.text:
        print(f"  {r.text}")
