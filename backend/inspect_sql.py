import os
import psycopg2

DATABASE_URL = "postgresql://postgres.clokchxukrwhaeeaxnif:mFk2tB49U668J#H@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT pg_get_functiondef(oid) 
        FROM pg_proc 
        WHERE proname = 'handle_new_user';
    """)
    res = cur.fetchone()
    if res:
        print("TRIGGER FUNCTION:\n", res[0])
    else:
        print("handle_new_user function not found.")
    
except Exception as e:
    print(f"Error: {e}")
