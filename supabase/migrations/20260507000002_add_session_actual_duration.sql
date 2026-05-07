-- Store the actual live attendance run timing for a session.
-- These fields are written when a teacher finishes the live attendance scan.

alter table public.sessions
  add column if not exists actual_started_at timestamptz,
  add column if not exists actual_ended_at timestamptz,
  add column if not exists duration_seconds integer
    check (duration_seconds is null or duration_seconds >= 0);

create index if not exists sessions_actual_ended_at_idx
  on public.sessions (actual_ended_at);
