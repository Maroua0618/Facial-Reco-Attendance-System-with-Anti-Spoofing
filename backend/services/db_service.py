from typing import Optional, List, Dict
from datetime import datetime, timezone
from config import supabase


def knn_search(vec: List[float], group_id: str, k: int = 1) -> List[Dict]:
    res = supabase().rpc("match_student_embedding", {"q": vec, "g": group_id, "k": k}).execute()
    return res.data or []


def write_attendance(session_id: str, student_id: Optional[str], status: str, confidence: float) -> None:
    supabase().table("attendance").insert({
        "session_id": session_id,
        "student_id": student_id,
        "status": status,
        "confidence": confidence,
        "recognized_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
