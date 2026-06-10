from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from models import User
from auth import get_current_user
from typing import List
from pydantic import BaseModel
import os
import uuid

router = APIRouter()

UPLOAD_DIR = "uploads"

class UpdateProfileRequest(BaseModel):
    username: str = None
    bio: str = None


@router.get("/search")
def search_users(
    q: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    users = db.query(User).filter(
        User.username.ilike(f"%{q}%"),
        User.id != current_user.id
    ).limit(10).all()

    from models import Block
    result = []
    for u in users:
        blocked_rel = db.query(Block).filter(
            ((Block.blocker_id == current_user.id) & (Block.blocked_id == u.id)) |
            ((Block.blocker_id == u.id) & (Block.blocked_id == current_user.id))
        ).first()
        is_blocked = bool(blocked_rel)

        result.append({
            "id": u.id,
            "username": u.username,
            "bio": None if is_blocked else u.bio,
            "avatar_url": None if is_blocked else u.avatar_url,
            "is_online": False if is_blocked else u.is_online
        })
    return result


@router.get("/me")
def get_my_profile(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # refresh from DB to get latest data
    user = db.query(User).filter(User.id == current_user.id).first()
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "is_online": user.is_online,
        "last_seen": user.last_seen.isoformat() if user.last_seen else None,
        "created_at": user.created_at.isoformat()
    }


@router.put("/me")
def update_profile(
    data: UpdateProfileRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.username:
        existing = db.query(User).filter(
            User.username == data.username,
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Username already taken"
            )
        current_user.username = data.username

    if data.bio is not None:
        current_user.bio = data.bio

    db.commit()
    db.refresh(current_user)

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "bio": current_user.bio,
        "avatar_url": current_user.avatar_url,
        "is_online": current_user.is_online
    }


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Only image files allowed"
        )

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image must be under 5MB"
        )

    ext = os.path.splitext(file.filename)[1]
    unique_name = f"avatar_{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    avatar_url = f"/media/files/{unique_name}"

    # update in DB
    db_user = db.query(User).filter(User.id == current_user.id).first()
    db_user.avatar_url = avatar_url
    db.commit()
    db.refresh(db_user)

    return {
        "avatar_url": avatar_url,
        "message": "Avatar updated"
    }


@router.get("/{user_id}")
def get_user_profile(
    user_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from models import Block
    blocked_rel = db.query(Block).filter(
        ((Block.blocker_id == current_user.id) & (Block.blocked_id == user_id)) |
        ((Block.blocker_id == user_id) & (Block.blocked_id == current_user.id))
    ).first()
    is_blocked = bool(blocked_rel)

    return {
        "id": user.id,
        "username": user.username,
        "bio": None if is_blocked else user.bio,
        "avatar_url": None if is_blocked else user.avatar_url,
        "is_online": False if is_blocked else user.is_online,
        "last_seen": None if is_blocked else (user.last_seen.isoformat() if user.last_seen else None)
    }