import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import { api } from '@/lib/mock-data';
import { toast } from 'sonner';
import type { Group } from '@/types/db';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface ImportStudentsTabProps {
  groups: Group[];
}

export default function ImportStudentsTab({ groups }: ImportStudentsTabProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const qc = useQueryClient();

  const importMut = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId || !file) throw new Error('Group and file required');

      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const start = lines[0]?.toLowerCase().includes('student_number') ? 1 : 0;

      const rows = lines.slice(start).map((line) => {
        const [student_number = '', full_name = ''] = line
          .split(',')
          .map((p) => p.trim());
        return { student_number, full_name, group_name: '' };
      }).filter((r) => r.student_number && r.full_name);

      return api.importStudents(rows);
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['students-flat'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success(
        `Imported ${result.ok} student${result.ok !== 1 ? 's' : ''}${
          result.skipped ? ` · ${result.skipped} skipped` : ''
        }`,
      );
      result.errors.slice(0, 3).forEach((e) => toast.error(e));
      setFile(null);
      setSelectedGroupId(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Import failed'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload student list</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Target group</Label>
          <SearchableSelect
            items={groups}
            value={selectedGroupId || ''}
            onChange={setSelectedGroupId}
            placeholder="Choose group..."
            renderLabel={(g) => `${g.group_name} (Year ${g.year})`}
          />
        </div>

        <div className="space-y-2">
          <Label>File (.xlsx or .csv)</Label>
          <div className="relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="pointer-events-none space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload Excel or CSV</p>
              <p className="text-xs text-muted-foreground">
                Expected columns: <strong>student_number</strong> and <strong>full_name</strong>{' '}
                (or matricule / nom — detected automatically)
              </p>
              {file && <p className="text-xs text-primary font-medium">{file.name}</p>}
            </div>
          </div>
        </div>

        <Button
          onClick={() => importMut.mutate()}
          disabled={!selectedGroupId || !file || importMut.isPending}
          size="lg"
          className="w-full"
        >
          {importMut.isPending ? 'Importing...' : 'Import students into group'}
        </Button>
      </CardContent>
    </Card>
  );
}
