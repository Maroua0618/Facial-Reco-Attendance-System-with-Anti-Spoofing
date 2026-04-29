from typing import Optional, Tuple, Dict
import os
import time
import logging
import numpy as np
from config import MOCK_AI, SPOOF_THRESHOLD

log = logging.getLogger("anti_spoofing")
log.setLevel(logging.INFO)

MODEL_PATH = os.getenv("SPOOF_MODEL_PATH", "ai/anti_spoofing/model.onnx")

_session = None
_load_err: Optional[str] = None
_tried_load = False

_prev_frames: Dict[str, Tuple[float, np.ndarray]] = {}
_PREV_FRAME_TTL = 30.0


def _ensure_loaded():
    global _session, _load_err, _tried_load
    if _tried_load or MOCK_AI:
        return
    _tried_load = True
    if not os.path.exists(MODEL_PATH):
        _load_err = f"no model at {MODEL_PATH} (using heuristic liveness)"
        log.info(_load_err)
        return
    try:
        import onnxruntime as ort
        _session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
        log.info("Loaded liveness ONNX model from %s", MODEL_PATH)
    except Exception as e:
        _load_err = repr(e)
        log.error("Liveness ONNX load failed: %s", _load_err)


def anti_spoofing_status():
    _ensure_loaded()
    return {
        "mock": MOCK_AI,
        "mode": "mock" if MOCK_AI else ("onnx" if _session is not None else "heuristic"),
        "loaded": _session is not None,
        "error": _load_err,
        "threshold": SPOOF_THRESHOLD,
    }


def _heuristic_breakdown(img, session_id: Optional[str] = None) -> Dict[str, float]:
    import cv2
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1) Sharpness window: real face ~80-300
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if lap_var < 80 or lap_var > 300:
        sharpness = 0.2
    else:
        sharpness = 1.0

    # 2) Saturation
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    sat = float(hsv[:, :, 1].mean()) / 255.0
    saturation_score = 1.0 if 0.12 <= sat <= 0.55 else 0.3

    # 3) Edge density: tightened. Clean below 0.10.
    edges = cv2.Canny(gray, 100, 200)
    edge_ratio = float(edges.mean()) / 255.0
    if edge_ratio < 0.10:
        edge_score = 1.0
    else:
        edge_score = max(0.0, 1.0 - (edge_ratio - 0.10) * 12.0)

    # 4) Reflection / hot spots
    bright_ratio = float((gray > 240).mean())
    reflection_score = 1.0 - min(1.0, bright_ratio * 12.0)

    # 5) Motion (per session). First-frame default lowered to 0.5 so a
    # cold start can't trivially pass.
    motion_score = 0.5
    if session_id:
        small = cv2.resize(gray, (64, 64))
        prev = _prev_frames.get(session_id)
        now = time.time()
        for k in list(_prev_frames.keys()):
            if now - _prev_frames[k][0] > _PREV_FRAME_TTL:
                del _prev_frames[k]
        if prev is not None:
            diff = float(np.abs(small.astype(np.int16) - prev[1].astype(np.int16)).mean()) / 255.0
            if diff > 0.012:
                motion_score = 1.0
            elif diff > 0.005:
                motion_score = 0.6
            else:
                motion_score = 0.05
        _prev_frames[session_id] = (now, small)

    return {
        "sharpness": sharpness,
        "saturation": saturation_score,
        "edge_density": edge_score,
        "reflection": reflection_score,
        "motion": motion_score,
        "_lap_var": lap_var,
        "_edge_ratio": edge_ratio,
        "_bright_ratio": bright_ratio,
    }


def _aggregate(b: Dict[str, float]) -> float:
    return float(
        0.15 * b["sharpness"] +
        0.10 * b["saturation"] +
        0.30 * b["edge_density"] +
        0.15 * b["reflection"] +
        0.30 * b["motion"]
    )


def is_live(img, session_id: Optional[str] = None) -> Tuple[bool, float, Dict[str, float]]:
    if MOCK_AI:
        seed = int(np.asarray(img).sum()) & 0xFFFFFFFF
        rng = np.random.default_rng(seed)
        s = float(rng.uniform(0.85, 0.99))
        return True, s, {"mock": s}
    _ensure_loaded()
    if _session is not None:
        import cv2
        x = cv2.resize(img, (128, 128)).astype(np.float32) / 255.0
        x = np.transpose(x, (2, 0, 1))[None]
        out = _session.run(None, {_session.get_inputs()[0].name: x})[0].flatten()
        score = float(out[1] if out.size >= 2 else out[0])
        return score >= SPOOF_THRESHOLD, score, {"onnx": score}
    b = _heuristic_breakdown(img, session_id=session_id)
    score = _aggregate(b)
    return score >= SPOOF_THRESHOLD, score, b
