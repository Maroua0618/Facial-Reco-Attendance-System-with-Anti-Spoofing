import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { RecentSessionsTable } from '@/components/dashboard/RecentSessionsTable';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { api, type DashboardFilters as Filters } from '@/lib/mock-data';
import { toCSV, downloadCSV } from '@/lib/csv';

export default function AttendanceHistory() {
  const [filters, setFilters] = useState<Filters>({});
  const { data: modules = [] } = useQuery({ queryKey: ['modules'], queryFn: api.getModules });
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: api.getGroups });
  const { data: rows = [] } = useQuery({
    queryKey: ['history', filters],
    queryFn: () => api.getRecentSessions(filters, 200),
  });

  const exportAll = () => {
    const data = rows.map((r) => ({
      date: r.session.session_date, time: r.session.start_time,
      module: r.module.module_code, group: r.group.group_name, type: r.session.session_type,
      present: r.present_count, absent: r.absent_count, rate: (r.attendance_rate * 100).toFixed(1),
    }));
    const csv = toCSV(data, [
      { key: 'date', header: 'Date' }, { key: 'time', header: 'Time' },
      { key: 'module', header: 'Module' }, { key: 'group', header: 'Group' },
      { key: 'type', header: 'Type' }, { key: 'present', header: 'Present' },
      { key: 'absent', header: 'Absent' }, { key: 'rate', header: 'Rate %' },
    ]);
    downloadCSV(`history-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Attendance history</h1>
            <p className="text-sm text-muted-foreground">{rows.length} sessions</p>
          </div>
          <div className="flex gap-2">
            <DashboardFilters
              modules={modules} groups={groups}
              moduleId={filters.moduleId} groupId={filters.groupId}
              onModuleChange={(moduleId) => setFilters((f) => ({ ...f, moduleId }))}
              onGroupChange={(groupId) => setFilters((f) => ({ ...f, groupId }))}
            />
            <Button variant="outline" size="sm" onClick={exportAll} disabled={rows.length === 0}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>
        </div>
        <Card><CardContent className="pt-6"><RecentSessionsTable rows={rows} /></CardContent></Card>
      </div>
    </DashboardLayout>
  );
}
