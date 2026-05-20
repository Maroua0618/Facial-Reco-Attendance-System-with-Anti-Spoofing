import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TrendSnapshot } from '@/types/db';

export function TrendBadge({ trend }: { trend: TrendSnapshot | null }) {
  if (!trend) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Trend</CardTitle></CardHeader>
        <CardContent><div className="text-sm text-muted-foreground">Not enough data</div></CardContent>
      </Card>
    );
  }
  const deltaPct = trend.delta * 100;
  const up = deltaPct > 0.5;
  const down = deltaPct < -0.5;
  const Icon = up ? ArrowUp : down ? ArrowDown : Minus;
  const color = up ? 'text-emerald-500' : down ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Trend (W{trend.previous_week} → W{trend.current_week})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`flex items-center gap-2 text-2xl font-bold ${color}`}>
          <Icon className="w-6 h-6" />
          {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}%
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {(trend.current_rate * 100).toFixed(1)}% vs {(trend.previous_rate * 100).toFixed(1)}%
        </div>
      </CardContent>
    </Card>
  );
}
