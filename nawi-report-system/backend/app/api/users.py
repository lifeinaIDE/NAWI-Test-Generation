"""
Users router — user management endpoints (admin only).
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas import User
from app.core.security import require_role
from app.repositories.user_repository import user_repository

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=List[User], summary="List users")
async def list_users(current_user: User = Depends(require_role(["ADMIN"]))):
    raw_users = user_repository.list_users()
    return [
        User(
            userId=u.get("userId") or u.get("id"),
            username=u["username"],
            displayName=u.get("displayName") or u["username"].capitalize(),
            role=u["role"],
            active=u.get("active", True),
            laboratory=u.get("laboratory", "")
        )
        for u in raw_users
    ]


@router.post("", response_model=User, summary="Create user")
async def create_user(body: dict, current_user: User = Depends(require_role(["ADMIN"]))):
    existing = user_repository.get_user_by_username(body.get("username", ""))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=[{"level": "ERROR", "field": "username", "message": "Username already exists"}]
        )
    created = user_repository.create_user(body)
    return User(
        userId=created.get("userId") or created.get("id"),
        username=created["username"],
        displayName=created.get("displayName") or created["username"].capitalize(),
        role=created["role"],
        active=created.get("active", True),
        laboratory=created.get("laboratory", "")
    )


@router.put("/{user_id}", response_model=User, summary="Update user")
async def update_user(user_id: str, body: dict, current_user: User = Depends(require_role(["ADMIN"]))):
    updated = user_repository.update_user(user_id, body)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return User(
        userId=updated.get("userId") or updated.get("id"),
        username=updated["username"],
        displayName=updated.get("displayName") or updated["username"].capitalize(),
        role=updated["role"],
        active=updated.get("active", True),
        laboratory=updated.get("laboratory", "")
    )
