import os
import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse
from auth import get_current_user

router = APIRouter()

UPLOAD_DIR = "uploads"
ALLOWED_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "text/plain",
    "video/mp4",
    "audio/mpeg", "audio/wav"
]
MAX_SIZE = 10 * 1024 * 1024  # 10MB
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed: {file.content_type}"
        )

    contents = await file.read()

    if len(contents) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Max size is 10MB"
        )

    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    # use /uploads/ path directly (StaticFiles serves this)
    file_url = f"/uploads/{unique_name}"
    is_image = file.content_type.startswith("image/")

    return {
        "file_url": file_url,
        "file_name": file.filename,
        "file_type": file.content_type,
        "is_image": is_image
    }


@router.get("/files/{filename}")
async def get_file(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)