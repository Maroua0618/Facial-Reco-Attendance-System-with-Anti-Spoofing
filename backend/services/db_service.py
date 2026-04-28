from typing import Optional, List, Dict
from datetime import datetime, timezone
from config import supabase, DB_SCHEMA


def _client():
    return supabase().schema(DB_SCHEMA)


def knn_search(vec: List[float], group_id: str, k: int = 1) -> List[Dict]:
    res = _client().rpc("match_student_embedding", {"q": vec, "g": group_id, "k": k}).execute()
    return res.data or []


def write_attendance(session_id: str, student_id: Optional[str], status: str, confidence: float) -> None:
    _client().table("attendance").insert({
        "session_id": session_id,
        "student_id": student_id,
        "status": status,
        "confidence": confidence,
        "marked_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
