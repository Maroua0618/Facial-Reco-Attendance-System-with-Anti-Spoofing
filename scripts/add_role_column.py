#!/usr/bin/env python3
"""Apply migration to add role column back to teachers table"""
import os
import subprocess
import sys

# Get credentials from environment or hardcode
SUPABASE_HOST = "db.spccazagwlvrwdmpgmgt.supabase.co"
SUPABASE_USER = "postgres"
SUPABASE_PASSWORD = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"
SUPABASE_DB = "postgres"
SUPABASE_PORT = "5432"

# SQL to execute
sql_statements = """
create type if not exists public.teacher_role as enum ('admin', 'lecturer', 'teacher');
alter table public.teachers add column if not exists role public.teacher_role not null default 'teacher';
"""

# Set environment for psql
env = os.environ.copy()
env['PGPASSWORD'] = SUPABASE_PASSWORD

try:
    # Try using psql directly
    result = subprocess.run(
        [
            'psql',
            '-h', SUPABASE_HOST,
            '-U', SUPABASE_USER,
            '-d', SUPABASE_DB,
            '-p', SUPABASE_PORT,
            '-c', sql_statements
        ],
        env=env,
        capture_output=True,
        text=True,
        timeout=30
    )
    
    print(result.stdout)
    if result.stderr:
        print("Warnings/Errors:", result.stderr)
    
    if result.returncode == 0:
        print("\n✓ Migration applied successfully!")
        
        # Verify
        verify_result = subprocess.run(
            [
                'psql',
                '-h', SUPABASE_HOST,
                '-U', SUPABASE_USER,
                '-d', SUPABASE_DB,
                '-p', SUPABASE_PORT,
                '-c', r"SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='teachers' ORDER BY ordinal_position;"
            ],
            env=env,
            capture_output=True,
            text=True,
            timeout=30
        )
        print("\nTeachers table columns:")
        print(verify_result.stdout)
    else:
        print(f"Error: psql returned {result.returncode}")
        sys.exit(1)
        
except FileNotFoundError:
    print("psql not found. Trying alternative method...")
    
    # Try using Python requests with a custom SQL RPC
    try:
        import requests
        SUPABASE_URL = 'https://spccazagwlvrwdmpgmgt.supabase.co'
        SUPABASE_KEY = 'sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt'
        
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        
        # Try checking if role column exists first
        print("Checking current table structure...")
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/teachers?limit=1',
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200 and response.json():
            columns = list(response.json()[0].keys())
            print(f"Current teachers columns: {columns}")
            if 'role' in columns:
                print("✓ Role column already exists!")
            else:
                print("✗ Role column missing - need manual Supabase SQL Editor intervention")
                print("  1. Go to Supabase Dashboard > SQL Editor")
                print("  2. Run the migration file: supabase/migrations/20260507000001_add_role_column_to_teachers.sql")
        else:
            print(f"Error checking table: {response.status_code}")
            
    except ImportError:
        print("requests library not available either")
        sys.exit(1)
        
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)


