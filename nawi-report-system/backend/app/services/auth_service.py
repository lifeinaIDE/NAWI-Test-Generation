from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import bcrypt
from jose import jwt, JWTError
from app.core.config import settings
from app.repositories.user_repository import user_repository

ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 8

class AuthService:
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        try:
            # First check if it's a bcrypt hash
            if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$") or hashed_password.startswith("$2y$"):
                return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
            # Fallback for plain demo passwords if any
            return plain_password == hashed_password
        except Exception:
            return False

    def hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def authenticate_user(self, username: str, password: str) -> Optional[dict]:
        user = user_repository.get_by_username(username)
        if not user:
            return None
        if not user.get("active", True):
            return None
        if not self.verify_password(password, user.get("password", "")):
            return None
        return user

    def create_access_token(self, user: dict) -> str:
        expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
        user_id = user.get("userId") or user.get("id")
        claims = {
            "sub": user_id,
            "role": user.get("role", "TECHNICIAN"),
            "name": user.get("displayName") or user.get("username", ""),
            "exp": expire,
        }
        encoded = jwt.encode(claims, settings.AUTH_SECRET, algorithm=ALGORITHM)
        return encoded

auth_service = AuthService()

def get_auth_service() -> AuthService:
    return auth_service
