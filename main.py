from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import EmailStr, BaseModel
from datetime import datetime, timedelta, timezone

import jwt
import schemas

from typing import Optional

# Import Supabase
from database import supabase

app = FastAPI(title="CSIT314 Backend - IAM Module (Supabase)")

# ====================== Configuration ======================
SECRET_KEY = "CSIT314_2026_SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION_!@#$"  # Recommended to load from .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # Recommended to set to 60 minutes

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ====================== Password Handling ======================
import bcrypt


def get_password_hash(password: str) -> str:
    """Hash the password (recommended approach)"""
    # Convert password to bytes and hash it
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify if the password is correct"""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            password_hash.encode('utf-8')
        )
    except Exception:
        return False


def create_access_token(data: dict):
    """Generate JWT token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ====================== Get Current Logged-in User ======================
def get_current_user(token: str = Depends(oauth2_scheme)):
    """Validate token and return current user information"""
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

    # Query user from Supabase
    response = supabase.table("users").select("*").eq("email", email).execute()
    if not response.data:
        raise credentials_exception

    user = response.data[0]
    return user


# ====================== Pydantic Data Models ======================
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str  # Corresponds to the username field in database
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
# 1. Register API
# ===========================================
@app.post("/auth/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate):
    # 1. Check if the email address has already been registered.
    response = supabase.table("users").select("*").eq("email", user.email).execute()
    if len(response.data) > 0:
        raise HTTPException(status_code=400, detail="邮箱已被注册！")

    # 2. Encryption Password
    hashed_pwd = get_password_hash(user.password)

    # 3. Construct the data to be stored in the database
    new_user_data = {
        "email": user.email,
        "password_hash": hashed_pwd,
        "username": user.username,
        "phone_number": user.phone_number,
        "role": schemas.UserRole.DONEE.value,
        "status": schemas.UserStatus.PENDING.value
    }

    # 4. Perform the insert operation and catch errors.
    try:
        insert_response = supabase.table("users").insert(new_user_data).execute()
    except Exception as e:
        # If there are other incorrect column names in the database, the error will be clearly returned to the webpage here.
        raise HTTPException(status_code=500, detail=f"Database insertion failed: {str(e)}")

    if not insert_response.data:
        raise HTTPException(status_code=500, detail="Registration failed, no data returned from the database.")

    return insert_response.data[0]

# ===========================================
# 2. Login API
# ===========================================
@app.post("/auth/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """User login"""
    # Find user by email
    response = supabase.table("users").select("*").eq("email", form_data.username).execute()
    user = response.data[0] if response.data else None

    if not user or not verify_password(form_data.password, user.get("password_hash")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check account status
    if user.get("status") in ["Suspended", "suspended"]:
        raise HTTPException(status_code=403, detail="Account is suspended, please contact admin")

    # Generate token
    access_token = create_access_token(data={"sub": user["email"]})

    return {"access_token": access_token, "token_type": "bearer"}


# ===========================================
# 3. View Profile (Requires Login)
# ===========================================
@app.get("/profile", response_model=UserResponse)
def read_users_me(current_user: dict = Depends(get_current_user)):
    """Get current logged-in user's information"""
    return {
        "user_id": current_user.get("user_id"),
        "username": current_user.get("username"),
        "email": current_user.get("email"),
        "role_id": current_user.get("role_id"),
        "status": current_user.get("status"),
        "created_at": current_user.get("created_at")
    }


# Root health check
@app.get("/")
def root():
    return {"message": "CSIT314 Backend is running successfully! (Supabase + FastAPI)"}

# ===========================================
# 4. Helper: Audit Log Generator (Story 12)
# ===========================================
def log_admin_action(admin_id: int, target_user_id: int, action: str, details: str = ""):
    log_data = {
        "admin_id": admin_id,
        "target_user_id": target_user_id,
        "action": action,
        "details": details
    }
    supabase.table("audit_logs").insert(log_data).execute()


# ===========================================
# 5. Admin Feature: Suspend User and Log Action (Story 11 & Story 12)
# ===========================================
@app.post("/admin/users/{target_user_id}/suspend")
def suspend_user(target_user_id: int):
    # a. Update user status in Supabase
    update_res = supabase.table("users").update({"status": "suspended"}).eq("id", target_user_id).execute()

    if len(update_res.data) == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # b. Log admin action (assuming admin ID = 1)
    log_admin_action(
        admin_id=1,
        target_user_id=target_user_id,
        action="SUSPEND_USER",
        details="Admin manually suspended this account"
    )

    return {"message": "User successfully suspended and logged in audit logs"}


# ===========================================
# 6. [Supplementary] Administrator Function: Approving Users (Story 10)
# ===========================================
@app.post("/admin/users/{target_user_id}/approve")
def approve_user(target_user_id: int):
    # Change the status from pending to active
    update_res = supabase.table("users").update({"status": "active"}).eq("user_id", target_user_id).execute()

    if len(update_res.data) == 0:
        raise HTTPException(status_code=404, detail="The user awaiting approval could not be found.")

    # Record audit logs (Story 12)
    log_admin_action(admin_id=1, target_user_id=target_user_id, action="APPROVE_USER", details="The administrator approved the user's application.")

    return {"message": "User has been successfully activated."}

# ===========================================
# 7. [Supplementary] Administrator Function: View Audit Logs (Story 12)
# ===========================================
@app.get("/admin/audit-logs")
def get_audit_logs():
    # Read all operation records from Supabase
    response = supabase.table("audit_logs").select("*").order("id", desc=True).execute()
    return response.data