"""Attachments router — Phase 1 stub. Real upload handling in Phase 3."""
from fastapi import APIRouter, Depends
from app.schemas import User
from app.core.security import get_current_user, require_role

router = APIRouter(prefix="/api/reports", tags=["attachments"])


@router.post("/{report_id}/attachments", summary="Upload attachment (stub)")
async def upload_attachment(report_id: str, current_user: User = Depends(require_role(["TECHNICIAN", "ADMIN"]))):
    return {"reportId": report_id, "message": "Attachment upload — implemented in Phase 3"}


@router.get("/{report_id}/attachments/{attachment_id}", summary="Get attachment (stub)")
async def get_attachment(report_id: str, current_user: User = Depends(get_current_user)):
    return {"reportId": report_id, "attachmentId": attachment_id}


@router.delete("/{report_id}/attachments/{attachment_id}", summary="Delete attachment (stub)")
async def delete_attachment(report_id: str, current_user: User = Depends(require_role(["TECHNICIAN", "ADMIN"]))):
    return {"deleted": attachment_id}
