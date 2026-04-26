from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import EmailStr
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

# Import Supabase client
from database import supabase

app = FastAPI(title="CSIT314 Backend - IAM Module (Supabase)")

# ====================== Configuration ======================
SECRET_KEY = "CSIT314_SUPER_SECRET_KEY_NEVER_SHARE"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ====================== 依赖：获取当前用户 ======================
def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的凭证",
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
    user = response.data[0] if response.data else None

    if user is None:
        raise credentials_exception
    return user


# ===========================================
# Register Interface (Adapted for Supabase)
# ===========================================
@app.post("/auth/register", response_model=dict)
def register_user(
    email: EmailStr,
    password: str,
    username: str,
    phone_number: str = None
):
    # Check if email already exists
    existing = supabase.table("users").select("email").eq("email", email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="邮箱已被注册！")

    # Hash the password before storing
    hashed_pwd = get_password_hash(password)

    # Insert new user into Supabase (adjust field names based on your actual table schema)
    new_user_data = {
        "username": username,
        "email": email,
        "password_hash": hashed_pwd,     # 你表里是 password_hash，不是 hashed_password
        "role_id": 1,                    # 默认角色（根据你 roles 表调整）
        "status": "Pending"              # 你表里是 status，不是枚举对象
    }

    response = supabase.table("users").insert(new_user_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="注册失败")

    created_user = response.data[0]
    return {
        "id": created_user.get("user_id"),
        "email": created_user["email"],
        "username": created_user["username"],
        "status": created_user["status"],
        "message": "注册成功"
    }


# ===========================================
# 登录接口（已适配 Supabase）
# ===========================================
@app.post("/auth/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # 用 email 作为 username 登录
    response = supabase.table("users").select("*").eq("email", form_data.username).execute()
    user = response.data[0] if response.data else None

    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.get("status") == "Suspended" or user.get("status") == "suspended":
        raise HTTPException(status_code=400, detail="账号已被封禁")

    # 生成 JWT
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}


# ===========================================
# 查看个人信息（需要登录）
# ===========================================
@app.get("/profile")
def read_users_me(current_user: dict = Depends(get_current_user)):
    return {
        "user_id": current_user.get("user_id"),
        "username": current_user.get("username"),
        "email": current_user.get("email"),
        "role_id": current_user.get("role_id"),
        "status": current_user.get("status"),
        "created_at": current_user.get("created_at")
    }


# 健康检查
@app.get("/")
def root():
    return {"message": "CSIT314 Backend (Supabase) is running!"}