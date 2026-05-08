import os
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"
supabase: Client = create_client(url, key)

# Since we don't have direct SQL access through postgrest to inspect triggers, 
# I will try to read the backend folder to see if there's any SQL migration files.
import glob
print(glob.glob("d:/CNS_C1/backend/**/*", recursive=True))
