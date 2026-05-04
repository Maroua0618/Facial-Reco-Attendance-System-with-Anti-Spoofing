import type { ElementType } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, Camera, CheckCircle2, XCircle, AlertTriangle, HelpCircle,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api } from '@/lib/mock-data';
import type { AttendanceStatus } from '@/types/db';

const STATUS_CONFIG: Record<
  AttendanceStatus | 'not_marked',
  { label: string; icon: ElementType; className: string }
> = {
  present:    { label: 'Present',    icon: CheckCircle2,  className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  absent:     { label: 'Absent',     icon: XCircle,       className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  spoof:      { label: 'Spoof',      icon: AlertTriangle, className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  not_marked: { label: 'Not marked', icon: HelpCircle,    className: 'bg-muted text-muted-foreground' },
};

function StatusBadge({ status }: { status: AttendanceStatus | 'not_marked' }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: profile, isPending, isError } = useQuery({
    queryKey: ['student-profile', id],
    queryFn: () => api.getStudentProfile(id!),
    enabled: !!id,
  });

  if (isPending) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !profile) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-4xl">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Student not found.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const {
    student, groups, embedding_count,
    total_sessions, attended, absent, spoof,
    attendance_rate, sessions, weekly_rates,
  } = profile;

  const rateColor =
    attendance_rate >= 0.75 ? 'text-green-600' :
    attendance_rate >= 0.5  ? 'text-yellow-600' :
    'text-red-600';

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Back + student header */}
        <div>
          <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{student.full_name}</h1>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">
                {student.student_number}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {groups.map((g) => (
                  <Badge key={g.id} variant="secondary">
                    {g.group_name} · Y{g.year}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Camera className="w-4 h-4" />
              <span>
                {embedding_count} face sample{embedding_count !== 1 ? 's' : ''} registered
              </span>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total sessions', value: total_sessions, extra: '' },
            { label: 'Attended',       value: attended,        extra: 'text-green-600' },
            { label: 'Absent',         value: absent,          extra: 'text-red-600' },
            {
              label: 'Attendance rate',
              value: `${(attendance_rate * 100).toFixed(1)}%`,
              extra: rateColor,
            },
          ].map(({ label, value, extra }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${extra}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Weekly trend chart */}
        {weekly_rates.length >= 2 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Attendance rate by week</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={weekly_rates}
                  margin={{ top: 4, right: 8, bottom: 4, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(w) => `W${w}`}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    domain={[0, 1]}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, 'Rate']}
                    labelFormatter={(w) => `Week ${w}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendance_rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Session timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Session history</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No sessions recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Module</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground hidden md:table-cell">Conf.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((entry) => (
                      <tr
                        key={entry.session.id}
                        className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                      >
                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">
                          {entry.session.session_date}
                          <span className="text-muted-foreground ml-1">
                            {entry.session.start_time}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="font-medium">{entry.module.module_code}</span>
                          <span className="text-muted-foreground ml-1 hidden sm:inline">
                            · {entry.group.group_name}
                          </span>
                        </td>
                        <td className="px-4 py-2 capitalize text-muted-foreground text-xs hidden sm:table-cell">
                          {entry.session.session_type}
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge status={entry.status} />
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground hidden md:table-cell">
                          {entry.confidence != null
                            ? `${(entry.confidence * 100).toFixed(1)}%`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {spoof > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            {spoof} spoof attempt{spoof !== 1 ? 's' : ''} flagged for this student.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
