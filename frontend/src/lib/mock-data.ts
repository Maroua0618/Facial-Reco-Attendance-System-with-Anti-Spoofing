import type {
  Teacher,
  Group,
  Module,
  ModuleGroup,
  Student,
  Session,
  Attendance,
  SessionRow,
  DashboardStats,
  WeeklyPoint,
  ModuleRatePoint,
} from '@/types/db';

// ---------- Seed data (small, readable) ----------

const uid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

export const teachers: Teacher[] = [
  { id: uid(1), full_name: 'Dr. Amina Belkacem', email: 'a.belkacem@univ.dz', role: 'lecturer', created_at: '' },
  { id: uid(2), full_name: 'Mr. Karim Hadj',     email: 'k.hadj@univ.dz',     role: 'teacher',  created_at: '' },
  { id: uid(3), full_name: 'Ms. Sara Bensaid',   email: 's.bensaid@univ.dz',  role: 'teacher',  created_at: '' },
  { id: uid(4), full_name: 'Admin',              email: 'admin@univ.dz',      role: 'admin',    created_at: '' },
];

export const groups: Group[] = [
  { id: uid(11), group_name: 'G1', year: 2, created_at: '' },
  { id: uid(12), group_name: 'G2', year: 2, created_at: '' },
  { id: uid(13), group_name: 'G3', year: 2, created_at: '' },
];

export const modules: Module[] = [
  { id: uid(21), module_name: 'Algorithmique',     module_code: 'ALGO201', lecturer_id: uid(1), created_at: '' },
  { id: uid(22), module_name: 'Bases de Données',  module_code: 'BDD202',  lecturer_id: uid(1), created_at: '' },
  { id: uid(23), module_name: 'Réseaux',           module_code: 'NET203',  lecturer_id: uid(1), created_at: '' },
];

export const moduleGroups: ModuleGroup[] = [
  { module_id: uid(21), group_id: uid(11), assigned_teacher_id: uid(2) },
  { module_id: uid(21), group_id: uid(12), assigned_teacher_id: uid(3) },
  { module_id: uid(21), group_id: uid(13), assigned_teacher_id: uid(2) },
  { module_id: uid(22), group_id: uid(11), assigned_teacher_id: uid(3) },
  { module_id: uid(22), group_id: uid(12), assigned_teacher_id: uid(2) },
  { module_id: uid(23), group_id: uid(11), assigned_teacher_id: uid(3) },
  { module_id: uid(23), group_id: uid(13), assigned_teacher_id: uid(3) },
];

// 30 students per group → 90 total
export const students: Student[] = Array.from({ length: 90 }, (_, i) => {
  const idx = i + 1;
  return {
    id: uid(1000 + idx),
    student_number: `2CS${String(2024000 + idx)}`,
    full_name: `Student ${idx}`,
    email: `student${idx}@univ.dz`,
    created_at: '',
  };
});

// Generate 14 weeks of sessions for each (module, group) pair
function makeSessions(): Session[] {
  const out: Session[] = [];
  const startMonday = new Date('2026-01-05'); // week 1 Monday
  let counter = 1;
  for (const mg of moduleGroups) {
    for (let week = 1; week <= 14; week++) {
      const date = new Date(startMonday);
      date.setDate(date.getDate() + (week - 1) * 7);
      // 1 lecture + 1 TD per (module,group) per week
      out.push({
        id: uid(2000 + counter++),
        module_id: mg.module_id,
        group_id: mg.group_id,
        session_date: date.toISOString().slice(0, 10),
        start_time: '08:30',
        end_time: '10:00',
        session_type: 'lecture',
        week,
        created_at: '',
      });
      out.push({
        id: uid(2000 + counter++),
        module_id: mg.module_id,
        group_id: mg.group_id,
        session_date: date.toISOString().slice(0, 10),
        start_time: '10:15',
        end_time: '11:45',
        session_type: 'td',
        week,
        created_at: '',
      });
    }
  }
  return out;
}
export const sessions: Session[] = makeSessions();

// For each session, mark each student in that group present/absent (~85% present)
function makeAttendance(): Attendance[] {
  const out: Attendance[] = [];
  let counter = 1;
  // group_id -> student_ids (split 90 students into 3 groups of 30)
  const groupStudents: Record<string, string[]> = {
    [uid(11)]: students.slice(0, 30).map((s) => s.id),
    [uid(12)]: students.slice(30, 60).map((s) => s.id),
    [uid(13)]: students.slice(60, 90).map((s) => s.id),
  };
  for (const sess of sessions) {
    const studentIds = groupStudents[sess.group_id] ?? [];
    for (const sid of studentIds) {
      // deterministic pseudo-random based on counter
      const r = (counter * 9301 + 49297) % 233280 / 233280;
      const status = r < 0.85 ? 'present' : r < 0.97 ? 'absent' : 'spoof';
      out.push({
        id: uid(50000 + counter++),
        session_id: sess.id,
        student_id: sid,
        status,
        confidence: status === 'present' ? 0.92 + (r * 0.07) : null,
        marked_at: sess.session_date + 'T' + sess.start_time + ':00Z',
        updated_at: sess.session_date + 'T' + sess.start_time + ':00Z',
      });
    }
  }
  return out;
}
export const attendance: Attendance[] = makeAttendance();

// ---------- Data-access API (swap this file for real Supabase later) ----------

function studentsInGroup(groupId: string): string[] {
  // Same split logic as makeAttendance
  if (groupId === uid(11)) return students.slice(0, 30).map((s) => s.id);
  if (groupId === uid(12)) return students.slice(30, 60).map((s) => s.id);
  if (groupId === uid(13)) return students.slice(60, 90).map((s) => s.id);
  return [];
}

export interface DashboardFilters {
  moduleId?: string;
  groupId?: string;
}

function filterSessions(f: DashboardFilters): Session[] {
  return sessions.filter((s) => {
    if (f.moduleId && s.module_id !== f.moduleId) return false;
    if (f.groupId && s.group_id !== f.groupId) return false;
    return true;
  });
}

export const api = {
  async getModules(): Promise<Module[]> {
    return modules;
  },
  async getGroups(): Promise<Group[]> {
    return groups;
  },

  async getStats(f: DashboardFilters = {}): Promise<DashboardStats> {
    const filteredSessions = filterSessions(f);
    const sessionIds = new Set(filteredSessions.map((s) => s.id));
    const att = attendance.filter((a) => sessionIds.has(a.session_id));
    const present = att.filter((a) => a.status === 'present').length;
    const total = att.length;
    return {
      total_students: f.groupId ? studentsInGroup(f.groupId).length : students.length,
      total_modules: f.moduleId ? 1 : modules.length,
      total_groups: f.groupId ? 1 : groups.length,
      sessions_this_week: filteredSessions.filter((s) => s.week === 7).length,
      overall_attendance_rate: total === 0 ? 0 : present / total,
    };
  },

  async getWeeklyAttendance(f: DashboardFilters = {}): Promise<WeeklyPoint[]> {
    const filteredSessions = filterSessions(f);
    const byWeek = new Map<number, { present: number; total: number; sessions: number }>();
    for (const sess of filteredSessions) {
      const slot = byWeek.get(sess.week) ?? { present: 0, total: 0, sessions: 0 };
      slot.sessions += 1;
      const att = attendance.filter((a) => a.session_id === sess.id);
      slot.total += att.length;
      slot.present += att.filter((a) => a.status === 'present').length;
      byWeek.set(sess.week, slot);
    }
    return Array.from(byWeek.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([week, v]) => ({
        week,
        sessions: v.sessions,
        attendance_rate: v.total === 0 ? 0 : v.present / v.total,
      }));
  },

  async getAttendanceRateByModule(f: DashboardFilters = {}): Promise<ModuleRatePoint[]> {
    const filteredSessions = filterSessions(f);
    const byModule = new Map<string, { present: number; total: number }>();
    for (const sess of filteredSessions) {
      const slot = byModule.get(sess.module_id) ?? { present: 0, total: 0 };
      const att = attendance.filter((a) => a.session_id === sess.id);
      slot.total += att.length;
      slot.present += att.filter((a) => a.status === 'present').length;
      byModule.set(sess.module_id, slot);
    }
    return modules
      .filter((m) => byModule.has(m.id))
      .map((m) => {
        const v = byModule.get(m.id)!;
        return {
          module_code: m.module_code,
          module_name: m.module_name,
          attendance_rate: v.total === 0 ? 0 : v.present / v.total,
        };
      });
  },

  async getRecentSessions(f: DashboardFilters = {}, limit = 10): Promise<SessionRow[]> {
    const filtered = filterSessions(f)
      .slice()
      .sort((a, b) => (b.session_date + b.start_time).localeCompare(a.session_date + a.start_time))
      .slice(0, limit);
    return filtered.map((sess) => {
      const mod = modules.find((m) => m.id === sess.module_id)!;
      const grp = groups.find((g) => g.id === sess.group_id)!;
      const att = attendance.filter((a) => a.session_id === sess.id);
      const present = att.filter((a) => a.status === 'present').length;
      const absent = att.filter((a) => a.status === 'absent').length;
      return {
        session: sess,
        module: mod,
        group: grp,
        total_students: att.length,
        present_count: present,
        absent_count: absent,
        attendance_rate: att.length === 0 ? 0 : present / att.length,
      };
    });
  },
};
