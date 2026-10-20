"""
Attachments router — file upload, download, and deletion with magic bytes verification.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse

from app.schemas import User
from app.core.security import get_current_user, require_role
from app.services.report_service import get_report_service, ReportService
from app.repositories.attachment_repository import (
    get_attachment_repository,
    AttachmentRepository,
    sanitize_filename,
)

router = APIRouter(prefix="/api/reports", tags=["attachments"])


@router.post("/{report_id}/attachments", summary="Upload attachment")
async def upload_attachment(
    report_id: str,
    file: UploadFile = File(...),
    category: str = Form("photo"),
    expiryDate: Optional[str] = Form(None),
    current_user: User = Depends(require_role(["TECHNICIAN", "ADMIN"])),
    report_service: ReportService = Depends(get_report_service),
    attachment_repo: AttachmentRepository = Depends(get_attachment_repository),
):
    content = await file.read()
    filename = file.filename or "attachment"

    try:
        attachment_id, stored_filename, size, mime_type = attachment_repo.save_attachment(
            filename, content
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    now_iso = datetime.utcnow().isoformat() + "Z"
    attachment_data = {
        "id": attachment_id,
        "filename": sanitize_filename(filename),
        "storedFilename": stored_filename,
        "type": mime_type,
        "category": category,
        "size": size,
        "uploadedAt": now_iso,
        "expiryDate": expiryDate if expiryDate else None,
    }

    # Service layer enforces immutability (403 on APPROVED/REJECTED)
    return report_service.add_attachment(report_id, attachment_data, current_user)


@router.get("/{report_id}/attachments", summary="List attachments")
async def list_attachments(
    report_id: str,
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service),
):
    report = report_service.get_report(report_id, current_user)
    return report.attachments or []


@router.get("/{report_id}/attachments/{attachment_id}", summary="Download attachment")
async def get_attachment(
    report_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service),
    attachment_repo: AttachmentRepository = Depends(get_attachment_repository),
):
    report = report_service.get_report(report_id, current_user)
    target = None
    for att in report.attachments or []:
        att_id = att.get("id") if isinstance(att, dict) else getattr(att, "id", None)
        if att_id == attachment_id:
            target = att
            break

    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    stored_name = target.get("storedFilename") if isinstance(target, dict) else getattr(target, "storedFilename", "")
    filename = target.get("filename") if isinstance(target, dict) else getattr(target, "filename", "attachment")
    mime_type = target.get("type") if isinstance(target, dict) else getattr(target, "type", "application/octet-stream")

    filepath = attachment_repo.get_attachment_path(stored_name)
    if not filepath:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment file not found on disk")

    return FileResponse(filepath, media_type=mime_type, filename=filename)


@router.delete("/{report_id}/attachments/{attachment_id}", summary="Delete attachment")
async def delete_attachment(
    report_id: str,
    attachment_id: str,
    current_user: User = Depends(require_role(["TECHNICIAN", "ADMIN"])),
    report_service: ReportService = Depends(get_report_service),
    attachment_repo: AttachmentRepository = Depends(get_attachment_repository),
):
    # Service layer enforces immutability (403 on APPROVED/REJECTED)
    res = report_service.delete_attachment(report_id, attachment_id, current_user)
    stored_name = res.get("storedFilename")
    if stored_name:
        attachment_repo.delete_attachment(stored_name)

    return {"deleted": attachment_id, "success": True}
