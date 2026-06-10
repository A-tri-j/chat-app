from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from auth import hash_password, verify_password, create_token

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        username=data.username,
        email=data.email,
        password=hash_password(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user.id)
    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "bio": user.bio,
            "avatar_url": user.avatar_url,
            "is_online": user.is_online
        }
    }