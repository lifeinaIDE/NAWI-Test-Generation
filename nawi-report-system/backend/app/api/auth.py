"""
Auth router — validates credentials against users.json and issues JWT tokens.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas import LoginRequest, LoginResponse, User
from app.core.security import get_current_user
from app.services.auth_service import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    """Validates against users.json and returns a signed HS256 JWT."""
    user_dict = auth_service.authenticate_user(body.username, body.password)
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=[{"level": "ERROR", "field": "", "message": "Incorrect username or password"}],
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth_service.create_access_token(user_dict)

    return LoginResponse(
        token=access_token,
        user=User(
            userId=user_dict["userId"],
            username=user_dict["username"],
            displayName=user_dict.get("displayName") or user_dict["username"],
            role=user_dict["role"],
            active=user_dict.get("active", True),
            laboratory=user_dict.get("laboratory", "Central Legal Metrology Laboratory"),
        ),
    )


@router.get("/me", response_model=User)
async def me(current_user: User = Depends(get_current_user)):
    """Decodes the JWT from the Authorization header and returns the current user."""
    return current_user
