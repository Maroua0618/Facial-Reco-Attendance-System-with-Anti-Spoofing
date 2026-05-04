// Shape mirrors supabase/migrations/20260424000001_baseline.sql
// When the migration is applied, replace these with auto-generated
// `Database` types from `supabase gen types typescript`.

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
  session_date: string;
  start_time: string;
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

// ---- Derived / view shapes ----

export interface SessionRow {
  session: Session;
  module: Module;
  group: Group;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_rate: number;
}

export interface DashboardStats {
  total_students: number;
  total_modules: number;
  total_groups: number;
  sessions_this_week: number;
  overall_attendance_rate: number;
}

export interface WeeklyPoint {
  week: number;
  attendance_rate: number;
  sessions: number;
}

export interface ModuleRatePoint {
  module_code: string;
  module_name: string;
  attendance_rate: number;
}

export interface RankedStudent {
  student: Student;
  attended: number;
  absent: number;
  total: number;
  attendance_rate: number;
}

export interface TrendSnapshot {
  current_week: number;
  previous_week: number;
  current_rate: number;
  previous_rate: number;
  delta: number;
}

export interface HeatmapCell {
  day_of_week: number;
  time_slot: string;
  attendance_rate: number;
  session_count: number;
}

export interface GroupWithRate extends Group {
  attendance_rate: number;
  session_count: number;
  assigned_teacher_name: string | null;
}

export interface ModuleDetail {
  module: Module;
  lecturer: Teacher | null;
  groups: GroupWithRate[];
  overall_rate: number;
  total_sessions: number;
}

export interface StudentWithRate {
  student: Student;
  attendance_rate: number;
  absent: number;
  total: number;
}

export interface GroupDetail {
  group: Group;
  students: StudentWithRate[];
  modules: Module[];
  overall_rate: number;
}

export interface RosterEntry {
  student: Student;
  status: AttendanceStatus | 'not_marked';
  confidence: number | null;
  marked_at: string | null;
}

export interface SessionDetail {
  session: Session;
  module: Module;
  group: Group;
  roster: RosterEntry[];
  present_count: number;
  absent_count: number;
  spoof_count: number;
  attendance_rate: number;
}

// ---- Phase 3 ----

export interface SpoofLogEntry {
  attendance_id: string;
  student: Student;
  session: Session;
  module: Module;
  group: Group;
  marked_at: string;
}

export interface AuditLogEntry {
  id: string;
  at: string;
  actor: Teacher;
  session: Session;
  module: Module;
  group: Group;
  student: Student;
  prev_status: AttendanceStatus | 'not_marked';
  new_status: AttendanceStatus;
}

export interface SystemHealth {
  avg_confidence: number;       // 0..1, over present rows
  match_rate: number;           // (present+spoof)/total marked
  spoof_rate: number;           // spoof/total marked
  total_marked: number;
  daily_counts: { date: string; recognized: number; spoof: number }[];
}

// ---- Student profile ----

export interface StudentSessionEntry {
  session: Session;
  module: Module;
  group: Group;
  status: AttendanceStatus | 'not_marked';
  confidence: number | null;
  marked_at: string | null;
}

export interface StudentProfileData {
  student: Student;
  groups: Group[];
  embedding_count: number;
  total_sessions: number;
  attended: number;
  absent: number;
  spoof: number;
  attendance_rate: number;
  sessions: StudentSessionEntry[];
  weekly_rates: WeeklyPoint[];
}
