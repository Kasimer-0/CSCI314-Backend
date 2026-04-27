from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

# ==========================================
# 1. Move the enumerations from the original models here (restore S10 & S11 dependencies).
# ==========================================
class UserRole(str, Enum):
    SYS_ADMIN = "sys_admin"
    PLATFORM_ADMIN = "platform_admin"
    FUNDRAISER = "fundraiser"
    DONEE = "donee"

class UserStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"

# ==========================================
# 2. Pydantic Validation Model
# ==========================================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    phone_number: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    role: UserRole
    status: UserStatus
    # If Supabase returns the time in string format, Pydantic will automatically convert it for you.
    created_at: datetime | str | None = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
