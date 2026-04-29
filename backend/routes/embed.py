import numpy as np
import cv2
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from services.face_service import get_embedding
from services.auth import require_auth

router = APIRouter()


@router.post("/embed")
async def embed_endpoint(
    image: UploadFile = File(...),
    user: dict = Depends(require_auth),
):
    raw = await image.read()
    arr = np.frombuffer(raw, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Invalid image")
    vec = get_embedding(img)
    if vec is None:
        raise HTTPException(422, "No face detected")
    return {"embedding": vec.tolist(), "dim": int(vec.shape[0])}
