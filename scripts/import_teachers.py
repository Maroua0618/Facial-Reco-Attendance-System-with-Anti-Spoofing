#!/usr/bin/env python3
"""Import teachers, modules and module_groups from a CSV/timetable.

Expected minimal CSV columns: full_name,email,module_name,group_name
Optional session fields (session_date,start_time,session_type,week) are ignored by default.

This script will:
 - upsert teachers (by email if present, otherwise by full_name)
 - ensure modules exist (create if missing)
 - ensure groups exist (create if missing)
 - upsert module_groups linking module <-> group and assign `assigned_teacher_id`

Usage:
  python scripts/import_teachers.py timetable.csv --year 3
  python scripts/import_teachers.py timetable.csv --year 3 --dry-run
"""
import csv
import argparse
import sys
import uuid
from backend.config import supabase, DB_SCHEMA


def client():
    return supabase().schema(DB_SCHEMA)


def ensure_group(sup, group_name: str, year: int) -> str:
    group_name = group_name.strip()
    res = sup.table('groups').select('id').eq('group_name', group_name).eq('year', year).execute()
    if res.error:
        raise RuntimeError(f"groups select error: {res.error.message}")
    if res.data and len(res.data) > 0:
        return res.data[0]['id']
    ins = sup.table('groups').insert({'group_name': group_name, 'year': year}).select('id').execute()
    if ins.error:
        raise RuntimeError(f"groups insert error: {ins.error.message}")
    return ins.data[0]['id']


def ensure_module(sup, module_name: str, academic_year: str, lecturer_id: str) -> str:
    res = sup.table('modules').select('id').eq('name', module_name).eq('academic_year', academic_year).execute()
    if res.error:
        raise RuntimeError(f"modules select error: {res.error.message}")
    if res.data and len(res.data) > 0:
        return res.data[0]['id']
    ins = sup.table('modules').insert({'name': module_name, 'academic_year': academic_year, 'lecturer_id': lecturer_id}).select('id').execute()
    if ins.error:
        raise RuntimeError(f"modules insert error: {ins.error.message}")
    return ins.data[0]['id']


def upsert_teacher(sup, full_name: str, email: str = None) -> str:
    payload = {'full_name': full_name.strip()}
    if email:
        payload['email'] = email.strip()
        res = sup.table('teachers').upsert(payload, on_conflict='email').select('id').execute()
    else:
        # best-effort: upsert by full_name
        res = sup.table('teachers').upsert(payload, on_conflict='full_name').select('id').execute()
    if res.error:
        raise RuntimeError(f"teachers upsert error: {res.error.message}")
    return res.data[0]['id']


def upsert_module_group(sup, module_id: str, group_id: str, teacher_id: str):
    payload = {'module_id': module_id, 'group_id': group_id, 'assigned_teacher_id': teacher_id}
    res = sup.table('module_groups').upsert(payload, on_conflict='module_id,group_id').execute()
    if res.error:
        raise RuntimeError(f"module_groups upsert error: {res.error.message}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument('csv', help='CSV file path')
    p.add_argument('--year', type=int, default=3, help='Group year (int)')
    p.add_argument('--academic-year', default='2025-2026')
    p.add_argument('--dry-run', action='store_true')
    args = p.parse_args()

    if args.dry_run:
        print('DRY RUN — no changes will be made')

    try:
        sup = client()
    except Exception as e:
        print('Failed to create Supabase client — set SUPABASE_URL and SUPABASE_SERVICE_KEY', file=sys.stderr)
        raise

    ok = 0
    skipped = 0
    errors = []

    with open(args.csv, newline='', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            full_name = (row.get('full_name') or row.get('teacher') or '').strip()
            email = (row.get('email') or row.get('teacher_email') or '').strip()
            module_name = (row.get('module_name') or row.get('module') or '').strip()
            group_name = (row.get('group_name') or row.get('group') or '').strip()
            if not (full_name and module_name):
                errors.append(f"Missing full_name or module_name: {row}")
                skipped += 1
                continue

            try:
                if args.dry_run:
                    print(f"Would upsert teacher {full_name} ({email})")
                    print(f"Would ensure module '{module_name}'")
                    if group_name:
                        print(f"  and link to group '{group_name}'")
                    ok += 1
                    continue

                tid = upsert_teacher(sup, full_name, email or None)
                mid = ensure_module(sup, module_name, args.academic_year, tid)
                if group_name:
                    gid = ensure_group(sup, group_name, args.year)
                    upsert_module_group(sup, mid, gid, tid)
                ok += 1
            except Exception as e:
                errors.append(f"{full_name}: {e}")
                skipped += 1

    print(f"Processed: {ok}, Skipped: {skipped}")
    if errors:
        print('Errors:')
        for e in errors[:50]:
            print('-', e)


if __name__ == '__main__':
    main()
