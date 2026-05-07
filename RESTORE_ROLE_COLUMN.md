# Restore Teacher Roles Column

The `role` column was accidentally deleted from the `teachers` table. 
Here's how to restore it:

## Option 1: Via Supabase Dashboard (Fastest)

1. Go to: https://app.supabase.com/project/spccazagwlvrwdmpgmgt/sql/new
2. Copy and paste this SQL:

```sql
-- Check if role column exists (it shouldn't)
SELECT column_name FROM information_schema.columns
WHERE table_name='teachers' AND column_name='role';

-- If nothing returned, add the column back:
ALTER TABLE public.teachers
ADD COLUMN role public.teacher_role NOT NULL DEFAULT 'teacher';

-- Verify it was added
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='teachers' ORDER BY ordinal_position;
```

3. Click **Run** to execute

4. You should see:
   - First query: (no results)
   - Second query: role column added
   - Third query: confirmation that role column exists with type "USER-DEFINED"

## Option 2: Via pgAdmin (if you have access)

Connect to the database and run the same SQL above.

## Verification

After running the SQL, the `teachers` table should have:
- id (uuid)
- full_name (text)
- email (text) [if it exists]
- role (teacher_role enum) ← restored
- auth_user_id (uuid)
- created_at (timestamptz)
