from fastapi import APIRouter, Depends, HTTPException
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
    manufacturer: Optional[str] = None,
    dateFrom: Optional[str] = None,
    dateTo: Optional[str] = None,
    accuracyClass: Optional[str] = None,
    result: Optional[str] = None,
    page: int = 1,
    pageSize: int = 100,
    current_user: User = Depends(get_current_user)
):
    from app.services.search_service import get_search_service
    service = get_search_service()
    all_filtered = service.search(
        current_user=current_user,
        status=status,
        model=model,
        serial=serial,
        manufacturer=manufacturer,
        dateFrom=dateFrom,
        dateTo=dateTo,
        accuracyClass=accuracyClass,
        result=result
    )
    
    start_idx = (page - 1) * pageSize
    end_idx = start_idx + pageSize
    paginated = all_filtered[start_idx:end_idx]
    
    return {
        "items": paginated,
        "total": len(all_filtered),
        "page": page,
        "pageSize": pageSize
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


@router.post("/{report_id}/submit", response_model=Report, summary="Submit for review")
async def submit_report(report_id: str, current_user: User = Depends(require_role(["TECHNICIAN", "ADMIN"])), service: ReportService = Depends(get_report_service)):
    return service.submit_report(report_id, current_user)


@router.post("/{report_id}/return", response_model=Report, summary="Return to technician")
async def return_report(report_id: str, body: dict, current_user: User = Depends(require_role(["REVIEWER", "ADMIN"])), service: ReportService = Depends(get_report_service)):
    return service.return_report(report_id, body.get("comment", ""), current_user)


@router.post("/{report_id}/approve", response_model=Report, summary="Approve report")
async def approve_report(report_id: str, body: dict, current_user: User = Depends(require_role(["REVIEWER", "ADMIN"])), service: ReportService = Depends(get_report_service)):
    return service.approve_report(report_id, body.get("comment", ""), current_user)


@router.post("/{report_id}/reject", response_model=Report, summary="Reject report")
async def reject_report(report_id: str, body: dict, current_user: User = Depends(require_role(["REVIEWER", "ADMIN"])), service: ReportService = Depends(get_report_service)):
    return service.reject_report(report_id, body.get("comment", ""), current_user)


@router.post("/{report_id}/finalize", summary="Finalize report / generate PDF")
async def finalize_report(report_id: str, current_user: User = Depends(require_role(["REVIEWER", "ADMIN"]))):
    return {"reportId": report_id, "message": "Report finalized. PDF generation triggered."}


from fastapi.responses import FileResponse
import os

@router.get("/{report_id}/download", summary="Download PDF")
async def download_report(report_id: str, current_user: User = Depends(get_current_user)):
    pdf_path = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "generated-reports", f"{report_id}.pdf")
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not generated for this report")
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"NAWI_Report_{report_id}.pdf")


@router.get("/{report_id}/audit", summary="Get audit log for report")
async def get_report_audit(report_id: str, current_user: User = Depends(get_current_user)):
    from app.services.audit_service import get_audit_service
    events = get_audit_service().get_events_for_report(report_id)
    return {"reportId": report_id, "events": events}
