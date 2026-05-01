from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str
    phone_number: Optional[str] = None
    role_id: int = 1  # 1: Donor/Donee, 2: Organization/Fundraiser, 0: Admin

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    user_id: int
    email: EmailStr
    username: str
    role_id: int
    status: str
    phone_number: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# 新增模型
class UserUpdate(BaseModel):
    username: Optional[str] = None
    phone_number: Optional[str] = None

class AdminCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    phone_number: Optional[str] = None

class AdminUserUpdate(BaseModel):
    username: Optional[str] = None
    phone_number: Optional[str] = None
    status: Optional[str] = None
    

# ================= （Sprint 2）FSA (Fundraising Activity) =================
class ActivityCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=100, description="活动标题至少5个字符")
    description: str = Field(..., min_length=20, description="活动详情至少20个字符")
    category_id: int = Field(..., gt=0)
    target_amount: float = Field(..., gt=10, description="目标金额必须大于10")
    is_private: bool = False

class ActivityUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=100)
    description: Optional[str] = Field(None, min_length=20)
    target_amount: Optional[float] = Field(None, gt=10)
    is_private: Optional[bool] = None

class ActivityResponse(BaseModel):
    activity_id: int
    fundraiser_id: int
    category_id: int
    title: str
    description: str
    target_amount: float
    current_amount: float
    status: str
    is_private: bool
    view_count: int
    created_at: datetime

    class Config:
        from_attributes = True

# ================= Bookmark =================
class BookmarkRequest(BaseModel):
    activity_id: int