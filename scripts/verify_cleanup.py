#!/usr/bin/env python3
import requests

SUPABASE_URL = 'https://spccazagwlvrwdmpgmgt.supabase.co'
SUPABASE_KEY = 'sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt'
headers = {'apikey': SUPABASE_KEY}

# Check final state
groups = requests.get(f'{SUPABASE_URL}/rest/v1/groups?select=count', headers=headers).json()
student_groups = requests.get(f'{SUPABASE_URL}/rest/v1/student_groups?select=count', headers=headers).json()

print('Final state after cleanup:')
print(f'  Total groups: {groups[0]["count"]}')
print(f'  Total student_group entries: {student_groups[0]["count"]}')

# Check if any numeric groups remain
numeric_groups = requests.get(f'{SUPABASE_URL}/rest/v1/groups?select=group_name,year', headers=headers).json()
numeric_count = sum(1 for g in numeric_groups if g['group_name'].isdigit())
print(f'  Numeric groups remaining: {numeric_count}')
if numeric_count > 0:
    print('    WARNING: Found numeric groups')
else:
    print('    ✓ All remaining groups use g# format')
