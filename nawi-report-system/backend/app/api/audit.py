from fastapi import APIRouter, Depends
from app.schemas import User
from app.core.security import require_role
from app.services.audit_service import get_audit_service, AuditService

router = APIRouter(prefix="/api/audit", tags=["audit"])

@router.get("", summary="Global audit log (admin only)")
async def get_audit_log(
    current_user: User = Depends(require_role(["ADMIN"])),
    audit_service: AuditService = Depends(get_audit_service)
):
    events = audit_service.get_all_events()
    return {"events": events, "total": len(events)}
