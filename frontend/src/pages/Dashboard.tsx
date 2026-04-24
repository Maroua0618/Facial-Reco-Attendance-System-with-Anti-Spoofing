import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { WeeklyAttendanceChart } from '@/components/dashboard/WeeklyAttendanceChart';
import { ModuleRateChart } from '@/components/dashboard/ModuleRateChart';
import { RecentSessionsTable } from '@/components/dashboard/RecentSessionsTable';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { TrendBadge } from '@/components/dashboard/TrendBadge';
import { StudentRankingPanel } from '@/components/dashboard/StudentRankingPanel';
import { AttendanceHeatmap } from '@/components/dashboard/AttendanceHeatmap';
import { TodayScheduleCard } from '@/components/dashboard/TodayScheduleCard';
import { LiveSessionCard } from '@/components/dashboard/LiveSessionCard';
import { SystemHealthCard } from '@/components/dashboard/SystemHealthCard';
import { api, type DashboardFilters as Filters } from '@/lib/mock-data';
import { downloadCSV, toCSV } from '@/lib/csv';

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>({});

  const { data: modules = [] }   = useQuery({ queryKey: ['modules'], queryFn: api.getModules });
  const { data: groups = [] }    = useQuery({ queryKey: ['groups'],  queryFn: api.getGroups });
  const { data: stats }          = useQuery({ queryKey: ['stats', filters],    queryFn: () => api.getStats(filters) });
  const { data: weekly = [] }    = useQuery({ queryKey: ['weekly', filters],   queryFn: () => api.getWeeklyAttendance(filters) });
  const { data: byModule = [] }  = useQuery({ queryKey: ['byModule', filters], queryFn: () => api.getAttendanceRateByModule(filters) });
  const { data: recent = [] }    = useQuery({ queryKey: ['recent', filters],   queryFn: () => api.getRecentSessions(filters, 10) });
  const { data: trend }          = useQuery({ queryKey: ['trend', filters],    queryFn: () => api.getTrend(filters) });
  const { data: ranking }        = useQuery({ queryKey: ['ranking', filters],  queryFn: () => api.getStudentRanking(filters, 5) });
  const { data: heatmap = [] }   = useQuery({ queryKey: ['heatmap', filters],  queryFn: () => api.getHeatmap(filters) });
  const { data: today = [] }     = useQuery({ queryKey: ['today'],             queryFn: () => api.getTodaySessions() });
  const { data: live }           = useQuery({ queryKey: ['live'],              queryFn: () => api.getLiveSession() });
  const { data: health }         = useQuery({ queryKey: ['health'],            queryFn: () => api.getSystemHealth() });

  const exportRecent = () => {
    const rows = recent.map((r) => ({
      date: r.session.session_date, time: r.session.start_time,
      module_code: r.module.module_code, module_name: r.module.module_name,
      group: r.group.group_name, type: r.session.session_type,
      present: r.present_count, absent: r.absent_count,
      rate_pct: (r.attendance_rate * 100).toFixed(1),
    }));
    const csv = toCSV(rows, [
      { key: 'date', header: 'Date' }, { key: 'time', header: 'Time' },
      { key: 'module_code', header: 'Module' }, { key: 'module_name', header: 'Module name' },
      { key: 'group', header: 'Group' }, { key: 'type', header: 'Type' },
      { key: 'present', header: 'Present' }, { key: 'absent', header: 'Absent' },
      { key: 'rate_pct', header: 'Rate %' },
    ]);
    downloadCSV(`recent-sessions-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Attendance overview · using mock data until DB migration is applied
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DashboardFilters
              modules={modules} groups={groups}
              moduleId={filters.moduleId} groupId={filters.groupId}
              onModuleChange={(moduleId) => setFilters((f) => ({ ...f, moduleId }))}
              onGroupChange={(groupId) => setFilters((f) => ({ ...f, groupId }))}
            />
            <Button variant="outline" size="sm" onClick={exportRecent} disabled={recent.length === 0}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>
        </div>

        {stats && <StatsCards stats={stats} />}

        <div className="grid lg:grid-cols-3 gap-4">
          <TodayScheduleCard rows={today} liveSessionId={live?.row.session.id} />
          <LiveSessionCard data={live ?? null} />
          <TrendBadge trend={trend ?? null} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><WeeklyAttendanceChart data={weekly} /></div>
          <SystemHealthCard health={health} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <ModuleRateChart data={byModule} />
          <AttendanceHeatmap cells={heatmap} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <StudentRankingPanel worst={ranking?.worst ?? []} best={ranking?.best ?? []} />
          <div className="lg:col-span-2"><RecentSessionsTable rows={recent} /></div>
        </div>
      </div>
    </DashboardLayout>
  );
}
