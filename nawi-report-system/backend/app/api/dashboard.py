"""Dashboard router — aggregates reports and audit data for the dashboard."""
from fastapi import APIRouter, Depends
from app.schemas import DashboardSummary, DashboardStatistics, User
from app.core.security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(current_user: User = Depends(get_current_user)):
    from app.services.search_service import get_search_service
    reports = get_search_service().search(current_user=current_user)

    summary = {
        "total": len(reports),
        "drafts": sum(1 for r in reports if r.status == "DRAFT"),
        "inProgress": sum(1 for r in reports if r.status in ("IN_PROGRESS", "QUERY_RAISED")),
        "submittedForReview": sum(1 for r in reports if r.status == "SUBMITTED_FOR_REVIEW"),
        "approved": sum(1 for r in reports if r.status == "APPROVED"),
        "rejected": sum(1 for r in reports if r.status == "REJECTED"),
    }
    return summary


@router.get("/statistics", response_model=DashboardStatistics)
async def get_statistics(current_user: User = Depends(get_current_user)):
    from app.services.search_service import get_search_service
    reports = get_search_service().search(current_user=current_user)

    approved_reports = [r for r in reports if r.status == "APPROVED"]
    total_approved = len(approved_reports)

    pass_count = sum(1 for r in approved_reports if r.finalResult == "PASS")

    pass_rate = (pass_count / total_approved * 100) if total_approved > 0 else 0.0
    fail_rate = 100.0 - pass_rate if total_approved > 0 else 0.0

    # Top models by volume
    from collections import Counter
    models = [r.instrument.model for r in reports if r.instrument and r.instrument.model]
    model_counts = Counter(models)
    top_models = [{"name": name, "count": count} for name, count in model_counts.most_common(5)]

    # Recent activity — filter to reports visible to this user
    from app.services.audit_service import get_audit_service
    all_events = get_audit_service().get_all_events()
    visible_report_ids = {r.reportId for r in reports}

    recent = []
    for e in reversed(all_events):
        # AuditEvent is a Pydantic model — use attribute access, not subscript
        if e.reportId in visible_report_ids:
            recent.append(e)
        if len(recent) >= 10:
            break

    return {
        "passRate": pass_rate,
        "failRate": fail_rate,
        "reportsByModel": top_models,
        "recentActivity": recent,
    }
