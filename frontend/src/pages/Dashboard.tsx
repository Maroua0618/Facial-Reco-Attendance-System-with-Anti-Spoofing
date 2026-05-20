import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Download, BookOpen } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>({});
  const navigate = useNavigate();
  const { user } = useAuth();
  const rawFullName = user?.user_metadata?.full_name;
  const fullName =
    typeof rawFullName === 'string' && rawFullName.trim() !== '' ? rawFullName : 'Teacher';

  const { data: teacher } = useQuery({
    queryKey: ['current-teacher-role', user?.id],
    queryFn: () => api.getCurrentTeacher(),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const canAddModule = teacher?.role === 'admin' || teacher?.role === 'lecturer';

  const { data: modules = [], isPending: modulesLoading } =
    useQuery({ queryKey: ['modules'], queryFn: api.getModules });
  const { data: groups = [] } =
    useQuery({ queryKey: ['visible-groups'],  queryFn: api.getVisibleGroups });
  const { data: stats, isPending: statsLoading } =
    useQuery({ queryKey: ['stats', filters],    queryFn: () => api.getStats(filters) });
  const { data: weekly = [] } =
    useQuery({ queryKey: ['weekly', filters],   queryFn: () => api.getWeeklyAttendance(filters) });
  const { data: byModule = [] } =
    useQuery({ queryKey: ['byModule', filters], queryFn: () => api.getAttendanceRateByModule(filters) });
  const { data: recent = [] } =
    useQuery({ queryKey: ['recent', filters],   queryFn: () => api.getRecentSessions(filters, 10) });
  const { data: trend } =
    useQuery({ queryKey: ['trend', filters],    queryFn: () => api.getTrend(filters) });
  const { data: ranking } =
    useQuery({ queryKey: ['ranking', filters],  queryFn: () => api.getStudentRanking(filters, 5) });
  const { data: heatmap = [] } =
    useQuery({ queryKey: ['heatmap', filters],  queryFn: () => api.getHeatmap(filters) });
  const { data: today = [] } =
    useQuery({ queryKey: ['today'],             queryFn: () => api.getTodaySessions() });
  const { data: live } =
    useQuery({ queryKey: ['live'],              queryFn: () => api.getLiveSession() });
  const { data: health } =
    useQuery({ queryKey: ['health'],            queryFn: () => api.getSystemHealth() });

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

  const isEmpty = !modulesLoading && modules.length === 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{fullName}'s Dashboard</h1>
            <p className="text-sm text-muted-foreground">Attendance overview</p>
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

        {statsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : stats ? (
          <StatsCards stats={stats} />
        ) : null}

        {isEmpty && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">No modules yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {canAddModule
                    ? 'Create your first module to start tracking attendance.'
                    : 'No modules have been created yet. Contact your lecturer or admin.'}
                </p>
              </div>
              {canAddModule && (
                <Button onClick={() => navigate('/modules/add')}>
                  Add your first module
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!isEmpty && (
          <>
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
