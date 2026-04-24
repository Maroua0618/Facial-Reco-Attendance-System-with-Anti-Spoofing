import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { History, Download } from 'lucide-react';
import { api } from '@/lib/mock-data';
import { downloadCSV, toCSV } from '@/lib/csv';
import type { AttendanceStatus } from '@/types/db';

function badgeFor(s: AttendanceStatus | 'not_marked') {
  if (s === 'present')    return <Badge variant="default">Present</Badge>;
  if (s === 'absent')     return <Badge variant="destructive">Absent</Badge>;
  if (s === 'spoof')      return <Badge className="bg-amber-500 hover:bg-amber-500/90">Spoof</Badge>;
  return <Badge variant="outline">Not marked</Badge>;
}

export default function ActivityLog() {
  const { data: log = [] } = useQuery({ queryKey: ['auditLog'], queryFn: () => api.getAuditLog(200) });

  const exportCSV = () => {
    const rows = log.map((e) => ({
      at: e.at,
      actor: e.actor.full_name,
      role: e.actor.role,
      module_code: e.module.module_code,
      group: e.group.group_name,
      session_date: e.session.session_date,
      student: e.student.full_name,
      matricule: e.student.student_number,
      from: e.prev_status,
      to: e.new_status,
    }));
    const csv = toCSV(rows, [
      { key: 'at', header: 'When' },
      { key: 'actor', header: 'Actor' }, { key: 'role', header: 'Role' },
      { key: 'module_code', header: 'Module' }, { key: 'group', header: 'Group' },
      { key: 'session_date', header: 'Session date' },
      { key: 'student', header: 'Student' }, { key: 'matricule', header: 'Matricule' },
      { key: 'from', header: 'From' }, { key: 'to', header: 'To' },
    ]);
    downloadCSV(`activity-log-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Teacher activity log</h1>
              <p className="text-sm text-muted-foreground">
                Manual attendance overrides · {log.length} entries
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={log.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            {log.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No overrides yet. Try changing a student's status on a session detail page.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.at}</TableCell>
                      <TableCell>
                        <div className="font-medium">{e.actor.full_name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{e.actor.role}</div>
                      </TableCell>
                      <TableCell>
                        <Link to={`/sessions/${e.session.id}`} className="hover:underline">
                          {e.module.module_code} · {e.group.group_name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{e.session.session_date} · {e.session.start_time}</div>
                      </TableCell>
                      <TableCell>
                        <div>{e.student.full_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{e.student.student_number}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {badgeFor(e.prev_status)}
                          <span className="text-muted-foreground">→</span>
                          {badgeFor(e.new_status)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
