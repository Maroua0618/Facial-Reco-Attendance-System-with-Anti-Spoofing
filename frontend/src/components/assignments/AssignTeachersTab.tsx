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
import { toast } from 'sonner';
import { api } from '@/lib/mock-data';
import type { Teacher, Module, Group } from '@/types/db';

interface AssignTeachersTabProps {
  groups?: Group[];
  teachers: Teacher[];
  modules: Module[];
}

export default function AssignTeachersTab({ teachers, modules }: AssignTeachersTabProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const { data: moduleDetail } = useQuery({
    queryKey: ['moduleDetail', selectedModuleId],
    queryFn: () => selectedModuleId ? api.getModuleDetail(selectedModuleId) : null,
    enabled: !!selectedModuleId,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(assignments).map(([groupId, teacherId]) =>
        api.assignTeacherToGroup(groupId, selectedModuleId!, teacherId),
      );
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
                    <TableHead>Year</TableHead>
                    <TableHead>Current TD/TP Teacher</TableHead>
                    <TableHead>Assign Teacher</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moduleDetail.groups.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.group_name}</TableCell>
                      <TableCell>Y{g.year}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {g.assigned_teacher_name || '—'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={assignments[g.id] || ''}
                          onValueChange={(teacherId) =>
                            setAssignments({
                              ...assignments,
                              [g.id]: teacherId,
                            })
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Choose teacher..." />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.filter((t) => t.role === 'teacher' || t.role === 'lecturer').map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {Object.keys(assignments).length > 0 && (
              <div className="mt-6 flex gap-2">
                <Button
                  onClick={() => saveMut.mutate()}
                  disabled={saveMut.isPending}
                >
                  {saveMut.isPending ? 'Saving...' : `Save ${Object.keys(assignments).length} assignment${Object.keys(assignments).length !== 1 ? 's' : ''}`}
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
