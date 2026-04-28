import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CameraFeed } from '@/components/CameraFeed';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, CheckCircle2, HelpCircle, Pause, Play } from 'lucide-react';
import { api } from '@/lib/mock-data';
import { recognizeFace, type RecognizeResult } from '@/lib/api';
import { toast } from 'sonner';

interface LogEntry { ts: number; res: RecognizeResult }

export default function Attendance() {
  const [sessionId, setSessionId] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<LogEntry[]>([]);
  const inflight = useRef(false);

  const { data: today = [] } = useQuery({ queryKey: ['today'], queryFn: api.getTodaySessions });
  const session = today.find((s) => s.session.id === sessionId);

  const handleFrame = async (canvas: HTMLCanvasElement) => {
    if (!running || !session || inflight.current) return;
    inflight.current = true;
    try {
      const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85));
      const res = await recognizeFace(blob, { session_id: session.session.id, group_id: session.group.id });
      setEvents((arr) => [{ ts: Date.now(), res }, ...arr].slice(0, 25));
      if (res.reason === 'spoof') toast.error('Spoof attempt blocked');
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
            <p className="text-sm text-muted-foreground">Pick a session, then start the camera. Frames are sent to the backend at ~1 fps.</p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger className="w-[320px]"><SelectValue placeholder="Select session" /></SelectTrigger>
              <SelectContent>
                {today.map((s) => (
                  <SelectItem key={s.session.id} value={s.session.id}>
                    {s.module.module_code} · {s.group.group_name} · {s.session.start_time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setRunning((r) => !r)} disabled={!sessionId} variant={running ? 'destructive' : 'default'}>
              {running ? <><Pause className="w-4 h-4 mr-1" /> Pause</> : <><Play className="w-4 h-4 mr-1" /> Start</>}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <CameraFeed onFrame={handleFrame} intervalMs={1000} />
          </div>
          <Card>
            <CardHeader><CardTitle>Recognition log</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[480px] overflow-auto">
              {events.length === 0 && <div className="text-sm text-muted-foreground">Waiting for frames...</div>}
              {events.map((e, i) => {
                const r = e.res;
                const time = new Date(e.ts).toLocaleTimeString();
                if (r.reason === 'spoof') {
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <ShieldAlert className="w-4 h-4 text-destructive" />
                      <span>{time}</span>
                      <Badge variant="destructive">Spoof</Badge>
                    </div>
                  );
                }
                if (r.ok) {
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span>{time}</span>
                      <span className="font-mono text-xs">{r.student_id?.slice(0, 8)}</span>
                      <Badge variant="outline">{((r.confidence ?? 0) * 100).toFixed(0)}%</Badge>
                    </div>
                  );
                }
                return (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <HelpCircle className="w-4 h-4" />
                    <span>{time}</span>
                    {r.reason}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
