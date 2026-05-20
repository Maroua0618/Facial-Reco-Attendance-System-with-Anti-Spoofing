import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WeeklyPoint } from '@/types/db';

export function WeeklyAttendanceChart({ data }: { data: WeeklyPoint[] }) {
  const display = data.map((d) => ({
    week: `W${d.week}`,
    rate: Math.round(d.attendance_rate * 100),
    sessions: d.sessions,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly attendance rate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={display}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="week" className="text-xs" />
              <YAxis domain={[0, 100]} unit="%" className="text-xs" />
              <Tooltip
                formatter={(v: number) => [`${v}%`, 'Attendance']}
                contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
