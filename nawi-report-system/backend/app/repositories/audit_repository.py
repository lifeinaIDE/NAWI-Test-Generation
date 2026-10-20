import json
import os
import uuid
from typing import List, Optional
from app.schemas import AuditEvent
from app.core.config import get_settings


class AuditRepository:
    def __init__(self, log_path: Optional[str] = None):
        if log_path:
            self.log_path = log_path
        else:
            settings = get_settings()
            storage_path = settings.STORAGE_PATH
            self.log_path = os.path.join(storage_path, "audit", "audit-log.jsonl")
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)

    def append_event(self, event: AuditEvent) -> None:
        """
        Appends an AuditEvent to the JSONL audit file.
        Strict append-only disk I/O.
        """
        if not event.eventId:
            event.eventId = str(uuid.uuid4())
        if not event.userRole and event.role:
            event.userRole = event.role
        if not event.role and event.userRole:
            event.role = event.userRole

        with open(self.log_path, "a", encoding="utf-8") as f:
            f.write(event.model_dump_json(by_alias=True) + "\n")

    def get_events_for_report(self, report_id: str) -> List[AuditEvent]:
        events = []
        if not os.path.exists(self.log_path):
            return events

        with open(self.log_path, "r", encoding="utf-8") as f:
            for line in f:
                line_str = line.strip()
                if not line_str:
                    continue
                try:
                    data = json.loads(line_str)
                    if data.get("reportId") == report_id:
                        if "userRole" in data and "role" not in data:
                            data["role"] = data["userRole"]
                        if "role" in data and "userRole" not in data:
                            data["userRole"] = data["role"]
                        if "eventId" not in data:
                            data["eventId"] = str(uuid.uuid4())
                        events.append(AuditEvent(**data))
                except (json.JSONDecodeError, TypeError, ValueError):
                    continue
        return events

    def get_all_events(self) -> List[AuditEvent]:
        events = []
        if not os.path.exists(self.log_path):
            return events

        with open(self.log_path, "r", encoding="utf-8") as f:
            for line in f:
                line_str = line.strip()
                if not line_str:
                    continue
                try:
                    data = json.loads(line_str)
                    if "userRole" in data and "role" not in data:
                        data["role"] = data["userRole"]
                    if "role" in data and "userRole" not in data:
                        data["userRole"] = data["role"]
                    if "eventId" not in data:
                        data["eventId"] = str(uuid.uuid4())
                    events.append(AuditEvent(**data))
                except (json.JSONDecodeError, TypeError, ValueError):
                    continue
        return events


_audit_repository_instance: Optional[AuditRepository] = None

def get_audit_repository() -> AuditRepository:
    global _audit_repository_instance
    if _audit_repository_instance is None:
        _audit_repository_instance = AuditRepository()
    return _audit_repository_instance
