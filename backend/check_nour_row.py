import os
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"
supabase: Client = create_client(url, key)

email = "nour.zamiche@ensia.edu.dz"
res = supabase.table("teachers").select("*").eq("email", email).execute().data
for t in res:
    print(t)
