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
  email?: string;
  photo_url?: string | null;
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
  end_time?: string | undefined;
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
  marked_at: string | null;
  updated_at?: string | null;
}

export interface AuditLogEntry {
  id: string;
  at: string;
  actor_id?: string | null;
  session_id?: string | null;
  student_id?: string | null;
  actor: Teacher;
  session: Session;
  module: Module;
  group: Group;
  student: Student;
  prev_status: AttendanceStatus | 'not_marked';
  new_status: AttendanceStatus;
}

// View shapes
export interface SessionWithDetails { session: Session; module: Module; group: Group; }
export interface AttendanceWithStudent { attendance: Attendance; student: Student }

export interface SessionSummary {
  session: Session; module: Module; group: Group;
  present_count: number; absent_count: number; spoof_count: number; total: number; rate: number;
}

export interface StudentWithGroup { student: Student; group: Group }

export interface DashboardStats {
  total_students: number;
  total_sessions: number;
  total_modules: number;
  total_groups: number;
  avg_attendance_rate?: number;
  recent_sessions?: SessionSummary[];
  sessions_this_week?: number;
  overall_attendance_rate?: number;
}

export interface ModuleAttendanceSummary { module_id: string; module_code: string; module_name: string; session_count: number; avg_rate: number }

export interface StudentProfileData {
  student: Student;
  groups: Group[];
  sessions: StudentSessionEntry[];
  overall_rate?: number;
  embedding_count?: number;
  total_sessions?: number;
  attended?: number;
  absent?: number;
  spoof?: number;
  attendance_rate?: number;
  weekly_rates?: WeeklyPoint[];
}

export interface GroupDetailData { group: Group; modules: Module[]; students: StudentWithGroup[] }
export interface ModuleDetailData { module: Module; groups: Group[]; sessions: SessionSummary[]; students: StudentWithGroup[] }

export interface SpoofEntry { id: string; session_id: string; student_id: string; student_name: string; session_date: string; module_name: string; confidence: number; marked_at: string }

export interface AuditEntry { id: string; at: string; actor_name: string; student_name: string; module_name: string; session_date: string; prev_status: AttendanceStatus | 'not_marked'; new_status: AttendanceStatus }

// Additional frontend types
export interface SessionRow { session: Session; module: Module; group: Group; total_students: number; present_count: number; absent_count: number; attendance_rate: number }
export interface WeeklyPoint { week: number; sessions: number; attendance_rate: number }
export interface ModuleRatePoint { module_code: string; module_name: string; attendance_rate: number }
export interface RankedStudent { student: Student; attended: number; absent: number; total: number; attendance_rate: number }
export interface TrendSnapshot { current_week: number; previous_week: number; current_rate: number; previous_rate: number; delta: number }
export interface HeatmapCell { day_of_week: number; time_slot: string; attendance_rate: number; session_count: number }

export interface GroupWithRate extends Group { attendance_rate: number; session_count: number; assigned_teacher_name?: string | null }
export interface StudentWithRate { student: Student; attendance_rate: number; absent: number; total: number }
export interface ModuleDetail { module: Module; lecturer: Teacher | null; groups: GroupWithRate[]; overall_rate: number; total_sessions: number }
export interface GroupDetail { group: Group; students: StudentWithRate[]; modules: Module[]; overall_rate: number }

export type RosterStatus = AttendanceStatus | 'not_marked'
export interface RosterEntry { student: Student; status: RosterStatus; confidence: number | null; marked_at: string | null }
export interface SessionDetail { session: Session; module: Module; group: Group; roster: RosterEntry[]; present_count: number; absent_count: number; spoof_count: number; attendance_rate: number }
export interface SpoofLogEntry { attendance_id: string; student: Student; session: Session; module: Module; group: Group; marked_at: string | null }
export interface StudentSessionEntry { session: Session; module: Module; group: Group; status: AttendanceStatus | 'not_marked'; confidence: number | null; marked_at: string | null }
export interface SystemHealth { avg_confidence: number; match_rate: number; spoof_rate: number; total_marked: number; daily_counts: { date: string; recognized: number; spoof: number }[] }
