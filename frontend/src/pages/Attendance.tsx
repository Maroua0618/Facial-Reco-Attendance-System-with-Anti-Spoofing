import { useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CameraFeed } from '@/components/CameraFeed';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, CheckCircle2, HelpCircle, Pause, Play, CheckSquare } from 'lucide-react';
import { api } from '@/lib/mock-data';
import { recognizeFace, type RecognizeResult } from '@/lib/api';
import { toast } from 'sonner';

interface LogEntry { ts: number; res: RecognizeResult }

function LivenessDebug({ res }: { res: RecognizeResult | null }) {
  if (!res?.liveness_breakdown) {
    return <div className="text-xs text-muted-foreground">Waiting for first frame...</div>;
  }
  const b = res.liveness_breakdown;
  const named = ['sharpness', 'saturation', 'edge_density', 'reflection', 'motion'];
  const score = res.live_conf;
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium">Live score</span>
        <span className={`font-mono ${score >= 0.7 ? 'text-success' : 'text-destructive'}`}>
          {(score * 100).toFixed(0)}%
        </span>
      </div>
      <div className="space-y-1">
        {named.filter((k) => b[k] !== undefined).map((k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-24 text-muted-foreground capitalize">{k.replace('_', ' ')}</span>
            <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
              <div
                className={`h-full ${b[k] >= 0.7 ? 'bg-success' : b[k] >= 0.4 ? 'bg-yellow-500' : 'bg-destructive'}`}
                style={{ width: `${(b[k] * 100).toFixed(0)}%` }}
              />
            </div>
            <span className="font-mono w-10 text-right">{(b[k] * 100).toFixed(0)}</span>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-muted-foreground pt-1 border-t">
        Heuristic-only liveness (no ONNX model loaded). High-quality phone
        replays may still pass. Drop a real model at
        ai/anti_spoofing/model.onnx to upgrade.
      </div>
    </div>
  );
}

export default function Attendance() {
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<LogEntry[]>([]);
  const [seenStudents, setSeenStudents] = useState<Set<string>>(() => new Set());
  const [finishedSessions, setFinishedSessions] = useState<Set<string>>(() => new Set());
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const hasStarted = Boolean(sessionStartedAt);
  const inflight = useRef(false);

  const { data: today = [] } = useQuery({ queryKey: ['today'], queryFn: api.getTodaySessions });
  const session = today.find((s) => s.session.id === sessionId);
  const lastRes = events[0]?.res ?? null;

  // Load roster for the selected session to resolve student_id -> name
  const { data: sessionDetail } = useQuery({
    queryKey: ['session-detail', sessionId],
    queryFn: () => api.getSessionDetail(sessionId),
    enabled: !!sessionId,
  });

  const studentMap = useMemo(() => {
    const map = new Map<string, { full_name: string; student_number: string }>();
    (sessionDetail?.roster ?? []).forEach((r) => {
      map.set(r.student.id, {
        full_name: r.student.full_name,
        student_number: r.student.student_number,
      });
    });
    return map;
  }, [sessionDetail]);

  const notMarkedCount = sessionDetail?.roster.filter((r) => r.status === 'not_marked').length ?? 0;
  const isFinished = sessionId ? finishedSessions.has(sessionId) : false;

  const finalizeMut = useMutation({
    mutationFn: () => api.finalizeSession(sessionId, {
      startedAt: sessionStartedAt,
      endedAt: new Date().toISOString(),
    }),
    onSuccess: (count) => {
      setRunning(false);
      setFinishedSessions((prev) => new Set(prev).add(sessionId));
      qc.invalidateQueries({ queryKey: ['session-detail', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionDetail', sessionId] });
      qc.invalidateQueries({ queryKey: ['today'] });
      qc.invalidateQueries({ queryKey: ['recent'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['ranking'] });
      qc.invalidateQueries({ queryKey: ['weekly'] });
      qc.invalidateQueries({ queryKey: ['module-rate'] });
      qc.invalidateQueries({ queryKey: ['heatmap'] });
      qc.invalidateQueries({ queryKey: ['live'] });
      toast.success(
        count === 0
          ? 'Session finalized. Everyone was already marked.'
          : `Session finalized: ${count} student${count === 1 ? '' : 's'} marked absent.`,
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to finalize session');
    },
  });

  const handleSessionChange = (value: string) => {
    setSessionId(value);
    setRunning(false);
    setEvents([]);
    setSeenStudents(new Set());
    setSessionStartedAt(null);
  };

  const handleRunToggle = () => {
    if (!sessionId) return;
    setRunning((current) => {
      if (!current && !sessionStartedAt) {
        setSessionStartedAt(new Date().toISOString());
      }
      return !current;
    });
  };

  const handleFinalize = () => {
    if (!sessionId || finalizeMut.isPending) return;
    finalizeMut.mutate();
  };

  const handleFrame = async (canvas: HTMLCanvasElement) => {
    if (!running || !session || isFinished || inflight.current) return;
    inflight.current = true;
    try {
      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85),
      );
      const res = await recognizeFace(blob, {
        session_id: session.session.id,
        group_id: session.group.id,
      });
      setEvents((arr) => [{ ts: Date.now(), res }, ...arr].slice(0, 25));
      if (res.reason === 'spoof')
        toast.error(`Spoof blocked (live=${(res.live_conf * 100).toFixed(0)}%)`);
      if (res.ok && res.student_id && !seenStudents.has(res.student_id)) {
        setSeenStudents((prev) => new Set(prev).add(res.student_id!));
        qc.invalidateQueries({ queryKey: ['session-detail', sessionId] });
        qc.invalidateQueries({ queryKey: ['today'] });
      }
    } catch {
      // network errors stay quiet
    } finally {
      inflight.current = false;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Live Attendance</h1>
            <p className="text-sm text-muted-foreground">
              Pick a session, then start the camera. Frames are sent to the backend at ~1 fps.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={sessionId} onValueChange={handleSessionChange}>
              <SelectTrigger className="w-full sm:w-[320px]">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                {today.map((s) => (
                  <SelectItem key={s.session.id} value={s.session.id}>
                    {s.module.module_code} · {s.group.group_name} · {s.session.start_time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isFinished && (
              <Button
                onClick={handleRunToggle}
                disabled={!sessionId}
                variant={running ? 'destructive' : 'default'}
              >
                {running
                  ? <><Pause className="w-4 h-4 mr-1" /> Pause</>
                  : <><Play className="w-4 h-4 mr-1" /> {hasStarted ? 'Resume' : 'Start'}</>}
              </Button>
            )}
            <Button
              onClick={handleFinalize}
              disabled={!sessionId || isFinished || finalizeMut.isPending}
              variant="outline"
            >
              <CheckSquare className="w-4 h-4 mr-1" />
              {isFinished
                ? 'Finished'
                : finalizeMut.isPending
                ? 'Finalizing...'
                : `Finish${notMarkedCount > 0 ? ` (${notMarkedCount} absent)` : ''}`}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <CameraFeed onFrame={handleFrame} intervalMs={1000} />
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Liveness debug</CardTitle></CardHeader>
              <CardContent><LivenessDebug res={lastRes} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Recognition log</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-[280px] overflow-auto">
                {events.length === 0 && (
                  <div className="text-xs text-muted-foreground">Waiting for frames...</div>
                )}
                {events.map((e, i) => {
                  const r = e.res;
                  const time = new Date(e.ts).toLocaleTimeString();

                  if (r.reason === 'spoof') {
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <ShieldAlert className="w-3 h-3 text-destructive flex-shrink-0" />
                        <span className="text-muted-foreground">{time}</span>
                        <Badge variant="destructive" className="text-[10px]">Spoof</Badge>
                      </div>
                    );
                  }

                  if (r.ok) {
                    const stu = r.student_id ? studentMap.get(r.student_id) : undefined;
                    return (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-3 h-3 text-success mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span className="text-muted-foreground">{time}</span>
                            {stu ? (
                              <Link
                                to={`/students/${r.student_id}`}
                                className="font-medium hover:underline"
                              >
                                {stu.full_name}
                              </Link>
                            ) : (
                              <span className="font-mono text-[10px]">
                                {r.student_id?.slice(0, 8)}
                              </span>
                            )}
                            {stu && (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {stu.student_number}
                              </span>
                            )}
                            <Badge variant="outline" className="text-[10px]">
                              {((r.confidence ?? 0) * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <HelpCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{time}</span>
                      {r.reason}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
