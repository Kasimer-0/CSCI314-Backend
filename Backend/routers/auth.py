# routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt

import schemas
from database import supabase
from dependencies import get_current_user, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(tags=["Auth & Profile"])

# utility functions
def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/auth/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate):
    existing = supabase.table("users").select("user_id").eq("email", user.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    initial_status = "Pending" if user.role_id == 2 else "Active"
    new_user_data = {
        "username": user.username,
        "email": user.email,
        "password_hash": get_password_hash(user.password),
        "role_id": user.role_id,
        "status": initial_status,
        "is_suspended": False,
        "phone_number": user.phone_number,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    response = supabase.table("users").insert(new_user_data).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create user")
    return response.data[0]

@router.post("/auth/login", response_model=schemas.Token)
def login_for_access_token(login_data: schemas.LoginRequest):
    response = supabase.table("users").select("*").eq("email", login_data.email).execute()
    user = response.data[0] if response.data else None

    if not user or not verify_password(login_data.password, user.get("password_hash")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials")

    if user.get("is_suspended") or user.get("status").lower() == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended.")

    return {"access_token": create_access_token(data={"sub": user["email"]}), "token_type": "bearer"}

@router.post("/auth/logout")
def logout():
    return {"message": "Successfully logged out. Please discard your token."}

@router.get("/profile", response_model=schemas.UserResponse)
def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.patch("/profile", response_model=schemas.UserResponse)
def update_profile(update_data: schemas.UserUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = update_data.dict(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No data provided")
    res = supabase.table("users").update(update_dict).eq("user_id", current_user["user_id"]).execute()
    return res.data[0]
