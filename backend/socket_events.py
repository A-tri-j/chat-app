from socket_manager import sio, connected_users, socket_to_user
from database import SessionLocal
from models import Message, RoomMember, User
from auth import decode_token
from datetime import datetime

def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        pass

@sio.event
async def connect(sid, environ, auth):
    try:
        token = None

        if auth and isinstance(auth, dict):
            token = auth.get('token')

        if not token:
            print(f"No token provided for {sid}")
            return False

        user_id = decode_token(token)
        if not user_id:
            return False

        connected_users[user_id] = sid
        socket_to_user[sid] = user_id

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.is_online = True
                db.commit()

            memberships = db.query(RoomMember).filter(
                RoomMember.user_id == user_id
            ).all()
            for m in memberships:
                await sio.enter_room(sid, f"room_{m.room_id}")

            await sio.emit('user_online', {'user_id': user_id}, skip_sid=sid)
            print(f"User {user_id} connected with socket {sid}")
        finally:
            db.close()

    except Exception as e:
        print(f"Connect error: {e}")
        return False


@sio.event
async def disconnect(sid):
    user_id = socket_to_user.get(sid)
    if user_id:
        connected_users.pop(user_id, None)
        socket_to_user.pop(sid, None)

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.is_online = False
                user.last_seen = datetime.utcnow()
                db.commit()
            await sio.emit('user_offline', {
                'user_id': user_id,
                'last_seen': datetime.utcnow().isoformat()
            })
            print(f"User {user_id} disconnected")
        finally:
            db.close()

@sio.event
async def send_message(sid, data):
    user_id = socket_to_user.get(sid)
    if not user_id:
        return

    room_id = data.get('room_id')
    message_text = data.get('message')
    message_type = data.get('message_type', 'text')
    file_url = data.get('file_url')
    file_name = data.get('file_name')
    view_once = data.get('view_once', False)

    if not room_id:
        return

    if message_type == 'text' and not message_text:
        return

    db = SessionLocal()
    try:
        member = db.query(RoomMember).filter(
            RoomMember.room_id == room_id,
            RoomMember.user_id == user_id
        ).first()
        if not member:
            return

        # check block status for direct chats
        from models import Block, ChatRoom
        room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
        
        is_blocked_by_recipient = False
        is_blocking_recipient = False
        
        if room and not room.is_group:
            other_member = db.query(RoomMember).filter(
                RoomMember.room_id == room_id,
                RoomMember.user_id != user_id
            ).first()
            if other_member:
                # check if recipient blocked the sender
                blocked_by_rec = db.query(Block).filter(
                    Block.blocker_id == other_member.user_id,
                    Block.blocked_id == user_id
                ).first()
                if blocked_by_rec:
                    is_blocked_by_recipient = True
                
                # check if sender blocked the recipient
                blocking_rec = db.query(Block).filter(
                    Block.blocker_id == user_id,
                    Block.blocked_id == other_member.user_id
                ).first()
                if blocking_rec:
                    is_blocking_recipient = True

        if is_blocking_recipient:
            await sio.emit(
                'send_error',
                {'message': 'You have blocked this user. Unblock to send messages.'},
                to=sid
            )
            return

        actual_message_type = "blocked" if is_blocked_by_recipient else message_type

        msg = Message(
            room_id=room_id,
            sender_id=user_id,
            message=message_text,
            message_type=actual_message_type,
            file_url=file_url,
            file_name=file_name,
            view_once=view_once,
            view_once_opened=False
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        user = db.query(User).filter(User.id == user_id).first()

        payload = {
            'id': msg.id,
            'room_id': room_id,
            'sender_id': user_id,
            'sender_username': user.username,
            'sender_avatar': None if (is_blocked_by_recipient or is_blocking_recipient) else user.avatar_url,
            'message': message_text,
            'message_type': message_type,
            'file_url': file_url,
            'file_name': file_name,
            'view_once': view_once,
            'view_once_opened': False,
            'is_seen': False,
            'created_at': msg.created_at.isoformat()
        }

        if is_blocked_by_recipient:
            await sio.emit('receive_message', payload, to=sid)
            await sio.emit('send_error', {'message': 'This user blocked you'}, to=sid)
        else:
            await sio.emit(
                'receive_message',
                payload,
                room=f"room_{room_id}"
            )

    finally:
        db.close()
@sio.event
async def typing(sid, data):
    user_id = socket_to_user.get(sid)
    if not user_id:
        return

    room_id = data.get('room_id')
    if not room_id:
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        await sio.emit(
            'typing_status',
            {
                'user_id': user_id,
                'username': user.username,
                'is_typing': True,
                'room_id': room_id
            },
            room=f"room_{room_id}",
            skip_sid=sid
        )
    finally:
        db.close()


@sio.event
async def stop_typing(sid, data):
    user_id = socket_to_user.get(sid)
    if not user_id:
        return

    room_id = data.get('room_id')
    if not room_id:
        return

    await sio.emit(
        'typing_status',
        {
            'user_id': user_id,
            'is_typing': False,
            'room_id': room_id
        },
        room=f"room_{room_id}",
        skip_sid=sid
    )
    
@sio.event
async def seen_message(sid, data):
    user_id = socket_to_user.get(sid)
    if not user_id:
        return

    room_id = data.get('room_id')
    if not room_id:
        return

    db = SessionLocal()
    try:
        # only mark messages seen that were sent BY other people TO current user
        # never mark your own messages as seen by yourself
        updated = db.query(Message).filter(
            Message.room_id == room_id,
            Message.sender_id != user_id,
            Message.is_seen == False
        ).all()

        if not updated:
            db.close()
            return

        for msg in updated:
            msg.is_seen = True
        db.commit()

        # tell the SENDER their messages were seen
        # find who sent those messages
        sender_ids = list(set([msg.sender_id for msg in updated]))
        for sender_id in sender_ids:
            sender_sid = connected_users.get(sender_id)
            if sender_sid:
                await sio.emit(
                    'messages_seen',
                    {
                        'room_id': room_id,
                        'seen_by': user_id
                    },
                    to=sender_sid
                )

    finally:
        db.close()
        
@sio.event
async def join_new_room(sid, data):
    room_id = data.get('room_id')
    if room_id:
        await sio.enter_room(sid, f"room_{room_id}")
        
@sio.event
async def call_offer(sid, data):
    user_id = socket_to_user.get(sid)
    if not user_id:
        print(f"call_offer: no user for sid {sid}")
        return

    target_user_id = data.get('target_user_id')
    target_sid = connected_users.get(target_user_id)

    print(f"call_offer: user {user_id} calling {target_user_id}, target_sid={target_sid}")
    print(f"connected_users: {connected_users}")

    if not target_sid:
        await sio.emit('call_failed', {
            'reason': 'User is offline or not connected'
        }, to=sid)
        return

    db = SessionLocal()
    try:
        caller = db.query(User).filter(User.id == user_id).first()
        payload = {
            'caller_id': user_id,
            'caller_name': caller.username,
            'caller_avatar': caller.avatar_url,
            'call_type': data.get('call_type', 'voice'),
            'offer': data.get('offer'),
            'room_id': data.get('room_id')
        }
        print(f"Emitting incoming_call to {target_sid}: {payload}")
        await sio.emit('incoming_call', payload, to=target_sid)
    finally:
        db.close()


@sio.event
async def call_answer(sid, data):
    user_id = socket_to_user.get(sid)
    if not user_id:
        return

    caller_id = data.get('caller_id')
    caller_sid = connected_users.get(caller_id)

    if caller_sid:
        await sio.emit('call_answered', {
            'answer': data.get('answer'),
            'answerer_id': user_id
        }, to=caller_sid)


@sio.event
async def ice_candidate(sid, data):
    user_id = socket_to_user.get(sid)
    if not user_id:
        return

    target_user_id = data.get('target_user_id')
    target_sid = connected_users.get(target_user_id)

    if target_sid:
        await sio.emit('ice_candidate', {
            'candidate': data.get('candidate'),
            'from_user_id': user_id
        }, to=target_sid)


@sio.event
async def call_rejected(sid, data):
    caller_id = data.get('caller_id')
    caller_sid = connected_users.get(caller_id)
    if caller_sid:
        await sio.emit('call_rejected', {}, to=caller_sid)


@sio.event
async def call_ended(sid, data):
    target_user_id = data.get('target_user_id')
    target_sid = connected_users.get(target_user_id)
    if target_sid:
        await sio.emit('call_ended', {}, to=target_sid)

@sio.event
async def view_once_opened(sid, data):
    user_id = socket_to_user.get(sid)
    if not user_id:
        return

    message_id = data.get('message_id')
    room_id = data.get('room_id')
    sender_id = data.get('sender_id')

    if not all([message_id, room_id, sender_id]):
        return

    # tell the sender their image was viewed
    sender_sid = connected_users.get(sender_id)
    if sender_sid:
        await sio.emit(
            'view_once_seen',
            {
                'message_id': message_id,
                'room_id': room_id,
                'viewed_by': user_id
            },
            to=sender_sid
        )

@sio.event
async def delete_message(sid, data):
    user_id = socket_to_user.get(sid)
    if not user_id:
        return

    message_id = data.get('message_id')
    room_id = data.get('room_id')
    delete_for_everyone = data.get('delete_for_everyone', False)

    if not message_id or not room_id:
        return

    db = SessionLocal()
    try:
        msg = db.query(Message).filter(
            Message.id == message_id,
            Message.room_id == room_id
        ).first()

        if not msg:
            return

        if delete_for_everyone:
            if msg.sender_id != user_id:
                return

            msg.message = None
            msg.file_url = None
            msg.file_name = None
            msg.message_type = "deleted"
            db.commit()

            # notify everyone in room
            await sio.emit(
                'message_deleted',
                {
                    'message_id': message_id,
                    'room_id': room_id,
                    'delete_type': 'everyone'
                },
                room=f"room_{room_id}"
            )
        else:
            # delete for me — save to DB so it persists
            from models import DeletedMessage
            existing = db.query(DeletedMessage).filter(
                DeletedMessage.message_id == message_id,
                DeletedMessage.user_id == user_id
            ).first()
            if not existing:
                deleted_record = DeletedMessage(
                    message_id=message_id,
                    user_id=user_id
                )
                db.add(deleted_record)
                db.commit()

            await sio.emit(
                'message_deleted',
                {
                    'message_id': message_id,
                    'room_id': room_id,
                    'delete_type': 'me'
                },
                to=sid
            )

    finally:
        db.close()