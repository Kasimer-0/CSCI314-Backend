# routers/donee.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone

import schemas
from database import supabase
from dependencies import get_current_donee

router = APIRouter(tags=["Sprint 2 - Donee & Public Activities"])

@router.get("/activities", response_model=list[schemas.ActivityResponse])
def search_activities(
    keyword: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
    sort_desc: bool = Query(True)
):
    query = supabase.table("activities").select("*").eq("is_private", False).eq("status", "Ongoing")
    if category_id: query = query.eq("category_id", category_id)
    if keyword: query = query.ilike("title", f"%{keyword}%")
        
    if sort_by in ["created_at", "target_amount"]:
        query = query.order(sort_by, desc=sort_desc)
        
    response = query.execute()
    activities = response.data

    if sort_by == "remaining_amount":
        activities.sort(key=lambda x: max(0, x["target_amount"] - x.get("current_amount", 0)), reverse=sort_desc)
    return activities

@router.get("/activities/{activity_id}")
def get_activity_detail(activity_id: int):
    response = supabase.table("activities").select("*, users(username, email)").eq("activity_id", activity_id).execute()
    if not response.data: raise HTTPException(status_code=404, detail="Not found")
    activity = response.data[0]
    
    new_views = activity.get("view_count", 0) + 1
    supabase.table("activities").update({"view_count": new_views}).eq("activity_id", activity_id).execute()
    activity["view_count"] = new_views
    return activity

@router.post("/donee/bookmarks")
def toggle_bookmark(request: schemas.BookmarkRequest, current_user: dict = Depends(get_current_donee)):
    existing = supabase.table("bookmarks").select("*").eq("user_id", current_user["user_id"]).eq("activity_id", request.activity_id).execute()
    if existing.data:
        supabase.table("bookmarks").delete().eq("bookmark_id", existing.data[0]["bookmark_id"]).execute()
        return {"message": "Activity removed from favorites", "is_bookmarked": False}
    
    supabase.table("bookmarks").insert({
        "user_id": current_user["user_id"],
        "activity_id": request.activity_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }).execute()
    return {"message": "Activity saved to favorites", "is_bookmarked": True}

@router.get("/donee/bookmarks")
def get_my_bookmarks(current_user: dict = Depends(get_current_donee)):
    return supabase.table("bookmarks").select("bookmark_id, created_at, activities(*)").eq("user_id", current_user["user_id"]).order("created_at", desc=True).execute().data

@router.get("/donee/dashboard/category-popularity")
def get_category_popularity():
    categories_resp = supabase.table("categories").select("category_id, name").execute()
    stats = {cat["category_id"]: {"name": cat["name"], "count": 0, "amount": 0.0} for cat in categories_resp.data} if categories_resp.data else {}
    
    activities_resp = supabase.table("activities").select("category_id, current_amount").execute()
    for act in activities_resp.data:
        cat_id = act.get("category_id")
        if cat_id in stats:
            stats[cat_id]["count"] += 1
            stats[cat_id]["amount"] += float(act.get("current_amount", 0))
            
    return {
        "chart_data": {
            "labels": [data["name"] for data in stats.values()],
            "activity_counts": [data["count"] for data in stats.values()],
            "total_amounts": [round(data["amount"], 2) for data in stats.values()]
        },
        "message": "Data aggregated successfully."
    }