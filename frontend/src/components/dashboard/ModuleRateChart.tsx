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
import type { ModuleRatePoint } from '@/types/db';

export function ModuleRateChart({ data }: { data: ModuleRatePoint[] }) {
  const display = data.map((d) => ({
    name: d.module_code,
    full: d.module_name,
    rate: Math.round(d.attendance_rate * 100),
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance rate by module</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={display} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" domain={[0, 100]} unit="%" className="text-xs" />
              <YAxis dataKey="name" type="category" className="text-xs" width={80} />
              <Tooltip
                formatter={(v: number, _n, p: any) => [`${v}%`, p?.payload?.full ?? 'Module']}
                contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
