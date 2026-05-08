import os
import traceback
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"

try:
    supabase: Client = create_client(url, key)

    email = "nour.zamiche@ensia.edu.dz"
    name = "Nour Zamiche"

    # 1. Check if teacher already exists
    existing = supabase.table("teachers").select("*").eq("email", email).execute().data
    if existing:
        teacher = existing[0]
        print(f"Teacher {name} already exists with ID: {teacher['id']}")
    else:
        # Insert new teacher
        res = supabase.table("teachers").insert({
            "full_name": name,
            "email": email,
            "role": "teacher"
        }).execute()
        teacher = res.data[0]
        print(f"Created teacher {name} with ID: {teacher['id']}")

    # 2. Assign to a group and module
    modules = supabase.table("modules").select("*").limit(5).execute().data
    groups = supabase.table("groups").select("*").limit(5).execute().data
    
    if modules and groups:
        mod = next((m for m in modules if 'cns' in str(m.get('module_code', '')).lower() or 'cns' in str(m.get('name', '')).lower()), modules[0])
        grp = groups[0]
        
        existing_assign = supabase.table("module_groups").select("*").eq("module_id", mod['id']).eq("group_id", grp['id']).eq("assigned_teacher_id", teacher['id']).execute().data
        if not existing_assign:
            supabase.table("module_groups").insert({
                "module_id": mod['id'],
                "group_id": grp['id'],
                "assigned_teacher_id": teacher['id']
            }).execute()
            print(f"Assigned {name} to module {mod['name']} and group {grp['group_name']}")
        else:
            print(f"{name} is already assigned to module {mod['name']} and group {grp['group_name']}")
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
