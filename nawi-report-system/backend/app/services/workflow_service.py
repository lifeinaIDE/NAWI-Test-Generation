import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from fastapi import HTTPException, status

from app.schemas import User, Report, ReviewInfo
from app.repositories.report_repository import ReportRepository, get_report_repository
from app.services.audit_service import AuditService, get_audit_service
from app.rules.rule_loader import get_rule_repository
from app.core.validation_engine import validation_engine


@dataclass
class TransitionDefinition:
    name: str
    from_statuses: List[str]
    to_status: str
    allowed_roles: List[str]
    require_comment: bool
    audit_action: str


TRANSITION_TABLE: Dict[str, TransitionDefinition] = {
    "submit": TransitionDefinition(
        name="submit",
        from_statuses=["DRAFT", "IN_PROGRESS", "QUERY_RAISED"],
        to_status="SUBMITTED_FOR_REVIEW",
        allowed_roles=["TECHNICIAN", "ADMIN"],
        require_comment=False,
        audit_action="SUBMIT",
    ),
    "return": TransitionDefinition(
        name="return",
        from_statuses=["SUBMITTED_FOR_REVIEW"],
        to_status="QUERY_RAISED",
        allowed_roles=["REVIEWER", "ADMIN"],
        require_comment=True,
        audit_action="RETURN",
    ),
    "approve": TransitionDefinition(
        name="approve",
        from_statuses=["SUBMITTED_FOR_REVIEW"],
        to_status="APPROVED",
        allowed_roles=["REVIEWER", "ADMIN"],
        require_comment=True,
        audit_action="APPROVE",
    ),
    "reject": TransitionDefinition(
        name="reject",
        from_statuses=["SUBMITTED_FOR_REVIEW"],
        to_status="REJECTED",
        allowed_roles=["REVIEWER", "ADMIN"],
        require_comment=True,
        audit_action="REJECT",
    ),
}


class WorkflowService:
    def __init__(
        self,
        report_repo: Optional[ReportRepository] = None,
        audit_service: Optional[AuditService] = None,
    ):
        self.report_repo = report_repo or get_report_repository()
        self.audit_service = audit_service or get_audit_service()

    def execute_transition(
        self,
        action: str,
        report_id: str,
        user: User,
        comment: Optional[str] = None,
    ) -> Report:
        """
        Executes a workflow transition driven entirely by TRANSITION_TABLE.
        Enforces roles, status pre-conditions, required comments, validation,
        frozen rule-set versions, and audit logging.
        """
        trans = TRANSITION_TABLE.get(action.lower())
        if not trans:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown workflow action '{action}'",
            )

        report = self.report_repo.get(report_id)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report '{report_id}' not found",
            )

        # 1. Role verification
        if user.role not in trans.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=[{
                    "level": "ERROR",
                    "field": "",
                    "message": f"Role '{user.role}' is not authorized to {action} this report.",
                }],
            )

        # 2. Status pre-condition check -> 409 on invalid transition
        old_status = report.status
        if old_status not in trans.from_statuses:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invalid transition: Cannot {action} report from status '{old_status}'. Expected one of: {', '.join(trans.from_statuses)}.",
            )

        # 3. Comment requirement check -> 422 if missing or empty
        cleaned_comment = (comment or "").strip()
        if trans.require_comment and not cleaned_comment:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=[{
                    "level": "ERROR",
                    "field": "comment",
                    "message": f"A comment is required when performing {action}.",
                }],
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        audit_action = trans.audit_action

        # 4. Action-specific rules
        user_id = getattr(user, "userId", None) or getattr(user, "id", None)
        creator_id = getattr(report, "createdBy", None) or getattr(report, "technicianId", None)

        if action == "submit":
            # Technician ownership check
            if user.role == "TECHNICIAN":
                if creator_id and creator_id != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=[{
                            "level": "ERROR",
                            "field": "",
                            "message": "Technicians may only submit their own reports.",
                        }],
                    )

            # Requires at least one applicable test
            applicable_tests = [
                t for t in (report.tests or []) if getattr(t, "applicable", True)
            ]
            if not applicable_tests:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=[{
                        "level": "ERROR",
                        "field": "tests",
                        "message": "At least one test must be marked applicable before submission.",
                    }],
                )

            # No INCOMPLETE applicable test
            for t in applicable_tests:
                t_code = getattr(t, "testCode", "")
                t_name = getattr(t, "testName", t_code)
                t_res = getattr(t, "result", "")
                t_stat = getattr(t, "status", "")
                if t_res in ["INCOMPLETE", "", None] or t_stat == "INCOMPLETE":
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=[{
                            "level": "ERROR",
                            "field": f"tests.{t_code}",
                            "message": f"Test '{t_name}' is incomplete. All applicable tests must have completed observations.",
                        }],
                    )

            # No validation ERRORs
            val_messages = validation_engine.validate_report(report, is_submit=True)
            blocking_errors = [m for m in val_messages if m.level == "ERROR"]
            if blocking_errors:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=[m.model_dump(by_alias=True) for m in blocking_errors],
                )

            # FREEZES ruleSetVersion
            if not report.ruleSetVersion:
                active_rule = get_rule_repository().get_active()
                report.ruleSetVersion = active_rule.ruleSetId

            # Recompute all results with frozen ruleSetVersion
            from app.services.report_service import get_report_service
            get_report_service()._recompute_test_calculations(report)

            # Audit action distinction: RESUBMIT if returning from QUERY_RAISED
            if old_status == "QUERY_RAISED":
                audit_action = "RESUBMIT"
            else:
                audit_action = "SUBMIT"

        elif action == "return":
            if not report.review:
                report.review = ReviewInfo()
            report.review.reviewerId = user.id
            report.review.reviewerComments = cleaned_comment
            report.review.reviewedAt = now_iso

        elif action == "approve":
            # ADMIN cannot approve a report they created
            creator_id = getattr(report, "createdBy", None) or getattr(report, "technicianId", None)
            if user.role == "ADMIN" and creator_id == user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=[{
                        "level": "ERROR",
                        "field": "",
                        "message": "Admins cannot approve a report they created.",
                    }],
                )

            if not report.review:
                report.review = ReviewInfo()
            report.review.reviewerId = user.id
            report.review.reviewerComments = cleaned_comment
            report.review.reviewedAt = now_iso

            # Determine finalResult:
            # FAIL if any applicable test FAILs;
            # PASS if all applicable are PASS or WARNING;
            # else PENDING.
            applicable_tests = [
                t for t in (report.tests or []) if getattr(t, "applicable", True)
            ]
            if any(getattr(t, "result", "") == "FAIL" for t in applicable_tests):
                report.finalResult = "FAIL"
            elif applicable_tests and all(
                getattr(t, "result", "") in ["PASS", "WARNING"] for t in applicable_tests
            ):
                report.finalResult = "PASS"
            else:
                report.finalResult = "PENDING"

        elif action == "reject":
            if not report.review:
                report.review = ReviewInfo()
            report.review.reviewerId = user.id
            report.review.reviewerComments = cleaned_comment
            report.review.reviewedAt = now_iso

        # 5. Transition state & update metadata
        report.status = trans.to_status
        report.updatedAt = now_iso

        # /approve now calls finalize(): compute hash, store report.hash, write storage/generated-reports/{reportId}.pdf
        if action == "approve":
            self.finalize(report)

        # Persist report
        updated_report = self.report_repo.update(report)

        # 6. Audit logging
        self.audit_service.log_event(
            userId=user.id,
            role=user.role,
            action=audit_action,
            reportId=report.reportId,
            fromStatus=old_status,
            toStatus=report.status,
            comment=cleaned_comment if cleaned_comment else None,
            ruleSetVersion=report.ruleSetVersion,
        )

        return updated_report

    def finalize(self, report: Report) -> None:
        """
        Finalizes an approved report per Phase 7 requirements:
        1. Computes SHA-256 of canonical JSON (excluding 'hash' and 'auditEvents').
        2. Sets report.hash = computed_hash.
        3. Generates the PDF containing all 24 items, D1, D3, D4.
        4. Writes the PDF to storage/generated-reports/{reportId}.pdf.
        """
        from app.core.hashing import compute_report_hash
        from app.reportgen.pdf_generator import generate_report
        from app.core.config import get_settings

        # 1. Compute canonical hash of the report in its APPROVED state
        computed_hash = compute_report_hash(report)
        report.hash = computed_hash

        # 2. Write PDF to storage/generated-reports/{reportId}.pdf
        settings = get_settings()
        gen_dir = os.path.join(settings.STORAGE_PATH, "generated-reports")
        os.makedirs(gen_dir, exist_ok=True)
        pdf_path = os.path.join(gen_dir, f"{report.reportId}.pdf")

        rep_dict = report.model_dump(by_alias=True, mode="json")
        pdf_bytes = generate_report(rep_dict)

        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)

    def finalize_approved_report(self, report_id: str) -> dict:
        """
        POST /finalize is idempotent for APPROVED reports:
        regenerates the PDF only if the file is missing and never changes the stored hash.
        """
        report = self.report_repo.get(report_id)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report '{report_id}' not found",
            )
        if report.status != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot finalize report in '{report.status}' status. Only APPROVED reports can be finalized.",
            )

        from app.core.config import get_settings
        from app.core.hashing import compute_report_hash
        from app.reportgen.pdf_generator import generate_report

        settings = get_settings()
        gen_dir = os.path.join(settings.STORAGE_PATH, "generated-reports")
        os.makedirs(gen_dir, exist_ok=True)
        pdf_path = os.path.join(gen_dir, f"{report.reportId}.pdf")

        # If stored hash is missing, compute and save it without changing existing
        if not report.hash:
            report.hash = compute_report_hash(report)
            self.report_repo.update(report)

        # Regenerate PDF only if missing
        if not os.path.exists(pdf_path):
            rep_dict = report.model_dump(by_alias=True, mode="json")
            pdf_bytes = generate_report(rep_dict)
            with open(pdf_path, "wb") as f:
                f.write(pdf_bytes)
            message = "PDF generated and report finalized."
        else:
            message = "Report already finalized. Existing PDF preserved."

        return {
            "reportId": report.reportId,
            "hash": report.hash,
            "message": message,
        }


_workflow_service_instance: Optional[WorkflowService] = None

def get_workflow_service() -> WorkflowService:
    global _workflow_service_instance
    if _workflow_service_instance is None:
        _workflow_service_instance = WorkflowService()
    return _workflow_service_instance
