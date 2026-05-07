import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Search, Users, ChevronDown, ChevronUp, GraduationCap } from 'lucide-react';
import { api } from '@/lib/mock-data';
import { supabase } from '@/integrations/supabase/client';
import type { Teacher } from '@/types/db';

function parseYear(moduleCode: string, academicYear?: string, fallbackYear?: number): number {
  const codeYear = moduleCode.match(/Y(\d+)/i)?.[1];
  if (codeYear) return Number(codeYear);

  const numericYear = String(academicYear ?? '').match(/^\d+$/)?.[0];
  if (numericYear) return Number(numericYear);

  return fallbackYear ?? 1;
}

function parseCurriculumSemester(moduleCode: string, year: number, semester?: string | number): number {
  const codeSemester = moduleCode.match(/S(\d+)/i)?.[1];
  if (codeSemester) return Number(codeSemester);

  const localSemester = Number(semester) || 1;
  return (year - 1) * 2 + localSemester;
}

export default function ModulesList() {
  const [q, setQ] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All years');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const { data: modules = [] } = useQuery({ queryKey: ['modules'], queryFn: api.getModules });
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: api.getGroups });
  const { data: teachers = [] } = useQuery({ queryKey: ['teachers'], queryFn: api.getAllTeachers });

  const { data: moduleGroups = [] } = useQuery({
    queryKey: ['module_groups'],
    queryFn: async () => {
      const { data } = await supabase.from('module_groups').select('*');
      return data ?? [];
    },
  });

  const parsedModules = useMemo(() => {
    return modules.map((m) => {
      const mGroups = moduleGroups.filter((mg) => mg.module_id === m.id);
      const linkedGroups = groups.filter((g) => mGroups.some((mg) => mg.group_id === g.id));
      const fallbackYear = linkedGroups.length > 0 ? Math.max(...linkedGroups.map((g) => g.year)) : undefined;
      const year = parseYear(m.module_code, m.academic_year, fallbackYear);
      const curriculumSemester = parseCurriculumSemester(m.module_code, year, m.semester);

      // Teaching team
      const teacherIds = Array.from(new Set(mGroups.map((mg) => mg.assigned_teacher_id).filter(Boolean)));
      const teachingTeam = teacherIds.map((id) => teachers.find((t) => t.id === id)).filter(Boolean) as Teacher[];

      return {
        ...m,
        year,
        curriculumSemester,
        groupCount: mGroups.length,
        teachingTeam,
      };
    });
  }, [modules, moduleGroups, groups, teachers]);

  const filtered = useMemo(() => {
    return parsedModules.filter((m) => {
      const matchesQ =
        m.module_code.toLowerCase().includes(q.toLowerCase()) ||
        m.module_name.toLowerCase().includes(q.toLowerCase()) ||
        m.teachingTeam.some((t) => t.full_name.toLowerCase().includes(q.toLowerCase()));

      let matchesFilter = true;
      if (selectedFilter.startsWith('Y')) {
        matchesFilter = m.year === Number(selectedFilter.replace('Y', ''));
      } else if (selectedFilter.startsWith('S')) {
        matchesFilter = m.curriculumSemester === Number(selectedFilter.replace('S', ''));
      }

      return matchesQ && matchesFilter;
    });
  }, [parsedModules, q, selectedFilter]);

  const groupedByYear = useMemo(() => {
    const res: Record<number, typeof filtered> = {};
    for (const m of filtered) {
      if (!res[m.year]) res[m.year] = [];
      res[m.year].push(m);
    }
    return res;
  }, [filtered]);

  const yearLabels: Record<number, string> = { 1: '1ST', 2: '2ND', 3: '3RD', 4: '4TH', 5: '5TH' };
  const availableYears = [1, 2, 3, 4, 5].filter((year) => groupedByYear[year]?.length);
  const availableSemesters = Array.from(new Set(parsedModules.map((m) => m.curriculumSemester)))
    .sort((a, b) => a - b);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-[1200px] mx-auto pb-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Curriculum</h1>
          <p className="text-muted-foreground text-sm">
            All {modules.length} ENSIA modules across 4 years
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-full max-w-[300px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or code..."
              className="pl-9 bg-card/50 border-border/50 h-10"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              'All years',
              ...availableYears.map((year) => `Y${year}`),
              ...availableSemesters.map((semester) => `S${semester}`),
            ].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedFilter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card/30 border border-border/30 text-muted-foreground hover:bg-card hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-10">
          {availableYears.map((year) => {
            const yearModules = groupedByYear[year];
            if (!yearModules || yearModules.length === 0) return null;

            return (
              <div key={year} className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap className="w-5 h-5" />
                  <h3 className="text-sm font-bold tracking-widest uppercase">
                    {yearLabels[year] || `${year}TH`} YEAR &mdash; {yearModules.length} modules
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {yearModules.map((m) => {
                    const isExpanded = expandedModule === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setExpandedModule(isExpanded ? null : m.id)}
                        className={`group relative flex flex-col rounded-xl border border-border/40 bg-card p-5 cursor-pointer hover:border-primary/50 transition-all duration-300 ${
                          isExpanded ? 'ring-1 ring-primary/30 shadow-lg shadow-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-muted text-muted-foreground">
                            {m.module_code}
                          </span>
                          <span className="text-[11px] font-bold text-muted-foreground">
                            Y{m.year} · S{m.curriculumSemester}
                          </span>
                        </div>

                        <h4 className="font-semibold text-lg leading-tight mb-4 group-hover:text-primary transition-colors">
                          {m.module_name}
                        </h4>

                        <div className="mt-auto flex items-center justify-between text-xs font-medium text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            <span>
                              {m.groupCount} group{m.groupCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 hover:text-foreground transition-colors">
                            {m.teachingTeam.length > 0 ? (
                              <>
                                {m.teachingTeam.length} Teacher{m.teachingTeam.length > 1 ? 's' : ''}
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </>
                            ) : (
                              'No lecturers'
                            )}
                          </div>
                        </div>

                        {/* Expandable Teaching Team Section */}
                        {isExpanded && m.teachingTeam.length > 0 && (
                          <div
                            className="mt-4 pt-4 border-t border-border/40 animate-in fade-in slide-in-from-top-2 duration-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                              Teaching Team
                            </h5>
                            <ul className="space-y-2">
                              {m.teachingTeam.map((t) => (
                                <li key={t.id} className="flex items-center gap-2 text-sm">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                    {t.full_name.charAt(0)}
                                  </div>
                                  <span className="font-medium text-foreground">{t.full_name}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
