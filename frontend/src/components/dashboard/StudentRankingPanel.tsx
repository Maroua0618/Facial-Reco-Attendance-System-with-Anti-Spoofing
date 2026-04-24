import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RankedStudent } from '@/types/db';

function Row({ r, rank }: { r: RankedStudent; rank: number }) {
  const pct = (r.attendance_rate * 100).toFixed(0);
  const tone = r.attendance_rate >= 0.85 ? 'default' : r.attendance_rate >= 0.7 ? 'secondary' : 'destructive';
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-6 text-xs font-mono text-muted-foreground">#{rank}</div>
        <div>
          <div className="text-sm font-medium">{r.student.full_name}</div>
          <div className="text-xs text-muted-foreground font-mono">{r.student.student_number}</div>
        </div>
      </div>
      <div className="text-right">
        <Badge variant={tone}>{pct}%</Badge>
        <div className="text-xs text-muted-foreground mt-1">{r.absent} absent / {r.total}</div>
      </div>
    </div>
  );
}

export function StudentRankingPanel({ worst, best }: { worst: RankedStudent[]; best: RankedStudent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Student ranking</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="worst">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="worst">Most absent</TabsTrigger>
            <TabsTrigger value="best">Best attendance</TabsTrigger>
          </TabsList>
          <TabsContent value="worst" className="mt-3">
            {worst.map((r, i) => <Row key={r.student.id} r={r} rank={i + 1} />)}
            {worst.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">No data</div>}
          </TabsContent>
          <TabsContent value="best" className="mt-3">
            {best.map((r, i) => <Row key={r.student.id} r={r} rank={i + 1} />)}
            {best.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">No data</div>}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
