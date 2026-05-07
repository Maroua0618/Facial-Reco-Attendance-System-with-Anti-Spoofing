import random
from datetime import datetime, timedelta
import uuid
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"
supabase: Client = create_client(url, key)

print("Fetching data...")
groups = supabase.table("groups").select("*").eq("year", 3).execute().data
teachers = supabase.table("teachers").select("*").execute().data
modules = supabase.table("modules").select("*").execute().data
student_groups = supabase.table("student_groups").select("*").execute().data

# filter students in year 3 groups
y3_group_ids = [g['id'] for g in groups]
y3_student_ids = list(set([sg['student_id'] for sg in student_groups if sg['group_id'] in y3_group_ids]))
print(f"Found {len(y3_group_ids)} Year 3 groups and {len(y3_student_ids)} Year 3 students.")

# Use first 3 modules
selected_modules = modules[:3]

# Create some module_groups links if not exist
existing_mg = supabase.table("module_groups").select("*").execute().data
mg_pairs = {(mg['module_id'], mg['group_id']) for mg in existing_mg}

for m in selected_modules:
    for g_id in y3_group_ids[:3]: # limit to first 3 groups to not spam too much
        if (m['id'], g_id) not in mg_pairs:
            teacher = random.choice(teachers)
            supabase.table("module_groups").insert({
                "module_id": m['id'],
                "group_id": g_id,
                "assigned_teacher_id": teacher['id']
            }).execute()

# Create sessions
# Let's create sessions for the last 2 weeks
today = datetime.now()
session_types = ['td', 'tp']
times = ['08:00', '09:30', '11:00', '13:00', '14:30']

new_sessions = []
for i in range(14): # past 14 days
    date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
    # skip weekends
    if (today - timedelta(days=i)).weekday() >= 5: continue
    
    for g_id in y3_group_ids[:3]:
        for t_idx, time in enumerate(times[:2]): # pick 2 distinct times
            m = selected_modules[t_idx % len(selected_modules)]
            s_type = random.choice(session_types)
            
            session = {
                "module_id": m['id'],
                "group_id": g_id,
                "session_date": date,
                "start_time": time,
                "session_type": s_type,
                "week": 1 if i > 7 else 2
            }
            try:
                res = supabase.table("sessions").insert(session).execute()
                new_sessions.extend(res.data)
            except Exception as e:
                pass # ignore duplicates

print(f"Created {len(new_sessions)} sessions.")

# Create attendance for these sessions
new_attendance = []
statuses = ['present', 'absent', 'spoof']
weights = [0.8, 0.15, 0.05]

for sess in new_sessions:
    # get students in this session's group
    sess_students = [sg['student_id'] for sg in student_groups if sg['group_id'] == sess['group_id']]
    
    for s_id in sess_students:
        status = random.choices(statuses, weights)[0]
        att = {
            "session_id": sess['id'],
            "student_id": s_id,
            "status": status,
            "confidence": round(random.uniform(0.7, 0.99), 2) if status in ['present', 'spoof'] else None,
            "marked_at": datetime.now().isoformat()
        }
        new_attendance.append(att)

# insert attendance in chunks
chunk_size = 500
try:
    for i in range(0, len(new_attendance), chunk_size):
        supabase.table("attendance").insert(new_attendance[i:i+chunk_size]).execute()
    print(f"Inserted {len(new_attendance)} attendance records.")
except Exception as e:
    print(f"Error inserting attendance: {e}")

print("Done seeding Year 3 data!")
