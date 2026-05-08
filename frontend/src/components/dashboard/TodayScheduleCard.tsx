import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { SessionRow } from '@/types/db';

export function TodayScheduleCard({
  rows, liveSessionId,
}: { rows: SessionRow[]; liveSessionId?: string }) {
  const [showAll, setShowAll] = useState(false);
  const limit = 3;
  
  const displayedRows = showAll ? rows : rows.slice(0, limit);
  const hasMore = rows.length > limit;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Today's schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">No sessions today</div>
        ) : (
          <div className="flex flex-col h-full justify-between">
            <div className="space-y-2">
              {displayedRows.map(({ session, module, group }) => {
                const live = session.id === liveSessionId;
                return (
                  <Link
                    key={session.id}
                    to={`/sessions/${session.id}`}
                    className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-sm tabular-nums">
                        {session.start_time}–{session.end_time}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{module.module_code} · {group.group_name}</div>
                        <div className="text-xs text-muted-foreground">{module.module_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase">{session.session_type}</Badge>
                      {live && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          LIVE
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
            
            {hasMore && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-4 text-muted-foreground"
                asChild
              >
                <Link to="/timetable">
                  See {rows.length - limit} more in full timetable
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
