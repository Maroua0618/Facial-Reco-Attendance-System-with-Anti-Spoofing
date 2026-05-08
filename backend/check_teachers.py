import os
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"
supabase: Client = create_client(url, key)

teachers = supabase.table("teachers").select("*").execute().data

for t in teachers:
    print(f"ID: {t['id']}, Name: {t['full_name']}, Email: {t['email']}, Auth_ID: {t['auth_user_id']}")

print(f"Total teachers: {len(teachers)}")
