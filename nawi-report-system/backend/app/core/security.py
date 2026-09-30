import os
import warnings
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel

from app.schemas import User
from app.repositories.user_repository import user_repository

_default_secret = "change-me-in-production-set-AUTH_SECRET-env-var"
AUTH_SECRET = os.getenv("AUTH_SECRET", _default_secret)

if AUTH_SECRET == _default_secret:
    warnings.warn(
        "AUTH_SECRET is using the insecure default value. "
        "Set the AUTH_SECRET environment variable in production.",
        stacklevel=1,
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

security = HTTPBearer()

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, AUTH_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=[{"level": "ERROR", "field": "", "message": "Could not validate credentials"}],
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, AUTH_SECRET, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user_dict = user_repository.get_user_by_id(user_id)
    if user_dict is None:
        raise credentials_exception
    
    return User(
        id=user_dict["id"],
        username=user_dict["username"],
        role=user_dict["role"],
        laboratory=user_dict["laboratory"]
    )

def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=[{"level": "ERROR", "field": "", "message": "Not authorized for this action"}],
            )
        return current_user
    return role_checker
