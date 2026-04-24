import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, Camera } from 'lucide-react';
import { api } from '@/lib/mock-data';
import type { RosterEntry } from '@/types/db';

function statusBadge(status: RosterEntry['status']) {
  switch (status) {
    case 'present':    return <Badge variant="default">Present</Badge>;
    case 'absent':     return <Badge variant="destructive">Absent</Badge>;
    case 'spoof':      return <Badge className="bg-amber-500 hover:bg-amber-500/90">Spoof</Badge>;
    case 'not_marked': return <Badge variant="outline">Not marked</Badge>;
  }
}

export default function SessionDetail() {
  const { id = '' } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ['sessionDetail', id], queryFn: () => api.getSessionDetail(id) });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        {isLoading && <div>Loading...</div>}
        {!isLoading && !data && <div>Session not found.</div>}

        {data && (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  <Link to={`/modules/${data.module.id}`} className="hover:underline">{data.module.module_code}</Link>
                  {' · '}
                  <Link to={`/groups/${data.group.id}`} className="hover:underline">{data.group.group_name}</Link>
                </h1>
                <p className="text-sm text-muted-foreground">
                  {data.session.session_date} · {data.session.start_time}–{data.session.end_time} ·
                  <Badge variant="outline" className="ml-2 uppercase">{data.session.session_type}</Badge>
                  <span className="ml-2">Week {data.session.week}</span>
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rate</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{(data.attendance_rate * 100).toFixed(0)}%</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Present</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-emerald-500">{data.present_count}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Absent</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-red-500">{data.absent_count}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Spoof attempts</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-amber-500">{data.spoof_count}</div></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Roster</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matricule</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead>Marked at</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.roster.map((r) => (
                      <TableRow key={r.student.id}>
                        <TableCell className="font-mono text-xs">{r.student.student_number}</TableCell>
                        <TableCell>{r.student.full_name}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.confidence !== null ? `${(r.confidence * 100).toFixed(1)}%` : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {r.marked_at ?? '—'}
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
