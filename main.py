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
@app.post("/auth/register", response_model=UserResponse)
def register_user(user: UserCreate):
    """User registration - enhanced version (with detailed error logging)"""
    try:
        print(f"Received registration request: email={user.email}, username={user.username}")  # Debug log

        # Check if email already exists
        existing = supabase.table("users").select("email").eq("email", user.email).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="This email is already registered!")

        # Hash password
        password_hash = get_password_hash(user.password)

        # Prepare data for insertion (must match Supabase users table fields)
        new_user = {
            "username": user.username,
            "email": user.email,
            "password_hash": password_hash,
            "role_id": 1,  # Adjust based on roles table (0 or 1)
            "status": "Pending"
        }

        print("Data to be inserted:", new_user)  # Debug log

        # Execute insertion
        response = supabase.table("users").insert(new_user).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Database insertion failed, empty response")

        created_user = response.data[0]
        print("Registration successful, user ID:", created_user.get("user_id"))

        return {
            "user_id": created_user.get("user_id"),
            "username": created_user.get("username"),
            "email": created_user.get("email"),
            "role_id": created_user.get("role_id"),
            "status": created_user.get("status"),
            "created_at": created_user.get("created_at")
        }

    except Exception as e:
        # Critical: print detailed error logs to terminal
        import traceback
        print("=== Registration API Error ===")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        traceback.print_exc()  # Full stack trace
        print("============================")

        raise HTTPException(
            status_code=500,
            detail=f"Registration failed: {str(e)}"
        )


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
# 4. User Registration (Integrated with S9 encryption, S10 default role, S11 pending status)
# ===========================================
@app.post("/auth/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate):
    # a. Check if email already exists
    response = supabase.table("users").select("*").eq("email", user.email).execute()
    if len(response.data) > 0:
        raise HTTPException(status_code=400, detail="Email already registered!")

    # b. Privacy encryption (Story 9)
    hashed_pwd = get_password_hash(user.password)

    # c. Prepare data for Supabase insertion
    new_user_data = {
        "email": user.email,
        "password_hash": hashed_pwd,  # Must match login query field
        "username": user.username,
        "phone_number": user.phone_number,
        # Restore S10 & S11: assign default values
        "role": schemas.UserRole.DONEE.value,
        "status": schemas.UserStatus.PENDING.value
    }

    # d. Insert into Supabase database
    insert_response = supabase.table("users").insert(new_user_data).execute()

    if not insert_response.data:
        raise HTTPException(status_code=500, detail="User creation failed, please check table structure")

    return insert_response.data[0]


# ===========================================
# 5. Helper: Audit Log Generator (Story 12)
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
# 6. Admin Feature: Suspend User and Log Action (Story 11 & Story 12)
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
