import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, BookOpen } from 'lucide-react';
import { api } from '@/lib/mock-data';

interface ModuleRow {
  id: string;
  module_code: string;
  module_name: string;
  lecturer_name: string | null;
  session_count: number;
}

export default function ModulesList() {
  const [q, setQ] = useState('');

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['modules'],
    queryFn: api.getModules,
  });

  const { data: teachersAll = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: api.getAllTeachers,
  });

  const { data: sessionsAll = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.getSessions(),
  });

  // Build rows with session count per module
  const rows: ModuleRow[] = modules.map((m) => {
    const lecturer = teachersAll.find((t) => t.id === m.lecturer_id);
    const sessionCount = sessionsAll.filter((s) => s.module_id === m.id).length;
    return {
      id: m.id,
      module_code: m.module_code,
      module_name: m.module_name,
      lecturer_name: lecturer?.full_name ?? null,
      session_count: sessionCount,
    };
  });

  const filtered = rows.filter(
    (m) =>
      m.module_code.toLowerCase().includes(q.toLowerCase()) ||
      m.module_name.toLowerCase().includes(q.toLowerCase()) ||
      (m.lecturer_name ?? '').toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Curriculum</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} modules</p>
          </div>
          <Button asChild>
            <Link to="/modules/add">
              <BookOpen className="w-4 h-4 mr-1" /> Add Module
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
                  placeholder="Search by code, name, or lecturer..."
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
                    <TableHead>Code</TableHead>
                    <TableHead>Module Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Lecturer</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Sessions</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs font-semibold">{m.module_code}</TableCell>
                      <TableCell>{m.module_name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {m.lecturer_name ?? '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right">{m.session_count}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/modules/${m.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
