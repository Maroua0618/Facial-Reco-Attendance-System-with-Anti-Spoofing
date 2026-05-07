-- Restore role column to teachers table
-- This was accidentally deleted but needed for display/filtering
alter table public.teachers
add column role public.teacher_role not null default 'teacher';

-- Update any existing teachers to have a role (in case some exist)
update public.teachers
set role = 'teacher'
where role is null;
