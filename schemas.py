from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from models import UserRole, UserStatus

# 1. Data format for receiving front-end registration requests
class UserCreate(BaseModel):
    email: EmailStr  # EmailStr will automatically verify the email address format (e.g., whether it contains @)
    password: str
    username: str
    phone_number: Optional[str] = None

# 2. The data format returned to the front end (absolutely must not contain passwords!)
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    role: UserRole
    status: UserStatus
    created_at: datetime

    class Config:
        from_attributes = True  # Allow Pydantic to automatically read data from SQLAlchemy models

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None