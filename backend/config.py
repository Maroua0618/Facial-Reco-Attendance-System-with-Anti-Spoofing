import os
from functools import lru_cache
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
DB_SCHEMA = os.getenv("DB_SCHEMA", "nour_demo")
MOCK_AI = os.getenv("MOCK_AI", "true").lower() == "true"
FACE_THRESHOLD = float(os.getenv("FACE_THRESHOLD", "0.5"))
SPOOF_THRESHOLD = float(os.getenv("SPOOF_THRESHOLD", "0.5"))
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")]

@lru_cache(maxsize=1)
def supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
