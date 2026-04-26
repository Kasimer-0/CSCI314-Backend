from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import EmailStr, BaseModel
from datetime import datetime, timedelta, timezone
import jwt

from typing import Optional

# Import Supabase
from database import supabase

app = FastAPI(title="CSIT314 Backend - IAM Module (Supabase)")

# ====================== Configuration ======================
SECRET_KEY = "CSIT314_2026_SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION_!@#$"  # 建议从 .env 读取
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60   # 建议改成60分钟

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ====================== 密码处理（使用纯 bcrypt，解决兼容性问题） ======================
import bcrypt

def get_password_hash(password: str) -> str:
    """对密码进行加密（推荐写法）"""
    # 把密码转为 bytes，然后加密
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码是否正确"""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

# ====================== 获取当前登录用户 ======================
def get_current_user(token: str = Depends(oauth2_scheme)):
    """验证 Token 并返回当前用户信息"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的凭证或Token已过期",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    # 从 Supabase 查询用户
    response = supabase.table("users").select("*").eq("email", email).execute()
    if not response.data:
        raise credentials_exception
    
    user = response.data[0]
    return user


# ====================== Pydantic 数据模型 ======================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str                    # 对应你数据库的 username 字段
    phone_number: Optional[str] = None


class UserResponse(BaseModel):
    user_id: int
    username: str
    email: EmailStr
    role_id: Optional[int] = None
    status: str
    created_at: Optional[datetime] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ===========================================
# 1. 注册接口
# ===========================================
@app.post("/auth/register", response_model=UserResponse)
def register_user(user: UserCreate):
    """用户注册 - 改进版（带详细错误日志）"""
    try:
        print(f"收到注册请求: email={user.email}, username={user.username}")  # 打印调试信息

        # 检查邮箱是否已存在
        existing = supabase.table("users").select("email").eq("email", user.email).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="该邮箱已被注册！")

        # 加密密码
        hashed_password = get_password_hash(user.password)

        # 准备插入数据（严格匹配你 Supabase 的 users 表字段）
        new_user = {
            "username": user.username,
            "email": user.email,
            "password_hash": hashed_password,
            "role_id": 1,           # 根据你 roles 表调整（0 或 1）
            "status": "Pending"
        }

        print("准备插入的数据:", new_user)   # 打印要插入的内容

        # 执行插入
        response = supabase.table("users").insert(new_user).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="数据库插入失败，返回空数据")

        created_user = response.data[0]
        print("注册成功，用户ID:", created_user.get("user_id"))

        return {
            "user_id": created_user.get("user_id"),
            "username": created_user.get("username"),
            "email": created_user.get("email"),
            "role_id": created_user.get("role_id"),
            "status": created_user.get("status"),
            "created_at": created_user.get("created_at")
        }

    except Exception as e:
        # 关键：打印详细错误到终端
        import traceback
        print("=== 注册接口发生错误 ===")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        traceback.print_exc()   # 打印完整调用栈
        print("========================")
        
        raise HTTPException(
            status_code=500, 
            detail=f"注册失败: {str(e)}"
        )

# ===========================================
# 2. 登录接口
# ===========================================
@app.post("/auth/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """用户登录"""
    # 根据邮箱查找用户
    response = supabase.table("users").select("*").eq("email", form_data.username).execute()
    user = response.data[0] if response.data else None

    if not user or not verify_password(form_data.password, user.get("password_hash")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 检查账号状态
    if user.get("status") in ["Suspended", "suspended"]:
        raise HTTPException(status_code=403, detail="账号已被封禁，请联系管理员")

    # 生成 Token
    access_token = create_access_token(data={"sub": user["email"]})
    
    return {"access_token": access_token, "token_type": "bearer"}


# ===========================================
# 3. 查看个人信息（需要登录）
# ===========================================
@app.get("/profile", response_model=UserResponse)
def read_users_me(current_user: dict = Depends(get_current_user)):
    """获取当前登录用户的信息"""
    return {
        "user_id": current_user.get("user_id"),
        "username": current_user.get("username"),
        "email": current_user.get("email"),
        "role_id": current_user.get("role_id"),
        "status": current_user.get("status"),
        "created_at": current_user.get("created_at")
    }


# 根路径健康检查
@app.get("/")
def root():
    return {"message": "CSIT314 Backend is running successfully! (Supabase + FastAPI)"}