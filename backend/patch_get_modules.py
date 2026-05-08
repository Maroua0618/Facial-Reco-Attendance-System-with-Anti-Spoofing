import os
import re

filepath = r"d:\CNS_C1\frontend\src\lib\mock-data.ts"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update getModules
old_getModules = """  async getModules(): Promise<Module[]> {
    return fetchAll('modules', adaptModule);
  },"""
new_getModules = """  async getModules(): Promise<Module[]> {
    const teacher = await getCurrentTeacher();
    const scope = await getTeacherScope(teacher);
    const modulesAll = await fetchAll<Module>('modules', adaptModule);
    return scope.isTeacher ? modulesAll.filter(m => scope.myModuleIds.has(m.id)) : modulesAll;
  },"""
content = content.replace(old_getModules, new_getModules)

# 2. Update getStudents
old_getStudents = """  async getStudents(): Promise<Student[]> {
    return fetchAll('students', adaptStudent);
  },"""
new_getStudents = """  async getStudents(): Promise<Student[]> {
    const teacher = await getCurrentTeacher();
    const scope = await getTeacherScope(teacher);
    const studentsAll = await fetchAll<Student>('students', adaptStudent);
    if (!scope.isTeacher) return studentsAll;

    const { data: sgRows } = await supabase.from('student_groups').select('student_id, group_id');
    const validGroupIds = scope.myGroupIds;
    const validStudentIds = new Set((sgRows ?? []).filter((r: any) => validGroupIds.has(r.group_id)).map((r: any) => r.student_id));
    return studentsAll.filter(s => validStudentIds.has(s.id));
  },"""
content = content.replace(old_getStudents, new_getStudents)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("mock-data.ts patched successfully")
