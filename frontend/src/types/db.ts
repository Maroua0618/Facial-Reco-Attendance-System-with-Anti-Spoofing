// Shape mirrors supabase/migrations/20260424000001_baseline.sql
// When the migration is applied to live Supabase, replace these with
// the auto-generated `Database` types from `supabase gen types typescript`.

export type TeacherRole = 'admin' | 'lecturer' | 'teacher';
export type SessionType = 'lecture' | 'td' | 'tp' | 'exam';
export type AttendanceStatus = 'present' | 'absent' | 'spoof';

export interface Teacher {
  id: string;
  full_name: string;
  email: string;
  role: TeacherRole;
  created_at: string;
}

export interface Group {
  id: string;
  group_name: string;
  year: number;
  created_at: string;
}

export interface Module {
  id: string;
  module_name: string;
  module_code: string;
  lecturer_id: string;
  created_at: string;
}

export interface ModuleGroup {
  module_id: string;
  group_id: string;
  assigned_teacher_id: string | null;
}

export interface Student {
  id: string;
  student_number: string;
  full_name: string;
  email: string | null;
  created_at: string;
}

export interface StudentGroup {
  student_id: string;
  group_id: string;
}

export interface Session {
  id: string;
  module_id: string;
  group_id: string;
  session_date: string; // ISO date
  start_time: string;   // HH:mm
  end_time: string;
  session_type: SessionType;
  week: number;
  created_at: string;
}

export interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  confidence: number | null;
  marked_at: string;
  updated_at: string;
}

// Convenience derived shape used by the dashboard table
export interface SessionRow {
  session: Session;
  module: Module;
  group: Group;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_rate: number; // 0..1
}

export interface DashboardStats {
  total_students: number;
  total_modules: number;
  total_groups: number;
  sessions_this_week: number;
  overall_attendance_rate: number; // 0..1
}

export interface WeeklyPoint {
  week: number;
  attendance_rate: number; // 0..1
  sessions: number;
}

export interface ModuleRatePoint {
  module_code: string;
  module_name: string;
  attendance_rate: number; // 0..1
}
