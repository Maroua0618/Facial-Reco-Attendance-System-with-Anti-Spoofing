-- =============================================================
-- C1 Face Attendance — Baseline Schema v1
-- Task 1 (Nour). Targets: Supabase Postgres with pgvector.
-- Safe for an empty DB: drops existing app tables first.
-- =============================================================

-- 1. EXTENSIONS ------------------------------------------------
create extension if not exists pgcrypto;           -- gen_random_uuid()
create extension if not exists vector;              -- pgvector

-- 2. CLEAN SLATE (safe because live DB has no data) -----------
drop table if exists public.attendance            cascade;
drop table if exists public.sessions              cascade;
drop table if exists public.student_embeddings    cascade;
drop table if exists public.student_groups        cascade;
drop table if exists public.students              cascade;
drop table if exists public.module_groups         cascade;
drop table if exists public.modules               cascade;
drop table if exists public.groups                cascade;
drop table if exists public.teachers              cascade;

drop type if exists public.attendance_status      cascade;
drop type if exists public.teacher_role           cascade;
drop type if exists public.session_type           cascade;

-- 3. ENUMS -----------------------------------------------------
create type public.teacher_role      as enum ('admin', 'lecturer', 'teacher');
create type public.attendance_status as enum ('present', 'absent', 'spoof');
create type public.session_type      as enum ('lecture', 'td', 'tp', 'exam');

-- 4. TABLES ----------------------------------------------------

-- 4.1 teachers (profile linked 1:1 to auth.users)
create table public.teachers (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text        not null,
  role        teacher_role not null default 'teacher',
  created_at  timestamptz  not null default now()
);

-- 4.2 groups (cohorts, e.g. "L2-CS-A")
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  group_name  text not null,
  year        int  not null check (year between 1 and 10),
  created_at  timestamptz not null default now(),
  unique (group_name, year)
);

-- 4.3 modules (subjects owned by a lecturer / chargé de cours)
create table public.modules (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  academic_year  text not null,                 -- e.g. "2025-2026"
  lecturer_id    uuid not null references public.teachers(id) on delete restrict,
  created_at     timestamptz not null default now()
);
create index on public.modules (lecturer_id);

-- 4.4 module_groups (M:N) with optional TD/TP teacher assignment
create table public.module_groups (
  module_id            uuid not null references public.modules(id) on delete cascade,
  group_id             uuid not null references public.groups(id)  on delete cascade,
  assigned_teacher_id  uuid         references public.teachers(id) on delete set null,
  primary key (module_id, group_id)
);
create index on public.module_groups (assigned_teacher_id);

-- 4.5 students
create table public.students (
  id              uuid primary key default gen_random_uuid(),
  student_number  text unique not null,   -- matricule
  full_name       text not null,
  created_at      timestamptz not null default now()
);

-- 4.6 student_groups (a student may belong to multiple groups)
create table public.student_groups (
  student_id  uuid not null references public.students(id) on delete cascade,
  group_id    uuid not null references public.groups(id)   on delete cascade,
  primary key (student_id, group_id)
);

-- 4.7 student_embeddings (pgvector; multiple per student for robustness)
create table public.student_embeddings (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  embedding    vector(512) not null,
  captured_at  timestamptz not null default now()
);
-- cosine-similarity index for fast ANN search
create index student_embeddings_embedding_idx
  on public.student_embeddings
  using hnsw (embedding vector_cosine_ops);

-- 4.8 sessions (each class meeting)
create table public.sessions (
  id            uuid primary key default gen_random_uuid(),
  module_id     uuid not null references public.modules(id) on delete cascade,
  group_id      uuid not null references public.groups(id)  on delete cascade,
  session_date  date not null,
  start_time    time not null default '08:00',
  session_type  session_type not null default 'lecture',
  week          int not null check (week between 1 and 14),
  created_at    timestamptz not null default now(),
  unique (module_id, group_id, session_date, start_time),
  -- the (module, group) pair must exist in module_groups
  foreign key (module_id, group_id)
    references public.module_groups (module_id, group_id) on delete cascade
);
create index on public.sessions (module_id, week);
create index on public.sessions (group_id, session_date);

-- 4.9 attendance (one row per student per session)
create table public.attendance (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  status      attendance_status not null default 'absent',
  confidence  float check (confidence is null or confidence between 0 and 1),
  marked_at   timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (session_id, student_id)
);
create index on public.attendance (student_id);
create index on public.attendance (session_id, status);

-- keep updated_at fresh
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger attendance_touch
  before update on public.attendance
  for each row execute function public.tg_touch_updated_at();

-- =============================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================
alter table public.teachers           enable row level security;
alter table public.groups             enable row level security;
alter table public.modules            enable row level security;
alter table public.module_groups      enable row level security;
alter table public.students           enable row level security;
alter table public.student_groups     enable row level security;
alter table public.student_embeddings enable row level security;
alter table public.sessions           enable row level security;
alter table public.attendance         enable row level security;

-- helper: current user's role
create or replace function public.current_role_is(r teacher_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teachers t
    where t.id = auth.uid() and t.role = r
  );
$$;

-- helper: can the current user see this module?
create or replace function public.can_see_module(mod_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.current_role_is('admin')
    or exists (select 1 from public.modules m
               where m.id = mod_id and m.lecturer_id = auth.uid())
    or exists (select 1 from public.module_groups mg
               where mg.module_id = mod_id and mg.assigned_teacher_id = auth.uid());
$$;

-- helper: can the current user see this session?
create or replace function public.can_see_session(sess_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sessions s
    where s.id = sess_id and public.can_see_module(s.module_id)
  );
$$;

-- TEACHERS ----------------------------------------------------
create policy teachers_self_read on public.teachers
  for select using (id = auth.uid() or public.current_role_is('admin'));
create policy teachers_admin_write on public.teachers
  for all using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));

-- GROUPS ------------------------------------------------------
-- everyone authenticated can read groups (needed to render selectors)
create policy groups_read on public.groups
  for select using (auth.role() = 'authenticated');
create policy groups_admin_write on public.groups
  for all using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));

-- MODULES -----------------------------------------------------
create policy modules_read on public.modules
  for select using (public.can_see_module(id));
create policy modules_admin_write on public.modules
  for all using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));

-- MODULE_GROUPS -----------------------------------------------
create policy module_groups_read on public.module_groups
  for select using (public.can_see_module(module_id));
create policy module_groups_admin_write on public.module_groups
  for all using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));

-- STUDENTS ----------------------------------------------------
-- a user may read a student if they share any group with a module the user can see
create policy students_read on public.students
  for select using (
    public.current_role_is('admin')
    or exists (
      select 1
      from public.student_groups sg
      join public.module_groups mg on mg.group_id = sg.group_id
      where sg.student_id = students.id
        and public.can_see_module(mg.module_id)
    )
  );
create policy students_admin_write on public.students
  for all using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));

-- STUDENT_GROUPS ----------------------------------------------
create policy student_groups_read on public.student_groups
  for select using (
    public.current_role_is('admin')
    or exists (
      select 1 from public.module_groups mg
      where mg.group_id = student_groups.group_id
        and public.can_see_module(mg.module_id)
    )
  );
create policy student_groups_admin_write on public.student_groups
  for all using (public.current_role_is('admin'))
  with check (public.current_role_is('admin'));

-- STUDENT_EMBEDDINGS ------------------------------------------
-- readable/writable by users who can see that student
create policy student_embeddings_read on public.student_embeddings
  for select using (
    public.current_role_is('admin')
    or exists (
      select 1 from public.student_groups sg
      join public.module_groups mg on mg.group_id = sg.group_id
      where sg.student_id = student_embeddings.student_id
        and public.can_see_module(mg.module_id)
    )
  );
create policy student_embeddings_write on public.student_embeddings
  for all using (
    public.current_role_is('admin')
    or exists (
      select 1 from public.student_groups sg
      join public.module_groups mg on mg.group_id = sg.group_id
      where sg.student_id = student_embeddings.student_id
        and public.can_see_module(mg.module_id)
    )
  )
  with check (
    public.current_role_is('admin')
    or exists (
      select 1 from public.student_groups sg
      join public.module_groups mg on mg.group_id = sg.group_id
      where sg.student_id = student_embeddings.student_id
        and public.can_see_module(mg.module_id)
    )
  );

-- SESSIONS ----------------------------------------------------
create policy sessions_read on public.sessions
  for select using (public.can_see_module(module_id));
create policy sessions_write on public.sessions
  for all using (public.can_see_module(module_id))
  with check (public.can_see_module(module_id));

-- ATTENDANCE --------------------------------------------------
create policy attendance_read on public.attendance
  for select using (public.can_see_session(session_id));
create policy attendance_write on public.attendance
  for all using (public.can_see_session(session_id))
  with check (public.can_see_session(session_id));

-- =============================================================
-- 6. AUTH TRIGGER — auto-create teacher row on signup
-- =============================================================
create or replace function public.tg_handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.teachers (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'teacher'                                   -- admin must be promoted manually
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_handle_new_auth_user();

-- =============================================================
-- End of baseline
-- =============================================================
