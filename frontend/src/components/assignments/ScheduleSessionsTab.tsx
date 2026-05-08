import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/mock-data';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Group, Module, Teacher } from '@/types/db';

interface ScheduleSessionsTabProps {
  groups: Group[];
  modules: Module[];
}

export default function ScheduleSessionsTab({ groups = [], modules = [] }: ScheduleSessionsTabProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [duration, setDuration] = useState('2');
  const [sessionType, setSessionType] = useState<'td' | 'tp'>('td');
  const [week, setWeek] = useState<string>('1');

  // Get current teacher's role
  const { data: teacher } = useQuery<Teacher | null>({
    queryKey: ['current-teacher', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('teachers')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const isAdmin = teacher?.role === 'admin';

  // Filter groups based on role
  // Teachers can only see groups where they're assigned as teacher
  const { data: teacherAssignments = [] } = useQuery({
    queryKey: ['teacher-assignments', teacher?.id],
    queryFn: async () => {
      if (!teacher?.id || isAdmin) return [];
      const { data } = await supabase
        .from('module_groups')
        .select('group_id, module_id')
        .eq('assigned_teacher_id', teacher.id);
      return data || [];
    },
    enabled: !!teacher?.id && !isAdmin,
  });

  const teacherGroupIds = teacherAssignments.map(item => item.group_id);
  const teacherModuleIds = teacherAssignments.map(item => item.module_id);

  const visibleGroups = isAdmin ? groups : groups.filter(g => teacherGroupIds.includes(g.id));
  const visibleModules = isAdmin ? modules : modules.filter(m => m.lecturer_id === teacher?.id || teacherModuleIds.includes(m.id));

  const createSessionMut = useMutation({
    mutationFn: async () => {
      if (!selectedModuleId || !selectedGroupId || !sessionDate || !startTime) {
        throw new Error('Please fill in all required fields');
      }

      // Validate date is not in the past
      const now = new Date();
      const selected = new Date(sessionDate);
      if (selected < now) {
        throw new Error('Cannot schedule sessions in the past');
      }

      // Calculate week number (1-14 for academic year)
      const weekNum = Math.max(1, Math.min(14, parseInt(week) || 1));

      await api.createSession({
        module_id: selectedModuleId,
        group_id: selectedGroupId,
        session_date: sessionDate,
        start_time: startTime,
        session_type: sessionType,
        week: weekNum,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session scheduled successfully');
      // Reset form
      setSelectedModuleId(null);
      setSelectedGroupId(null);
      setSessionDate('');
      setStartTime('08:00');
      setDuration('2');
      setSessionType('td');
      setWeek('1');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to schedule session'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Sessions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Module Selection */}
          <div>
            <Label>Module *</Label>
            <Select value={selectedModuleId || ''} onValueChange={setSelectedModuleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select module..." />
              </SelectTrigger>
              <SelectContent>
                {visibleModules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.module_name || 'Unnamed'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {visibleModules.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {isAdmin ? 'No modules available' : 'You are not assigned to any modules'}
              </p>
            )}
          </div>

          {/* Group Selection */}
          <div>
            <Label>Group *</Label>
            <Select value={selectedGroupId || ''} onValueChange={setSelectedGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Select group..." />
              </SelectTrigger>
              <SelectContent>
                {visibleGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.group_name} (Y{g.year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {visibleGroups.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {isAdmin ? 'No groups available' : 'You are not assigned to any groups'}
              </p>
            )}
          </div>

          {/* Session Date */}
          <div>
            <Label>Session Date *</Label>
            <Input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>

          {/* Start Time */}
          <div>
            <Label>Start Time *</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* Duration */}
          <div>
            <Label>Duration (hours)</Label>
            <Input
              type="number"
              min="1"
              max="4"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          {/* Session Type */}
          <div>
            <Label>Session Type</Label>
            <Select value={sessionType} onValueChange={(v) => setSessionType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="td">Tutorial (TD)</SelectItem>
                <SelectItem value="tp">Lab (TP)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Week */}
          <div>
            <Label>Week (1-14)</Label>
            <Input
              type="number"
              min="1"
              max="14"
              value={week}
              onChange={(e) => setWeek(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={() => createSessionMut.mutate()}
          disabled={!selectedModuleId || !selectedGroupId || !sessionDate || createSessionMut.isPending}
          className="w-full"
        >
          {createSessionMut.isPending ? 'Scheduling...' : 'Schedule Session'}
        </Button>
      </CardContent>
    </Card>
  );
}
