import json
import os
from typing import Optional

USERS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "users", "users.json")

class JsonUserRepository:
    def _read_users(self) -> list[dict]:
        if not os.path.exists(USERS_FILE):
            return []
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_user_by_username(self, username: str) -> Optional[dict]:
        users = self._read_users()
        for user in users:
            if user.get("username") == username:
                return user
        return None

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        users = self._read_users()
        for user in users:
            if user.get("id") == user_id:
                return user
        return None

user_repository = JsonUserRepository()
