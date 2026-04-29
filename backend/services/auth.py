from typing import Optional
import logging
from fastapi import Header, HTTPException
from config import supabase

log = logging.getLogger("auth")
log.setLevel(logging.INFO)


async def require_auth(authorization: Optional[str] = Header(None)) -> dict:
    """FastAPI dependency. Verifies a Supabase Auth JWT.

    Frontend must send: Authorization: Bearer <access_token>
    where access_token is supabase.auth.getSession().data.session.access_token.

    Returns dict with user_id and email; raises 401 on failure.
    Validates by round-tripping to Supabase Auth (no JWT secret needed
    on our side; works with both legacy HS256 and modern asymmetric keys).
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed bearer token")
    token = authorization.split(" ", 1)[1].strip()
    try:
        client = supabase()
        resp = client.auth.get_user(token)
        user = getattr(resp, "user", None)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user.id, "email": user.email}
    except HTTPException:
        raise
    except Exception as e:
        log.error("JWT validation error: %s", e)
        raise HTTPException(status_code=401, detail="Token validation failed")
