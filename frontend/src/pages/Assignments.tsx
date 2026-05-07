import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload, Users, Calendar,
} from 'lucide-react';
import { api } from '@/lib/mock-data';
import ImportStudentsTab from '@/components/assignments/ImportStudentsTab';
import AssignTeachersTab from '@/components/assignments/AssignTeachersTab';
import ScheduleSessionsTab from '@/components/assignments/ScheduleSessionsTab';

export default function Assignments() {
  const [activeTab, setActiveTab] = useState('import-students');

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: api.getGroups,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: api.getAllTeachers,
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: api.getModules,
  });

  const tabs = [
    { id: 'import-students', label: 'Import Students', icon: Upload },
    { id: 'assign-teachers', label: 'Assign Teachers', icon: Users },
    { id: 'schedule-sessions', label: 'Schedule Sessions', icon: Calendar },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assign teachers to TD/TP groups and schedule sessions.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value="import-students" className="mt-6">
                <ImportStudentsTab groups={groups} />
              </TabsContent>

              <TabsContent value="assign-teachers" className="mt-6">
                <AssignTeachersTab groups={groups} teachers={teachers} modules={modules} />
              </TabsContent>

              <TabsContent value="schedule-sessions" className="mt-6">
                <ScheduleSessionsTab groups={groups} modules={modules} />
              </TabsContent>
            </Tabs>
          </CardHeader>
          <CardContent>
            {/* Tab content will be handled by individual components */}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
