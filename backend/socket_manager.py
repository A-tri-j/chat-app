import socketio

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['http://localhost:5173']
)

connected_users = {}
# { user_id: socket_id }
# { socket_id: user_id }
socket_to_user = {}