import os
import traceback
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"

try:
    supabase: Client = create_client(url, key)

    # Find and delete ALL ghost rows (where email is null)
    ghost_rows = supabase.table("teachers").select("*").is_("email", "null").execute().data
    print(f"Found {len(ghost_rows)} ghost rows to clean up.")
    
    for ghost in ghost_rows:
        supabase.table("teachers").delete().eq("id", ghost['id']).execute()
        print(f"Successfully deleted ghost row: {ghost['id']}")
        
    print("Cleanup complete!")
        
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
