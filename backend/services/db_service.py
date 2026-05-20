from typing import Optional, List, Dict
from datetime import datetime, timezone
from config import supabase, DB_SCHEMA


def _client():
    return supabase().schema(DB_SCHEMA)


def _vec_str(v: List[float]) -> str:
    """pgvector accepts string literals like '[1.2, 3.4, ...]' reliably.
    Sending raw arrays sometimes fails the cast over PostgREST.
    """
    return "[" + ",".join(format(x, ".6g") for x in v) + "]"


def knn_search(vec: List[float], group_id: str, k: int = 1) -> List[Dict]:
    res = _client().rpc(
        "match_student_embedding",
        {"q": _vec_str(vec), "g": group_id, "k": k},
    ).execute()
    return res.data or []


def upsert_attendance(
    session_id: str,
    student_id: str,
    status: str,
    confidence: Optional[float],
    at: Optional[str] = None,
) -> None:
    """Insert or update the (session_id, student_id) attendance row.
    Idempotent: re-recognizing the same student in the same session
    just refreshes the confidence + updated_at instead of duplicating.
    """
    payload = {
        "session_id": session_id,
        "student_id": student_id,
        "status": status,
        "confidence": confidence,
        "updated_at": at or datetime.now(timezone.utc).isoformat(),
    }
    _client().table("attendance").upsert(
        payload, on_conflict="session_id,student_id"
    ).execute()


def write_spoof(session_id: str, confidence: float, at: Optional[str] = None) -> None:
    """Spoof rows have no student_id (we couldn't identify whose face it was).
    Insert with student_id = NULL doesn't violate the unique key because
    NULLs are distinct in Postgres uniqueness.
    """
    _client().table("attendance").insert({
        "session_id": session_id,
        "student_id": None,
        "status": "spoof",
        "confidence": confidence,
        "marked_at": at or datetime.now(timezone.utc).isoformat(),
    }).execute()


# Back-compat: a previous version of recognize.py imported write_attendance.
def write_attendance(
    session_id: str,
    student_id: Optional[str],
    status: str,
    confidence: Optional[float],
) -> None:
    if status == "spoof" or student_id is None:
        write_spoof(session_id=session_id, confidence=confidence or 0.0)
    else:
        upsert_attendance(
            session_id=session_id,
            student_id=student_id,
            status=status,
            confidence=confidence,
        )
