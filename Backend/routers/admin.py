# routers/admin.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone

import schemas
from database import supabase
from dependencies import get_current_admin
# 注意：你需要从 auth 里面借用 hash 密码的函数，或者简单复制一份
from routers.auth import get_password_hash

router = APIRouter(prefix="/admin", tags=["Sprint 1 - Admin Features"])

def log_admin_action(admin_id: int, target_user_id: int, action: str, details: str = ""):
    log_data = {"admin_id": admin_id, "target_user_id": target_user_id, "action": action, "details": details, "created_at": datetime.now(timezone.utc).isoformat()}
    supabase.table("audit_logs").insert(log_data).execute()

@router.post("/create-admin", response_model=schemas.UserResponse)
def create_admin(admin_data: schemas.AdminCreate, current_admin: dict = Depends(get_current_admin)):
    existing = supabase.table("users").select("user_id").eq("email", admin_data.email).execute()
    if existing.data: raise HTTPException(status_code=400, detail="Email exists")

    new_admin = {
        "username": admin_data.username, "email": admin_data.email,
        "password_hash": get_password_hash(admin_data.password), "role_id": 0,
        "status": "Active", "is_suspended": False, "phone_number": admin_data.phone_number,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    return supabase.table("users").insert(new_admin).execute().data[0]

@router.get("/users")
def admin_search_users(
    email: Optional[str] = Query(None), username: Optional[str] = Query(None),
    role_id: Optional[int] = Query(None), status: Optional[str] = Query(None),
    current_admin: dict = Depends(get_current_admin)
):
    query = supabase.table("users").select("*")
    if email: query = query.eq("email", email)
    if username: query = query.ilike("username", f"%{username}%")
    if role_id is not None: query = query.eq("role_id", role_id)
    if status: query = query.eq("status", status)
    return query.order("created_at", desc=True).execute().data

@router.patch("/users/{user_id}")
def admin_update_user(user_id: int, update_data: schemas.AdminUserUpdate, current_admin: dict = Depends(get_current_admin)):
    update_dict = update_data.dict(exclude_unset=True)
    if not update_dict: raise HTTPException(status_code=400, detail="No data")
    res = supabase.table("users").update(update_dict).eq("user_id", user_id).execute()
    if not res.data: raise HTTPException(status_code=404, detail="User not found")
    log_admin_action(current_admin["user_id"], user_id, "UPDATE_USER", f"Fields: {list(update_dict.keys())}")
    return {"message": "Updated"}

@router.post("/approve/{user_id}")
def approve_user(user_id: int, current_admin: dict = Depends(get_current_admin)):
    res = supabase.table("users").update({"status": "Active", "is_suspended": False}).eq("user_id", user_id).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Not found")
    log_admin_action(current_admin["user_id"], user_id, "APPROVE_USER")
    return {"message": "Approved"}

@router.post("/users/{user_id}/suspend")
def suspend_user(user_id: int, current_admin: dict = Depends(get_current_admin)):
    res = supabase.table("users").update({"status": "Suspended", "is_suspended": True}).eq("user_id", user_id).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Not found")
    log_admin_action(current_admin["user_id"], user_id, "SUSPEND_USER")
    return {"message": "Suspended"}

@router.post("/users/{user_id}/reactivate")
def reactivate_user(user_id: int, current_admin: dict = Depends(get_current_admin)):
    res = supabase.table("users").update({"status": "Active", "is_suspended": False}).eq("user_id", user_id).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Not found")
    log_admin_action(current_admin["user_id"], user_id, "REACTIVATE_USER")
    return {"message": "Reactivated"}

@router.get("/audit-logs")
def get_audit_logs(current_admin: dict = Depends(get_current_admin)):
    return supabase.table("audit_logs").select("*").order("created_at", desc=True).execute().data