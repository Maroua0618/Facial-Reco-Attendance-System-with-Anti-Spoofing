import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { api } from '@/lib/mock-data';

function rateColor(r: number): 'default' | 'secondary' | 'destructive' {
  return r >= 0.85 ? 'default' : r >= 0.7 ? 'secondary' : 'destructive';
}

export default function ModuleDetail() {
  const { id = '' } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ['moduleDetail', id], queryFn: () => api.getModuleDetail(id) });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        {isLoading && <div>Loading...</div>}
        {!isLoading && !data && <div>Module not found.</div>}

        {data && (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{data.module.module_code} — {data.module.module_name}</h1>
                <p className="text-sm text-muted-foreground">
                  Lecturer: {data.lecturer?.full_name ?? 'Unassigned'} · {data.total_sessions} sessions
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overall rate</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{(data.overall_rate * 100).toFixed(1)}%</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Groups enrolled</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{data.groups.length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total sessions</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{data.total_sessions}</div></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Groups breakdown</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead>TD/TP teacher</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Attendance rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.groups.map((g) => (
                      <TableRow key={g.id} className="hover:bg-muted/40">
                        <TableCell>
                          <Link to={`/groups/${g.id}`} className="hover:underline font-medium">
                            {g.group_name} (Year {g.year})
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{g.assigned_teacher_name ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{g.session_count}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={rateColor(g.attendance_rate)}>{(g.attendance_rate * 100).toFixed(0)}%</Badge>
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
