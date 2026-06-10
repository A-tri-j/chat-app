import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import ChatRoom, RoomMember, Message, User
from auth import get_current_user
from pydantic import BaseModel
from typing import List

router = APIRouter()

class CreateChatRequest(BaseModel):
    receiver_id: int

class SendMessageRequest(BaseModel):
    message: str

@router.post("/")
def create_chat(data: CreateChatRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    # check if chat already exists
    my_rooms = db.query(RoomMember.room_id).filter(RoomMember.user_id == current_user.id)
    their_rooms = db.query(RoomMember.room_id).filter(RoomMember.user_id == data.receiver_id)
    common = my_rooms.intersect(their_rooms).first()
    
    if common:
        room = db.query(ChatRoom).filter(ChatRoom.id == common[0], ChatRoom.is_group == False).first()
        if room:
            return room

    room = ChatRoom(is_group=False)
    db.add(room)
    db.commit()
    db.refresh(room)

    db.add(RoomMember(room_id=room.id, user_id=current_user.id))
    db.add(RoomMember(room_id=room.id, user_id=data.receiver_id))
    db.commit()
    return room

@router.get("/")
def get_my_chats(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(RoomMember).filter(
        RoomMember.user_id == current_user.id
    ).all()

    result = []
    for m in memberships:
        room = db.query(ChatRoom).filter(ChatRoom.id == m.room_id).first()

        last_msg = db.query(Message).filter(
            Message.room_id == room.id
        ).order_by(Message.created_at.desc()).first()

        unread_count = db.query(Message).filter(
            Message.room_id == room.id,
            Message.sender_id != current_user.id,
            Message.is_seen == False
        ).count()

        if room.is_group:
            result.append({
                "room_id": room.id,
                "is_group": True,
                "group_name": room.name,
                "created_by": room.created_by,
                "other_user": None,
                "last_message": last_msg.message if last_msg else None,
                "last_message_time": last_msg.created_at.isoformat() if last_msg else None,
                "unread_count": unread_count
            })
        else:
            other_member = db.query(RoomMember).filter(
                RoomMember.room_id == room.id,
                RoomMember.user_id != current_user.id
            ).first()
            other_user = db.query(User).filter(
                User.id == other_member.user_id
            ).first() if other_member else None

            from models import Block
            is_blocked_1 = False
            is_blocked_2 = False
            if other_user:
                is_blocked_1 = db.query(Block).filter(Block.blocker_id == current_user.id, Block.blocked_id == other_user.id).first() is not None
                is_blocked_2 = db.query(Block).filter(Block.blocker_id == other_user.id, Block.blocked_id == current_user.id).first() is not None
            is_blocked = bool(is_blocked_1 or is_blocked_2)

            result.append({
                "room_id": room.id,
                "is_group": False,
                "group_name": None,
                "other_user": {
                    "id": other_user.id,
                    "username": other_user.username,
                    "is_online": False if is_blocked else other_user.is_online,
                    "avatar_url": None if is_blocked else other_user.avatar_url,
                    "last_seen": None if is_blocked else (other_user.last_seen.isoformat() if other_user.last_seen else None),
                    "i_blocked_them": is_blocked_1,
                    "they_blocked_me": is_blocked_2
                } if other_user else None,
                "last_message": last_msg.message if last_msg else None,
                "last_message_time": last_msg.created_at.isoformat() if last_msg else None,
                "unread_count": unread_count
            })

    result.sort(
        key=lambda x: x["last_message_time"] or "",
        reverse=True
    )
    return result
@router.get("/{room_id}/messages")
def get_messages(
    room_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    member = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member")

    messages = db.query(Message).filter(
        Message.room_id == room_id
    ).order_by(Message.created_at).all()

    from models import Block, DeletedMessage
    other_member = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id != current_user.id
    ).first()
    is_blocked = False
    if other_member:
        blocked_rel = db.query(Block).filter(
            ((Block.blocker_id == current_user.id) & (Block.blocked_id == other_member.user_id)) |
            ((Block.blocker_id == other_member.user_id) & (Block.blocked_id == current_user.id))
        ).first()
        is_blocked = bool(blocked_rel)

    # get IDs of messages this user has deleted for themselves
    deleted_ids = set(
        d.message_id for d in db.query(DeletedMessage).filter(
            DeletedMessage.user_id == current_user.id
        ).all()
    )

    result = []
    for msg in messages:
        # skip messages deleted for me
        if msg.id in deleted_ids:
            continue

        if msg.message_type == "blocked" and msg.sender_id != current_user.id:
            continue

        sender = db.query(User).filter(User.id == msg.sender_id).first()

        # for view_once messages that are opened
        # hide file_url from receiver
        file_url = msg.file_url
        file_name = msg.file_name
        if (
            msg.view_once and
            msg.view_once_opened and
            msg.sender_id != current_user.id
        ):
            file_url = None
            file_name = None

        result.append({
            "id": msg.id,
            "room_id": msg.room_id,
            "sender_id": msg.sender_id,
            "sender_username": sender.username if sender else "Unknown",
            "sender_avatar": None if is_blocked else (sender.avatar_url if sender else None),
            "message": msg.message,
            "message_type": "text" if msg.message_type == "blocked" else (msg.message_type or "text"),
            "file_url": file_url,
            "file_name": file_name,
            "view_once": msg.view_once or False,
            "view_once_opened": msg.view_once_opened or False,
            "is_seen": msg.is_seen,
            "created_at": msg.created_at.isoformat()
        })
    return result
@router.post("/{room_id}/messages")
def send_message(room_id: int, data: SendMessageRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    member = db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member")
    msg = Message(room_id=room_id, sender_id=current_user.id, message=data.message)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg

@router.put("/{room_id}/seen")
def mark_messages_seen(room_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    member = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member")

    db.query(Message).filter(
        Message.room_id == room_id,
        Message.sender_id != current_user.id,
        Message.is_seen == False
    ).update({"is_seen": True})
    db.commit()
    return {"success": True}

from typing import List

class CreateGroupRequest(BaseModel):
    name: str
    member_ids: List[int]

class AddMemberRequest(BaseModel):
    user_id: int

@router.post("/group")
def create_group(
    data: CreateGroupRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if len(data.member_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail="Group needs at least 2 other members"
        )

    room = ChatRoom(
        name=data.name,
        is_group=True,
        created_by=current_user.id
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    all_members = list(set(data.member_ids + [current_user.id]))
    for uid in all_members:
        db.add(RoomMember(room_id=room.id, user_id=uid))
    db.commit()

    return {"room_id": room.id, "name": room.name, "is_group": True}


@router.get("/group/{room_id}/members")
def get_group_members(
    room_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    member = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member")

    members = db.query(RoomMember).filter(
        RoomMember.room_id == room_id
    ).all()

    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            result.append({
                "id": user.id,
                "username": user.username,
                "is_online": user.is_online
            })
    return result


@router.post("/group/{room_id}/members")
def add_group_member(
    room_id: int,
    data: AddMemberRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    room = db.query(ChatRoom).filter(
        ChatRoom.id == room_id,
        ChatRoom.is_group == True
    ).first()
    if not room:
        raise HTTPException(status_code=404, detail="Group not found")

    if room.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only admin can add members")

    existing = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id == data.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already in group")

    db.add(RoomMember(room_id=room_id, user_id=data.user_id))
    db.commit()
    return {"success": True}


@router.delete("/group/{room_id}/leave")
def leave_group(
    room_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    member = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Not a member")

    db.delete(member)
    db.commit()
    return {"success": True}

@router.post("/{room_id}/messages/{message_id}/view-once")
def open_view_once(
    room_id: int,
    message_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = db.query(Message).filter(
        Message.id == message_id,
        Message.room_id == room_id,
        Message.view_once == True
    ).first()

    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    if msg.sender_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot open your own view once message"
        )

    if msg.view_once_opened:
        raise HTTPException(
            status_code=400,
            detail="Already opened"
        )

    # mark as opened
    msg.view_once_opened = True

    # delete the actual file from disk
    if msg.file_url:
        file_path = msg.file_url.lstrip('/')
        # handle both /uploads/ and /media/files/ paths
        if file_path.startswith('uploads/'):
            full_path = file_path
        else:
            full_path = os.path.join('uploads', os.path.basename(file_path))

        if os.path.exists(full_path):
            try:
                os.remove(full_path)
                print(f"Deleted view-once file: {full_path}")
            except Exception as e:
                print(f"Could not delete file: {e}")

    # clear file_url so it cannot be accessed again
    msg.file_url = None
    msg.file_name = None

    db.commit()

    return {
        "success": True,
        "message_id": message_id,
        "room_id": room_id
    }

class DeleteMessageRequest(BaseModel):
    delete_for_everyone: bool = False

@router.delete("/{room_id}/messages/{message_id}")
def delete_message(
    room_id: int,
    message_id: int,
    data: DeleteMessageRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = db.query(Message).filter(
        Message.id == message_id,
        Message.room_id == room_id
    ).first()

    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # check membership
    member = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member")

    if data.delete_for_everyone:
        # only sender can delete for everyone
        if msg.sender_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Only sender can delete for everyone"
            )
        # mark as deleted for everyone
        msg.message = None
        msg.file_url = None
        msg.file_name = None
        msg.message_type = "deleted"
        db.commit()
        return {
            "success": True,
            "delete_type": "everyone",
            "message_id": message_id,
            "room_id": room_id
        }
    else:
        # delete for me — save to DB so it persists
        from models import DeletedMessage
        existing = db.query(DeletedMessage).filter(
            DeletedMessage.message_id == message_id,
            DeletedMessage.user_id == current_user.id
        ).first()
        if not existing:
            deleted_record = DeletedMessage(
                message_id=message_id,
                user_id=current_user.id
            )
            db.add(deleted_record)
            db.commit()
        return {
            "success": True,
            "delete_type": "me",
            "message_id": message_id,
            "room_id": room_id
        }