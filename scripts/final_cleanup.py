#!/usr/bin/env python3
import requests
import re
from time import sleep

SUPABASE_URL = 'https://spccazagwlvrwdmpgmgt.supabase.co'
SUPABASE_KEY = 'sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt'
headers = {'apikey': SUPABASE_KEY}

# Get all groups
print('Fetching all groups...')
r = requests.get(f'{SUPABASE_URL}/rest/v1/groups?select=id,group_name', headers=headers, timeout=30)
groups = r.json()

# Filter numeric groups locally
numeric_groups = [g for g in groups if g['group_name'].isdigit()]
print(f'Numeric groups: {len(numeric_groups)}')
for g in numeric_groups[:5]:
    print(f'  - {g["group_name"]} id={g["id"][:8]}...')

if numeric_groups:
    print(f'\nDeleting {len(numeric_groups)} numeric groups...')
    for i, group in enumerate(numeric_groups, 1):
        try:
            r = requests.delete(
                f'{SUPABASE_URL}/rest/v1/groups?id=eq.{group["id"]}',
                headers=headers,
                timeout=30
            )
            r.raise_for_status()
            if i % 10 == 0:
                print(f'  ✓ Deleted {i}/{len(numeric_groups)}')
        except Exception as e:
            print(f'  ✗ Error deleting {group["group_name"]}: {e}')
            sleep(1)

print('\nVerifying...')
r = requests.get(f'{SUPABASE_URL}/rest/v1/groups?select=count', headers=headers, timeout=30)
count = r.json()[0]['count']
print(f'Total groups remaining: {count}')

# Check numeric groups still remain
r2 = requests.get(f'{SUPABASE_URL}/rest/v1/groups?select=id,group_name', headers=headers, timeout=30)
all_groups = r2.json()
numeric_remaining = [g for g in all_groups if g['group_name'].isdigit()]
print(f'Numeric groups remaining: {len(numeric_remaining)}')

if len(numeric_remaining) == 0:
    print('\n✅ Cleanup complete!')
else:
    print(f'\n⚠️  {len(numeric_remaining)} numeric groups still exist')
