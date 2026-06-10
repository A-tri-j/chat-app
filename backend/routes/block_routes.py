from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Block, User
from auth import get_current_user
from pydantic import BaseModel

router = APIRouter()


class BlockRequest(BaseModel):
    blocked_id: int


@router.post("/block")
def block_user(
    data: BlockRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.blocked_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot block yourself"
        )

    existing = db.query(Block).filter(
        Block.blocker_id == current_user.id,
        Block.blocked_id == data.blocked_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Already blocked"
        )

    block = Block(
        blocker_id=current_user.id,
        blocked_id=data.blocked_id
    )
    db.add(block)
    db.commit()
    return {"success": True, "message": "User blocked"}


@router.post("/unblock")
def unblock_user(
    data: BlockRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    block = db.query(Block).filter(
        Block.blocker_id == current_user.id,
        Block.blocked_id == data.blocked_id
    ).first()

    if not block:
        raise HTTPException(
            status_code=404,
            detail="Not blocked"
        )

    db.delete(block)
    db.commit()
    return {"success": True, "message": "User unblocked"}


@router.get("/blocked")
def get_blocked_users(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    blocks = db.query(Block).filter(
        Block.blocker_id == current_user.id
    ).all()

    result = []
    for b in blocks:
        user = db.query(User).filter(User.id == b.blocked_id).first()
        if user:
            result.append({
                "id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url
            })
    return result


@router.get("/is-blocked/{user_id}")
def check_blocked(
    user_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # check if current user blocked them
    i_blocked = db.query(Block).filter(
        Block.blocker_id == current_user.id,
        Block.blocked_id == user_id
    ).first()

    # check if they blocked current user
    they_blocked = db.query(Block).filter(
        Block.blocker_id == user_id,
        Block.blocked_id == current_user.id
    ).first()

    return {
        "i_blocked_them": bool(i_blocked),
        "they_blocked_me": bool(they_blocked),
        "is_blocked": bool(i_blocked or they_blocked)
    }