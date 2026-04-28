from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    SYS_ADMIN = "sys_admin"
    PLATFORM_ADMIN = "platform_admin"
    FUNDRAISER = "fundraiser"
    DONEE = "donee"

class UserStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    phone_number: Optional[str] = None

class UserResponse(BaseModel):
    user_id: int
    email: EmailStr
    username: str
    role: Optional[UserRole] = None
    status: UserStatus
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str