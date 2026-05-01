from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from database import supabase

# ====================== Configuration ======================
security = HTTPBearer()
SECRET_KEY = "CSIT314_2026_SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION_!@#$"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ====================== Dependencies ======================
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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

def get_current_fundraiser(current_user: dict = Depends(get_current_user)):
    """Only allow Fundraiser/Organization (role_id = 2)"""
    if current_user.get("role_id") != 2:
        raise HTTPException(status_code=403, detail="Fundraiser access required")
    return current_user

def get_current_donee(current_user: dict = Depends(get_current_user)):
    """Only allow Donee/Donor (role_id = 1)"""
    if current_user.get("role_id") != 1:
        raise HTTPException(status_code=403, detail="Donee/Donor access required")
    return current_user