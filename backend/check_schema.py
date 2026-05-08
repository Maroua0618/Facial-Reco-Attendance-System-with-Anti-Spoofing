import psycopg2

DATABASE_URL = "postgresql://postgres.clokchxukrwhaeeaxnif:sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'module_groups';
    """)
    rows = cur.fetchall()
    print("Columns in module_groups:")
    for r in rows:
        print(f"  {r[0]}: {r[1]}")
        
    cur.execute("""
        SELECT a.attname
        FROM   pg_index i
        JOIN   pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE  i.indrelid = 'module_groups'::regclass AND i.indisprimary;
    """)
    pk_cols = cur.fetchall()
    print("Primary key columns:", [c[0] for c in pk_cols])
except Exception as e:
    print(f"Error: {e}")
