import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Teacher } from '@/types/db';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface ManageRolesTabProps {
  teachers: Teacher[];
}

type UserRole = 'admin' | 'lecturer' | 'teacher';

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  lecturer: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  teacher: 'bg-muted text-muted-foreground',
};

export default function ManageRolesTab({ teachers }: ManageRolesTabProps) {
  const [roleChanges, setRoleChanges] = useState<Record<string, UserRole>>({});
  const qc = useQueryClient();

  const saveMut = useMutation({
    mutationFn: async () => {
      // Role management has been removed - teachers can serve as both lecturers and tutorial instructors
      throw new Error('Role management is no longer supported');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('Roles updated successfully');
      setRoleChanges({});
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update roles'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Roles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((t) => {
                const newRole = roleChanges[t.id];
                const displayRole = newRole || t.role;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ROLE_COLORS[displayRole as UserRole]}>
                        {displayRole.charAt(0).toUpperCase() + displayRole.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <SearchableSelect
                        items={[
                          { id: 'admin', full_name: 'Admin' },
                          { id: 'lecturer', full_name: 'Lecturer' },
                          { id: 'teacher', full_name: 'Teacher' },
                        ] as any[]}
                        value={newRole || ''}
                        onChange={(role) =>
                          setRoleChanges({
                            ...roleChanges,
                            [t.id]: role as UserRole,
                          })
                        }
                        placeholder="Change role..."
                        renderLabel={(item) => item.full_name}
                        className="w-40"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {Object.keys(roleChanges).length > 0 && (
          <div className="flex gap-2 mt-6">
            <Button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending ? 'Saving...' : `Update ${Object.keys(roleChanges).length} role${Object.keys(roleChanges).length !== 1 ? 's' : ''}`}
            </Button>
            <Button
              variant="outline"
              onClick={() => setRoleChanges({})}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
