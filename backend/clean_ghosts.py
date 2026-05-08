import os
import traceback
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"

try:
    supabase: Client = create_client(url, key)

    email = "nour.zamiche@ensia.edu.dz"
    
    # 1. Find the real row
    real_rows = supabase.table("teachers").select("*").eq("email", email).execute().data
    if real_rows:
        real_row = real_rows[0]
        print(f"Found real row for {email}: {real_row['id']}")
        
        # 2. Find any ghost rows that lack an email
        ghost_rows = supabase.table("teachers").select("*").is_("email", "null").execute().data
        for ghost in ghost_rows:
            # Delete ghost rows
            supabase.table("teachers").delete().eq("id", ghost['id']).execute()
            print(f"Deleted ghost row: {ghost['id']}")
            
            # Link the real row to the auth user ID that was on the ghost row
            # The ghost row's ID is the auth.user.id
            supabase.table("teachers").update({"auth_user_id": ghost['id']}).eq("id", real_row['id']).execute()
            print(f"Linked auth_user_id {ghost['id']} to real row {real_row['id']}")
    else:
        print("Could not find the real row!")
        
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
