from fastapi import APIRouter, Depends, HTTPException, Body
from app.schemas import Report, User
from app.core.security import get_current_user, require_role
from app.services.report_service import get_report_service, ReportService

router = APIRouter(prefix="/api/reports", tags=["reports"])

from typing import Optional

@router.get("", summary="List reports")
async def list_reports(
    status: Optional[str] = None,
    model: Optional[str] = None,
    serial: Optional[str] = None,
    serialNumber: Optional[str] = None,
    manufacturer: Optional[str] = None,
    dateFrom: Optional[str] = None,
    dateTo: Optional[str] = None,
    accuracyClass: Optional[str] = None,
    result: Optional[str] = None,
    finalResult: Optional[str] = None,
    q: Optional[str] = None,
    sortBy: Optional[str] = "createdAt",
    sortOrder: Optional[str] = "desc",
    page: int = 1,
    pageSize: int = 20,
    current_user: User = Depends(get_current_user)
):
    from app.services.search_service import get_search_service
    service = get_search_service()
    all_filtered = service.search(
        current_user=current_user,
        status=status,
        model=model,
        serialNumber=serialNumber or serial,
        manufacturer=manufacturer,
        dateFrom=dateFrom,
        dateTo=dateTo,
        accuracyClass=accuracyClass,
        finalResult=finalResult or result,
        q=q,
        sortBy=sortBy,
        sortOrder=sortOrder,
    )
    
    p = max(1, page)
    ps = max(1, pageSize)
    start_idx = (p - 1) * ps
    end_idx = start_idx + ps
    paginated = all_filtered[start_idx:end_idx]
    
    return {
        "items": paginated,
        "page": p,
        "pageSize": ps,
        "total": len(all_filtered)
    }


@router.post("", response_model=Report, summary="Create report")
async def create_report(body: dict, current_user: User = Depends(require_role(["TECHNICIAN", "ADMIN"])), service: ReportService = Depends(get_report_service)):
    return service.create_report(current_user, body)


@router.get("/{report_id}", response_model=Report, summary="Get report")
async def get_report(report_id: str, current_user: User = Depends(get_current_user), service: ReportService = Depends(get_report_service)):
    return service.get_report(report_id, current_user)


@router.put("/{report_id}", response_model=Report, summary="Update report")
async def update_report(report_id: str, body: dict, current_user: User = Depends(require_role(["TECHNICIAN", "ADMIN"])), service: ReportService = Depends(get_report_service)):
    return service.update_report(report_id, body, current_user)


@router.delete("/{report_id}", summary="Delete report")
async def delete_report(report_id: str, current_user: User = Depends(require_role(["TECHNICIAN", "ADMIN"])), service: ReportService = Depends(get_report_service)):
    deleted = service.delete_report(report_id, current_user)
    return {"deleted": report_id, "success": deleted}


from app.services.workflow_service import get_workflow_service, WorkflowService


@router.post("/{report_id}/submit", response_model=Report, summary="Submit for review")
async def submit_report(
    report_id: str,
    current_user: User = Depends(require_role(["TECHNICIAN", "ADMIN"])),
    workflow_service: WorkflowService = Depends(get_workflow_service),
):
    return workflow_service.execute_transition("submit", report_id, current_user)


@router.post("/{report_id}/return", response_model=Report, summary="Return to technician")
async def return_report(
    report_id: str,
    body: dict = Body(default_factory=dict),
    current_user: User = Depends(require_role(["REVIEWER", "ADMIN"])),
    workflow_service: WorkflowService = Depends(get_workflow_service),
):
    return workflow_service.execute_transition(
        "return", report_id, current_user, comment=body.get("comment", "") if body else ""
    )


@router.post("/{report_id}/approve", response_model=Report, summary="Approve report")
async def approve_report(
    report_id: str,
    body: dict = Body(default_factory=dict),
    current_user: User = Depends(require_role(["REVIEWER", "ADMIN"])),
    workflow_service: WorkflowService = Depends(get_workflow_service),
):
    return workflow_service.execute_transition(
        "approve", report_id, current_user, comment=body.get("comment", "") if body else ""
    )


@router.post("/{report_id}/reject", response_model=Report, summary="Reject report")
async def reject_report(
    report_id: str,
    body: dict = Body(default_factory=dict),
    current_user: User = Depends(require_role(["REVIEWER", "ADMIN"])),
    workflow_service: WorkflowService = Depends(get_workflow_service),
):
    return workflow_service.execute_transition(
        "reject", report_id, current_user, comment=body.get("comment", "") if body else ""
    )


@router.post("/{report_id}/finalize", summary="Finalize report / generate PDF")
async def finalize_report(
    report_id: str,
    current_user: User = Depends(require_role(["REVIEWER", "ADMIN"])),
    workflow_service: WorkflowService = Depends(get_workflow_service),
):
    return workflow_service.finalize_approved_report(report_id)


from fastapi.responses import FileResponse
import os
from app.repositories.report_repository import get_report_repository, ReportRepository

@router.get("/{report_id}/download", summary="Download PDF")
@router.get("/{report_id}/pdf", summary="Download PDF (alias)")
async def download_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    report_repo: ReportRepository = Depends(get_report_repository),
):
    report = report_repo.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Role filtering & status check:
    # technician: own approved; viewer: approved only; reviewer/admin: all approved
    if report.status != "APPROVED":
        raise HTTPException(
            status_code=403,
            detail="Only approved reports can be downloaded as PDF",
        )

    user_id = getattr(current_user, "userId", None) or getattr(current_user, "id", None)
    creator_id = getattr(report, "createdBy", None) or getattr(report, "technicianId", None)

    if current_user.role == "TECHNICIAN" and creator_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Technicians can only download their own approved reports",
        )

    from app.core.config import get_settings
    settings = get_settings()
    pdf_path = os.path.join(settings.STORAGE_PATH, "generated-reports", f"{report_id}.pdf")

    if not os.path.exists(pdf_path):
        from app.reportgen.pdf_generator import generate_report
        rep_dict = report.model_dump(by_alias=True, mode="json")
        pdf_bytes = generate_report(rep_dict)
        os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"NAWI_Report_{report_id}.pdf",
    )


@router.get("/{report_id}/audit", summary="Get audit log for report")
async def get_report_audit(report_id: str, current_user: User = Depends(require_role(["REVIEWER", "ADMIN"]))):
    from app.services.audit_service import get_audit_service
    events = get_audit_service().get_events_for_report(report_id)
    return {"reportId": report_id, "events": events}


@router.post("/{report_id}/validate", summary="Validate report data")
async def validate_report(report_id: str, current_user: User = Depends(require_role(["TECHNICIAN", "ADMIN"])), service: ReportService = Depends(get_report_service)):
    report = service.get_report(report_id, current_user)
    from app.core.validation_engine import validation_engine
    messages = validation_engine.validate_report(report)
    return {"reportId": report_id, "valid": len(messages) == 0, "messages": messages}


@router.post("/{report_id}/verify", summary="Verify report integrity hash")
@router.get("/{report_id}/verify", summary="Verify report integrity hash (GET alias)")
async def verify_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    report_repo: ReportRepository = Depends(get_report_repository),
):
    report = report_repo.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found")

    from app.core.hashing import compute_report_hash
    stored_hash = getattr(report, "hash", None) or ""
    computed_hash = compute_report_hash(report)
    match = bool(stored_hash and stored_hash == computed_hash)

    return {
        "reportId": report_id,
        "status": report.status,
        "match": match,
        "verified": match,
        "storedHash": stored_hash,
        "computedHash": computed_hash,
    }
