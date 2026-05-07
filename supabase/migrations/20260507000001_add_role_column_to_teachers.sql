-- Add role column back to teachers table
-- This was accidentally deleted and we're restoring it

-- Create enum type (PostgreSQL doesn't support IF NOT EXISTS for types, so we use DO block)
DO $$ 
BEGIN 
  CREATE TYPE public.teacher_role AS ENUM ('admin', 'lecturer', 'teacher');
EXCEPTION WHEN duplicate_object THEN 
  NULL; 
END $$;

-- Add role column back to teachers table with default 'teacher'
ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS role public.teacher_role NOT NULL DEFAULT 'teacher';
