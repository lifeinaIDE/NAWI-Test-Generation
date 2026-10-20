from datetime import datetime, timezone
from typing import List, Optional
from app.schemas import AuditEvent
from app.repositories.audit_repository import AuditRepository, get_audit_repository


class AuditService:
    def __init__(self, repo: Optional[AuditRepository] = None):
        self.repo = repo or get_audit_repository()

    def log_event(
        self,
        userId: str,
        role: str,
        action: str,
        reportId: str,
        fromStatus: str,
        toStatus: str,
        comment: Optional[str] = None,
        ruleSetVersion: Optional[str] = None,
        timestamp: Optional[str] = None,
    ) -> AuditEvent:
        """
        Logs an audit event in append-only storage via AuditRepository.
        """
        event_time = timestamp or datetime.now(timezone.utc).isoformat()
        event = AuditEvent(
            userId=userId,
            role=role,
            userRole=role,
            action=action,
            reportId=reportId,
            fromStatus=fromStatus,
            toStatus=toStatus,
            comment=comment,
            ruleSetVersion=ruleSetVersion,
            timestamp=event_time,
        )
        self.repo.append_event(event)
        return event

    def get_events_for_report(self, report_id: str) -> List[AuditEvent]:
        return self.repo.get_events_for_report(report_id)

    def get_all_events(self) -> List[AuditEvent]:
        return self.repo.get_all_events()


_audit_service_instance: Optional[AuditService] = None

def get_audit_service() -> AuditService:
    global _audit_service_instance
    if _audit_service_instance is None:
        _audit_service_instance = AuditService()
    return _audit_service_instance
