import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CameraFeed } from '@/components/CameraFeed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, CheckCircle2, Loader2, Search, UserPlus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/mock-data';
import { embedFace } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { SearchableSelect } from '@/components/ui/searchable-select';

const SHOTS = 5;

// pgvector accepts text literal '[1.2,3.4,...]' reliably across the JSON wire.
function toVectorLiteral(v: number[]): string {
  return '[' + v.map((x) => x.toFixed(6)).join(',') + ']';
}

interface Row {
  id: string;
  full_name: string;
  matricule: string;
  group_id: string;
  group_name: string;
  year: number;
}

export default function RegisterStudent() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  
  const [mode, setMode] = useState<'existing' | 'manual'>('existing');
  const [q, setQ] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [matricule, setMatricule] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [embeddings, setEmbeddings] = useState<number[][]>([]);
  const [busy, setBusy] = useState(false);

  const { data: groups = [] } = useQuery({ queryKey: ['visible-groups'], queryFn: api.getVisibleGroups });

  const { data: rows = [], isLoading: isLoadingStudents } = useQuery<Row[]>({
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
              group_id: d.group.id,
              group_name: d.group.group_name,
              year: d.group.year,
            }))
          : [],
      );
    },
  });

  const uniqueYears = useMemo(() => {
    const years = new Set(groups.map((g) => g.year));
    return Array.from(years).sort((a, b) => a - b).map(String);
  }, [groups]);

  const filteredGroups = useMemo(() => {
    if (!selectedYear) return [];
    return groups.filter((g) => String(g.year) === selectedYear);
  }, [groups, selectedYear]);

  const filteredStudents = useMemo(() => {
    const query = q.toLowerCase();
    return rows.filter((s) =>
      (s.full_name || '').toLowerCase().includes(query) ||
      (s.matricule || '').toLowerCase().includes(query)
    );
  }, [rows, q]);

  const captureShot = async () => {
    if (!video) return;
    setBusy(true);
    try {
      const c = document.createElement('canvas');
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      c.getContext('2d')!.drawImage(video, 0, 0);
      const blob: Blob = await new Promise((resolve) =>
        c.toBlob((b) => resolve(b!), 'image/jpeg', 0.9),
      );
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

  const register = useMutation({
    mutationFn: async () => {
      let stuId = selectedStudentId;

      if (mode === 'manual') {
        const finalMat = matricule.trim() || `S${Date.now().toString().slice(-7)}`;

        const { data: stu, error: e1 } = await supabase
          .from('students')
          .insert({ student_number: finalMat, full_name: name })
          .select()
          .single();
        if (e1 || !stu) throw new Error(e1?.message ?? 'Failed to create student');
        stuId = stu.id;

        const { error: e2 } = await supabase
          .from('student_groups')
          .insert({ student_id: stuId, group_id: groupId });
        if (e2) throw new Error(e2.message);
      }

      if (!stuId) throw new Error('No student selected or created');

      // Capture a photo from the live feed (non-blocking)
      if (video) {
        try {
          const photoCanvas = document.createElement('canvas');
          photoCanvas.width = video.videoWidth;
          photoCanvas.height = video.videoHeight;
          photoCanvas.getContext('2d')!.drawImage(video, 0, 0);
          const photoBlob: Blob = await new Promise((res) =>
            photoCanvas.toBlob((b) => res(b!), 'image/jpeg', 0.85),
          );
          await supabase.storage
            .from('student-photos')
            .upload(`${stuId}.jpg`, photoBlob, { contentType: 'image/jpeg', upsert: true });
          const { data: { publicUrl } } = supabase.storage
            .from('student-photos')
            .getPublicUrl(`${stuId}.jpg`);
          await supabase.from('students').update({ photo_url: publicUrl }).eq('id', stuId);
        } catch {
          // photo upload is non-blocking
        }
      }

      if (embeddings.length > 0) {
        const dbRows = embeddings.map((emb) => ({
          student_id: stuId,
          embedding: toVectorLiteral(emb),
        }));
        const { error: e3 } = await supabase.from('student_embeddings').insert(dbRows as never);
        if (e3) throw new Error(e3.message);
      }

      return stuId;
    },
    onSuccess: () => {
      toast.success('Face registered successfully');
      qc.invalidateQueries({ queryKey: ['students-flat'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['ranking'] });
      navigate('/students');
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Registration failed');
    },
  });

  const canSubmit = useMemo(() => {
    if (embeddings.length < SHOTS || register.isPending) return false;
    if (mode === 'existing') return !!selectedStudentId;
    return !!(name && groupId && selectedYear);
  }, [embeddings.length, register.isPending, mode, selectedStudentId, name, groupId, selectedYear]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Register Face</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Find the student in the system and capture their face.
            </p>
          </div>
          <div className="flex bg-muted p-1 rounded-md border border-border">
            <button
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                mode === 'existing' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => { setMode('existing'); setEmbeddings([]); }}
            >
              <Search className="w-4 h-4 mr-2" /> Find existing
            </button>
            <button
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-sm transition-colors ${
                mode === 'manual' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => { setMode('manual'); setEmbeddings([]); }}
            >
              <UserPlus className="w-4 h-4 mr-2" /> New student
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px] gap-6">
          <div className="overflow-hidden rounded-xl border bg-card">
            <CameraFeed onReady={setVideo} />
          </div>
          
          <Card className="flex flex-col h-full lg:max-h-[600px] overflow-hidden">
            {mode === 'existing' ? (
              <div className="flex flex-col h-full overflow-hidden">
                <CardHeader className="pb-3 border-b shrink-0">
                  <CardTitle>Find student</CardTitle>
                  <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or student number..."
                      className="pl-9 bg-background/50 focus-visible:ring-primary/30"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0 min-h-[200px]">
                  {isLoadingStudents ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No students found.</div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {filteredStudents.map((s) => (
                        <div
                          key={`${s.id}-${s.group_id}`}
                          onClick={() => setSelectedStudentId(s.id)}
                          className={`p-4 cursor-pointer hover:bg-muted/50 transition-all flex items-center justify-between gap-2 border-b border-border/50 ${
                            selectedStudentId === s.id 
                              ? 'bg-primary/20 border-l-4 border-l-primary shadow-inner' 
                              : 'border-l-4 border-l-transparent'
                          }`}
                        >
                          <div className="flex flex-col gap-1.5">
                            <div className="font-medium text-sm flex items-center gap-2">
                              {s.full_name}
                              {selectedStudentId === s.id && (
                                <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                  Selected
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                              <span>{s.matricule}</span>
                              <span className="bg-secondary/80 px-2 py-0.5 rounded-full">{s.group_name}</span>
                              <span className="bg-secondary/80 px-2 py-0.5 rounded-full">Y{s.year}</span>
                            </div>
                          </div>
                          {selectedStudentId === s.id && (
                            <Check className="w-5 h-5 text-primary shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <div className="p-3 border-t border-b bg-muted/10 shrink-0">
                  <button 
                    onClick={() => setMode('manual')}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center"
                  >
                    Student not in the system yet? Register manually &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                <CardHeader className="pb-3 border-b shrink-0">
                  <CardTitle>New student</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 flex-1 overflow-y-auto">
                  <div className="space-y-2">
                    <Label>Full name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aya Benali" />
                  </div>
                  <div className="space-y-2">
                    <Label>Matricule (auto-generated if blank)</Label>
                    <Input value={matricule} onChange={(e) => setMatricule(e.target.value)} placeholder="S2026099" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <SearchableSelect
                        items={uniqueYears.map((y) => ({ id: y, group_name: `Year ${y}`, year: parseInt(y), created_at: '' }))}
                        value={selectedYear}
                        onChange={(v) => { setSelectedYear(v); setGroupId(''); }}
                        placeholder="Select year"
                        renderLabel={(item) => `Year ${item.year}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Group</Label>
                      <SearchableSelect
                        items={filteredGroups}
                        value={groupId}
                        onChange={setGroupId}
                        placeholder="Select group"
                        renderLabel={(g) => g.group_name}
                      />
                    </div>
                  </div>
                </CardContent>
              </div>
            )}

            {/* Bottom area for capture progress and actions */}
            <div className="p-4 border-t bg-card shrink-0 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Captures</span>
                  <span className="text-muted-foreground font-medium">{embeddings.length}/{SHOTS}</span>
                </div>
                <Progress value={(embeddings.length / SHOTS) * 100} className="h-2" />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={captureShot}
                  disabled={busy || !video || embeddings.length >= SHOTS || (mode === 'existing' && !selectedStudentId)}
                  className="flex-1"
                  variant="secondary"
                >
                  <Camera className="w-4 h-4 mr-2" /> Capture
                </Button>
                <Button onClick={() => register.mutate()} disabled={!canSubmit} className="flex-1">
                  {register.isPending
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Save Face
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
