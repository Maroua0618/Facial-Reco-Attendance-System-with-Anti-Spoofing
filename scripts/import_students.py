#!/usr/bin/env python3
"""Import students from a CSV into the Supabase DB used by the backend.

CSV format expected: full_name,student_number,group_name

This script uses the existing `backend.config.supabase()` client. Ensure
`SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in the environment.

Usage:
  python scripts/import_students.py students.csv --year 3
  python scripts/import_students.py students.csv --year 3 --dry-run
"""
import csv
import argparse
import sys
from typing import Dict, Any
from backend.config import supabase, DB_SCHEMA


def client():
    return supabase().schema(DB_SCHEMA)


def find_or_create_group(sup, group_name: str, year: int) -> str:
    group_name = group_name.strip()
    res = sup.table('groups').select('id').eq('group_name', group_name).eq('year', year).execute()
    if res.error:
        raise RuntimeError(f"groups select error: {res.error.message}")
    if res.data and len(res.data) > 0:
        return res.data[0]['id']
    # create
    ins = sup.table('groups').insert({'group_name': group_name, 'year': year}).select('id').execute()
    if ins.error:
        raise RuntimeError(f"groups insert error: {ins.error.message}")
    return ins.data[0]['id']


def upsert_student(sup, student_number: str, full_name: str) -> Dict[str, Any]:
    payload = {'student_number': student_number.strip(), 'full_name': full_name.strip()}
    res = sup.table('students').upsert(payload, on_conflict='student_number').select('id').execute()
    if res.error:
        raise RuntimeError(f"students upsert error: {res.error.message}")
    return res.data[0]


def link_student_group(sup, student_id: str, group_id: str) -> None:
    payload = {'student_id': student_id, 'group_id': group_id}
    res = sup.table('student_groups').upsert(payload, on_conflict='student_id,group_id').execute()
    if res.error:
        raise RuntimeError(f"student_groups upsert error: {res.error.message}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument('csv', help='CSV file path')
    p.add_argument('--year', type=int, default=3, help='Academic year (int)')
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
            full_name = (row.get('full_name') or row.get('name') or '').strip()
            student_number = (row.get('student_number') or row.get('matricule') or '').strip()
            group_name = (row.get('group_name') or row.get('group') or '').strip()
            if not (full_name and student_number and group_name):
                errors.append(f"Missing fields: {row}")
                skipped += 1
                continue

            try:
                if args.dry_run:
                    print(f"Would ensure group '{group_name}' (year {args.year})")
                    print(f"Would upsert student {student_number} – {full_name}")
                    print(f"Would link student -> group")
                    ok += 1
                    continue

                gid = find_or_create_group(sup, group_name, args.year)
                stu = upsert_student(sup, student_number, full_name)
                sid = stu['id']
                link_student_group(sup, sid, gid)
                ok += 1
            except Exception as e:
                errors.append(f"{full_name}: {e}")
                skipped += 1

    print(f"Imported: {ok}, Skipped: {skipped}")
    if errors:
        print('Errors:')
        for e in errors[:50]:
            print('-', e)


if __name__ == '__main__':
    main()
