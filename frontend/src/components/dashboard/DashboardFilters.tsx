import type { Group, Module } from '@/types/db';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface Props {
  modules: Module[];
  groups: Group[];
  moduleId: string | undefined;
  groupId: string | undefined;
  onModuleChange: (id: string | undefined) => void;
  onGroupChange: (id: string | undefined) => void;
}

const ALL = '__all__';

export function DashboardFilters({
  modules,
  groups,
  moduleId,
  groupId,
  onModuleChange,
  onGroupChange,
}: Props) {
  const modulesWithAll = [{ id: ALL, module_name: 'All modules', module_code: '', lecturer_id: null, academic_year: '', created_at: '' }, ...modules];
  const groupsWithAll = [{ id: ALL, group_name: 'All groups', year: 0, created_at: '' }, ...groups];

  return (
    <div className="flex flex-wrap gap-3">
      <SearchableSelect
        items={modulesWithAll}
        value={moduleId ?? ALL}
        onChange={(v) => onModuleChange(v === ALL ? undefined : v)}
        placeholder="All modules"
        renderLabel={(m) => `${m.module_code} — ${m.module_name}`}
        className="w-[220px]"
      />
      <SearchableSelect
        items={groupsWithAll}
        value={groupId ?? ALL}
        onChange={(v) => onGroupChange(v === ALL ? undefined : v)}
        placeholder="All groups"
        renderLabel={(g) => `${g.group_name} (Year ${g.year})`}
        className="w-[180px]"
      />
    </div>
  );
}
