export interface Teacher {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'lecturer' | 'teacher';
  auth_user_id?: string;
  created_at: string;
}

export interface Group {
  id: string;
  group_name: string;
  year: number;
  created_at: string;
}

export interface Student {
  id: string;
  student_number: string;
  full_name: string;
  created_at: string;
}

export interface Module {
  id: string;
  module_name: string;
  module_code: string;
  lecturer_id: string | null;
  created_at: string;
}

export type SessionType = 'cours' | 'td' | 'tp' | 'exam';

export interface Session {
  id: string;
  module_id: string;
  group_id: string;
  session_date: string;
  start_time: string;
  session_type: SessionType;
  week: number;
  created_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'spoof';

export interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  confidence: number | null;
  marked_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  at: string;
  actor_id: string;
  session_id: string;
  student_id: string;
  prev_status: AttendanceStatus;
  new_status: AttendanceStatus;
}

// ── View shapes ──────────────────────────────────────────────────────────────

export interface SessionWithDetails {
  session: Session;
  module: Module;
  group: Group;
}

export interface AttendanceWithStudent {
  attendance: Attendance;
  student: Student;
}

export interface SessionSummary {
  session: Session;
  module: Module;
  group: Group;
  present_count: number;
  absent_count: number;
  spoof_count: number;
  total: number;
  rate: number;
}

export interface StudentWithGroup {
  student: Student;
  group: Group;
}

export interface DashboardStats {
  total_students: number;
  total_sessions: number;
  total_modules: number;
  total_groups: number;
  avg_attendance_rate: number;
  recent_sessions: SessionSummary[];
}

export interface ModuleAttendanceSummary {
  module_id: string;
  module_code: string;
  module_name: string;
  session_count: number;
  avg_rate: number;
}

export interface StudentProfileData {
  student: Student;
  groups: Group[];
  sessions: SessionSummary[];
  overall_rate: number;
}

export interface GroupDetailData {
  group: Group;
  modules: Module[];
  students: StudentWithGroup[];
}

export interface ModuleDetailData {
  module: Module;
  groups: Group[];
  sessions: SessionSummary[];
  students: StudentWithGroup[];
}

export interface SpoofEntry {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  session_date: string;
  module_name: string;
  confidence: number;
  marked_at: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor_name: string;
  student_name: string;
  module_name: string;
  session_date: string;
  prev_status: AttendanceStatus;
  new_status: AttendanceStatus;
}
