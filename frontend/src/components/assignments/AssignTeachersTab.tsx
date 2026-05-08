import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/mock-data';
import type { Teacher, Module, Group, Session } from '@/types/db';

interface AssignTeachersTabProps {
  groups?: Group[];
  teachers: Teacher[];
  modules: Module[];
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

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: api.getSessions,
  });

  const getSessionTypesForGroup = (groupId: string, moduleId: string): string[] => {
    const types = new Set<string>();
    sessions.forEach(s => {
      if (s.group_id === groupId && s.module_id === moduleId) {
        types.add(s.session_type);
      }
    });
    return Array.from(types).sort();
  };

  const typeLabels: Record<string, string> = {
    'td': 'Tutorial (TD)',
    'tp': 'Lab (TP)',
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const updates: Promise<void>[] = [];
      for (const [groupId, types] of Object.entries(assignments)) {
        if (types.td) updates.push(api.assignTeacherToGroup(groupId, selectedModuleId!, types.td, 'td'));
        if (types.tp) updates.push(api.assignTeacherToGroup(groupId, selectedModuleId!, types.tp, 'tp'));
      }
      await Promise.all(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['moduleDetail'] });
      toast.success('Teachers assigned successfully');
      setAssignments({});
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to assign teachers'),
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Select module</Label>
        <Select value={selectedModuleId || ''} onValueChange={setSelectedModuleId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose module..." />
          </SelectTrigger>
          <SelectContent>
            {modules.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.module_code} — {m.module_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                          <Select
                            value={assignments[g.id]?.td || g.assigned_teacher_id_td || ''}
                            onValueChange={(teacherId) =>
                              setAssignments(prev => ({
                                ...prev,
                                [g.id]: { ...prev[g.id], td: teacherId }
                              }))
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="TD Teacher" />
                            </SelectTrigger>
                            <SelectContent>
                              {teachers.filter((t) => t.role !== 'admin').map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {g.assigned_teacher_name_tp || '—'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={assignments[g.id]?.tp || g.assigned_teacher_id_tp || ''}
                            onValueChange={(teacherId) =>
                              setAssignments(prev => ({
                                ...prev,
                                [g.id]: { ...prev[g.id], tp: teacherId }
                              }))
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="TP Teacher" />
                            </SelectTrigger>
                            <SelectContent>
                              {teachers.filter((t) => t.role !== 'admin').map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
