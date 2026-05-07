import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/mock-data';
import type { Teacher } from '@/types/db';

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
      const updates = Object.entries(roleChanges).map(([teacherId, role]) =>
        api.updateTeacherRole(teacherId, role),
      );
      await Promise.all(updates);
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
                      <Select
                        value={newRole || ''}
                        onValueChange={(role) =>
                          setRoleChanges({
                            ...roleChanges,
                            [t.id]: role as UserRole,
                          })
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Change role..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="lecturer">Lecturer</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                        </SelectContent>
                      </Select>
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
