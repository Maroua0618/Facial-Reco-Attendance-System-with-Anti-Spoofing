import psycopg2

DATABASE_URL = "postgresql://postgres.clokchxukrwhaeeaxnif:sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'teachers';
    """)
    res = cur.fetchone()
    print("RLS enabled on teachers:", res[0] if res else "Table not found")
except Exception as e:
    print(f"Error: {e}")
