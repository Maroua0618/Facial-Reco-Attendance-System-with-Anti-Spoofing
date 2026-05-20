# Re-export from backend service layer so AI logic has a stable home
# even if the backend wrapper is replaced later.
from backend.services.face_service import get_embedding  # noqa: F401
