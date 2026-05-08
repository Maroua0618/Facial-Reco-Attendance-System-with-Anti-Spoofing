import os
import traceback
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"

try:
    supabase: Client = create_client(url, key)

    email = "lyna.selsabila.remadi@ensia.edu.dz"
    
    # 1. Find Lyna in the teachers table
    teachers_res = supabase.table("teachers").select("*").eq("email", email).execute()
    if not teachers_res.data:
        print(f"Teacher {email} not found in database! Creating her...")
        teacher_res = supabase.table("teachers").insert({
            "email": email,
            "full_name": "Lyna Selsabila Remadi",
            "role": "teacher"
        }).execute()
        teacher_id = teacher_res.data[0]['id']
        print(f"Created teacher with ID: {teacher_id}")
    else:
        teacher_id = teachers_res.data[0]['id']
        print(f"Found teacher with ID: {teacher_id}")
        
    # 2. Find a specific module and group
    modules_res = supabase.table("modules").select("*").limit(1).execute()
    groups_res = supabase.table("groups").select("*").eq("year", 3).limit(1).execute()
    
    if modules_res.data and groups_res.data:
        module_id = modules_res.data[0]['id']
        group_id = groups_res.data[0]['id']
        
        # 3. Assign her to TD and TP for this group
        print(f"Assigning {email} to module {module_id} and group {group_id}...")
        supabase.table("module_groups").upsert({
            "module_id": module_id,
            "group_id": group_id,
            "assigned_teacher_id": teacher_id,
            "session_type": "td"
        }).execute()
        
        supabase.table("module_groups").upsert({
            "module_id": module_id,
            "group_id": group_id,
            "assigned_teacher_id": teacher_id,
            "session_type": "tp"
        }).execute()
        
        print("Successfully assigned!")
    else:
        print("No modules or groups found in the database!")
        
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
