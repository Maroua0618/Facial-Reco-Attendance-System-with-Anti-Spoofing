import type {
  Group,
  Module,
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
  Teacher,
} from '@/types/db';
import { supabase } from '@/integrations/supabase/client';

// ---------- adapters: DB rows -> frontend types ----------
function adaptModule(r: any): Module {
  return {
    id: r.id,
    module_name: r.name ?? r.module_name ?? '',
    module_code: r.module_code ?? '',
    lecturer_id: r.lecturer_id,
    created_at: r.created_at ?? '',
  };
}
function adaptStudent(r: any): Student {
  return {
    id: r.id,
    student_number: r.student_number,
    full_name: r.full_name,
    email: '',
    created_at: r.created_at ?? '',
  };
}
function adaptGroup(r: any): Group {
  return { id: r.id, group_name: r.group_name, year: r.year, created_at: r.created_at ?? '' };
}
function adaptTeacher(r: any): Teacher {
  return {
    id: r.id, full_name: r.full_name, email: r.email ?? '',
    role: r.role ?? 'teacher', created_at: r.created_at ?? '',
  };
}
function adaptSession(r: any): Session {
  return {
    id: r.id,
    module_id: r.module_id,
    group_id: r.group_id,
    session_date: r.session_date,
    start_time: r.start_time?.slice(0, 5) ?? r.start_time,
    end_time: undefined,
    session_type: r.session_type,
    week: r.week,
    created_at: r.created_at ?? '',
  };
}
function adaptAttendance(r: any): Attendance {
  return {
    id: r.id,
    session_id: r.session_id,
    student_id: r.student_id,
    status: r.status,
    confidence: r.confidence ?? null,
    marked_at: r.marked_at,
    updated_at: r.updated_at,
  };
}

// ---------- low-level fetchers ----------
async function fetchAll<T>(table: string, adapter: (r: any) => T): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*');
  if (error) { console.error(`fetch ${table}`, error); return []; }
  return (data ?? []).map(adapter);
}

// ---------- helpers ----------
async function getCurrentTeacher(): Promise<Teacher | null> {
  const { data: u } = await supabase.auth.getUser();
  if (u.user) {
    const { data: rows } = await supabase
      .from('teachers').select('*').eq('auth_user_id', u.user.id).maybeSingle();
    if (rows) return adaptTeacher(rows);
  }
  // fallback: pretend signed-in user is admin from seed
  const teachers = await fetchAll('teachers', adaptTeacher);
  return teachers.find((t) => t.role === 'admin') ?? teachers[0] ?? null;
}

function filterSessions(rows: Session[], f: { moduleId?: string; groupId?: string }): Session[] {
  return rows.filter((s) => {
    if (f.moduleId && s.module_id !== f.moduleId) return false;
    if (f.groupId && s.group_id !== f.groupId) return false;
    return true;
  });
}

function buildSessionRow(
  sess: Session,
  modules: Module[],
  groups: Group[],
  attendance: Attendance[],
): SessionRow {
  const mod = modules.find((m) => m.id === sess.module_id)!;
  const grp = groups.find((g) => g.id === sess.group_id)!;
  const att = attendance.filter((a) => a.session_id === sess.id);
  const present = att.filter((a) => a.status === 'present').length;
  const absent = att.filter((a) => a.status === 'absent').length;
  return {
    session: sess, module: mod, group: grp,
    total_students: att.length,
    present_count: present, absent_count: absent,
    attendance_rate: att.length ? present / att.length : 0,
  };
}

async function studentIdsInGroup(groupId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('student_groups').select('student_id').eq('group_id', groupId);
  if (error) { console.error('student_groups', error); return []; }
  return (data ?? []).map((r: any) => r.student_id);
}

function getDemoToday(sessions: Session[]): string {
  return sessions.reduce((acc, s) => (s.session_date > acc ? s.session_date : acc), '');
}

export interface DashboardFilters {
  moduleId?: string;
  groupId?: string;
}

// ---------- the api ----------
export const api = {
  async getModules(): Promise<Module[]> {
    return fetchAll('modules', adaptModule);
  },
  async getGroups(): Promise<Group[]> {
    return fetchAll('groups', adaptGroup);
  },

  async getStats(f: DashboardFilters = {}): Promise<DashboardStats> {
    const [sessionsAll, modulesAll, groupsAll, attendanceAll, studentsAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Module>('modules', adaptModule),
      fetchAll<Group>('groups', adaptGroup),
      fetchAll<Attendance>('attendance', adaptAttendance),
      fetchAll<Student>('students', adaptStudent),
    ]);
    const fs = filterSessions(sessionsAll, f);
    const ids = new Set(fs.map((s) => s.id));
    const att = attendanceAll.filter((a) => ids.has(a.session_id));
    const present = att.filter((a) => a.status === 'present').length;
    let totalStudents = studentsAll.length;
    if (f.groupId) {
      const ids2 = await studentIdsInGroup(f.groupId);
      totalStudents = ids2.length;
    }
    const maxWeek = Math.max(0, ...fs.map((s) => s.week));
    return {
      total_students: totalStudents,
      total_modules: f.moduleId ? 1 : modulesAll.length,
      total_groups: f.groupId ? 1 : groupsAll.length,
      sessions_this_week: fs.filter((s) => s.week === maxWeek).length,
      overall_attendance_rate: att.length ? present / att.length : 0,
    };
  },

  async getWeeklyAttendance(f: DashboardFilters = {}): Promise<WeeklyPoint[]> {
    const [sessionsAll, attendanceAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Attendance>('attendance', adaptAttendance),
    ]);
    const fs = filterSessions(sessionsAll, f);
    const byWeek = new Map<number, { present: number; total: number; sessions: number }>();
    for (const sess of fs) {
      const slot = byWeek.get(sess.week) ?? { present: 0, total: 0, sessions: 0 };
      slot.sessions += 1;
      const att = attendanceAll.filter((a) => a.session_id === sess.id);
      slot.total += att.length;
      slot.present += att.filter((a) => a.status === 'present').length;
      byWeek.set(sess.week, slot);
    }
    return [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([week, v]) => ({
      week, sessions: v.sessions, attendance_rate: v.total ? v.present / v.total : 0,
    }));
  },

  async getAttendanceRateByModule(f: DashboardFilters = {}): Promise<ModuleRatePoint[]> {
    const [sessionsAll, attendanceAll, modulesAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Attendance>('attendance', adaptAttendance),
      fetchAll<Module>('modules', adaptModule),
    ]);
    const fs = filterSessions(sessionsAll, f);
    const byModule = new Map<string, { present: number; total: number }>();
    for (const sess of fs) {
      const slot = byModule.get(sess.module_id) ?? { present: 0, total: 0 };
      const att = attendanceAll.filter((a) => a.session_id === sess.id);
      slot.total += att.length;
      slot.present += att.filter((a) => a.status === 'present').length;
      byModule.set(sess.module_id, slot);
    }
    return modulesAll.filter((m) => byModule.has(m.id)).map((m) => {
      const v = byModule.get(m.id)!;
      return {
        module_code: m.module_code,
        module_name: m.module_name,
        attendance_rate: v.total ? v.present / v.total : 0,
      };
    });
  },

  async getRecentSessions(f: DashboardFilters = {}, limit = 10): Promise<SessionRow[]> {
    const [sessionsAll, modulesAll, groupsAll, attendanceAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Module>('modules', adaptModule),
      fetchAll<Group>('groups', adaptGroup),
      fetchAll<Attendance>('attendance', adaptAttendance),
    ]);
    return filterSessions(sessionsAll, f).slice()
      .sort((a, b) => (b.session_date + b.start_time).localeCompare(a.session_date + a.start_time))
      .slice(0, limit)
      .map((s) => buildSessionRow(s, modulesAll, groupsAll, attendanceAll));
  },

  async getStudentRanking(
    f: DashboardFilters = {},
    limit = 5,
  ): Promise<{ worst: RankedStudent[]; best: RankedStudent[] }> {
    const [sessionsAll, attendanceAll, studentsAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Attendance>('attendance', adaptAttendance),
      fetchAll<Student>('students', adaptStudent),
    ]);
    const fs = filterSessions(sessionsAll, f);
    const ids = new Set(fs.map((s) => s.id));
    const scope = attendanceAll.filter((a) => ids.has(a.session_id));
    const per = new Map<string, { attended: number; absent: number; total: number }>();
    for (const a of scope) {
      const s = per.get(a.student_id) ?? { attended: 0, absent: 0, total: 0 };
      s.total += 1;
      if (a.status === 'present') s.attended += 1; else s.absent += 1;
      per.set(a.student_id, s);
    }
    const ranked: RankedStudent[] = [...per.entries()]
      .map(([id, v]) => ({
        student: studentsAll.find((s) => s.id === id)!,
        attended: v.attended, absent: v.absent, total: v.total,
        attendance_rate: v.total ? v.attended / v.total : 0,
      }))
      .filter((r) => r.student && r.total > 0);
    return {
      worst: [...ranked].sort((a, b) => a.attendance_rate - b.attendance_rate).slice(0, limit),
      best: [...ranked].sort((a, b) => b.attendance_rate - a.attendance_rate).slice(0, limit),
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
    const [sessionsAll, attendanceAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Attendance>('attendance', adaptAttendance),
    ]);
    const fs = filterSessions(sessionsAll, f);
    const buckets = new Map<string, { present: number; total: number; sessions: number }>();
    for (const sess of fs) {
      const d = new Date(sess.session_date);
      const dow = (d.getUTCDay() + 6) % 7;
      if (dow > 5) continue;
      const key = `${dow}|${sess.start_time}`;
      const att = attendanceAll.filter((a) => a.session_id === sess.id);
      const b = buckets.get(key) ?? { present: 0, total: 0, sessions: 0 };
      b.sessions += 1; b.total += att.length;
      b.present += att.filter((a) => a.status === 'present').length;
      buckets.set(key, b);
    }
    return [...buckets.entries()].map(([key, v]) => {
      const [dow, slot] = key.split('|');
      return {
        day_of_week: Number(dow),
        time_slot: slot,
        attendance_rate: v.total ? v.present / v.total : 0,
        session_count: v.sessions,
      };
    });
  },

  async getModuleDetail(moduleId: string): Promise<ModuleDetail | null> {
    const [{ data: mRow }, mgsRows, sessionsAll, attendanceAll, groupsAll, teachersAll] =
      await Promise.all([
        supabase.from('modules').select('*').eq('id', moduleId).maybeSingle(),
        supabase.from('module_groups').select('*').eq('module_id', moduleId),
        fetchAll<Session>('sessions', adaptSession),
        fetchAll<Attendance>('attendance', adaptAttendance),
        fetchAll<Group>('groups', adaptGroup),
        fetchAll<Teacher>('teachers', adaptTeacher),
      ]);
    if (!mRow) return null;
    const mod = adaptModule(mRow);
    const lecturer = teachersAll.find((t) => t.id === mod.lecturer_id) ?? null;
    const mgs = (mgsRows.data ?? []) as any[];
    const groupsOut: GroupWithRate[] = mgs.map((mg) => {
      const grp = groupsAll.find((g) => g.id === mg.group_id)!;
      const fs = sessionsAll.filter((s) => s.module_id === moduleId && s.group_id === mg.group_id);
      const ids = new Set(fs.map((s) => s.id));
      const att = attendanceAll.filter((a) => ids.has(a.session_id));
      const present = att.filter((a) => a.status === 'present').length;
      const teacher = teachersAll.find((t) => t.id === mg.assigned_teacher_id);
      return {
        ...grp,
        attendance_rate: att.length ? present / att.length : 0,
        session_count: fs.length,
        assigned_teacher_name: teacher?.full_name ?? null,
      };
    });
    const allFs = sessionsAll.filter((s) => s.module_id === moduleId);
    const allIds = new Set(allFs.map((s) => s.id));
    const allAtt = attendanceAll.filter((a) => allIds.has(a.session_id));
    const overallPresent = allAtt.filter((a) => a.status === 'present').length;
    return {
      module: mod, lecturer, groups: groupsOut,
      overall_rate: allAtt.length ? overallPresent / allAtt.length : 0,
      total_sessions: allFs.length,
    };
  },

  async getGroupDetail(groupId: string): Promise<GroupDetail | null> {
    const [
      { data: gRow },
      sgRows,
      sessionsAll,
      attendanceAll,
      modulesAll,
      mgRows,
      studentsAll,
    ] = await Promise.all([
      supabase.from('groups').select('*').eq('id', groupId).maybeSingle(),
      supabase.from('student_groups').select('student_id').eq('group_id', groupId),
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Attendance>('attendance', adaptAttendance),
      fetchAll<Module>('modules', adaptModule),
      supabase.from('module_groups').select('module_id').eq('group_id', groupId),
      fetchAll<Student>('students', adaptStudent),
    ]);
    if (!gRow) return null;
    const grp = adaptGroup(gRow);
    const studentIds: string[] = (sgRows.data ?? []).map((r: any) => r.student_id);
    const groupSessions = sessionsAll.filter((s) => s.group_id === groupId);
    const groupSessionIds = new Set(groupSessions.map((s) => s.id));
    const studentsOut: StudentWithRate[] = studentIds.map((sid) => {
      const att = attendanceAll.filter((a) => a.student_id === sid && groupSessionIds.has(a.session_id));
      const attended = att.filter((a) => a.status === 'present').length;
      const absent = att.filter((a) => a.status === 'absent').length;
      return {
        student: studentsAll.find((s) => s.id === sid)!,
        attendance_rate: att.length ? attended / att.length : 0,
        absent, total: att.length,
      };
    }).filter((r) => r.student).sort((a, b) => a.attendance_rate - b.attendance_rate);
    const moduleIds = new Set((mgRows.data ?? []).map((r: any) => r.module_id));
    const grpModules = modulesAll.filter((m) => moduleIds.has(m.id));
    const att = attendanceAll.filter((a) => groupSessionIds.has(a.session_id));
    const present = att.filter((a) => a.status === 'present').length;
    return {
      group: grp, students: studentsOut, modules: grpModules,
      overall_rate: att.length ? present / att.length : 0,
    };
  },

  async getSessionDetail(sessionId: string): Promise<SessionDetail | null> {
    const [{ data: sRow }, modulesAll, groupsAll, studentsAll, sgRows, attRows] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).maybeSingle(),
      fetchAll<Module>('modules', adaptModule),
      fetchAll<Group>('groups', adaptGroup),
      fetchAll<Student>('students', adaptStudent),
      supabase.from('student_groups').select('student_id, group_id'),
      supabase.from('attendance').select('*').eq('session_id', sessionId),
    ]);
    if (!sRow) return null;
    const sess = adaptSession(sRow);
    const mod = modulesAll.find((m) => m.id === sess.module_id)!;
    const grp = groupsAll.find((g) => g.id === sess.group_id)!;
    const inGroup = (sgRows.data ?? [])
      .filter((r: any) => r.group_id === sess.group_id)
      .map((r: any) => r.student_id);
    const sessAtt = (attRows.data ?? []).map(adaptAttendance);
    const byStudent = new Map(sessAtt.map((a) => [a.student_id, a]));
    const roster: RosterEntry[] = inGroup.map((sid: string) => {
      const a = byStudent.get(sid);
      return {
        student: studentsAll.find((s) => s.id === sid)!,
        status: (a?.status ?? 'not_marked') as RosterEntry['status'],
        confidence: a?.confidence ?? null,
        marked_at: a?.marked_at ?? null,
      };
    }).filter((r) => r.student);
    const present = roster.filter((r) => r.status === 'present').length;
    const absent = roster.filter((r) => r.status === 'absent').length;
    const spoof = roster.filter((r) => r.status === 'spoof').length;
    return {
      session: sess, module: mod, group: grp, roster,
      present_count: present, absent_count: absent, spoof_count: spoof,
      attendance_rate: roster.length ? present / roster.length : 0,
    };
  },

  async getTodaySessions(): Promise<SessionRow[]> {
    const [sessionsAll, modulesAll, groupsAll, attendanceAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Module>('modules', adaptModule),
      fetchAll<Group>('groups', adaptGroup),
      fetchAll<Attendance>('attendance', adaptAttendance),
    ]);
    const today = getDemoToday(sessionsAll);
    return sessionsAll.filter((s) => s.session_date === today)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map((s) => buildSessionRow(s, modulesAll, groupsAll, attendanceAll));
  },

  async getLiveSession() {
    const [sessionsAll, attendanceAll, modulesAll, groupsAll, studentsAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Attendance>('attendance', adaptAttendance),
      fetchAll<Module>('modules', adaptModule),
      fetchAll<Group>('groups', adaptGroup),
      fetchAll<Student>('students', adaptStudent),
    ]);
    const today = getDemoToday(sessionsAll);
    const todayRows = sessionsAll.filter((s) => s.session_date === today)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    if (todayRows.length === 0) return null;
    const liveSess = todayRows[Math.floor(todayRows.length / 2)] ?? todayRows[0];
    const sessAtt = attendanceAll.filter((a) => a.session_id === liveSess.id);
    const recognizedAtt = sessAtt.filter((a) => a.status === 'present' || a.status === 'spoof');
    const last = recognizedAtt.slice(-5).reverse().map((a) => ({
      student: studentsAll.find((s) => s.id === a.student_id)!,
      confidence: a.confidence ?? 0,
      at: a.marked_at,
    })).filter((x) => x.student);
    return {
      row: buildSessionRow(liveSess, modulesAll, groupsAll, attendanceAll),
      recognized: recognizedAtt.length,
      total: sessAtt.length,
      last_recognized: last,
    };
  },

  async updateAttendanceStatus(
    sessionId: string,
    studentId: string,
    newStatus: AttendanceStatus,
  ): Promise<void> {
    const now = new Date().toISOString();
    const { data: prevRow } = await supabase
      .from('attendance').select('status')
      .eq('session_id', sessionId).eq('student_id', studentId).maybeSingle();
    const prevStatus: AttendanceStatus | 'not_marked' =
      (prevRow?.status as AttendanceStatus | undefined) ?? 'not_marked';

    const { error } = await supabase.from('attendance').upsert(
      { session_id: sessionId, student_id: studentId, status: newStatus, updated_at: now },
      { onConflict: 'session_id,student_id' },
    );
    if (error) { console.error('upsert attendance', error); throw error; }

    const actor = await getCurrentTeacher();
    const { error: e2 } = await supabase.from('audit_log').insert({
      actor_id: actor?.id ?? null,
      session_id: sessionId,
      student_id: studentId,
      prev_status: prevStatus,
      new_status: newStatus,
    });
    if (e2) console.error('audit_log insert', e2);
  },

  async getSpoofLog(f: DashboardFilters = {}): Promise<SpoofLogEntry[]> {
    const [sessionsAll, modulesAll, groupsAll, studentsAll, attRows] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Module>('modules', adaptModule),
      fetchAll<Group>('groups', adaptGroup),
      fetchAll<Student>('students', adaptStudent),
      supabase.from('attendance').select('*').eq('status', 'spoof'),
    ]);
    const fs = filterSessions(sessionsAll, f);
    const ids = new Set(fs.map((s) => s.id));
    return ((attRows.data ?? []).map(adaptAttendance) as Attendance[])
      .filter((a) => ids.has(a.session_id))
      .sort((a, b) => (b.marked_at ?? '').localeCompare(a.marked_at ?? ''))
      .map((a) => {
        const sess = sessionsAll.find((s) => s.id === a.session_id)!;
        return {
          attendance_id: a.id,
          student: studentsAll.find((s) => s.id === a.student_id)!,
          session: sess,
          module: modulesAll.find((m) => m.id === sess.module_id)!,
          group: groupsAll.find((g) => g.id === sess.group_id)!,
          marked_at: a.marked_at,
        };
      })
      .filter((e) => e.student);
  },

  async getAuditLog(limit = 100): Promise<AuditLogEntry[]> {
    const [{ data: rows }, sessionsAll, modulesAll, groupsAll, studentsAll, teachersAll] =
      await Promise.all([
        supabase.from('audit_log').select('*').order('at', { ascending: false }).limit(limit),
        fetchAll<Session>('sessions', adaptSession),
        fetchAll<Module>('modules', adaptModule),
        fetchAll<Group>('groups', adaptGroup),
        fetchAll<Student>('students', adaptStudent),
        fetchAll<Teacher>('teachers', adaptTeacher),
      ]);
    if (!rows) return [];
    return rows.map((r: any) => {
      const sess = sessionsAll.find((s) => s.id === r.session_id);
      const stu = studentsAll.find((s) => s.id === r.student_id);
      const actor =
        teachersAll.find((t) => t.id === r.actor_id) ??
        ({ id: '', full_name: 'Unknown', email: '', role: 'teacher', created_at: '' } as Teacher);
      const mod = sess ? modulesAll.find((m) => m.id === sess.module_id) : undefined;
      const grp = sess ? groupsAll.find((g) => g.id === sess.group_id) : undefined;
      return {
        id: r.id,
        at: r.at,
        actor,
        session: sess!,
        module: mod!,
        group: grp!,
        student: stu!,
        prev_status: (r.prev_status ?? 'not_marked') as AuditLogEntry['prev_status'],
        new_status: r.new_status as AttendanceStatus,
      };
    }).filter((e) => e.session && e.student && e.module && e.group);
  },

  async getSystemHealth(): Promise<SystemHealth> {
    const all = await fetchAll<Attendance>('attendance', adaptAttendance);
    const total = all.length;
    const present = all.filter((a) => a.status === 'present');
    const spoof = all.filter((a) => a.status === 'spoof');
    const recognized = present.length + spoof.length;
    const avgConf = present.length
      ? present.reduce((acc, a) => acc + (a.confidence ?? 0), 0) / present.length
      : 0;
    const byDate = new Map<string, { recognized: number; spoof: number }>();
    for (const a of all) {
      const date = (a.marked_at ?? '').slice(0, 10);
      if (!date) continue;
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
