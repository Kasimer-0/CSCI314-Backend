from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import EmailStr, BaseModel
from datetime import datetime, timedelta, timezone
from typing import Optional, Annotated

import jwt
import schemas
import bcrypt

from database import supabase

app = FastAPI(title="CSIT314 Backend - IAM Module (User Stories 1-12)")

# ====================== Configuration ======================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有前端端口访问（开发环境）
    allow_credentials=True,
    allow_methods=["*"],  # 允许 GET, POST, PATCH 等所有方法
    allow_headers=["*"],  # 允许携带 Token 等所有请求头
)
SECRET_KEY = "CSIT314_2026_SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION_!@#$"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ====================== 使用纯 Bearer Token 认证（推荐方式） ======================
security = HTTPBearer()

def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]):
    """Validate Bearer Token and return current user"""
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    response = supabase.table("users").select("*").eq("email", email).execute()
    if not response.data:
        raise credentials_exception

    return response.data[0]


def get_current_admin(current_user: dict = Depends(get_current_user)):
    """Only allow Admin (role_id = 0)"""
    if current_user.get("role_id") != 0:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ====================== Password Handling ======================
def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


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


# ====================== Audit Log Helper (Story 12) ======================
def log_admin_action(admin_id: int, target_user_id: int, action: str, details: str = ""):
    log_data = {
        "admin_id": admin_id,
        "target_user_id": target_user_id,
        "action": action,
        "details": details,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    supabase.table("audit_logs").insert(log_data).execute()


# ===========================================
# 1. Register (User Story 9)
# ===========================================
@app.post("/auth/register", response_model=schemas.UserResponse)
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


# ===========================================
# 2. Login - 使用 email + password JSON Body (User Story 1)
# ===========================================
@app.post("/auth/login", response_model=schemas.Token)
def login_for_access_token(login_data: schemas.LoginRequest):
    """使用邮箱和密码登录"""
    response = supabase.table("users").select("*").eq("email", login_data.email).execute()
    user = response.data[0] if response.data else None

    if not user or not verify_password(login_data.password, user.get("password_hash")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.get("is_suspended") or user.get("status") in ["Suspended", "suspended"]:
        raise HTTPException(status_code=403, detail="Account is suspended. Please contact admin.")

    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}


# ===========================================
# 3. Logout (User Story 2)
# ===========================================
@app.post("/auth/logout")
def logout():
    return {"message": "Successfully logged out. Please discard your token."}


# ===========================================
# 4. View Personal Profile (User Story 3)
# ===========================================
@app.get("/profile", response_model=schemas.UserResponse)
def read_users_me(current_user: dict = Depends(get_current_user)):
    return {
        "user_id": current_user.get("user_id"),
        "email": current_user.get("email"),
        "username": current_user.get("username"),
        "role_id": current_user.get("role_id"),
        "status": current_user.get("status"),
        "phone_number": current_user.get("phone_number"),
        "created_at": current_user.get("created_at")
    }


# ===========================================
# 5. Update Personal Profile (User Story 4)
# ===========================================
class UserUpdate(BaseModel):
    username: Optional[str] = None
    phone_number: Optional[str] = None

@app.patch("/profile", response_model=schemas.UserResponse)
def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = update_data.dict(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data provided")

    res = supabase.table("users").update(update_dict).eq("user_id", current_user["user_id"]).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")

    updated = supabase.table("users").select("*").eq("user_id", current_user["user_id"]).execute().data[0]
    return updated


# ===========================================
# Password Reset (Story 5) - 简化版
# ===========================================
class PasswordResetRequest(BaseModel):
    email: EmailStr

@app.post("/auth/forgot-password")
def forgot_password(request: PasswordResetRequest):
    return {"message": f"Password reset link has been sent to {request.email} (simulation)"}

class PasswordReset(BaseModel):
    token: str
    new_password: str

@app.post("/auth/reset-password")
def reset_password(reset: PasswordReset):
    try:
        payload = jwt.decode(reset.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
    except:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    hashed = get_password_hash(reset.new_password)
    res = supabase.table("users").update({"password_hash": hashed}).eq("email", email).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Password has been successfully reset"}


# ===========================================
# Admin Features (Stories 6-12)
# ===========================================

class AdminCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    phone_number: Optional[str] = None

@app.post("/admin/create-admin", response_model=schemas.UserResponse)
def create_admin(admin_data: AdminCreate, current_admin: dict = Depends(get_current_admin)):
    existing = supabase.table("users").select("user_id").eq("email", admin_data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_admin = {
        "username": admin_data.username,
        "email": admin_data.email,
        "password_hash": get_password_hash(admin_data.password),
        "role_id": 0,
        "status": "Active",
        "is_suspended": False,
        "phone_number": admin_data.phone_number,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    response = supabase.table("users").insert(new_admin).execute()
    return response.data[0]


@app.get("/admin/users")
def admin_search_users(
    email: Optional[str] = Query(None),
    username: Optional[str] = Query(None),
    role_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    current_admin: dict = Depends(get_current_admin)
):
    query = supabase.table("users").select("*")
    if email:
        query = query.eq("email", email)
    if username:
        query = query.ilike("username", f"%{username}%")
    if role_id is not None:
        query = query.eq("role_id", role_id)
    if status:
        query = query.eq("status", status)

    response = query.order("created_at", desc=True).execute()
    return response.data


class AdminUserUpdate(BaseModel):
    username: Optional[str] = None
    phone_number: Optional[str] = None
    status: Optional[str] = None

@app.patch("/admin/users/{user_id}")
def admin_update_user(user_id: int, update_data: AdminUserUpdate, current_admin: dict = Depends(get_current_admin)):
    update_dict = update_data.dict(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No data to update")

    res = supabase.table("users").update(update_dict).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")

    log_admin_action(current_admin["user_id"], user_id, "UPDATE_USER_INFO", f"Updated fields: {list(update_dict.keys())}")
    return {"message": "User updated successfully"}


@app.post("/admin/approve/{user_id}")
def approve_user(user_id: int, current_admin: dict = Depends(get_current_admin)):
    res = supabase.table("users").update({"status": "Active", "is_suspended": False}).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    log_admin_action(current_admin["user_id"], user_id, "APPROVE_USER", "User approved")
    return {"message": "User has been approved and activated"}


@app.post("/admin/users/{user_id}/suspend")
def suspend_user(user_id: int, current_admin: dict = Depends(get_current_admin)):
    res = supabase.table("users").update({"status": "Suspended", "is_suspended": True}).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    log_admin_action(current_admin["user_id"], user_id, "SUSPEND_USER", "Account suspended by admin")
    return {"message": "User has been suspended"}


@app.post("/admin/users/{user_id}/reactivate")
def reactivate_user(user_id: int, current_admin: dict = Depends(get_current_admin)):
    res = supabase.table("users").update({"status": "Active", "is_suspended": False}).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    log_admin_action(current_admin["user_id"], user_id, "REACTIVATE_USER", "Account reactivated by admin")
    return {"message": "User has been reactivated"}


@app.get("/admin/audit-logs")
def get_audit_logs(current_admin: dict = Depends(get_current_admin)):
    response = supabase.table("audit_logs").select("*").order("created_at", desc=True).execute()
    return response.data


# Health Check
@app.get("/")
def root():
    return {"message": "Backend IAM Module (Stories 1-12) is running - Pure Bearer Token Auth"}