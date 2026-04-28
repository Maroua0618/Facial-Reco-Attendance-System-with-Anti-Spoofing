from typing import Optional
import numpy as np
from config import MOCK_AI, FACE_THRESHOLD
from services.db_service import knn_search

_app = None
_load_err: Optional[str] = None


def _ensure_loaded():
    global _app, _load_err
    if _app is not None or MOCK_AI:
        return
    try:
        from insightface.app import FaceAnalysis
        a = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        a.prepare(ctx_id=0, det_size=(640, 640))
        _app = a
    except Exception as e:
        _load_err = repr(e)


def face_service_status():
    _ensure_loaded()
    return {"mock": MOCK_AI, "loaded": _app is not None, "error": _load_err}


def get_embedding(img) -> Optional[np.ndarray]:
    if MOCK_AI:
        seed = int(np.asarray(img).sum()) & 0xFFFFFFFF
        rng = np.random.default_rng(seed)
        v = rng.standard_normal(512).astype(np.float32)
        v /= (np.linalg.norm(v) + 1e-9)
        return v
    _ensure_loaded()
    if _app is None:
        return None
    faces = _app.get(img)
    if not faces:
        return None
    f = max(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))
    return f.normed_embedding.astype(np.float32)


def match_student(vec: np.ndarray, group_id: str):
    rows = knn_search(vec.tolist(), group_id, k=1)
    if not rows:
        return None
    row = rows[0]
    distance = float(row.get("distance", 1.0))
    confidence = max(0.0, 1.0 - distance)
    if confidence < FACE_THRESHOLD:
        return None
    return {"student_id": row["student_id"], "confidence": confidence}
