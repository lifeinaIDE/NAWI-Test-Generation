import json
import os
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel

class AuditEvent(BaseModel):
    timestamp: str
    userId: str
    role: str
    action: str
    reportId: str
    fromStatus: str
    toStatus: str
    comment: Optional[str] = None
    ruleSetVersion: Optional[str] = None

AUDIT_LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "audit", "audit-log.json")

class AuditService:
    def __init__(self, log_file: str = AUDIT_LOG_FILE):
        self.log_file = log_file

    def log_event(self, user_id: str, role: str, action: str, report_id: str, 
                  from_status: str, to_status: str, comment: Optional[str] = None, 
                  rule_set_version: Optional[str] = None) -> None:
        
        event = AuditEvent(
            timestamp=datetime.now(timezone.utc).isoformat(),
            userId=user_id,
            role=role,
            action=action,
            reportId=report_id,
            fromStatus=from_status,
            toStatus=to_status,
            comment=comment,
            ruleSetVersion=rule_set_version
        )
        
        # Append-only
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(event.model_dump_json() + "\n")

    def get_events_for_report(self, report_id: str) -> List[AuditEvent]:
        events = []
        if not os.path.exists(self.log_file):
            return events
            
        with open(self.log_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        data = json.loads(line)
                        if data.get("reportId") == report_id:
                            events.append(AuditEvent(**data))
                    except json.JSONDecodeError:
                        continue
        return events

    def get_all_events(self) -> List[AuditEvent]:
        events = []
        if not os.path.exists(self.log_file):
            return events
            
        with open(self.log_file, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        data = json.loads(line)
                        events.append(AuditEvent(**data))
                    except json.JSONDecodeError:
                        continue
        return events

audit_service = AuditService()

def get_audit_service() -> AuditService:
    return audit_service
