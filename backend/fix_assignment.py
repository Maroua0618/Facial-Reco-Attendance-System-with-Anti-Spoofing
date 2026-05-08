import os
import traceback
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"

try:
    supabase: Client = create_client(url, key)

    email = "nour.zamiche@ensia.edu.dz"
    teacher_name = "Nour Zamiche"

    teacher = supabase.table("teachers").select("*").eq("email", email).execute().data[0]
    
    # Find a 3rd year module: Machine Learning
    modules = supabase.table("modules").select("*").ilike("name", "%Machine Learning%").execute().data
    if not modules:
        modules = supabase.table("modules").select("*").execute().data
        
    mod = modules[0]

    # Find a 3rd year group
    groups = supabase.table("groups").select("*").eq("year", 3).execute().data
    if not groups:
        groups = supabase.table("groups").select("*").execute().data
        
    grp = groups[0]

    # Assign
    supabase.table("module_groups").upsert({
        "module_id": mod['id'],
        "group_id": grp['id'],
        "assigned_teacher_id": teacher['id']
    }).execute()
    print(f"Assigned {teacher_name} to module {mod.get('name', mod.get('module_name'))} and group {grp['group_name']} (Year {grp['year']})")
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
