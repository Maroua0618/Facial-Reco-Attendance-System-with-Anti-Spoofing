-- Fix auth trigger to honour the role chosen at signup (lecturer or teacher).
-- Admin role can never be self-assigned; it must be promoted manually.
create or replace function public.tg_handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _role teacher_role;
begin
  _role := case
    when new.raw_user_meta_data->>'role' = 'lecturer' then 'lecturer'::teacher_role
    else 'teacher'::teacher_role
  end;
  insert into public.teachers (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    _role
  )
  on conflict (id) do nothing;
  return new;
end $$;
