#!/usr/bin/env python3
"""Check if necessary packages are available"""
try:
    import requests
    print("✓ requests available")
except ImportError:
    print("✗ requests not available - installing...")
    import subprocess
    subprocess.run([__import__('sys').executable, '-m', 'pip', 'install', 'requests', '--quiet'])
    import requests
    print("✓ requests installed")

# Now test adding role column
print("\nAttempting to add role column to teachers table...")
import json

SUPABASE_URL = 'https://spccazagwlvrwdmpgmgt.supabase.co'
SUPABASE_KEY = 'sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt'

headers = {'apikey': SUPABASE_KEY}

# First check current structure
print("Checking current teachers table structure...")
try:
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/teachers?limit=1',
        headers=headers,
        timeout=10
    )
    if r.status_code == 200 and r.json():
        columns = list(r.json()[0].keys())
        print(f"Current columns: {columns}")
        
        if 'role' in columns:
            print("✓ Role column already exists!")
        else:
            print("✗ Role column missing")
            print("\nTo add the role column, visit:")
            print("  Supabase Dashboard > SQL Editor")
            print("  Then run: supabase/migrations/20260507000001_add_role_column_to_teachers.sql")
    else:
        print(f"Error: {r.status_code}")
except Exception as e:
    print(f"Error: {e}")
