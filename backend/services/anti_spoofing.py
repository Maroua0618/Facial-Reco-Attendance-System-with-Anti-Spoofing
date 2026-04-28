from typing import Optional, Tuple
import os
import numpy as np
from config import MOCK_AI, SPOOF_THRESHOLD

MODEL_PATH = os.getenv("SPOOF_MODEL_PATH", "ai/anti_spoofing/model.onnx")

_session = None
_load_err: Optional[str] = None


def _ensure_loaded():
    global _session, _load_err
    if _session is not None or MOCK_AI:
        return
    try:
        import onnxruntime as ort
        if not os.path.exists(MODEL_PATH):
            _load_err = f"model not found at {MODEL_PATH}"
            return
        _session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
    except Exception as e:
        _load_err = repr(e)


def anti_spoofing_status():
    _ensure_loaded()
    return {"mock": MOCK_AI, "loaded": _session is not None, "error": _load_err, "threshold": SPOOF_THRESHOLD}


def is_live(img) -> Tuple[bool, float]:
    if MOCK_AI:
        seed = int(np.asarray(img).sum()) & 0xFFFFFFFF
        rng = np.random.default_rng(seed)
        score = float(rng.uniform(0.85, 0.99))
        return True, score
    _ensure_loaded()
    if _session is None:
        return True, 0.5
    import cv2
    x = cv2.resize(img, (128, 128)).astype(np.float32) / 255.0
    x = np.transpose(x, (2, 0, 1))[None]
    out = _session.run(None, {_session.get_inputs()[0].name: x})[0].flatten()
    score = float(out[1] if out.size >= 2 else out[0])
    return score >= SPOOF_THRESHOLD, score
