import os
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"
supabase: Client = create_client(url, key)

modules = supabase.table("modules").select("*").execute().data
for m in modules[:10]:
    print(m['module_code'], m['academic_year'], m['semester'])
