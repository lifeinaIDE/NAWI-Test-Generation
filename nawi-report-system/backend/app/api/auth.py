"""
Auth router — validates credentials against users.json and issues JWT tokens.

Error-handling convention:
  4xx responses always return: { "detail": [ ValidationMessage ] }
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas import LoginRequest, LoginResponse, User
from app.core.security import create_access_token, get_current_user
from app.repositories.user_repository import user_repository

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    """Validates against users.json and returns a signed JWT."""
    user_dict = user_repository.get_user_by_username(body.username)
    if not user_dict or user_dict.get("password") != body.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=[{"level": "ERROR", "field": "", "message": "Incorrect username or password"}],
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user_dict["id"], "role": user_dict["role"]})
    
    return LoginResponse(
        token=access_token,
        user=User(
            id=user_dict["id"],
            username=user_dict["username"],
            role=user_dict["role"],
            laboratory=user_dict["laboratory"],
        ),
    )


@router.get("/me", response_model=User)
async def me(current_user: User = Depends(get_current_user)):
    """Decodes the JWT from the Authorization header and returns the current user."""
    return current_user
