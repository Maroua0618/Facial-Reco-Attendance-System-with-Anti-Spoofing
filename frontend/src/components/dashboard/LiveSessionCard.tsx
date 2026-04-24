import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import type { Student, SessionRow } from '@/types/db';

interface Props {
  data: {
    row: SessionRow;
    recognized: number;
    total: number;
    last_recognized: { student: Student; confidence: number; at: string }[];
  } | null;
}

export function LiveSessionCard({ data }: Props) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5" /> Live session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground py-4 text-center">No session in progress</div>
        </CardContent>
      </Card>
    );
  }
  const { row, recognized, total, last_recognized } = data;
  const pct = total ? Math.round((recognized / total) * 100) : 0;

  return (
    <Card className="border-red-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-red-500">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <Radio className="w-5 h-5" />
          </span>
          Live session
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to={`/sessions/${row.session.id}`} className="font-medium hover:underline">
              {row.module.module_code} · {row.group.group_name}
            </Link>
            <Badge variant="outline" className="uppercase">{row.session.session_type}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {row.session.start_time}–{row.session.end_time} · {row.module.module_name}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Recognized</span>
            <span className="tabular-nums font-medium">{recognized} / {total}</span>
          </div>
          <Progress value={pct} />
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-2">Last recognized</div>
          <div className="space-y-1">
            {last_recognized.length === 0 && (
              <div className="text-xs text-muted-foreground">None yet</div>
            )}
            {last_recognized.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span>{r.student.full_name}</span>
                <span className="text-muted-foreground tabular-nums">{(r.confidence * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
