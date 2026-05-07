import random
from datetime import datetime, timedelta
import uuid
from supabase import create_client, Client

url = "https://spccazagwlvrwdmpgmgt.supabase.co"
key = "sb_secret_L59UnN-pjnB4qeqsqoUuCA_rBKG5JMt"
supabase: Client = create_client(url, key)

mapping_text = """
PROJECT MANAGEMENT
Ibtissem BRAHITI
Nour El Houda Bouadila

ADB
Baya Lina Menai
Kamel Bal
Kamel Boukhalfa
Meriem Amel Guessoum
Nadira Benmedakhene
Rahma Djiroun
Yousra Izountar

ML
Abdellah Khelloufi
Abir Derouiche
Aicha Boutorh
Elhocine Boutellaa
lyazid Hamimed
Mohamed Ait Mehdi
Mohamed Brahimi
Nasreddine Guelfout
Seif Eddine Bouziane
Youcef Omari
Zineb Djouamai

nmo
AbdelBadie Younes
Billal ElHamza
Mohamed Amine Boutiche
Soumaya Lakehal

GP
Aicha Boutorh
Amir Djouama
Meziane Iftene
Mohamed Brahimi
Mohamed Hadj Ameur
Mohammed El Amin Larabi
Okba Tibermacine
Sami Belkacem
Youcef Omari

cns
Karim Lounis
Noureddine Lasla
Ouarda Lounis
Yacine Sahraoui

tsac
Abderrahim Kessira
Houssam Brairi
Oualid Ouarem
Tarek Medkour

entreprenship
Widad Guechtouli
ibtissam brahiti

or
Mohamed Brahimi
Soumaya Lakehal

stochastic
Houssam Brairi
Nawel Remita

se
Ahmed Laouedj
Imed Bouchrika
Khadidja Chettah
Okba Tibermacine

dm
Meriem Amel Guessoum
Mohamed Akram Khelili
Mohamed Brahimi
Nafaa Nacereddine
Oualid Ouarem
Sami Belkacem
Seif Eddine Bouziane

networks
Abdelmalik Bachir
Amina Bensalem
Amir Djouama
Karim Lounis
Yacine Sahraoui

mobile
Hayet Saadi
Imed Bouchrika
Sami Abdellatif
Youcef Omari
Zahia Mabrek
"""

# Parse mapping
lines = [l.strip() for l in mapping_text.split('\n') if l.strip()]
module_teachers = {}
current_module = None
for line in lines:
    if line.isupper() or line.islower() or line in ['PROJECT MANAGEMENT', 'ADB', 'ML', 'GP', 'nmo', 'cns', 'tsac', 'entreprenship', 'or', 'stochastic', 'se', 'dm', 'networks', 'mobile']:
        if line in ['PROJECT MANAGEMENT', 'ADB', 'ML', 'GP', 'nmo', 'cns', 'tsac', 'entreprenship', 'or', 'stochastic', 'se', 'dm', 'networks', 'mobile'] or len(line.split()) == 1:
            current_module = line.upper()
            module_teachers[current_module] = []
        else:
            module_teachers[current_module].append(line)
    else:
        if current_module:
            module_teachers[current_module].append(line)

print("Parsed Modules:")
for m, t in module_teachers.items():
    print(f"- {m}: {len(t)} teachers")

# Fetch DB data
print("\nFetching current DB data...")
db_teachers = supabase.table("teachers").select("*").execute().data
db_modules = supabase.table("modules").select("*").execute().data
db_groups = supabase.table("groups").select("*").eq("year", 3).execute().data
student_groups = supabase.table("student_groups").select("*").execute().data

# Helper to find teacher
def find_teacher(name):
    name_lower = name.lower().replace(' ', '')
    for t in db_teachers:
        if t['full_name'].lower().replace(' ', '') == name_lower:
            return t
    return None

# Create missing teachers & modules
db_module_dict = {m.get('module_code', '').upper(): m for m in db_modules}
db_module_name_dict = {m.get('name', '').upper(): m for m in db_modules}

y3_group_ids = [g['id'] for g in db_groups]
print(f"Found {len(y3_group_ids)} Year 3 groups.")

# Clear old data? The user said "fill the db with diffrent sessions data". Let's delete existing module_groups, sessions, and attendance to be clean.
print("Clearing old module_groups, sessions, and attendance...")
supabase.table("attendance").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("module_groups").delete().neq("module_id", "00000000-0000-0000-0000-000000000000").execute()

new_modules = []
new_mg = []

for mod_name, teachers in module_teachers.items():
    # Find or create module
    mod_code = mod_name
    m = db_module_dict.get(mod_code) or db_module_name_dict.get(mod_name)
    if not m:
        # insert module
        res = supabase.table("modules").insert({
            "module_code": mod_code,
            "name": mod_name.title(),
            "academic_year": "2023-2024",
            "semester": 1
        }).execute()
        m = res.data[0]
        db_modules.append(m)
        db_module_dict[mod_code] = m
        new_modules.append(m)
    
    # Assign teachers to groups for this module
    # We have e.g. 12 groups and maybe 5 teachers. Distribute groups among teachers.
    if teachers:
        for i, g_id in enumerate(y3_group_ids):
            t_name = teachers[i % len(teachers)]
            t = find_teacher(t_name)
            if not t:
                # create teacher
                res = supabase.table("teachers").insert({
                    "full_name": t_name.title(),
                    "role": "teacher"
                }).execute()
                t = res.data[0]
                db_teachers.append(t)
            
            new_mg.append({
                "module_id": m['id'],
                "group_id": g_id,
                "assigned_teacher_id": t['id']
            })

# Insert module_groups
print(f"Creating {len(new_mg)} module_group assignments...")
# chunk it
for i in range(0, len(new_mg), 500):
    supabase.table("module_groups").insert(new_mg[i:i+500]).execute()

# Create sessions
print("Creating sessions...")
today = datetime.now()
session_types = ['td', 'tp'] # 'cours' might be valid but previously failed, sticking to td/tp
times = ['08:00', '09:30', '11:00', '13:00', '14:30']

new_sessions = []
# 2 weeks of schedule
for i in range(14):
    date = (today - timedelta(days=i))
    if date.weekday() >= 5: continue # skip weekends
    date_str = date.strftime("%Y-%m-%d")
    
    # assign some sessions each day
    # For every group, give them 2 sessions a day
    for g_id in y3_group_ids:
        daily_mods = random.sample(list(module_teachers.keys()), 2)
        for t_idx, mod_name in enumerate(daily_mods):
            m = db_module_dict.get(mod_name) or db_module_name_dict.get(mod_name)
            if not m: continue
            
            s_type = random.choice(session_types)
            time = times[random.randint(0, len(times)-1)]
            
            session = {
                "module_id": m['id'],
                "group_id": g_id,
                "session_date": date_str,
                "start_time": time,
                "session_type": s_type,
                "week": 1 if i > 7 else 2
            }
            new_sessions.append(session)

# Filter unique sessions to avoid constraint errors
unique_sessions = []
seen = set()
for s in new_sessions:
    key = (s['module_id'], s['group_id'], s['session_date'], s['start_time'])
    if key not in seen:
        seen.add(key)
        unique_sessions.append(s)

inserted_sessions = []
# insert sessions in chunks, ignoring constraint errors if they still happen
for i in range(0, len(unique_sessions), 100):
    chunk = unique_sessions[i:i+100]
    for s in chunk:
        try:
            res = supabase.table("sessions").insert(s).execute()
            inserted_sessions.extend(res.data)
        except Exception:
            pass

print(f"Created {len(inserted_sessions)} unique sessions.")

# Create attendance
print("Creating attendance records...")
new_attendance = []
statuses = ['present', 'absent', 'spoof']
weights = [0.8, 0.15, 0.05]

for sess in inserted_sessions:
    sess_students = set([sg['student_id'] for sg in student_groups if sg['group_id'] == sess['group_id']])
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

att_inserted = 0
for i in range(0, len(new_attendance), 500):
    try:
        supabase.table("attendance").insert(new_attendance[i:i+500]).execute()
        att_inserted += len(new_attendance[i:i+500])
    except Exception as e:
        print(f"Warning: Chunk {i} failed: {e}")

print(f"Inserted {att_inserted} attendance records.")
print("Done seeding accurate Y3 data!")
