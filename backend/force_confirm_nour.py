import os
import traceback
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"

try:
    supabase: Client = create_client(url, key)

    email = "nour.zamiche@ensia.edu.dz"
    
    users = supabase.auth.admin.list_users()
    found = False
    for u in users:
        u_dict = u.model_dump() if hasattr(u, 'model_dump') else u.__dict__ if hasattr(u, '__dict__') else u
        u_email = getattr(u, 'email', None) or (u_dict.get('email') if isinstance(u_dict, dict) else None)
        
        if u_email == email:
            found = True
            u_id = getattr(u, 'id', None) or (u_dict.get('id') if isinstance(u_dict, dict) else None)
            print(f"Found user in auth.users: {u_id}")
            
            # Manually confirm the user's email so they don't need OTP!
            supabase.auth.admin.update_user_by_id(u_id, {"email_confirm": True})
            print("Manually verified the user's email (bypassing OTP).")
            
            # Manually link to teachers table
            res = supabase.table("teachers").update({"auth_user_id": u_id}).eq("email", email).execute()
            print(f"Manually linked teachers row. Response: {res.data}")
            break
            
    if not found:
        print("User NOT found in auth.users.")
        
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
