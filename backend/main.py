import os
import socketio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes import auth_routes, user_routes, chat_routes, media_routes, ai_routes

from database import engine
import models

from routes import (
    auth_routes, user_routes,
    chat_routes, media_routes,
    ai_routes, block_routes
)

from socket_manager import sio
import socket_events


# Create database tables
models.Base.metadata.create_all(bind=engine)

# Create uploads folder if it doesn't exist
os.makedirs("uploads", exist_ok=True)

# FastAPI application
fastapi_app = FastAPI()

# CORS
fastapi_app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:5173"],
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
fastapi_app.include_router(auth_routes.router, prefix="/auth")
fastapi_app.include_router(block_routes.router, prefix="/users")
fastapi_app.include_router(user_routes.router, prefix="/users")
fastapi_app.include_router(chat_routes.router, prefix="/chats")
fastapi_app.include_router(media_routes.router, prefix="/media")

# Serve uploaded files
fastapi_app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)

# Health check
@fastapi_app.get("/")
def root():
    return {"message": "Chat API running"}

# Socket.IO + FastAPI
app = socketio.ASGIApp(
    sio,
    other_asgi_app=fastapi_app
)

fastapi_app.include_router(ai_routes.router, prefix="/ai")