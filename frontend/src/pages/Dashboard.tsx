import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { WeeklyAttendanceChart } from '@/components/dashboard/WeeklyAttendanceChart';
import { ModuleRateChart } from '@/components/dashboard/ModuleRateChart';
import { RecentSessionsTable } from '@/components/dashboard/RecentSessionsTable';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { api, type DashboardFilters as Filters } from '@/lib/mock-data';

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>({});

  const { data: modules = [] }      = useQuery({ queryKey: ['modules'], queryFn: api.getModules });
  const { data: groups = [] }       = useQuery({ queryKey: ['groups'],  queryFn: api.getGroups });
  const { data: stats }             = useQuery({ queryKey: ['stats', filters],   queryFn: () => api.getStats(filters) });
  const { data: weekly = [] }       = useQuery({ queryKey: ['weekly', filters],  queryFn: () => api.getWeeklyAttendance(filters) });
  const { data: byModule = [] }     = useQuery({ queryKey: ['byModule', filters],queryFn: () => api.getAttendanceRateByModule(filters) });
  const { data: recent = [] }       = useQuery({ queryKey: ['recent', filters],  queryFn: () => api.getRecentSessions(filters, 10) });

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
          <DashboardFilters
            modules={modules}
            groups={groups}
            moduleId={filters.moduleId}
            groupId={filters.groupId}
            onModuleChange={(moduleId) => setFilters((f) => ({ ...f, moduleId }))}
            onGroupChange={(groupId) => setFilters((f) => ({ ...f, groupId }))}
          />
        </div>

        {stats && <StatsCards stats={stats} />}

        <div className="grid lg:grid-cols-2 gap-4">
          <WeeklyAttendanceChart data={weekly} />
          <ModuleRateChart data={byModule} />
        </div>

        <RecentSessionsTable rows={recent} />
      </div>
    </DashboardLayout>
  );
}
