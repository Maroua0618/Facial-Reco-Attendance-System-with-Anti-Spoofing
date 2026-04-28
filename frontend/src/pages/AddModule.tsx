import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AddModule() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [year, setYear] = useState(2);
  const [groups, setGroups] = useState<string[]>(['G1']);

  const submit = () => {
    if (!code || !name) return;
    toast.info('Module will be created in Supabase once the DB migration is applied');
    navigate('/dashboard');
  };

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
                <Button size="sm" variant="outline" onClick={() => setGroups((g) => [...g, `G${g.length + 1}`])}><Plus className="w-3 h-3 mr-1" /> Add</Button>
              </div>
              {groups.map((g, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={g} onChange={(e) => setGroups((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} />
                  <Button size="icon" variant="ghost" onClick={() => setGroups((arr) => arr.filter((_, j) => j !== i))} disabled={groups.length === 1}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
            <Button onClick={submit} disabled={!code || !name} className="w-full">Create</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
