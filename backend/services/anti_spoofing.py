from typing import Optional, Tuple
import os
import logging
import numpy as np
from config import MOCK_AI, SPOOF_THRESHOLD

log = logging.getLogger("anti_spoofing")
log.setLevel(logging.INFO)

MODEL_PATH = os.getenv("SPOOF_MODEL_PATH", "ai/anti_spoofing/model.onnx")

_session = None
_load_err: Optional[str] = None
_tried_load = False


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


def _heuristic_liveness(img) -> float:
    """Cheap passive liveness based on physical properties of real faces.
    Combines four signals into a [0,1] score. Catches the cheapest
    spoofs (printed photos, low-quality screen replays). Not a
    substitute for a real anti-spoof model.
    """
    import cv2
    h, w = img.shape[:2]

    # 1) Sharpness: printed photos and screens often produce blurry crops
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    sharpness = min(1.0, lap_var / 200.0)  # ~200 = sharp; <50 = blurry

    # 2) Color saturation: greyscale prints score very low
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    sat = float(hsv[:, :, 1].mean()) / 255.0
    saturation_score = min(1.0, sat * 3.0)  # real skin ~0.2-0.4

    # 3) Face area ratio: a tiny face suggests a photo within frame
    # (We don't run detection here; assume CameraFeed cropped to roughly fill.)
    area_score = 1.0 if h * w >= 320 * 240 else 0.5

    # 4) Highlight peaks: screens reflect harshly, printed photos rarely do.
    # Penalize if too many near-saturated pixels in a small area.
    bright = (gray > 240).mean()
    reflection_score = 1.0 - min(1.0, bright * 5.0)

    # Weighted average
    score = (
        0.40 * sharpness +
        0.30 * saturation_score +
        0.10 * area_score +
        0.20 * reflection_score
    )
    return float(max(0.0, min(1.0, score)))


def is_live(img) -> Tuple[bool, float]:
    if MOCK_AI:
        # Deterministic mock: always live with high confidence.
        seed = int(np.asarray(img).sum()) & 0xFFFFFFFF
        rng = np.random.default_rng(seed)
        return True, float(rng.uniform(0.85, 0.99))
    _ensure_loaded()
    if _session is not None:
        import cv2
        x = cv2.resize(img, (128, 128)).astype(np.float32) / 255.0
        x = np.transpose(x, (2, 0, 1))[None]
        out = _session.run(None, {_session.get_inputs()[0].name: x})[0].flatten()
        score = float(out[1] if out.size >= 2 else out[0])
        return score >= SPOOF_THRESHOLD, score
    # No ONNX — use heuristic.
    score = _heuristic_liveness(img)
    return score >= SPOOF_THRESHOLD, score
