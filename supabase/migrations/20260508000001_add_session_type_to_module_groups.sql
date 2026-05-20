begin;

-- Repair live databases where module_groups was created without the
-- module/group uniqueness required by frontend upserts.
--
-- Keep one row per module/group and prefer the latest row that already has an
-- assigned teacher when duplicates exist.
with ranked_module_groups as (
  select
    ctid,
    row_number() over (
      partition by module_id, group_id
      order by (assigned_teacher_id is not null) desc, ctid desc
    ) as rn
  from public.module_groups
)
delete from public.module_groups mg
using ranked_module_groups r
where mg.ctid = r.ctid
  and r.rn > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.module_groups'::regclass
      and conname = 'module_groups_module_id_group_id_key'
  ) then
    alter table public.module_groups
      add constraint module_groups_module_id_group_id_key unique (module_id, group_id);
  end if;
end $$;

commit;
