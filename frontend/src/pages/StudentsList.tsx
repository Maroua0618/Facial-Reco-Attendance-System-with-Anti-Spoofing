import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search, UserPlus } from 'lucide-react';
import { api } from '@/lib/mock-data';

interface Row {
  id: string;
  full_name: string;
  matricule: string;
  attendance_rate: number;
  group_id: string;
  group_name: string;
}

export default function StudentsList() {
  const [q, setQ] = useState('');
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: api.getGroups });
  const { data: rows = [] } = useQuery<Row[]>({
    queryKey: ['students-flat', groups.map((g) => g.id)],
    enabled: groups.length > 0,
    queryFn: async () => {
      const all = await Promise.all(groups.map((g) => api.getGroupDetail(g.id)));
      return all.flatMap((d) =>
        d
          ? d.students.map((sw) => ({
              id: sw.student.id,
              full_name: sw.student.full_name,
              matricule: sw.student.student_number,
              attendance_rate: sw.attendance_rate,
              group_id: d.group.id,
              group_name: d.group.group_name,
            }))
          : [],
      );
    },
  });

  const filtered = rows.filter(
    (s) =>
      s.full_name.toLowerCase().includes(q.toLowerCase()) ||
      (s.matricule ?? '').toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} students</p>
          </div>
          <Button asChild>
            <Link to="/students/register">
              <UserPlus className="w-4 h-4 mr-1" /> Register
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name or matricule..."
                  className="max-w-sm"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.matricule}</TableCell>
                    <TableCell>{s.full_name}</TableCell>
                    <TableCell>
                      <Link to={`/groups/${s.group_id}`} className="text-primary hover:underline">
                        {s.group_name}
                      </Link>
                    </TableCell>
                    <TableCell>{(s.attendance_rate * 100).toFixed(1)}%</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/students/${s.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
