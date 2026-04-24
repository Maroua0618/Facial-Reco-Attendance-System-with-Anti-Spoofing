import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Group, Module } from '@/types/db';

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
  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={moduleId ?? ALL}
        onValueChange={(v) => onModuleChange(v === ALL ? undefined : v)}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="All modules" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All modules</SelectItem>
          {modules.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.module_code} — {m.module_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={groupId ?? ALL}
        onValueChange={(v) => onGroupChange(v === ALL ? undefined : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All groups" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All groups</SelectItem>
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.group_name} (Year {g.year})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
