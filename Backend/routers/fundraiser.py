# routers/fundraiser.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone

import schemas
from database import supabase
from dependencies import get_current_fundraiser # Introduce the authentication function we just wrote

# Create Router instances and automatically add prefixes and category tags.
router = APIRouter(
    prefix="/fundraiser/activities",
    tags=["Sprint 2 - Fundraiser Activities"]
)

# Note: The path here is just "/" since the Router already has the prefix
@router.post("/", response_model=schemas.ActivityResponse)
def create_activity(activity: schemas.ActivityCreate, current_user: dict = Depends(get_current_fundraiser)):
    new_activity = {
        "fundraiser_id": current_user["user_id"],
        "category_id": activity.category_id,
        "title": activity.title,
        "description": activity.description,
        "target_amount": activity.target_amount,
        "is_private": activity.is_private,
        "status": "Ongoing",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    response = supabase.table("activities").insert(new_activity).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create activity")
    return response.data[0]

@router.get("/")
def get_my_activities(
    status: Optional[str] = Query(None, description="Filter by Ongoing or Closed"), 
    current_user: dict = Depends(get_current_fundraiser)
):
    query = supabase.table("activities").select("*").eq("fundraiser_id", current_user["user_id"])
    if status:
        query = query.eq("status", status)
    response = query.order("created_at", desc=True).execute()
    
    activities = response.data
    for act in activities:
        bookmark_count = supabase.table("bookmarks").select("bookmark_id", count="exact").eq("activity_id", act["activity_id"]).execute()
        act["shortlist_count"] = bookmark_count.count
    return activities

@router.get("/suggest-target")
def get_suggested_target(
    category_id: int = Query(..., description="The category ID to analyze"),
    current_user: dict = Depends(get_current_fundraiser)
):
    response = supabase.table("activities").select("target_amount").eq("category_id", category_id).eq("status", "Closed").gt("current_amount", 0).execute()
    activities = response.data
    if not activities:
        return {"category_id": category_id, "suggested_target": 500.00, "based_on_records": 0, "message": "Insufficient historical data, using default baseline."}
    
    average_target = round(sum(act["target_amount"] for act in activities) / len(activities), 2)
    return {"category_id": category_id, "suggested_target": average_target, "based_on_records": len(activities), "message": f"Based on {len(activities)} successful campaigns in this category."}

@router.patch("/{activity_id}", response_model=schemas.ActivityResponse)
def update_activity(activity_id: int, update_data: schemas.ActivityUpdate, current_user: dict = Depends(get_current_fundraiser)):
    existing_resp = supabase.table("activities").select("*").eq("activity_id", activity_id).eq("fundraiser_id", current_user["user_id"]).execute()
    if not existing_resp.data:
        raise HTTPException(status_code=404, detail="Activity not found or unauthorized")
    
    if existing_resp.data[0]["status"] == "Closed":
        raise HTTPException(status_code=400, detail="Cannot edit a closed activity")

    update_dict = update_data.dict(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No data provided for update")
        
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = supabase.table("activities").update(update_dict).eq("activity_id", activity_id).execute()
    return res.data[0]

@router.post("/{activity_id}/close")
def close_activity(activity_id: int, current_user: dict = Depends(get_current_fundraiser)):
    res = supabase.table("activities").update({"status": "Closed"}).eq("activity_id", activity_id).eq("fundraiser_id", current_user["user_id"]).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Activity not found or unauthorized")
    return {"message": "Activity successfully closed"}
