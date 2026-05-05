from typing import Optional, Tuple, Dict
import os
import time
import logging
import numpy as np
from config import MOCK_AI, SPOOF_THRESHOLD

log = logging.getLogger("anti_spoofing")
log.setLevel(logging.INFO)

_REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
_DEFAULT_MODEL = os.path.join(_REPO_ROOT, "ai", "anti_spoofing", "model.onnx")
MODEL_PATH = os.getenv("SPOOF_MODEL_PATH", _DEFAULT_MODEL)

_session = None
_load_err: Optional[str] = None
_tried_load = False

_prev_frames: Dict[str, Tuple[float, np.ndarray]] = {}
_PREV_FRAME_TTL = 30.0

_face_cascade = None


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


def _get_face_crop(img):
    global _face_cascade
    import cv2

    if _face_cascade is None:
        xml = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        _face_cascade = cv2.CascadeClassifier(xml)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # minNeighbors=3 is more sensitive than 5 — avoids falling back to full frame
    faces = _face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(60, 60))
    if not len(faces):
        return img

    x, y, w, h = max(faces.tolist(), key=lambda r: r[2] * r[3])
    pad = int(max(w, h) * 0.20)
    ih, iw = img.shape[:2]
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(iw, x + w + pad)
    y2 = min(ih, y + h + pad)
    return img[y1:y2, x1:x2]


def _heuristic_breakdown(img, session_id: Optional[str] = None) -> Dict[str, float]:
    import cv2
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if lap_var < 80 or lap_var > 300:
        sharpness = 0.2
    else:
        sharpness = 1.0

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    sat = float(hsv[:, :, 1].mean()) / 255.0
    saturation_score = 1.0 if 0.12 <= sat <= 0.55 else 0.3

    edges = cv2.Canny(gray, 100, 200)
    edge_ratio = float(edges.mean()) / 255.0
    if edge_ratio < 0.10:
        edge_score = 1.0
    else:
        edge_score = max(0.0, 1.0 - (edge_ratio - 0.10) * 12.0)

    bright_ratio = float((gray > 240).mean())
    reflection_score = 1.0 - min(1.0, bright_ratio * 12.0)

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
        crop = _get_face_crop(img)
        rgb = cv2.cvtColor(cv2.resize(crop, (80, 80)), cv2.COLOR_BGR2RGB).astype(np.float32)
        x = (rgb / 255.0 - 0.5) / 0.5
        x = np.transpose(x, (2, 0, 1))[None]
        out = _session.run(None, {_session.get_inputs()[0].name: x})[0].flatten()

        # MiniFASNetV2 softmax output: [background, live, spoof]
        # Decision matches Silent-Face-Anti-Spoofing test.py: argmax==1 -> live
        predicted = int(np.argmax(out))
        live_score = float(out[1])
        is_live_pred = predicted == 1
        log.debug("ONNX out: %s  argmax=%d  live=%s", [round(float(v), 3) for v in out], predicted, is_live_pred)
        return is_live_pred, live_score, {
            "onnx_bg": round(float(out[0]), 3),
            "onnx_live": round(live_score, 3),
            "onnx_spoof": round(float(out[2]), 3),
            "predicted_class": predicted,
        }

    b = _heuristic_breakdown(img, session_id=session_id)
    score = _aggregate(b)
    return score >= SPOOF_THRESHOLD, score, b
