import os
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"
supabase: Client = create_client(url, key)

groups = supabase.table("groups").select("*").execute().data
teachers = supabase.table("teachers").select("*").execute().data
modules = supabase.table("modules").select("*").execute().data
students = supabase.table("students").select("*").execute().data

# filter 3rd year groups
y3_groups = [g for g in groups if g.get('year') == 3 or '3' in g.get('group_name', '')]

print("Year 3 Groups:", [(g['id'], g['group_name'], g.get('year')) for g in y3_groups])
print("Modules:", [(m['id'], m.get('module_name') or m.get('name'), m.get('module_code')) for m in modules[:5]])
print(f"Total students: {len(students)}")
