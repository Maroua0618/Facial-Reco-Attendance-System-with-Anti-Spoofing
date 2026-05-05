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
import { Search, UserPlus, Pencil, Trash2, Upload } from 'lucide-react';
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
interface ImportRow { full_name: string; student_number: string; group_name: string }

export default function StudentsList() {
  const [q, setQ] = useState('');
  const [editStudent, setEditStudent] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [fileKey, setFileKey] = useState(0);
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

  const importMut = useMutation({
    mutationFn: () => api.importStudents(validImportRows),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['students-flat'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success(
        `Imported ${result.ok} student${result.ok !== 1 ? 's' : ''}${
          result.skipped ? ` · ${result.skipped} skipped` : ''
        }`,
      );
      result.errors.slice(0, 3).forEach((e) => toast.error(e));
      setImportOpen(false);
      setImportRows([]);
      setFileKey((k) => k + 1);
    },
    onError: () => toast.error('Import failed'),
  });

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const start = lines[0]?.toLowerCase().includes('full_name') ? 1 : 0;
      const parsed: ImportRow[] = lines.slice(start).map((line) => {
        const [full_name = '', student_number = '', group_name = ''] = line
          .split(',')
          .map((p) => p.trim());
        return { full_name, student_number, group_name };
      });
      setImportRows(parsed);
    };
    reader.readAsText(file);
  };

  const validImportRows = importRows.filter(
    (r) => r.full_name && r.student_number && r.group_name,
  );

  const filtered = rows.filter(
    (s) =>
      s.full_name.toLowerCase().includes(q.toLowerCase()) ||
      (s.matricule ?? '').toLowerCase().includes(q.toLowerCase()),
  );

  const closeImport = () => {
    setImportOpen(false);
    setImportRows([]);
    setFileKey((k) => k + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} students</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-1" /> Import CSV
            </Button>
            <Button asChild>
              <Link to="/students/register">
                <UserPlus className="w-4 h-4 mr-1" /> Register
              </Link>
            </Button>
          </div>
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
            {isLoading && (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matricule</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Group</TableHead>
                    <TableHead className="hidden sm:table-cell">Rate</TableHead>
                    <TableHead className="w-[140px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.matricule}</TableCell>
                      <TableCell>{s.full_name}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Link to={`/groups/${s.group_id}`} className="text-primary hover:underline">
                          {s.group_name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{(s.attendance_rate * 100).toFixed(1)}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <Link to={`/students/${s.id}`}>View</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setEditStudent({
                                id: s.id,
                                full_name: s.full_name,
                                student_number: s.matricule,
                              })
                            }
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit dialog */}
      <Dialog
        open={!!editStudent}
        onOpenChange={(open) => {
          if (!open) setEditStudent(null);
        }}
      >
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
                  onChange={(e) =>
                    setEditStudent({ ...editStudent, full_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-matricule">Matricule</Label>
                <Input
                  id="edit-matricule"
                  value={editStudent.student_number}
                  onChange={(e) =>
                    setEditStudent({ ...editStudent, student_number: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditStudent(null)}>
              Cancel
            </Button>
            <Button onClick={() => editMut.mutate()} disabled={editMut.isPending}>
              {editMut.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will permanently delete the student and all their group memberships.
            Attendance records linked to this student will block deletion — you must remove
            them first.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
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

      {/* Import CSV dialog */}
      <Dialog open={importOpen} onOpenChange={(open) => { if (!open) closeImport(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Students from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Format:{' '}
              <code className="font-mono bg-muted px-1 rounded text-xs">
                full_name,student_number,group_name
              </code>{' '}
              — one student per line.
            </p>
            <a
              href="data:text/csv;charset=utf-8,full_name%2Cstudent_number%2Cgroup_name%0AAya%20Benali%2CS2026001%2CL3%20CS%0A"
              download="students_template.csv"
              className="text-xs text-primary hover:underline"
            >
              Download template
            </a>
            <Input
              key={fileKey}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />
            {importRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {validImportRows.length} valid
                  {importRows.length - validImportRows.length > 0 &&
                    ` · ${importRows.length - validImportRows.length} incomplete (missing fields)`}
                </p>
                <div className="max-h-48 overflow-y-auto rounded border text-xs">
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left font-medium">Name</th>
                        <th className="px-2 py-1 text-left font-medium">Matricule</th>
                        <th className="px-2 py-1 text-left font-medium">Group</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 30).map((r, i) => {
                        const invalid =
                          !r.full_name || !r.student_number || !r.group_name;
                        return (
                          <tr
                            key={i}
                            className={
                              invalid ? 'text-destructive bg-destructive/5' : ''
                            }
                          >
                            <td className="px-2 py-1">{r.full_name || '—'}</td>
                            <td className="px-2 py-1 font-mono">
                              {r.student_number || '—'}
                            </td>
                            <td className="px-2 py-1">{r.group_name || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>

                  </table>
                </div>
                {importRows.length > 30 && (
                  <p className="text-xs text-muted-foreground">
                    …and {importRows.length - 30} more rows
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeImport}>
              Cancel
            </Button>
            <Button
              onClick={() => importMut.mutate()}
              disabled={validImportRows.length === 0 || importMut.isPending}
            >
              {importMut.isPending
                ? 'Importing…'
                : `Import ${validImportRows.length} student${
                    validImportRows.length !== 1 ? 's' : ''
                  }`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
