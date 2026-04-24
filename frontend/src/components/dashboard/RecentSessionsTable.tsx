import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ session, module, group, present_count, absent_count, attendance_rate }) => (
              <TableRow key={session.id} className="hover:bg-muted/40">
                <TableCell className="font-mono text-xs">
                  {session.session_date} · {session.start_time}
                </TableCell>
                <TableCell>
                  <Link to={`/modules/${module.id}`} className="hover:underline">
                    <div className="font-medium">{module.module_code}</div>
                    <div className="text-xs text-muted-foreground">{module.module_name}</div>
                  </Link>
                </TableCell>
                <TableCell>
                  <Link to={`/groups/${group.id}`} className="hover:underline">
                    {group.group_name} (Y{group.year})
                  </Link>
                </TableCell>
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
                <TableCell className="text-right">
                  <Link to={`/sessions/${session.id}`} className="inline-flex items-center text-muted-foreground hover:text-foreground">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
