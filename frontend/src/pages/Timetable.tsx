import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Calendar } from 'lucide-react';
import { api } from '@/lib/mock-data';
import type { Session, Module, Group } from '@/types/db';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const TIME_SLOTS = [
  '08:00', '09:40', '11:20', '13:00', '14:40', '16:20'
];

export default function Timetable() {
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: api.getGroups });
  const { data: modules = [] } = useQuery({ queryKey: ['modules'], queryFn: api.getModules });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: api.getSessions });

  // Filter only Year 3 groups for now as requested
  const year3Groups = useMemo(() => {
    return groups.filter(g => g.year === 3).sort((a, b) => a.group_name.localeCompare(b.group_name));
  }, [groups]);

  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Set default active group once loaded
  useMemo(() => {
    if (year3Groups.length > 0 && !activeGroup) {
      setActiveGroup(year3Groups[0].id);
    }
  }, [year3Groups, activeGroup]);

  // Build timetable grid for active group
  const grid = useMemo(() => {
    if (!activeGroup) return {};
    const groupSessions = sessions.filter(s => s.group_id === activeGroup);
    
    const result: Record<string, Record<string, { session: Session, module: Module }>> = {};
    DAYS.forEach(d => result[d] = {});

    groupSessions.forEach(s => {
      const dateObj = new Date(s.session_date);
      // getDay: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday
      const dayIndex = dateObj.getDay();
      if (dayIndex >= 0 && dayIndex <= 4) {
        const dayName = DAYS[dayIndex];
        const module = modules.find(m => m.id === s.module_id);
        if (module) {
          result[dayName][s.start_time] = { session: s, module };
        }
      }
    });
    return result;
  }, [activeGroup, sessions, modules]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Global Timetable</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View the master schedule for all Third Year groups.
          </p>
        </div>

        <Card className="border-t-4 border-t-primary shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calendar className="w-5 h-5 text-primary" />
              Third Year Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {year3Groups.length > 0 && activeGroup ? (
              <Tabs value={activeGroup} onValueChange={setActiveGroup} className="w-full">
                <ScrollArea className="w-full max-w-full pb-4">
                  <TabsList className="inline-flex w-max mb-2">
                    {year3Groups.map((g) => (
                      <TabsTrigger key={g.id} value={g.id} className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        {g.group_name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {year3Groups.map((g) => (
                  <TabsContent key={g.id} value={g.id} className="mt-4">
                    <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b border-border">
                              <th className="p-3 text-left font-medium text-muted-foreground w-28 border-r border-border">Day</th>
                              {TIME_SLOTS.map(time => (
                                <th key={time} className="p-3 text-center font-medium text-muted-foreground border-r border-border min-w-[140px]">
                                  {time}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {DAYS.map((day) => (
                              <tr key={day} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="p-3 font-semibold bg-muted/10 border-r border-border">
                                  {day}
                                </td>
                                {TIME_SLOTS.map(time => {
                                  const cell = grid[day]?.[time];
                                  return (
                                    <td key={time} className="p-2 border-r border-border last:border-0 h-24 align-top relative group">
                                      {cell ? (
                                        <div className="absolute inset-1 rounded-md bg-primary/10 border border-primary/20 p-2 flex flex-col justify-between shadow-sm hover:shadow-md hover:bg-primary/15 transition-all">
                                          <div>
                                            <div className="font-bold text-primary truncate" title={cell.module.module_name}>
                                              {cell.module.module_code}
                                            </div>
                                            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-tight">
                                              {cell.module.module_name}
                                            </div>
                                          </div>
                                          <div className="flex justify-between items-end mt-1">
                                            <Badge variant="outline" className="text-[10px] uppercase bg-background px-1.5 py-0">
                                              {cell.session.session_type}
                                            </Badge>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="w-full h-full text-center text-xs text-muted-foreground/30 flex items-center justify-center">
                                          -
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="text-center py-10 text-muted-foreground">Loading groups...</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
