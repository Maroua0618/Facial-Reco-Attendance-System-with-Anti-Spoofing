import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { api } from '@/lib/mock-data';
import type { Module, Teacher } from '@/types/db';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface AssignLecturersTabProps {
  modules: Module[];
  teachers: Teacher[];
}

export default function AssignLecturersTab({ modules, teachers }: AssignLecturersTabProps) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const lecturers = teachers.filter((t) => t.role === 'lecturer');

  const saveMut = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(assignments).map(([moduleId, teacherId]) =>
        api.updateModule(moduleId, { lecturer_id: teacherId }),
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules'] });
      toast.success('Lecturers assigned successfully');
      setAssignments({});
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to assign lecturers'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Lecturers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module Code</TableHead>
                <TableHead>Module Name</TableHead>
                <TableHead>Current Lecturer</TableHead>
                <TableHead>Assign Lecturer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((m) => {
                const currentLecturer = lecturers.find((t) => t.id === m.lecturer_id);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs font-semibold">{m.module_code}</TableCell>
                    <TableCell>{m.module_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {currentLecturer?.full_name || '—'}
                    </TableCell>
                    <TableCell>
                      <SearchableSelect
                        items={lecturers}
                        value={assignments[m.id] || ''}
                        onChange={(teacherId) =>
                          setAssignments({
                            ...assignments,
                            [m.id]: teacherId,
                          })
                        }
                        placeholder="Choose lecturer..."
                        renderLabel={(t) => t.full_name}
                        className="w-48"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {Object.keys(assignments).length > 0 && (
          <div className="flex gap-2 mt-6">
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
  );
}
