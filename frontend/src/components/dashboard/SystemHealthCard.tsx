import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { SystemHealth } from '@/types/db';

export function SystemHealthCard({ health }: { health: SystemHealth | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" /> System health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!health ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Avg confidence" value={`${(health.avg_confidence * 100).toFixed(1)}%`} />
              <Stat label="Match rate"     value={`${(health.match_rate * 100).toFixed(1)}%`} />
              <Stat label="Spoof rate"     value={`${(health.spoof_rate * 100).toFixed(2)}%`} tone={health.spoof_rate > 0.05 ? 'bad' : 'ok'} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Recognitions · last 7 days</div>
              <div className="h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={health.daily_counts}>
                    <defs>
                      <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                      formatter={(v: number, n: string) => [v, n]}
                    />
                    <Area type="monotone" dataKey="recognized" stroke="hsl(var(--primary))" fill="url(#recGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {health.total_marked.toLocaleString()} attendance rows tracked
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' }) {
  const color = tone === 'bad' ? 'text-red-500' : '';
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
