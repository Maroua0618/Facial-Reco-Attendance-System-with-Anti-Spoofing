import re
import os

filepath = r"d:\CNS_C1\frontend\src\lib\mock-data.ts"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add getTeacherScope helper
helper = """
async function getTeacherScope(teacher: Teacher | null) {
  const scope = {
    isTeacher: false,
    myGroupIds: new Set<string>(),
    myModuleIds: new Set<string>(),
    sessionFilter: (s: Session) => true
  };
  if (teacher && teacher.role !== 'admin') {
    scope.isTeacher = true;
    const { data } = await supabase.from('module_groups').select('module_id, group_id').eq('assigned_teacher_id', teacher.id);
    for (const mg of data ?? []) {
      scope.myGroupIds.add((mg as any).group_id);
      scope.myModuleIds.add((mg as any).module_id);
    }
    scope.sessionFilter = (s: Session) => scope.myModuleIds.has(s.module_id) && scope.myGroupIds.has(s.group_id);
  }
  return scope;
}

function filterSessions(rows: Session[], f: { moduleId?: string; groupId?: string }): Session[] {
"""

content = re.sub(r'function filterSessions\(rows: Session\[\], f: \{ moduleId\?: string; groupId\?: string \}\): Session\[\] \{', helper, content)

# 2. Update getStats
old_getStats = """  async getStats(f: DashboardFilters = {}): Promise<DashboardStats> {
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
      total_sessions: fs.length,
      sessions_this_week: fs.filter((s) => s.week === maxWeek).length,
      overall_attendance_rate: att.length ? present / att.length : 0,
    };
  },"""

new_getStats = """  async getStats(f: DashboardFilters = {}): Promise<DashboardStats> {
    const teacher = await getCurrentTeacher();
    const scope = await getTeacherScope(teacher);

    const [sessionsAll, modulesAll, groupsAll, attendanceAll, sgRows] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Module>('modules', adaptModule),
      fetchAll<Group>('groups', adaptGroup),
      fetchAll<Attendance>('attendance', adaptAttendance),
      supabase.from('student_groups').select('*')
    ]);
    
    let fs = filterSessions(sessionsAll, f).filter(scope.sessionFilter);

    const ids = new Set(fs.map((s) => s.id));
    const att = attendanceAll.filter((a) => ids.has(a.session_id));
    const present = att.filter((a) => a.status === 'present').length;

    let scopedGroups = scope.isTeacher ? groupsAll.filter(g => scope.myGroupIds.has(g.id)) : groupsAll;
    if (f.groupId) {
      scopedGroups = scopedGroups.filter(g => g.id === f.groupId);
    }
    const scopedGroupIds = new Set(scopedGroups.map(g => g.id));
    const scopedStudentIds = new Set((sgRows.data ?? []).filter((sg: any) => scopedGroupIds.has(sg.group_id)).map((sg: any) => sg.student_id));
    const totalStudents = scopedStudentIds.size;

    const scopedModules = scope.isTeacher ? modulesAll.filter(m => scope.myModuleIds.has(m.id)) : modulesAll;

    const maxWeek = fs.length > 0 ? Math.max(...fs.map((s) => s.week)) : 0;
    const thisWeekSessions = fs.filter((s) => s.week === maxWeek);
    const doneThisWeek = thisWeekSessions.filter(s => !!s.actual_ended_at).length;

    return {
      total_students: totalStudents,
      total_modules: f.moduleId ? 1 : scopedModules.length,
      total_groups: f.groupId ? 1 : scopedGroups.length,
      total_sessions: fs.length,
      sessions_this_week: thisWeekSessions.length,
      sessions_done_this_week: doneThisWeek,
      overall_attendance_rate: att.length ? present / att.length : 0,
    };
  },"""

content = content.replace(old_getStats, new_getStats)

# 3. Update getWeeklyAttendance
old_weekly = """  async getWeeklyAttendance(f: DashboardFilters = {}): Promise<WeeklyPoint[]> {
    const [sessionsAll, attendanceAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Attendance>('attendance', adaptAttendance),
    ]);
    const fs = filterSessions(sessionsAll, f);"""

new_weekly = """  async getWeeklyAttendance(f: DashboardFilters = {}): Promise<WeeklyPoint[]> {
    const teacher = await getCurrentTeacher();
    const scope = await getTeacherScope(teacher);
    const [sessionsAll, attendanceAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Attendance>('attendance', adaptAttendance),
    ]);
    const fs = filterSessions(sessionsAll, f).filter(scope.sessionFilter);"""
content = content.replace(old_weekly, new_weekly)

# 4. Update getAttendanceRateByModule
old_mod_rate = """  async getAttendanceRateByModule(f: DashboardFilters = {}): Promise<ModuleRatePoint[]> {
    const [sessionsAll, attendanceAll, modulesAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Attendance>('attendance', adaptAttendance),
      fetchAll<Module>('modules', adaptModule),
    ]);
    const fs = filterSessions(sessionsAll, f);"""

new_mod_rate = """  async getAttendanceRateByModule(f: DashboardFilters = {}): Promise<ModuleRatePoint[]> {
    const teacher = await getCurrentTeacher();
    const scope = await getTeacherScope(teacher);
    const [sessionsAll, attendanceAll, modulesAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Attendance>('attendance', adaptAttendance),
      fetchAll<Module>('modules', adaptModule),
    ]);
    const fs = filterSessions(sessionsAll, f).filter(scope.sessionFilter);"""
content = content.replace(old_mod_rate, new_mod_rate)

# 5. Update getRecentSessions
old_recent = """  async getRecentSessions(f: DashboardFilters = {}, limit = 10): Promise<SessionRow[]> {
    const [sessionsAll, modulesAll, groupsAll, attendanceAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Module>('modules', adaptModule),
      fetchAll<Group>('groups', adaptGroup),
      fetchAll<Attendance>('attendance', adaptAttendance),
    ]);
    return filterSessions(sessionsAll, f).slice()"""

new_recent = """  async getRecentSessions(f: DashboardFilters = {}, limit = 10): Promise<SessionRow[]> {
    const teacher = await getCurrentTeacher();
    const scope = await getTeacherScope(teacher);
    const [sessionsAll, modulesAll, groupsAll, attendanceAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Module>('modules', adaptModule),
      fetchAll<Group>('groups', adaptGroup),
      fetchAll<Attendance>('attendance', adaptAttendance),
    ]);
    return filterSessions(sessionsAll, f).filter(scope.sessionFilter).slice()"""
content = content.replace(old_recent, new_recent)

# 6. Update getTodaySessions
old_today = """  async getTodaySessions(): Promise<SessionRow[]> {
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
  },"""

new_today = """  async getTodaySessions(): Promise<SessionRow[]> {
    const teacher = await getCurrentTeacher();
    const scope = await getTeacherScope(teacher);
    const [sessionsAll, modulesAll, groupsAll, attendanceAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Module>('modules', adaptModule),
      fetchAll<Group>('groups', adaptGroup),
      fetchAll<Attendance>('attendance', adaptAttendance),
    ]);
    const today = getDemoToday(sessionsAll);
    return sessionsAll.filter((s) => s.session_date === today).filter(scope.sessionFilter)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map((s) => buildSessionRow(s, modulesAll, groupsAll, attendanceAll));
  },"""
content = content.replace(old_today, new_today)

# 7. Update getLiveSession
old_live = """  async getLiveSession() {
    const [sessionsAll, attendanceAll, modulesAll, groupsAll, studentsAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Attendance>('attendance', adaptAttendance),
      fetchAll<Module>('modules', adaptModule),
      fetchAll<Group>('groups', adaptGroup),
      fetchAll<Student>('students', adaptStudent),
    ]);
    const today = getDemoToday(sessionsAll);
    const todayRows = sessionsAll.filter((s) => s.session_date === today)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));"""

new_live = """  async getLiveSession() {
    const teacher = await getCurrentTeacher();
    const scope = await getTeacherScope(teacher);
    const [sessionsAll, attendanceAll, modulesAll, groupsAll, studentsAll] = await Promise.all([
      fetchAll<Session>('sessions', adaptSession),
      fetchAll<Attendance>('attendance', adaptAttendance),
      fetchAll<Module>('modules', adaptModule),
      fetchAll<Group>('groups', adaptGroup),
      fetchAll<Student>('students', adaptStudent),
    ]);
    const today = getDemoToday(sessionsAll);
    const todayRows = sessionsAll.filter((s) => s.session_date === today).filter(scope.sessionFilter)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));"""
content = content.replace(old_live, new_live)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated mock-data.ts successfully")
