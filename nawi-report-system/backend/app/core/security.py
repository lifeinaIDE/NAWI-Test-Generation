from typing import Optional, List, Union
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.schemas import User
from app.repositories.user_repository import user_repository
from app.core.config import settings

ALGORITHM = "HS256"

# auto_error=False so missing authorization header raises 401 instead of FastAPI's default 403
security = HTTPBearer(auto_error=False)


def create_access_token(data: dict) -> str:
    from app.services.auth_service import auth_service
    return auth_service.create_access_token(data)


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=[{"level": "ERROR", "field": "", "message": "Could not validate credentials"}],
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials or not credentials.credentials:
        raise credentials_exception

    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.AUTH_SECRET, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user_dict = user_repository.get_by_id(user_id)
    if user_dict is None or not user_dict.get("active", True):
        raise credentials_exception

    return User(
        userId=user_dict["userId"],
        username=user_dict["username"],
        displayName=user_dict.get("displayName") or user_dict["username"],
        role=user_dict["role"],
        active=user_dict.get("active", True),
        laboratory=user_dict.get("laboratory", "Central Legal Metrology Laboratory"),
    )


def require_role(*roles: Union[str, List[str]]):
    if len(roles) == 1 and isinstance(roles[0], (list, tuple, set)):
        allowed = list(roles[0])
    else:
        allowed = list(roles)

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=[{"level": "ERROR", "field": "", "message": "Not authorized for this action"}],
            )
        return current_user

    return role_checker
