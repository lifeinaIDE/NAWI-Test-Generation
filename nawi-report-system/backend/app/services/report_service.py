from datetime import datetime
from fastapi import HTTPException, status
from app.schemas import Report, User, Instrument, Manufacturer, Laboratory
from app.repositories.report_repository import get_report_repository, ReportRepository
from app.core.validation_engine import validation_engine

class ReportService:
    def __init__(self, repo: ReportRepository):
        self.repo = repo

    def create_report(self, user: User, metadata: dict) -> Report:
        # metadata contains instrument, manufacturer, laboratory from initial creation step (if any)
        report = Report(
            reportId="stub",  # Repository assigns real ID
            status="DRAFT",
            ruleSetVersion="OIML-R76-PROTOTYPE-V1", # Stub active rule set
            createdBy=user.id,
            createdAt=datetime.utcnow().isoformat() + "Z",
            updatedAt=datetime.utcnow().isoformat() + "Z",
            instrument=Instrument(**metadata.get("instrument", {})),
            manufacturer=Manufacturer(**metadata.get("manufacturer", {})),
            laboratory=Laboratory(**metadata.get("laboratory", {})),
        )
        return self.repo.create(report)

    def get_report(self, report_id: str, user: User) -> Report:
        report = self.repo.get(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Access control: VIEWER can only see APPROVED
        if user.role == "VIEWER" and report.status != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=[{"level": "ERROR", "field": "", "message": "Viewers can only see approved reports"}]
            )
            
        return report

    def update_report(self, report_id: str, partial_data: dict, user: User) -> Report:
        report = self.get_report(report_id, user)
        
        # Access control: Must be owner or ADMIN to edit
        if user.role != "ADMIN" and report.createdBy != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=[{"level": "ERROR", "field": "", "message": "Not authorized to edit this report"}]
            )
            
        # Access control: Status must be DRAFT or IN_PROGRESS
        if report.status not in ["DRAFT", "IN_PROGRESS", "QUERY_RAISED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=[{"level": "ERROR", "field": "status", "message": f"Cannot edit report in {report.status} status"}]
            )

        # Merge partial_data into report
        # Exclude read-only fields
        for key in ["reportId", "status", "createdBy", "createdAt", "updatedAt"]:
            partial_data.pop(key, None)
            
        report_dict = report.model_dump()
        
        # Deep merge for nested dicts (instrument, environment, etc)
        def deep_merge(d1, d2):
            for k, v in d2.items():
                if isinstance(v, dict) and k in d1 and isinstance(d1[k], dict):
                    deep_merge(d1[k], v)
                else:
                    d1[k] = v
                    
        deep_merge(report_dict, partial_data)
        
        updated_report = Report(**report_dict)
        updated_report.updatedAt = datetime.utcnow().isoformat() + "Z"
        
        # Validate
        validation_messages = validation_engine.validate_report(updated_report)
        errors = [m for m in validation_messages if m.level == "ERROR"]
        if errors:
            raise HTTPException(status_code=422, detail=[e.model_dump() for e in errors])
            
        return self.repo.update(updated_report)

    def delete_report(self, report_id: str, user: User) -> bool:
        report = self.get_report(report_id, user)
        
        if user.role != "ADMIN" and report.createdBy != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=[{"level": "ERROR", "field": "", "message": "Not authorized to delete this report"}]
            )
            
        if report.status != "DRAFT":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=[{"level": "ERROR", "field": "status", "message": "Only DRAFT reports can be deleted"}]
            )
            
        return self.repo.delete(report_id)

    def submit_report(self, report_id: str, user: User) -> Report:
        report = self.get_report(report_id, user)
        from app.services.audit_service import get_audit_service
        from app.rules.rule_loader import get_rule_repository
        
        if user.role not in ["TECHNICIAN", "ADMIN"]:
            raise HTTPException(status_code=403, detail=[{"level": "ERROR", "field": "", "message": "Only TECHNICIAN can submit."}])
            
        if report.status not in ["DRAFT", "IN_PROGRESS", "QUERY_RAISED"]:
            raise HTTPException(status_code=422, detail=[{"level": "ERROR", "field": "status", "message": f"Invalid transition from {report.status}"}])
            
        # Pre-condition: no mandatory test is INCOMPLETE
        for test in report.tests:
            if test.applicable and test.result == "INCOMPLETE":
                raise HTTPException(status_code=422, detail=[{"level": "ERROR", "field": "tests", "message": f"Test {test.testCode} is mandatory but incomplete."}])
                
        old_status = report.status
        report.status = "SUBMITTED_FOR_REVIEW"
        report.ruleSetVersion = get_rule_repository().get_active_ruleset().ruleSetId
        report.updatedAt = datetime.utcnow().isoformat() + "Z"
        
        updated = self.repo.update(report)
        get_audit_service().log_event(user.id, user.role, "SUBMIT", report.reportId, old_status, report.status, None, report.ruleSetVersion)
        return updated

    def return_report(self, report_id: str, comment: str, user: User) -> Report:
        report = self.get_report(report_id, user)
        from app.services.audit_service import get_audit_service
        
        if user.role not in ["REVIEWER", "ADMIN"]:
            raise HTTPException(status_code=403, detail=[{"level": "ERROR", "field": "", "message": "Only REVIEWER can return."}])
            
        if report.status != "SUBMITTED_FOR_REVIEW":
            raise HTTPException(status_code=422, detail=[{"level": "ERROR", "field": "status", "message": f"Invalid transition from {report.status}"}])
            
        old_status = report.status
        report.status = "QUERY_RAISED"
        if not report.review:
            from app.schemas import ReviewInfo
            report.review = ReviewInfo()
        report.review.reviewerComments = comment
        report.updatedAt = datetime.utcnow().isoformat() + "Z"
        
        updated = self.repo.update(report)
        get_audit_service().log_event(user.id, user.role, "RETURN", report.reportId, old_status, report.status, comment, report.ruleSetVersion)
        return updated

    def approve_report(self, report_id: str, comment: str, user: User) -> Report:
        report = self.get_report(report_id, user)
        from app.services.audit_service import get_audit_service
        
        if user.role not in ["REVIEWER", "ADMIN"]:
            raise HTTPException(status_code=403, detail=[{"level": "ERROR", "field": "", "message": "Only REVIEWER can approve."}])
            
        if report.status != "SUBMITTED_FOR_REVIEW":
            raise HTTPException(status_code=422, detail=[{"level": "ERROR", "field": "status", "message": f"Invalid transition from {report.status}"}])
            
        old_status = report.status
        report.status = "APPROVED"
        if not report.review:
            from app.schemas import ReviewInfo
            report.review = ReviewInfo()
        report.review.reviewerId = user.id
        report.review.reviewedAt = datetime.utcnow().isoformat() + "Z"
        report.review.reviewerComments = comment
        report.updatedAt = datetime.utcnow().isoformat() + "Z"
        
        # Determine overall result
        all_passed = all(t.result in ["PASS", "NOT_APPLICABLE"] for t in report.tests if t.applicable)
        report.finalResult = "PASS" if all_passed else "FAIL"

        updated = self.repo.update(report)
        get_audit_service().log_event(user.id, user.role, "APPROVE", report.reportId, old_status, report.status, comment, report.ruleSetVersion)
        
        # Phase 7: Generate PDF
        from app.reportgen.pdf_generator import generate_pdf
        import os
        
        gen_dir = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "generated-reports")
        os.makedirs(gen_dir, exist_ok=True)
        pdf_path = os.path.join(gen_dir, f"{report.reportId}.pdf")
        
        file_hash = generate_pdf(updated, pdf_path)
        
        # Save hash
        updated.hash = file_hash
        updated = self.repo.update(updated)
        
        return updated

    def reject_report(self, report_id: str, comment: str, user: User) -> Report:
        report = self.get_report(report_id, user)
        from app.services.audit_service import get_audit_service
        
        if user.role not in ["REVIEWER", "ADMIN"]:
            raise HTTPException(status_code=403, detail=[{"level": "ERROR", "field": "", "message": "Only REVIEWER can reject."}])
            
        if report.status != "SUBMITTED_FOR_REVIEW":
            raise HTTPException(status_code=422, detail=[{"level": "ERROR", "field": "status", "message": f"Invalid transition from {report.status}"}])
            
        old_status = report.status
        report.status = "REJECTED"
        if not report.review:
            from app.schemas import ReviewInfo
            report.review = ReviewInfo()
        report.review.reviewerComments = comment
        report.updatedAt = datetime.utcnow().isoformat() + "Z"
        
        updated = self.repo.update(report)
        get_audit_service().log_event(user.id, user.role, "REJECT", report.reportId, old_status, report.status, comment, report.ruleSetVersion)
        return updated


def get_report_service() -> ReportService:
    return ReportService(get_report_repository())
