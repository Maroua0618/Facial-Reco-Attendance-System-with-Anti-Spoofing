import logging
import numpy as np
import cv2
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services.face_service import get_embedding, match_student
from services.anti_spoofing import is_live
from services.db_service import upsert_attendance, write_spoof

router = APIRouter()
log = logging.getLogger("recognize")
log.setLevel(logging.INFO)


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
    now = datetime.now(timezone.utc).isoformat()

    if vec is None:
        return {"ok": False, "reason": "no_face", "is_live": live, "live_conf": live_conf}

    if not live:
        try:
            write_spoof(session_id=session_id, confidence=float(live_conf), at=now)
        except Exception as e:
            log.error("write_spoof failed: %s", e)
        return {"ok": False, "reason": "spoof", "is_live": False, "live_conf": live_conf}

    try:
        match = match_student(vec, group_id=group_id)
    except Exception as e:
        log.error("match_student failed: %s", e)
        match = None
    if not match:
        return {"ok": False, "reason": "unknown", "is_live": True, "live_conf": live_conf}

    try:
        upsert_attendance(
            session_id=session_id,
            student_id=match["student_id"],
            status="present",
            confidence=match["confidence"],
            at=now,
        )
    except Exception as e:
        log.error("upsert_attendance failed: %s", e)
    return {
        "ok": True,
        "student_id": match["student_id"],
        "confidence": match["confidence"],
        "is_live": True,
        "live_conf": live_conf,
    }
