import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Group, Module } from '@/types/db';

interface ScheduleSessionsTabProps {
  groups: Group[];
  modules: Module[];
}

export default function ScheduleSessionsTab({}: ScheduleSessionsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Schedule sessions for modules and groups. This feature is coming soon.
        </p>
      </CardContent>
    </Card>
  );
}
