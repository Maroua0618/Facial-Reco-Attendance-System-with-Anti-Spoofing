#!/usr/bin/env python3
"""Update all students to set their year to 3rd year."""
import sys
import os
from supabase import create_client


def client():
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY')
    if not url or not key:
        raise RuntimeError('Missing SUPABASE_URL and/or SUPABASE_SERVICE_KEY environment variables')
    return create_client(url, key)


def main():
    try:
        sup = client()
    except Exception as e:
        print(f'Error: {e}', file=sys.stderr)
        sys.exit(1)

    # First, get all students
    res = sup.table('students').select('id').execute()
    if res.error:
        raise RuntimeError(f"students select error: {res.error.message}")
    
    total = len(res.data) if res.data else 0
    print(f"Found {total} students to update")
    
    if total == 0:
        print("No students to update")
        return
    
    # Update all students to year 3
    res = sup.table('students').update({'year': 3}).execute()
    if res.error:
        raise RuntimeError(f"students update error: {res.error.message}")
    
    print(f"✓ Updated {total} students to year 3")


if __name__ == '__main__':
    main()
