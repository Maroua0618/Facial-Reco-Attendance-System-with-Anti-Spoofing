import os
import traceback
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"

try:
    supabase: Client = create_client(url, key)

    email = "nour.zamiche@ensia.edu.dz"
    
    # 1. Get the auth.users ID using the admin API
    user_res = supabase.auth.admin.list_users()
    auth_user_id = None
    for u in user_res.users:
        if u.email == email:
            auth_user_id = u.id
            break
            
    if auth_user_id:
        print(f"Found auth_user_id for {email}: {auth_user_id}")
        
        # 2. Update the teachers row, bypassing RLS using service key
        res = supabase.table("teachers").update({"auth_user_id": auth_user_id}).eq("email", email).execute()
        print(f"Update response: {res.data}")
    else:
        print("Auth user not found. Did she delete her account again?")
        
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
