import numpy as np
import cv2
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services.face_service import get_embedding, match_student
from services.anti_spoofing import is_live
from services.db_service import write_attendance

router = APIRouter()

@router.post("/recognize")
async def recognize_endpoint(
    image: UploadFile = File(...),
    session_id: str = Form(...),
    group_id: str = Form(...),
):
    raw = await image.read()
    arr = np.frombuffer(raw, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Invalid image")

    live, live_conf = is_live(img)
    vec = get_embedding(img)
    if vec is None:
        return {"ok": False, "reason": "no_face", "is_live": live, "live_conf": live_conf}

    if not live:
        try:
            write_attendance(session_id=session_id, student_id=None, status="spoof", confidence=float(live_conf))
        except Exception:
            pass
        return {"ok": False, "reason": "spoof", "is_live": False, "live_conf": live_conf}

    try:
        match = match_student(vec, group_id=group_id)
    except Exception:
        match = None
    if not match:
        return {"ok": False, "reason": "unknown", "is_live": True, "live_conf": live_conf}

    try:
        write_attendance(session_id=session_id, student_id=match["student_id"], status="present", confidence=match["confidence"])
    except Exception:
        pass
    return {"ok": True, "student_id": match["student_id"], "confidence": match["confidence"], "is_live": True, "live_conf": live_conf}
