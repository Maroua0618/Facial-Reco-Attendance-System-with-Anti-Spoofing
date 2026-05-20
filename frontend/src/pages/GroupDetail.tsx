import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, Layers, Download } from 'lucide-react';
import { api } from '@/lib/mock-data';
import { downloadCSV, toCSV } from '@/lib/csv';

function rateColor(r: number): 'default' | 'secondary' | 'destructive' {
  return r >= 0.85 ? 'default' : r >= 0.7 ? 'secondary' : 'destructive';
}

export default function GroupDetail() {
  const { id = '' } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ['groupDetail', id], queryFn: () => api.getGroupDetail(id) });

  const exportStudents = () => {
    if (!data) return;
    const rows = data.students.map((s) => ({
      matricule: s.student.student_number,
      name: s.student.full_name,
      absent: s.absent, total: s.total,
      rate_pct: (s.attendance_rate * 100).toFixed(1),
    }));
    const csv = toCSV(rows, [
      { key: 'matricule', header: 'Matricule' }, { key: 'name', header: 'Name' },
      { key: 'absent', header: 'Absent' }, { key: 'total', header: 'Total' },
      { key: 'rate_pct', header: 'Rate %' },
    ]);
    downloadCSV(`group-${data.group.group_name}-y${data.group.year}-students.csv`, csv);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        {isLoading && <div>Loading...</div>}
        {!isLoading && !data && <div>Group not found.</div>}

        {data && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Group {data.group.group_name} — Year {data.group.year}</h1>
                  <p className="text-sm text-muted-foreground">
                    {data.students.length} students · {data.modules.length} modules
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={exportStudents}>
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overall rate</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{(data.overall_rate * 100).toFixed(1)}%</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Students</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.students.length}</div></CardContent></Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Modules</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {data.modules.map((m) => (
                      <Link key={m.id} to={`/modules/${m.id}`}>
                        <Badge variant="outline" className="hover:bg-muted cursor-pointer">{m.module_code}</Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Students (sorted by attendance — worst first)</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matricule</TableHead><TableHead>Name</TableHead>
                      <TableHead className="text-right">Absent</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.students.map((sw) => (
                      <TableRow key={sw.student.id}>
                        <TableCell className="font-mono text-xs">{sw.student.student_number}</TableCell>
                        <TableCell>{sw.student.full_name}</TableCell>
                        <TableCell className="text-right tabular-nums">{sw.absent}</TableCell>
                        <TableCell className="text-right tabular-nums">{sw.total}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={rateColor(sw.attendance_rate)}>{(sw.attendance_rate * 100).toFixed(0)}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
