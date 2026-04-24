import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SessionRow } from '@/types/db';

function rateColor(rate: number): 'default' | 'secondary' | 'destructive' {
  if (rate >= 0.85) return 'default';
  if (rate >= 0.7) return 'secondary';
  return 'destructive';
}

export function RecentSessionsTable({ rows }: { rows: SessionRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Present</TableHead>
              <TableHead className="text-right">Absent</TableHead>
              <TableHead className="text-right">Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ session, module, group, present_count, absent_count, attendance_rate }) => (
              <TableRow key={session.id}>
                <TableCell className="font-mono text-xs">
                  {session.session_date} · {session.start_time}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{module.module_code}</div>
                  <div className="text-xs text-muted-foreground">{module.module_name}</div>
                </TableCell>
                <TableCell>{group.group_name} (Y{group.year})</TableCell>
                <TableCell>
                  <Badge variant="outline" className="uppercase">{session.session_type}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{present_count}</TableCell>
                <TableCell className="text-right tabular-nums">{absent_count}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={rateColor(attendance_rate)}>
                    {(attendance_rate * 100).toFixed(0)}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
