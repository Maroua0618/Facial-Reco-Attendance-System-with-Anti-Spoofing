import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, Camera, Download, CheckSquare } from 'lucide-react';
import { api } from '@/lib/mock-data';
import { downloadCSV, toCSV } from '@/lib/csv';
import type { AttendanceStatus, RosterEntry } from '@/types/db';
import { toast } from 'sonner';

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
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sessionDetail', id],
    queryFn: () => api.getSessionDetail(id),
  });

  const overrideMut = useMutation({
    mutationFn: ({ studentId, status }: { studentId: string; status: AttendanceStatus }) =>
      api.updateAttendanceStatus(id, studentId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionDetail', id] });
      qc.invalidateQueries({ queryKey: ['recent'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['ranking'] });
      toast.success('Attendance updated');
    },
    onError: () => toast.error('Failed to update attendance'),
  });

  const finalizeMut = useMutation({
    mutationFn: () => api.finalizeSession(id),
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['sessionDetail', id] });
      qc.invalidateQueries({ queryKey: ['recent'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      setConfirming(false);
      toast.success(
        count === 0
          ? 'All students already marked — nothing to finalize.'
          : `Finalized: ${count} student${count === 1 ? '' : 's'} marked absent.`,
      );
    },
    onError: () => { toast.error('Failed to finalize session'); setConfirming(false); },
  });

  const notMarkedCount = data?.roster.filter((r) => r.status === 'not_marked').length ?? 0;

  const exportRoster = () => {
    if (!data) return;
    const rows = data.roster.map((r) => ({
      matricule: r.student.student_number,
      name: r.student.full_name,
      status: r.status,
      confidence_pct: r.confidence !== null ? (r.confidence * 100).toFixed(1) : '',
      marked_at: r.marked_at ?? '',
    }));
    const csv = toCSV(rows, [
      { key: 'matricule', header: 'Matricule' }, { key: 'name', header: 'Name' },
      { key: 'status', header: 'Status' }, { key: 'confidence_pct', header: 'Confidence %' },
      { key: 'marked_at', header: 'Marked at' },
    ]);
    downloadCSV(`session-${data.module.module_code}-${data.group.group_name}-${data.session.session_date}.csv`, csv);
  };

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
            <div className="flex flex-wrap items-start justify-between gap-3">
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
              <div className="flex flex-wrap items-center gap-2">
                {!confirming ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirming(true)}
                    disabled={notMarkedCount === 0}
                  >
                    <CheckSquare className="w-4 h-4 mr-1" />
                    Finalize{notMarkedCount > 0 ? ` (${notMarkedCount} unmarked)` : ''}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-1.5">
                    <span className="text-sm text-muted-foreground">
                      Mark {notMarkedCount} student{notMarkedCount === 1 ? '' : 's'} absent?
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => finalizeMut.mutate()}
                      disabled={finalizeMut.isPending}
                    >
                      {finalizeMut.isPending ? 'Working...' : 'Confirm'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={exportRoster}>
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Rate</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{(data.attendance_rate * 100).toFixed(0)}%</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Present</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-500">{data.present_count}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Absent</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-500">{data.absent_count}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Spoof attempts</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-500">{data.spoof_count}</div></CardContent></Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Roster</CardTitle>
                <p className="text-xs text-muted-foreground">Use the dropdown to manually override a student's status. Use Finalize to bulk-mark all unmarked students as absent.</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Matricule</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell text-right">Confidence</TableHead>
                        <TableHead className="hidden md:table-cell">Marked at</TableHead>
                        <TableHead className="w-[150px]">Override</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.roster.map((r) => (
                        <TableRow key={r.student.id}>
                          <TableCell className="font-mono text-xs">{r.student.student_number}</TableCell>
                          <TableCell>{r.student.full_name}</TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell className="hidden md:table-cell text-right tabular-nums">
                            {r.confidence !== null ? `${(r.confidence * 100).toFixed(1)}%` : '—'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-mono">
                            {r.marked_at ?? '—'}
                          </TableCell>
                          <TableCell>
                            <SearchableSelect
                              items={[
                                { id: 'present', full_name: 'Present' },
                                { id: 'absent', full_name: 'Absent' },
                                { id: 'spoof', full_name: 'Spoof' },
                              ] as any[]}
                              value={r.status === 'not_marked' ? '' : r.status}
                              onChange={(v) =>
                                overrideMut.mutate({ studentId: r.student.id, status: v as AttendanceStatus })
                              }
                              placeholder="Set..."
                              renderLabel={(item) => item.full_name}
                              className="w-32"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
