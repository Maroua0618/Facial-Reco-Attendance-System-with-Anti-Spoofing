import type {
  Teacher,
  Group,
  Module,
  ModuleGroup,
  Student,
  Session,
  Attendance,
  AttendanceStatus,
  SessionRow,
  DashboardStats,
  WeeklyPoint,
  ModuleRatePoint,
  RankedStudent,
  TrendSnapshot,
  HeatmapCell,
  ModuleDetail,
  GroupDetail,
  SessionDetail,
  GroupWithRate,
  StudentWithRate,
  RosterEntry,
  SpoofLogEntry,
  AuditLogEntry,
  SystemHealth,
} from '@/types/db';

const uid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

export const teachers: Teacher[] = [
  { id: uid(1), full_name: 'Dr. Amina Belkacem', email: 'a.belkacem@univ.dz', role: 'lecturer', created_at: '' },
  { id: uid(2), full_name: 'Mr. Karim Hadj',     email: 'k.hadj@univ.dz',     role: 'teacher',  created_at: '' },
  { id: uid(3), full_name: 'Ms. Sara Bensaid',   email: 's.bensaid@univ.dz',  role: 'teacher',  created_at: '' },
  { id: uid(4), full_name: 'Admin',              email: 'admin@univ.dz',      role: 'admin',    created_at: '' },
];

// Pretend the current user is Admin for the demo. Wire to Supabase Auth later.
const CURRENT_USER_ID = uid(4);

export const groups: Group[] = [
  { id: uid(11), group_name: 'G1', year: 2, created_at: '' },
  { id: uid(12), group_name: 'G2', year: 2, created_at: '' },
  { id: uid(13), group_name: 'G3', year: 2, created_at: '' },
];

export const modules: Module[] = [
  { id: uid(21), module_name: 'Algorithmique',    module_code: 'ALGO201', lecturer_id: uid(1), created_at: '' },
  { id: uid(22), module_name: 'Bases de Donnees', module_code: 'BDD202',  lecturer_id: uid(1), created_at: '' },
  { id: uid(23), module_name: 'Reseaux',          module_code: 'NET203',  lecturer_id: uid(1), created_at: '' },
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

function studentsInGroup(groupId: string): string[] {
  if (groupId === uid(11)) return students.slice(0, 30).map((s) => s.id);
  if (groupId === uid(12)) return students.slice(30, 60).map((s) => s.id);
  if (groupId === uid(13)) return students.slice(60, 90).map((s) => s.id);
  return [];
}

const LECTURE_SLOTS = ['08:30', '10:15', '13:30'];
const TD_SLOTS      = ['10:15', '13:30', '15:00'];

function makeSessions(): Session[] {
  const out: Session[] = [];
  const startMonday = new Date('2026-01-05');
  let counter = 1;
  moduleGroups.forEach((mg, mgIdx) => {
    const lectureDay = mgIdx % 5;
    const tdDay      = (mgIdx + 2) % 5;
    const lectureSlot = LECTURE_SLOTS[mgIdx % LECTURE_SLOTS.length];
    const tdSlot      = TD_SLOTS[mgIdx % TD_SLOTS.length];

    for (let week = 1; week <= 14; week++) {
      const weekStart = new Date(startMonday);
      weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
      const lectureDate = new Date(weekStart); lectureDate.setDate(lectureDate.getDate() + lectureDay);
      const tdDate      = new Date(weekStart); tdDate.setDate(tdDate.getDate() + tdDay);

      out.push({
        id: uid(2000 + counter++),
        module_id: mg.module_id, group_id: mg.group_id,
        session_date: lectureDate.toISOString().slice(0, 10),
        start_time: lectureSlot, end_time: addMinutes(lectureSlot, 90),
        session_type: 'lecture', week, created_at: '',
      });
      out.push({
        id: uid(2000 + counter++),
        module_id: mg.module_id, group_id: mg.group_id,
        session_date: tdDate.toISOString().slice(0, 10),
        start_time: tdSlot, end_time: addMinutes(tdSlot, 90),
        session_type: 'td', week, created_at: '',
      });
    }
  });
  return out;
}

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export const sessions: Session[] = makeSessions();

function makeAttendance(): Attendance[] {
  const out: Attendance[] = [];
  let counter = 1;
  for (const sess of sessions) {
    const studentIds = studentsInGroup(sess.group_id);
    for (const sid of studentIds) {
      const studentHash = parseInt(sid.slice(-6), 10);
      const baseline = 0.6 + ((studentHash * 53) % 40) / 100;
      const r = (counter * 9301 + 49297) % 233280 / 233280;
      const status: AttendanceStatus = r < baseline ? 'present' : r < baseline + 0.03 ? 'spoof' : 'absent';
      out.push({
        id: uid(50000 + counter++),
        session_id: sess.id, student_id: sid,
        status,
        confidence: status === 'present' ? 0.92 + r * 0.07 : null,
        marked_at: sess.session_date + 'T' + sess.start_time + ':00Z',
        updated_at: sess.session_date + 'T' + sess.start_time + ':00Z',
      });
    }
  }
  return out;
}
export const attendance: Attendance[] = makeAttendance();
export const auditLog: AuditLogEntry[] = [];

// --- API ---

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

function sessionsById(ids: Set<string>): Attendance[] {
  return attendance.filter((a) => ids.has(a.session_id));
}

function getDemoToday(): string {
  return sessions.reduce((acc, s) => (s.session_date > acc ? s.session_date : acc), '');
}

function buildSessionRow(sess: Session): SessionRow {
  const mod = modules.find((m) => m.id === sess.module_id)!;
  const grp = groups.find((g) => g.id === sess.group_id)!;
  const att = attendance.filter((a) => a.session_id === sess.id);
  const present = att.filter((a) => a.status === 'present').length;
  const absent  = att.filter((a) => a.status === 'absent').length;
  return {
    session: sess, module: mod, group: grp,
    total_students: att.length,
    present_count: present, absent_count: absent,
    attendance_rate: att.length ? present / att.length : 0,
  };
}

export const api = {
  async getModules(): Promise<Module[]> { return modules; },
  async getGroups(): Promise<Group[]>   { return groups;  },

  async getStats(f: DashboardFilters = {}): Promise<DashboardStats> {
    const fs = filterSessions(f);
    const att = sessionsById(new Set(fs.map((s) => s.id)));
    const present = att.filter((a) => a.status === 'present').length;
    return {
      total_students: f.groupId ? studentsInGroup(f.groupId).length : students.length,
      total_modules: f.moduleId ? 1 : modules.length,
      total_groups:  f.groupId  ? 1 : groups.length,
      sessions_this_week: fs.filter((s) => s.week === 7).length,
      overall_attendance_rate: att.length ? present / att.length : 0,
    };
  },

  async getWeeklyAttendance(f: DashboardFilters = {}): Promise<WeeklyPoint[]> {
    const fs = filterSessions(f);
    const byWeek = new Map<number, { present: number; total: number; sessions: number }>();
    for (const sess of fs) {
      const slot = byWeek.get(sess.week) ?? { present: 0, total: 0, sessions: 0 };
      slot.sessions += 1;
      const att = attendance.filter((a) => a.session_id === sess.id);
      slot.total += att.length;
      slot.present += att.filter((a) => a.status === 'present').length;
      byWeek.set(sess.week, slot);
    }
    return [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([week, v]) => ({
      week, sessions: v.sessions, attendance_rate: v.total ? v.present / v.total : 0,
    }));
  },

  async getAttendanceRateByModule(f: DashboardFilters = {}): Promise<ModuleRatePoint[]> {
    const fs = filterSessions(f);
    const byModule = new Map<string, { present: number; total: number }>();
    for (const sess of fs) {
      const slot = byModule.get(sess.module_id) ?? { present: 0, total: 0 };
      const att = attendance.filter((a) => a.session_id === sess.id);
      slot.total += att.length;
      slot.present += att.filter((a) => a.status === 'present').length;
      byModule.set(sess.module_id, slot);
    }
    return modules.filter((m) => byModule.has(m.id)).map((m) => {
      const v = byModule.get(m.id)!;
      return { module_code: m.module_code, module_name: m.module_name, attendance_rate: v.total ? v.present / v.total : 0 };
    });
  },

  async getRecentSessions(f: DashboardFilters = {}, limit = 10): Promise<SessionRow[]> {
    return filterSessions(f).slice()
      .sort((a, b) => (b.session_date + b.start_time).localeCompare(a.session_date + a.start_time))
      .slice(0, limit).map(buildSessionRow);
  },

  async getStudentRanking(f: DashboardFilters = {}, limit = 5): Promise<{ worst: RankedStudent[]; best: RankedStudent[] }> {
    const fs = filterSessions(f);
    const sessionIds = new Set(fs.map((s) => s.id));
    const scope = attendance.filter((a) => sessionIds.has(a.session_id));
    const perStudent = new Map<string, { attended: number; absent: number; total: number }>();
    for (const a of scope) {
      const s = perStudent.get(a.student_id) ?? { attended: 0, absent: 0, total: 0 };
      s.total += 1;
      if (a.status === 'present') s.attended += 1; else s.absent += 1;
      perStudent.set(a.student_id, s);
    }
    const ranked: RankedStudent[] = [...perStudent.entries()].map(([id, v]) => ({
      student: students.find((st) => st.id === id)!,
      attended: v.attended, absent: v.absent, total: v.total,
      attendance_rate: v.total ? v.attended / v.total : 0,
    })).filter((r) => r.total > 0);
    return {
      worst: [...ranked].sort((a, b) => a.attendance_rate - b.attendance_rate).slice(0, limit),
      best:  [...ranked].sort((a, b) => b.attendance_rate - a.attendance_rate).slice(0, limit),
    };
  },

  async getTrend(f: DashboardFilters = {}): Promise<TrendSnapshot | null> {
    const weekly = await api.getWeeklyAttendance(f);
    if (weekly.length < 2) return null;
    const cur = weekly[weekly.length - 1];
    const prev = weekly[weekly.length - 2];
    return {
      current_week: cur.week, previous_week: prev.week,
      current_rate: cur.attendance_rate, previous_rate: prev.attendance_rate,
      delta: cur.attendance_rate - prev.attendance_rate,
    };
  },

  async getHeatmap(f: DashboardFilters = {}): Promise<HeatmapCell[]> {
    const fs = filterSessions(f);
    const buckets = new Map<string, { present: number; total: number; sessions: number }>();
    for (const sess of fs) {
      const d = new Date(sess.session_date);
      const dow = (d.getUTCDay() + 6) % 7;
      if (dow > 5) continue;
      const key = `${dow}|${sess.start_time}`;
      const att = attendance.filter((a) => a.session_id === sess.id);
      const b = buckets.get(key) ?? { present: 0, total: 0, sessions: 0 };
      b.sessions += 1; b.total += att.length;
      b.present += att.filter((a) => a.status === 'present').length;
      buckets.set(key, b);
    }
    return [...buckets.entries()].map(([key, v]) => {
      const [dow, slot] = key.split('|');
      return {
        day_of_week: Number(dow), time_slot: slot,
        attendance_rate: v.total ? v.present / v.total : 0,
        session_count: v.sessions,
      };
    });
  },

  async getModuleDetail(moduleId: string): Promise<ModuleDetail | null> {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return null;
    const lecturer = teachers.find((t) => t.id === mod.lecturer_id) ?? null;
    const mgs = moduleGroups.filter((mg) => mg.module_id === moduleId);
    const groupsOut: GroupWithRate[] = mgs.map((mg) => {
      const grp = groups.find((g) => g.id === mg.group_id)!;
      const fs = sessions.filter((s) => s.module_id === moduleId && s.group_id === mg.group_id);
      const att = attendance.filter((a) => fs.some((s) => s.id === a.session_id));
      const present = att.filter((a) => a.status === 'present').length;
      const teacher = teachers.find((t) => t.id === mg.assigned_teacher_id);
      return {
        ...grp,
        attendance_rate: att.length ? present / att.length : 0,
        session_count: fs.length,
        assigned_teacher_name: teacher?.full_name ?? null,
      };
    });
    const allFs = sessions.filter((s) => s.module_id === moduleId);
    const allAtt = attendance.filter((a) => allFs.some((s) => s.id === a.session_id));
    const overallPresent = allAtt.filter((a) => a.status === 'present').length;
    return {
      module: mod, lecturer, groups: groupsOut,
      overall_rate: allAtt.length ? overallPresent / allAtt.length : 0,
      total_sessions: allFs.length,
    };
  },

  async getGroupDetail(groupId: string): Promise<GroupDetail | null> {
    const grp = groups.find((g) => g.id === groupId);
    if (!grp) return null;
    const studentIds = studentsInGroup(groupId);
    const groupSessions = sessions.filter((s) => s.group_id === groupId);
    const groupSessionIds = new Set(groupSessions.map((s) => s.id));
    const studentsOut: StudentWithRate[] = studentIds.map((sid) => {
      const att = attendance.filter((a) => a.student_id === sid && groupSessionIds.has(a.session_id));
      const attended = att.filter((a) => a.status === 'present').length;
      const absent = att.filter((a) => a.status === 'absent').length;
      return {
        student: students.find((s) => s.id === sid)!,
        attendance_rate: att.length ? attended / att.length : 0,
        absent, total: att.length,
      };
    }).sort((a, b) => a.attendance_rate - b.attendance_rate);
    const moduleIds = new Set(moduleGroups.filter((mg) => mg.group_id === groupId).map((mg) => mg.module_id));
    const grpModules = modules.filter((m) => moduleIds.has(m.id));
    const att = attendance.filter((a) => groupSessionIds.has(a.session_id));
    const present = att.filter((a) => a.status === 'present').length;
    return {
      group: grp, students: studentsOut, modules: grpModules,
      overall_rate: att.length ? present / att.length : 0,
    };
  },

  async getSessionDetail(sessionId: string): Promise<SessionDetail | null> {
    const sess = sessions.find((s) => s.id === sessionId);
    if (!sess) return null;
    const mod = modules.find((m) => m.id === sess.module_id)!;
    const grp = groups.find((g) => g.id === sess.group_id)!;
    const sessAtt = attendance.filter((a) => a.session_id === sessionId);
    const byStudent = new Map(sessAtt.map((a) => [a.student_id, a]));
    const roster: RosterEntry[] = studentsInGroup(sess.group_id).map((sid) => {
      const a = byStudent.get(sid);
      return {
        student: students.find((s) => s.id === sid)!,
        status: a?.status ?? 'not_marked',
        confidence: a?.confidence ?? null,
        marked_at: a?.marked_at ?? null,
      };
    });
    const present = roster.filter((r) => r.status === 'present').length;
    const absent  = roster.filter((r) => r.status === 'absent').length;
    const spoof   = roster.filter((r) => r.status === 'spoof').length;
    return {
      session: sess, module: mod, group: grp, roster,
      present_count: present, absent_count: absent, spoof_count: spoof,
      attendance_rate: roster.length ? present / roster.length : 0,
    };
  },

  async getTodaySessions(): Promise<SessionRow[]> {
    const today = getDemoToday();
    return sessions.filter((s) => s.session_date === today)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map(buildSessionRow);
  },

  async getLiveSession() {
    const today = await api.getTodaySessions();
    if (today.length === 0) return null;
    const liveRow = today[Math.floor(today.length / 2)] ?? today[0];
    const sessAtt = attendance.filter((a) => a.session_id === liveRow.session.id);
    const recognizedAtt = sessAtt.filter((a) => a.status === 'present' || a.status === 'spoof');
    const last = recognizedAtt.slice(-5).reverse().map((a) => ({
      student: students.find((s) => s.id === a.student_id)!,
      confidence: a.confidence ?? 0,
      at: a.marked_at,
    }));
    return {
      row: liveRow,
      recognized: recognizedAtt.length,
      total: sessAtt.length,
      last_recognized: last,
    };
  },

  async updateAttendanceStatus(sessionId: string, studentId: string, newStatus: AttendanceStatus): Promise<void> {
    const idx = attendance.findIndex((a) => a.session_id === sessionId && a.student_id === studentId);
    const now = new Date().toISOString();
    const prev: AttendanceStatus | 'not_marked' = idx >= 0 ? attendance[idx].status : 'not_marked';

    if (idx >= 0) {
      attendance[idx] = { ...attendance[idx], status: newStatus, updated_at: now };
    } else {
      attendance.push({
        id: uid(99000 + attendance.length + 1),
        session_id: sessionId, student_id: studentId,
        status: newStatus, confidence: null,
        marked_at: now, updated_at: now,
      });
    }

    const sess = sessions.find((s) => s.id === sessionId);
    const stu  = students.find((s) => s.id === studentId);
    const actor = teachers.find((t) => t.id === CURRENT_USER_ID);
    if (sess && stu && actor) {
      auditLog.unshift({
        id: uid(80000 + auditLog.length + 1),
        at: now,
        actor,
        session: sess,
        module: modules.find((m) => m.id === sess.module_id)!,
        group:  groups.find((g)  => g.id === sess.group_id)!,
        student: stu,
        prev_status: prev,
        new_status: newStatus,
      });
    }
  },

  async getSpoofLog(f: DashboardFilters = {}): Promise<SpoofLogEntry[]> {
    const fs = filterSessions(f);
    const sessionIds = new Set(fs.map((s) => s.id));
    return attendance
      .filter((a) => a.status === 'spoof' && sessionIds.has(a.session_id))
      .sort((a, b) => b.marked_at.localeCompare(a.marked_at))
      .map((a) => {
        const sess = sessions.find((s) => s.id === a.session_id)!;
        return {
          attendance_id: a.id,
          student: students.find((s) => s.id === a.student_id)!,
          session: sess,
          module: modules.find((m) => m.id === sess.module_id)!,
          group:  groups.find((g)  => g.id === sess.group_id)!,
          marked_at: a.marked_at,
        };
      });
  },

  async getAuditLog(limit = 100): Promise<AuditLogEntry[]> {
    return auditLog.slice(0, limit);
  },

  async getSystemHealth(): Promise<SystemHealth> {
    const total = attendance.length;
    const present = attendance.filter((a) => a.status === 'present');
    const spoof   = attendance.filter((a) => a.status === 'spoof');
    const recognized = present.length + spoof.length;
    const avgConf = present.length
      ? present.reduce((acc, a) => acc + (a.confidence ?? 0), 0) / present.length
      : 0;

    // Daily counts for the last 7 distinct dates we have data on
    const byDate = new Map<string, { recognized: number; spoof: number }>();
    for (const a of attendance) {
      const date = a.marked_at.slice(0, 10);
      const slot = byDate.get(date) ?? { recognized: 0, spoof: 0 };
      if (a.status === 'present' || a.status === 'spoof') slot.recognized += 1;
      if (a.status === 'spoof') slot.spoof += 1;
      byDate.set(date, slot);
    }
    const daily_counts = [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([date, v]) => ({ date, recognized: v.recognized, spoof: v.spoof }));

    return {
      avg_confidence: avgConf,
      match_rate: total ? recognized / total : 0,
      spoof_rate: total ? spoof.length / total : 0,
      total_marked: total,
      daily_counts,
    };
  },
};
