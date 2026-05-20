"""Unit tests for backend services.
All run with MOCK_AI=true — no InsightFace, no ONNX, no real Supabase needed.
"""
import asyncio
import os

# Must be set before any service import so config.py reads them
os.environ.setdefault("MOCK_AI", "true")
os.environ.setdefault("SUPABASE_URL", "https://placeholder.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "placeholder-key")
os.environ.setdefault("FACE_THRESHOLD", "0.5")
os.environ.setdefault("SPOOF_THRESHOLD", "0.70")

import numpy as np
import pytest


class _FakeResponse:
    def __init__(self, data=None):
        self.data = data


class _FakeQuery:
    def __init__(self, table_name, tables):
        self.table_name = table_name
        self.tables = tables
        self.filters = []
        self.selected = None
        self.payload = None

    def select(self, columns):
        self.selected = columns
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def limit(self, _count):
        return self

    def execute(self):
        rows = list(self.tables.get(self.table_name, []))
        for column, value in self.filters:
            rows = [row for row in rows if row.get(column) == value]
        if self.payload is not None:
            rows.append(self.payload)
        return _FakeResponse(rows)

    def insert(self, payload):
        self.payload = payload
        self.tables.setdefault(self.table_name, []).append(payload)
        return self


class _FakeClient:
    def __init__(self, tables):
        self.tables = tables

    def schema(self, _schema):
        return self

    def table(self, table_name):
        return _FakeQuery(table_name, self.tables)


def test_create_session_route_inserts_with_backend_client(monkeypatch):
    from backend.routes import sessions as sessions_route

    tables = {
        'teachers': [{'id': 'teacher-1', 'role': 'admin', 'auth_user_id': 'auth-1'}],
        'modules': [{'id': 'module-1', 'lecturer_id': 'teacher-1'}],
        'module_groups': [{'module_id': 'module-1', 'group_id': 'group-1', 'assigned_teacher_id': 'teacher-1'}],
        'sessions': [],
    }

    monkeypatch.setattr(sessions_route, 'supabase', lambda: _FakeClient(tables))

    payload = sessions_route.SessionCreateRequest(
        module_id='module-1',
        group_id='group-1',
        session_date='2026-05-08',
        start_time='14:00',
        session_type='td',
        week=3,
    )

    result = asyncio.run(sessions_route.create_session(payload, user={'user_id': 'auth-1', 'email': 'admin@example.com'}))

    assert result['ok'] is True
    assert tables['sessions'][0]['module_id'] == 'module-1'
    assert tables['sessions'][0]['group_id'] == 'group-1'
    assert tables['sessions'][0]['session_type'] == 'td'


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


def test_require_auth_rejects_missing_header():
    """No Authorization header must raise HTTP 401 before touching Supabase."""
    from fastapi import HTTPException
    from services.auth import require_auth

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(require_auth(authorization=None))
    assert exc_info.value.status_code == 401


def test_require_auth_rejects_malformed_header():
    """Authorization without 'Bearer ' prefix must also raise HTTP 401."""
    from fastapi import HTTPException
    from services.auth import require_auth

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(require_auth(authorization="Token abc123"))
    assert exc_info.value.status_code == 401


def test_vec_str_produces_pgvector_literal():
    """_vec_str must wrap floats in brackets — the format pgvector expects."""
    from services.db_service import _vec_str

    result = _vec_str([1.0, -2.5, 0.0])
    assert result.startswith("["), "Must start with '['"
    assert result.endswith("]"), "Must end with ']'"
    # No spaces around commas that would trip up some parsers
    assert " " not in result.replace("e-", "").replace("e+", "")
