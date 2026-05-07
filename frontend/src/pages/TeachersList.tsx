import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Search, Pencil, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/mock-data';
import { toast } from 'sonner';

interface Row {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

interface EditState { 
  id: string
  full_name: string
  email: string
}
interface ImportRow { 
  full_name: string
  email: string
}

export default function TeachersList() {
  const [q, setQ] = useState('');
  const [editTeacher, setEditTeacher] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [fileKey, setFileKey] = useState(0);
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ['teachers'],
    queryFn: api.getAllTeachers,
  });

  const editMut = useMutation({
    mutationFn: () =>
      api.updateTeacher(editTeacher!.id, {
        full_name: editTeacher!.full_name,
        email: editTeacher!.email,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      setEditTeacher(null);
      toast.success('Teacher updated');
    },
    onError: () => toast.error('Failed to update teacher'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteTeacher(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      setDeleteId(null);
      toast.success('Teacher deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete teacher');
      setDeleteId(null);
    },
  });

  const importMut = useMutation({
    mutationFn: () => api.importTeachers(validImportRows),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      qc.invalidateQueries({ queryKey: ['allTeachers'] });
      toast.success(
        `Imported ${result.ok} teacher${result.ok !== 1 ? 's' : ''}${
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
        const [full_name = '', email = ''] = line.split(',').map((p) => p.trim());
        return { full_name, email };
      });
      setImportRows(parsed);
    };
    reader.readAsText(file);
  };

  const validImportRows = importRows.filter(
    (r) => r.full_name && r.email,
  );

  const filtered = rows.filter(
    (t) =>
      t.full_name.toLowerCase().includes(q.toLowerCase()) ||
      (t.email ?? '').toLowerCase().includes(q.toLowerCase()),
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
            <h1 className="text-2xl font-bold">Teachers</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} teachers</p>
          </div>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-1" /> Import CSV
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
                  placeholder="Search by name or email..."
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
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="w-[140px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.full_name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">{t.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setEditTeacher({
                                id: t.id,
                                full_name: t.full_name,
                                email: t.email,
                              })
                            }
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(t.id)}
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
        open={!!editTeacher}
        onOpenChange={(open) => {
          if (!open) setEditTeacher(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
          </DialogHeader>
          {editTeacher && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editTeacher.full_name}
                  onChange={(e) =>
                    setEditTeacher({ ...editTeacher, full_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editTeacher.email}
                  onChange={(e) =>
                    setEditTeacher({ ...editTeacher, email: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTeacher(null)}>
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
            <DialogTitle>Delete Teacher</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will permanently delete the teacher. If the teacher is assigned to any sessions
            or groups, those references must be removed first.
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
            <DialogTitle>Import Teachers from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Format:{' '}
              <code className="font-mono bg-muted px-1 rounded text-xs">
                full_name,email
              </code>{' '}
              — one teacher per line.
            </p>
            <a
              href="data:text/csv;charset=utf-8,full_name%2Cemail%2Crole%0AJohn%20Smith%2Cjohn%40example.com%2Clecturer%0A"
              download="teachers_template.csv"
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
                        <th className="px-2 py-1 text-left font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 30).map((r, i) => {
                        const invalid = !r.full_name || !r.email;
                        return (
                          <tr
                            key={i}
                            className={
                              invalid ? 'text-destructive bg-destructive/5' : ''
                            }
                          >
                            <td className="px-2 py-1">{r.full_name || '—'}</td>
                            <td className="px-2 py-1 font-mono">
                              {r.email || '—'}
                            </td>
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
                : `Import ${validImportRows.length} teacher${
                    validImportRows.length !== 1 ? 's' : ''
                  }`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
