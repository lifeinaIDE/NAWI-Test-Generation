import json
import os
import uuid
from typing import Optional, List

USERS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "users", "users.json")

class JsonUserRepository:
    def _read_users(self) -> list[dict]:
        if not os.path.exists(USERS_FILE):
            return []
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Ensure each dict has both userId and id for seamless compatibility
            for u in data:
                uid = u.get("userId") or u.get("id")
                u["userId"] = uid
                u["id"] = uid
            return data

    def _write_users(self, users: list[dict]) -> None:
        os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)

    def list_users(self) -> List[dict]:
        return self._read_users()

    def get_by_username(self, username: str) -> Optional[dict]:
        users = self._read_users()
        for user in users:
            if user.get("username") == username:
                return user
        return None

    def get_user_by_username(self, username: str) -> Optional[dict]:
        return self.get_by_username(username)

    def get_by_id(self, user_id: str) -> Optional[dict]:
        users = self._read_users()
        for user in users:
            if user.get("userId") == user_id or user.get("id") == user_id:
                return user
        return None

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        return self.get_by_id(user_id)

    def create_user(self, user_data: dict) -> dict:
        users = self._read_users()
        uid = user_data.get("userId") or user_data.get("id") or f"user-{uuid.uuid4().hex[:6]}"
        new_user = {
            "userId": uid,
            "id": uid,
            "username": user_data.get("username", ""),
            "displayName": user_data.get("displayName") or user_data.get("username", "").capitalize(),
            "password": user_data.get("password", "demo123"),
            "role": user_data.get("role", "TECHNICIAN"),
            "active": user_data.get("active", True),
            "laboratory": user_data.get("laboratory", "Central Legal Metrology Laboratory"),
        }
        users.append(new_user)
        self._write_users(users)
        return new_user

    def update_user(self, user_id: str, user_data: dict) -> Optional[dict]:
        users = self._read_users()
        for i, user in enumerate(users):
            if user.get("userId") == user_id or user.get("id") == user_id:
                users[i].update(user_data)
                self._write_users(users)
                return users[i]
        return None

user_repository = JsonUserRepository()
