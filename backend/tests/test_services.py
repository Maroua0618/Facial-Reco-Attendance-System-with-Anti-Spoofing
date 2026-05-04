"""Unit tests for backend services.
All run with MOCK_AI=true — no InsightFace, no ONNX, no real Supabase needed.
"""
import os

# Must be set before any service import so config.py reads them
os.environ.setdefault("MOCK_AI", "true")
os.environ.setdefault("SUPABASE_URL", "https://placeholder.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "placeholder-key")
os.environ.setdefault("FACE_THRESHOLD", "0.5")
os.environ.setdefault("SPOOF_THRESHOLD", "0.70")

import numpy as np
import pytest


def test_get_embedding_mock_returns_512d_unit_vector():
    """Mock embedding must be 512-d, float32, and unit-norm."""
    from services.face_service import get_embedding

    img = np.zeros((100, 100, 3), dtype=np.uint8)
    vec = get_embedding(img)

    assert vec is not None, "get_embedding must return a vector in mock mode"
    assert vec.shape == (512,), f"Expected 512-d vector, got {vec.shape}"
    assert vec.dtype == np.float32
    assert abs(float(np.linalg.norm(vec)) - 1.0) < 1e-4, "Vector must be unit-norm"


def test_is_live_mock_always_returns_live():
    """Mock liveness must return live=True with a score in [0, 1]."""
    from services.anti_spoofing import is_live

    img = np.zeros((100, 100, 3), dtype=np.uint8)
    live, conf, breakdown = is_live(img)

    assert live is True, "Mock liveness must always return live"
    assert 0.0 <= conf <= 1.0, f"Confidence {conf} out of [0, 1]"
    assert isinstance(breakdown, dict)


def test_heuristic_aggregate_matches_formula():
    """_aggregate must compute the documented weighted sum exactly."""
    from services.anti_spoofing import _aggregate

    scores = {
        "sharpness":   1.0,
        "saturation":  1.0,
        "edge_density": 1.0,
        "reflection":  1.0,
        "motion":      1.0,
    }
    result = _aggregate(scores)
    expected = 0.15 + 0.10 + 0.30 + 0.15 + 0.30  # == 1.0
    assert abs(result - expected) < 1e-6

    # Spot-check with zeros: should produce 0.0
    zeroed = {k: 0.0 for k in scores}
    assert abs(_aggregate(zeroed)) < 1e-6


@pytest.mark.asyncio
async def test_require_auth_rejects_missing_header():
    """No Authorization header must raise HTTP 401 before touching Supabase."""
    from fastapi import HTTPException
    from services.auth import require_auth

    with pytest.raises(HTTPException) as exc_info:
        await require_auth(authorization=None)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_require_auth_rejects_malformed_header():
    """Authorization without 'Bearer ' prefix must also raise HTTP 401."""
    from fastapi import HTTPException
    from services.auth import require_auth

    with pytest.raises(HTTPException) as exc_info:
        await require_auth(authorization="Token abc123")
    assert exc_info.value.status_code == 401


def test_vec_str_produces_pgvector_literal():
    """_vec_str must wrap floats in brackets — the format pgvector expects."""
    from services.db_service import _vec_str

    result = _vec_str([1.0, -2.5, 0.0])
    assert result.startswith("["), "Must start with '['"
    assert result.endswith("]"), "Must end with ']'"
    # No spaces around commas that would trip up some parsers
    assert " " not in result.replace("e-", "").replace("e+", "")
