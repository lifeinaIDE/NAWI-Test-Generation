from datetime import datetime
from fastapi import HTTPException, status
from app.schemas import Report, User, Instrument, Manufacturer, Laboratory, Environment
from app.repositories.report_repository import get_report_repository, ReportRepository
from app.core.validation_engine import validation_engine

class ReportService:
    def __init__(self, repo: ReportRepository):
        self.repo = repo

    def create_report(self, user: User, metadata: dict) -> Report:
        user_id = getattr(user, "userId", None) or getattr(user, "id", None)
        from app.rules.rule_loader import get_rule_repository
        active_ruleset = get_rule_repository().get_active_ruleset()
        rule_version = active_ruleset.ruleSetId if active_ruleset else "OIML-R76-2006-V1"
        
        now_str = datetime.utcnow().isoformat() + "Z"
        report = Report(
            reportId="",  # Repository assigns sequential NAWI-YYYY-NNNN
            applicationNumber=metadata.get("applicationNumber", ""),
            status="DRAFT",
            ruleSetVersion=rule_version,
            createdBy=user_id or "user-tech-01",
            createdAt=now_str,
            updatedAt=now_str,
            instrument=Instrument(**metadata.get("instrument", {})),
            manufacturer=Manufacturer(**metadata.get("manufacturer", {})),
            laboratory=Laboratory(**metadata.get("laboratory", {})),
            environment=Environment(**metadata.get("environment", {})),
        )
        return self.repo.create(report)

    def get_report(self, report_id: str, user: User) -> Report:
        report = self.repo.get(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        user_id = getattr(user, "userId", None) or getattr(user, "id", None)
        
        # Access control: Technicians may only access their own reports
        if user.role == "TECHNICIAN" and report.createdBy != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=[{"level": "ERROR", "field": "", "message": "Technicians may only access their own reports"}]
            )

        # Access control: VIEWER can only see APPROVED
        if user.role == "VIEWER" and report.status != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=[{"level": "ERROR", "field": "", "message": "Viewers can only see approved reports"}]
            )
            
        return report

    def update_report(self, report_id: str, partial_data: dict, user: User) -> Report:
        report = self.get_report(report_id, user)
        user_id = getattr(user, "userId", None) or getattr(user, "id", None)
        
        # Immutability check: APPROVED or REJECTED reports cannot be modified -> 403
        if report.status in ["APPROVED", "REJECTED"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cannot modify an {report.status.lower()} report (enforced immutability)."
            )

        # Access control: Must be owner or ADMIN to edit
        if user.role != "ADMIN" and report.createdBy != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=[{"level": "ERROR", "field": "", "message": "Not authorized to edit this report"}]
            )
            
        # Access control: Status must be DRAFT, IN_PROGRESS, or QUERY_RAISED
        if report.status not in ["DRAFT", "IN_PROGRESS", "QUERY_RAISED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=[{"level": "ERROR", "field": "status", "message": f"Cannot edit report in {report.status} status"}]
            )

        # First substantive save moves DRAFT -> IN_PROGRESS
        next_status = "IN_PROGRESS" if report.status == "DRAFT" else report.status

        # Merge partial_data into report
        # Exclude read-only immutable fields
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
        report_dict["status"] = next_status
        report_dict["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        
        updated_report = Report(**report_dict)

        # Server-side n auto-computation if maxCapacity and e are present
        inst = updated_report.instrument
        if inst and inst.maxCapacity > 0 and inst.verificationIntervalE > 0:
            computed_n = int(round(inst.maxCapacity / inst.verificationIntervalE))
            if not inst.numberOfIntervalsN or inst.numberOfIntervalsN == 0:
                inst.numberOfIntervalsN = computed_n

        # Recompute every test's calculations and result server-side. Never trust client-sent results.
        self._recompute_test_calculations(updated_report)
        
        # Validate draft save (structural problems -> ERROR, content issues -> WARNING)
        validation_messages = validation_engine.validate_report(updated_report, is_submit=False)
        errors = [m for m in validation_messages if m.level == "ERROR"]
        if errors:
            raise HTTPException(status_code=422, detail=[e.model_dump() for e in errors])
            
        return self.repo.update(updated_report)

    def delete_report(self, report_id: str, user: User) -> bool:
        report = self.get_report(report_id, user)
        user_id = getattr(user, "userId", None) or getattr(user, "id", None)
        
        # Immutability check: APPROVED or REJECTED reports cannot be deleted -> 403
        if report.status in ["APPROVED", "REJECTED"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cannot delete an {report.status.lower()} report (enforced immutability)."
            )

        if user.role != "ADMIN" and report.createdBy != user_id:
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

    def add_attachment(self, report_id: str, attachment_data: dict, user: User) -> dict:
        report = self.get_report(report_id, user)
        if report.status in ["APPROVED", "REJECTED"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cannot add attachments to an {report.status.lower()} report (enforced immutability)."
            )
        if report.status not in ["DRAFT", "IN_PROGRESS", "QUERY_RAISED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot add attachments to report in {report.status} status",
            )
        if not isinstance(report.attachments, list):
            report.attachments = []
        report.attachments.append(attachment_data)
        report.updatedAt = datetime.utcnow().isoformat() + "Z"
        self.repo.update(report)
        return attachment_data

    def delete_attachment(self, report_id: str, attachment_id: str, user: User) -> dict:
        report = self.get_report(report_id, user)
        if report.status in ["APPROVED", "REJECTED"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cannot delete attachments from an {report.status.lower()} report (enforced immutability)."
            )
        if report.status not in ["DRAFT", "IN_PROGRESS", "QUERY_RAISED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete attachments from report in {report.status} status",
            )

        target_idx = None
        stored_name = None
        for idx, att in enumerate(report.attachments or []):
            att_id = att.get("id") if isinstance(att, dict) else getattr(att, "id", None)
            if att_id == attachment_id:
                target_idx = idx
                stored_name = att.get("storedFilename") if isinstance(att, dict) else getattr(att, "storedFilename", "")
                break

        if target_idx is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

        report.attachments.pop(target_idx)
        report.updatedAt = datetime.utcnow().isoformat() + "Z"
        self.repo.update(report)
        return {"deleted": attachment_id, "storedFilename": stored_name}

    def submit_report(self, report_id: str, user: User) -> Report:
        from app.services.workflow_service import get_workflow_service
        return get_workflow_service().execute_transition("submit", report_id, user)

    def return_report(self, report_id: str, comment: str, user: User) -> Report:
        from app.services.workflow_service import get_workflow_service
        return get_workflow_service().execute_transition("return", report_id, user, comment=comment)

    def approve_report(self, report_id: str, comment: str, user: User) -> Report:
        from app.services.workflow_service import get_workflow_service
        return get_workflow_service().execute_transition("approve", report_id, user, comment=comment)

    def reject_report(self, report_id: str, comment: str, user: User) -> Report:
        from app.services.workflow_service import get_workflow_service
        return get_workflow_service().execute_transition("reject", report_id, user, comment=comment)

    def _recompute_test_calculations(self, report: Report) -> None:
        """
        Recomputes every applicable test's calculations and compliance result server-side.
        Guarantees that client-sent pass/fail calculations are never blindly trusted.
        Uses frozen ruleSetVersion if already set on the report.
        """
        from app.rules.rule_loader import get_rule_repository
        from app.services import calculation_engine

        rule_repo = get_rule_repository()
        rule_set = None
        if report.ruleSetVersion:
            try:
                rule_set = rule_repo.get_by_id(report.ruleSetVersion)
            except Exception:
                pass
        if not rule_set:
            try:
                rule_set = rule_repo.get_active()
            except Exception:
                return

        inst = report.instrument
        e_val = inst.verificationIntervalE if inst and inst.verificationIntervalE else 1.0
        d_val = inst.actualIntervalD if inst and inst.actualIntervalD else 1.0
        acc_class = inst.accuracyClass if inst and inst.accuracyClass else "III"

        for test in report.tests or []:
            if not getattr(test, "applicable", True):
                test.result = "NOT_APPLICABLE"
                test.status = "NOT_APPLICABLE"
                test.calculations = {}
                continue

            test_code = getattr(test, "testCode", "")
            obs = getattr(test, "observations", [])

            if test_code == "WEIGHING_PERFORMANCE":
                if obs and len(obs) > 0:
                    first_obs = obs[0]
                    t_load = first_obs.get("testLoad") if isinstance(first_obs, dict) else getattr(first_obs, "testLoad", None)
                    ind = first_obs.get("indication") if isinstance(first_obs, dict) else getattr(first_obs, "indication", None)
                    zero_err = first_obs.get("zeroError", 0) if isinstance(first_obs, dict) else getattr(first_obs, "zeroError", 0)
                    if t_load is not None and ind is not None:
                        calc = calculation_engine.calculate_weighing_performance(
                            test_load=t_load,
                            indication=ind,
                            zero_error=zero_err,
                            e=e_val,
                            accuracy_class=acc_class,
                            rule_set=rule_set
                        )
                        test.calculations = calc.model_dump(by_alias=True)
                        test.result = calc.result
                        test.status = "COMPLETED" if calc.result in ["PASS", "WARNING", "FAIL"] else "INCOMPLETE"

            elif test_code == "ECCENTRICITY":
                if obs and len(obs) >= 5:
                    loads_payload = []
                    for o in obs:
                        pos = o.get("position") if isinstance(o, dict) else getattr(o, "position", "")
                        ind = o.get("indication") if isinstance(o, dict) else getattr(o, "indication", None)
                        ref = o.get("reference") if isinstance(o, dict) else getattr(o, "reference", None)
                        if ref is None:
                            ref = o.get("load") if isinstance(o, dict) else getattr(o, "load", None)
                        loads_payload.append({"position": pos, "indication": ind, "reference": ref})
                    calc = calculation_engine.calculate_eccentricity(
                        loads=loads_payload,
                        e=e_val,
                        accuracy_class=acc_class,
                        rule_set=rule_set
                    )
                    test.calculations = calc.model_dump(by_alias=True)
                    test.result = calc.result
                    test.status = "COMPLETED" if calc.result in ["PASS", "WARNING", "FAIL"] else "INCOMPLETE"

            elif test_code == "REPEATABILITY":
                t_load = None
                readings = []
                for o in obs:
                    if isinstance(o, dict):
                        if "testLoad" in o and o["testLoad"] is not None:
                            t_load = o["testLoad"]
                        if "reading" in o and o["reading"] is not None and o["reading"] != "":
                            try:
                                readings.append(float(o["reading"]))
                            except ValueError:
                                pass
                if t_load is not None and len(readings) >= 2:
                    calc = calculation_engine.calculate_repeatability(
                        test_load=t_load,
                        readings=readings,
                        e=e_val,
                        accuracy_class=acc_class,
                        rule_set=rule_set
                    )
                    test.calculations = calc.model_dump(by_alias=True)
                    test.result = calc.result
                    test.status = "COMPLETED" if calc.result in ["PASS", "WARNING", "FAIL"] else "INCOMPLETE"

            elif test_code == "DISCRIMINATION":
                if obs and len(obs) > 0:
                    first_obs = obs[0]
                    init_ind = first_obs.get("initialIndication") if isinstance(first_obs, dict) else getattr(first_obs, "initialIndication", None)
                    added = first_obs.get("addedLoad") if isinstance(first_obs, dict) else getattr(first_obs, "addedLoad", None)
                    new_ind = first_obs.get("newIndication") if isinstance(first_obs, dict) else getattr(first_obs, "newIndication", None)
                    if init_ind is not None and new_ind is not None:
                        calc = calculation_engine.calculate_discrimination(
                            initial_indication=init_ind,
                            added_load=added,
                            new_indication=new_ind,
                            d=d_val,
                            rule_set=rule_set
                        )
                        test.calculations = calc.model_dump(by_alias=True)
                        test.result = calc.result
                        test.status = "COMPLETED" if calc.result in ["PASS", "WARNING", "FAIL"] else "INCOMPLETE"


def get_report_service() -> ReportService:
    return ReportService(get_report_repository())
