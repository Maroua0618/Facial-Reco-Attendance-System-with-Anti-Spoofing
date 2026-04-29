import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

async function resolveLecturerId(): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (u.user) {
    const { data } = await supabase
      .from('teachers')
      .select('id')
      .eq('auth_user_id', u.user.id)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  // Fallback: first seeded admin or lecturer
  const { data, error } = await supabase
    .from('teachers')
    .select('id, role')
    .in('role', ['admin', 'lecturer'])
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error('No teacher available to own this module');
  return data.id;
}

export default function AddModule() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [year, setYear] = useState(2);
  const [groups, setGroups] = useState<string[]>(['G1']);

  const create = useMutation({
    mutationFn: async () => {
      const lecturerId = await resolveLecturerId();

      const { data: mod, error: e1 } = await supabase
        .from('modules')
        .insert({
          name,
          module_code: code,
          academic_year: '2025-2026',
          lecturer_id: lecturerId,
        })
        .select()
        .single();
      if (e1 || !mod) throw new Error(e1?.message ?? 'Failed to create module');

      for (const groupName of groups) {
        const trimmed = groupName.trim();
        if (!trimmed) continue;
        const { data: g, error: gErr } = await supabase
          .from('groups')
          .upsert({ group_name: trimmed, year }, { onConflict: 'group_name,year' })
          .select()
          .single();
        if (gErr || !g) continue;
        await supabase
          .from('module_groups')
          .upsert(
            { module_id: mod.id, group_id: g.id },
            { onConflict: 'module_id,group_id' },
          );
      }
      return mod;
    },
    onSuccess: () => {
      toast.success('Module created');
      qc.invalidateQueries({ queryKey: ['modules'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['byModule'] });
      qc.invalidateQueries({ queryKey: ['weekly'] });
      navigate('/dashboard');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Create failed'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Add Module</h1>
          <p className="text-sm text-muted-foreground">Create a module and assign its groups.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>Module</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ALGO201" /></div>
              <div className="space-y-2"><Label>Year</Label><Input type="number" min={1} max={5} value={year} onChange={(e) => setYear(parseInt(e.target.value) || 1)} /></div>
            </div>
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Algorithms II" /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Groups</Label>
                <Button size="sm" variant="outline" onClick={() => setGroups((g) => [...g, `G${g.length + 1}`])}>
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              {groups.map((g, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={g} onChange={(e) => setGroups((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} />
                  <Button size="icon" variant="ghost" onClick={() => setGroups((arr) => arr.filter((_, j) => j !== i))} disabled={groups.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button onClick={() => create.mutate()} disabled={!code || !name || create.isPending} className="w-full">
              {create.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Create
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
