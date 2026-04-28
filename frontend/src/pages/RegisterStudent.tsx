import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CameraFeed } from '@/components/CameraFeed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/mock-data';
import { embedFace } from '@/lib/api';

const SHOTS = 5;

export default function RegisterStudent() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [matricule, setMatricule] = useState('');
  const [groupId, setGroupId] = useState<string>('');
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [embeddings, setEmbeddings] = useState<number[][]>([]);
  const [busy, setBusy] = useState(false);

  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: api.getGroups });

  const captureShot = async () => {
    if (!video) return;
    setBusy(true);
    try {
      const c = document.createElement('canvas');
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      c.getContext('2d')!.drawImage(video, 0, 0);
      const blob: Blob = await new Promise((resolve) => c.toBlob((b) => resolve(b!), 'image/jpeg', 0.9));
      const res = await embedFace(blob);
      setEmbeddings((arr) => [...arr, res.embedding]);
      toast.success(`Captured ${embeddings.length + 1}/${SHOTS}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Capture failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!name || !groupId || embeddings.length < SHOTS) return;
    toast.info('Registration will write to Supabase once the DB migration is applied');
    navigate('/students');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold">Register Student</h1>
          <p className="text-sm text-muted-foreground">Capture {SHOTS} face shots from different angles, then assign a group.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <CameraFeed onReady={setVideo} />
          <Card>
            <CardHeader><CardTitle>Student details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aya Benali" />
              </div>
              <div className="space-y-2">
                <Label>Matricule</Label>
                <Input value={matricule} onChange={(e) => setMatricule(e.target.value)} placeholder="S2026001" />
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.group_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Captures</span>
                  <span className="text-muted-foreground">{embeddings.length}/{SHOTS}</span>
                </div>
                <Progress value={(embeddings.length / SHOTS) * 100} />
              </div>
              <div className="flex gap-2">
                <Button onClick={captureShot} disabled={busy || !video || embeddings.length >= SHOTS} className="flex-1">
                  <Camera className="w-4 h-4 mr-1" /> Capture
                </Button>
                <Button onClick={submit} disabled={!name || !groupId || embeddings.length < SHOTS}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Register
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
