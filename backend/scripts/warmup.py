"""Pre-download InsightFace's buffalo_l model so the first /embed call
isn't 30+ seconds. Run once after pip install.

  cd backend
  python scripts/warmup.py

Downloads ~280 MB to ~/.insightface/models/buffalo_l/.
"""
import sys
import time

print("Warming up InsightFace buffalo_l (one-time download ~280 MB)...")
try:
    from insightface.app import FaceAnalysis
    t0 = time.time()
    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640, 640))
    print(f"OK in {time.time() - t0:.1f}s")
except Exception as e:
    print(f"FAIL: {e}")
    sys.exit(1)
