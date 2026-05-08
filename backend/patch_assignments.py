import os

db_ts_path = r"d:\CNS_C1\frontend\src\types\db.ts"
with open(db_ts_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("assigned_teacher_name?: string | null;", 
"""assigned_teacher_name?: string | null;
  assigned_teacher_name_td?: string | null;
  assigned_teacher_name_tp?: string | null;
  assigned_teacher_id_td?: string | null;
  assigned_teacher_id_tp?: string | null;""")

with open(db_ts_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched db.ts")

mock_data_path = r"d:\CNS_C1\frontend\src\lib\mock-data.ts"
with open(mock_data_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Patch getModuleDetail
old_groups_out = """    const groupsOut: GroupWithRate[] = mgs.map((mg) => {
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
    });"""

new_groups_out = """    const uniqueGroupIds = Array.from(new Set(mgs.map(mg => mg.group_id)));
    const groupsOut: GroupWithRate[] = uniqueGroupIds.map((gid) => {
      const grp = groupsAll.find((g) => g.id === gid)!;
      const fs = sessionsAll.filter((s) => s.module_id === moduleId && s.group_id === gid);
      const ids = new Set(fs.map((s) => s.id));
      const att = attendanceAll.filter((a) => ids.has(a.session_id));
      const present = att.filter((a) => a.status === 'present').length;
      
      const groupMgs = mgs.filter(mg => mg.group_id === gid);
      const tdMg = groupMgs.find(mg => mg.session_type === 'td' || !mg.session_type);
      const tpMg = groupMgs.find(mg => mg.session_type === 'tp');
      const tdTeacher = tdMg ? teachersAll.find(t => t.id === tdMg.assigned_teacher_id) : null;
      const tpTeacher = tpMg ? teachersAll.find(t => t.id === tpMg.assigned_teacher_id) : null;
      
      return {
        ...grp,
        attendance_rate: att.length ? present / att.length : 0,
        session_count: fs.length,
        assigned_teacher_name: tdTeacher?.full_name ?? tpTeacher?.full_name ?? null,
        assigned_teacher_name_td: tdTeacher?.full_name ?? null,
        assigned_teacher_name_tp: tpTeacher?.full_name ?? null,
        assigned_teacher_id_td: tdMg?.assigned_teacher_id ?? null,
        assigned_teacher_id_tp: tpMg?.assigned_teacher_id ?? null,
      };
    });"""

content = content.replace(old_groups_out, new_groups_out)

# Patch assignTeacherToGroup signature and body
old_assign = """  async assignTeacherToGroup(groupId: string, moduleId: string, teacherId: string): Promise<void> {
    const { error } = await supabase
      .from('module_groups')
      .update({ assigned_teacher_id: teacherId })
      .eq('module_id', moduleId)
      .eq('group_id', groupId);
    if (error) throw error;
  },"""

new_assign = """  async assignTeacherToGroup(groupId: string, moduleId: string, teacherId: string, sessionType: 'td' | 'tp' = 'td'): Promise<void> {
    const { error } = await supabase
      .from('module_groups')
      .upsert({ 
         module_id: moduleId,
         group_id: groupId,
         assigned_teacher_id: teacherId,
         session_type: sessionType
      }, { onConflict: 'module_id,group_id,session_type' });
    if (error) throw error;
  },"""
content = content.replace(old_assign, new_assign)

with open(mock_data_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched mock-data.ts")
