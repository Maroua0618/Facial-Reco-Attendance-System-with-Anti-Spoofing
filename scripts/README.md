Scripts for bulk imports (students, teachers, timetable)

- `import_students.py` — import students CSV (columns: full_name,student_number,group_name)
- `import_teachers.py` — import teachers/modules/module_groups from a timetable CSV

Both scripts use `backend.config.supabase()` and require `SUPABASE_URL` and
`SUPABASE_SERVICE_KEY` environment variables. Use `--dry-run` to preview actions.

Example:
```
python scripts/import_students.py data/year3_students.csv --year 3 --dry-run
python scripts/import_teachers.py data/timetable_y3.csv --year 3
```
