import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Search, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/mock-data';
import { toast } from 'sonner';

interface Row {
  id: string;
  full_name: string;
  matricule: string;
  attendance_rate: number;
  group_id: string;
  group_name: string;
}

interface EditState { id: string; full_name: string; student_number: string }

export default function StudentsList() {
  const [q, setQ] = useState('');
  const [editStudent, setEditStudent] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: api.getGroups });
  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ['students-flat', groups.map((g) => g.id)],
    enabled: groups.length > 0,
    queryFn: async () => {
      const all = await Promise.all(groups.map((g) => api.getGroupDetail(g.id)));
      return all.flatMap((d) =>
        d
          ? d.students.map((sw) => ({
              id: sw.student.id,
              full_name: sw.student.full_name,
              matricule: sw.student.student_number,
              attendance_rate: sw.attendance_rate,
              group_id: d.group.id,
              group_name: d.group.group_name,
            }))
          : [],
      );
    },
  });

  const editMut = useMutation({
    mutationFn: () =>
      api.updateStudent(editStudent!.id, {
        full_name: editStudent!.full_name,
        student_number: editStudent!.student_number,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students-flat'] });
      setEditStudent(null);
      toast.success('Student updated');
    },
    onError: () => toast.error('Failed to update student'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteStudent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students-flat'] });
      setDeleteId(null);
      toast.success('Student deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete student');
      setDeleteId(null);
    },
  });

  const filtered = rows.filter(
    (s) =>
      s.full_name.toLowerCase().includes(q.toLowerCase()) ||
      (s.matricule ?? '').toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} students</p>
          </div>
          <Button asChild>
            <Link to="/students/register">
              <UserPlus className="w-4 h-4 mr-1" /> Register
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name or matricule..."
                  className="max-w-sm"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="w-[140px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.matricule}</TableCell>
                    <TableCell>{s.full_name}</TableCell>
                    <TableCell>
                      <Link to={`/groups/${s.group_id}`} className="text-primary hover:underline">
                        {s.group_name}
                      </Link>
                    </TableCell>
                    <TableCell>{(s.attendance_rate * 100).toFixed(1)}%</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/students/${s.id}`}>View</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditStudent({ id: s.id, full_name: s.full_name, student_number: s.matricule })}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(s.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editStudent} onOpenChange={(open) => { if (!open) setEditStudent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          {editStudent && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editStudent.full_name}
                  onChange={(e) => setEditStudent({ ...editStudent, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-matricule">Matricule</Label>
                <Input
                  id="edit-matricule"
                  value={editStudent.student_number}
                  onChange={(e) => setEditStudent({ ...editStudent, student_number: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditStudent(null)}>Cancel</Button>
            <Button onClick={() => editMut.mutate()} disabled={editMut.isPending}>
              {editMut.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will permanently delete the student and all their group memberships.
            Attendance records linked to this student will block deletion — you must remove them first.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
