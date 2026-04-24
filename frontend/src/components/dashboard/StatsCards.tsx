import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Layers, CalendarDays, TrendingUp } from 'lucide-react';
import type { DashboardStats } from '@/types/db';

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function StatsCards({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: 'Students',           value: stats.total_students,                Icon: Users },
    { label: 'Modules',            value: stats.total_modules,                 Icon: BookOpen },
    { label: 'Groups',             value: stats.total_groups,                  Icon: Layers },
    { label: 'Sessions this week', value: stats.sessions_this_week,            Icon: CalendarDays },
    { label: 'Attendance rate',    value: pct(stats.overall_attendance_rate),  Icon: TrendingUp },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {items.map(({ label, value, Icon }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <Icon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
