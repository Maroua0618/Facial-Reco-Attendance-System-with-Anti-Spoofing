import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { ShieldAlert, Download } from 'lucide-react';
import { api, type DashboardFilters } from '@/lib/mock-data';
import { downloadCSV, toCSV } from '@/lib/csv';

const ALL = '__all__';

export default function SpoofLog() {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const { data: modules = [] } = useQuery({ queryKey: ['modules'], queryFn: api.getModules });
  const { data: groups = [] }  = useQuery({ queryKey: ['groups'],  queryFn: api.getGroups });
  const { data: log = [] }     = useQuery({ queryKey: ['spoofLog', filters], queryFn: () => api.getSpoofLog(filters) });

  const exportCSV = () => {
    const rows = log.map((e) => ({
      at: e.marked_at,
      matricule: e.student.student_number,
      student: e.student.full_name,
      module_code: e.module.module_code,
      group: e.group.group_name,
      type: e.session.session_type,
      session_date: e.session.session_date,
    }));
    const csv = toCSV(rows, [
      { key: 'at', header: 'When' }, { key: 'matricule', header: 'Matricule' },
      { key: 'student', header: 'Student' },
      { key: 'module_code', header: 'Module' }, { key: 'group', header: 'Group' },
      { key: 'type', header: 'Type' }, { key: 'session_date', header: 'Session date' },
    ]);
    downloadCSV(`spoof-log-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Spoof attempts log</h1>
              <p className="text-sm text-muted-foreground">{log.length} attempts in current scope</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={log.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={filters.moduleId ?? ALL} onValueChange={(v) => setFilters((f) => ({ ...f, moduleId: v === ALL ? undefined : v }))}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="All modules" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All modules</SelectItem>
              {modules.map((m) => <SelectItem key={m.id} value={m.id}>{m.module_code} — {m.module_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.groupId ?? ALL} onValueChange={(v) => setFilters((f) => ({ ...f, groupId: v === ALL ? undefined : v }))}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All groups" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All groups</SelectItem>
              {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.group_name} (Year {g.year})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader><CardTitle>Detected spoof attempts</CardTitle></CardHeader>
          <CardContent>
            {log.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No spoof attempts in current scope</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.map((e) => (
                    <TableRow key={e.attendance_id}>
                      <TableCell className="font-mono text-xs">{e.marked_at}</TableCell>
                      <TableCell>
                        <div className="font-medium">{e.student.full_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{e.student.student_number}</div>
                      </TableCell>
                      <TableCell>
                        <Link to={`/modules/${e.module.id}`} className="hover:underline">
                          {e.module.module_code}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link to={`/groups/${e.group.id}`} className="hover:underline">
                          {e.group.group_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase mr-1">{e.session.session_type}</Badge>
                        <span className="text-xs text-muted-foreground">{e.session.session_date} · {e.session.start_time}</span>
                      </TableCell>
                      <TableCell>
                        <Link to={`/sessions/${e.session.id}`} className="text-xs text-primary hover:underline">View</Link>
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
