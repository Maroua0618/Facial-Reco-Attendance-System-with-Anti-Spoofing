import os
import traceback
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"

try:
    supabase: Client = create_client(url, key)
    group_id = "154361d2-b91a-4ad0-9771-1e1848d0e16e"
    module_id = "3d8ad4db-6f65-4383-a854-c5adca345086"
    
    group_res = supabase.table("groups").select("group_name").eq("id", group_id).execute()
    module_res = supabase.table("modules").select("module_name").eq("id", module_id).execute()
    
    print(f"Group: {group_res.data[0]['group_name']}")
    print(f"Module: {module_res.data[0]['module_name']}")
        
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
