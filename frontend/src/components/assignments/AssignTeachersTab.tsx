import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { api } from '@/lib/mock-data';
import type { Teacher, Module, Group } from '@/types/db';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface AssignTeachersTabProps {
  groups?: Group[];
  teachers: Teacher[];
  modules: Module[];
}

interface TeacherOptionProps {
  teachers: Teacher[];
  value: string;
  onChange: (teacherId: string) => void;
  placeholder: string;
  teacherSessionTypes: Record<string, string[]>;
  tpOnly?: boolean;
}

function TeacherDropdown({
  teachers,
  value,
  onChange,
  placeholder,
  teacherSessionTypes,
  tpOnly = false,
}: TeacherOptionProps) {
  const items = teachers
    .filter((teacher) => teacher.role !== 'admin')
    .filter((teacher) => {
      if (!tpOnly) return true;
      const types = teacherSessionTypes?.[teacher.id] ?? [];
      return types.includes('tp');
    });

  return (
    <SearchableSelect
      items={items}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      renderLabel={(t) => t.full_name}
      className="w-44"
    />
  );
}

export default function AssignTeachersTab({ teachers, modules }: AssignTeachersTabProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  // assignments state structure: Record<groupId, { td: string, tp: string }>
  const [assignments, setAssignments] = useState<Record<string, { td?: string; tp?: string }>>({});
  const qc = useQueryClient();

  const { data: moduleDetail } = useQuery({
    queryKey: ['moduleDetail', selectedModuleId],
    queryFn: () => selectedModuleId ? api.getModuleDetail(selectedModuleId) : null,
    enabled: !!selectedModuleId,
  });

  

  const { data: teacherSessionTypes = {} } = useQuery<Record<string, string[]>>({
    queryKey: ['teacher-session-types'],
    queryFn: api.getTeacherSessionTypes,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const updates: Promise<void>[] = [];
      for (const [groupId, types] of Object.entries(assignments)) {
        if (types.td) updates.push(api.assignTeacherToGroup(groupId, selectedModuleId!, types.td));
        if (types.tp) updates.push(api.assignTeacherToGroup(groupId, selectedModuleId!, types.tp));
      }
      await Promise.all(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['moduleDetail'] });
      qc.invalidateQueries({ queryKey: ['teacher-assignments'] });
      toast.success('Teachers assigned successfully');
      setAssignments({});
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to assign teachers'),
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Select module</Label>
        <SearchableSelect
          items={modules}
          value={selectedModuleId || ''}
          onChange={setSelectedModuleId}
          placeholder="Choose module..."
          renderLabel={(m) => `${m.module_code} — ${m.module_name}`}
          className="w-full"
        />
      </div>

      {moduleDetail && (
        <Card>
          <CardHeader>
            <CardTitle>Assign teachers to groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>Current TD Teacher</TableHead>
                    <TableHead>Assign TD</TableHead>
                    <TableHead>Current TP Teacher</TableHead>
                    <TableHead>Assign TP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moduleDetail.groups.map((g) => {
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.group_name} (Y{g.year})</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {g.assigned_teacher_name_td || '—'}
                        </TableCell>
                        <TableCell>
                          <TeacherDropdown
                            teachers={teachers}
                            value={assignments[g.id]?.td || g.assigned_teacher_id_td || ''}
                            onChange={(teacherId) =>
                              setAssignments((prev) => ({
                                ...prev,
                                [g.id]: { ...prev[g.id], td: teacherId },
                              }))
                            }
                            placeholder="TD Teacher"
                            teacherSessionTypes={teacherSessionTypes}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {g.assigned_teacher_name_tp || '—'}
                        </TableCell>
                        <TableCell>
                          <TeacherDropdown
                            teachers={teachers}
                            value={assignments[g.id]?.tp || g.assigned_teacher_id_tp || ''}
                            onChange={(teacherId) =>
                              setAssignments((prev) => ({
                                ...prev,
                                [g.id]: { ...prev[g.id], tp: teacherId },
                              }))
                            }
                            placeholder="TP Teacher"
                            teacherSessionTypes={teacherSessionTypes}
                            tpOnly
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {Object.keys(assignments).length > 0 && (
              <div className="mt-6 flex gap-2">
                <Button
                  onClick={() => saveMut.mutate()}
                  disabled={saveMut.isPending}
                >
                  {saveMut.isPending ? 'Saving...' : `Save assignments`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAssignments({})}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
