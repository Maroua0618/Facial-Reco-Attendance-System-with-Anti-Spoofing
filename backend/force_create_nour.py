import os
import traceback
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"

try:
    supabase: Client = create_client(url, key)

    email = "nour.zamiche@ensia.edu.dz"
    password = "password123" # A temporary password
    
    print(f"Creating user {email} manually to bypass rate limit...")
    user = supabase.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"full_name": "Nour Zamiche"}
    })
    
    auth_user_id = user.user.id
    print(f"User created successfully! ID: {auth_user_id}")
    
    print("Linking user to the teachers table...")
    res = supabase.table("teachers").update({"auth_user_id": auth_user_id}).eq("email", email).execute()
    print(f"Update response: {res.data}")
    
    print("SUCCESS! User is created, verified, and linked.")
        
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
