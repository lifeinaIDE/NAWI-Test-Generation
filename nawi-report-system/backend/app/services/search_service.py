from typing import List, Optional, Any, Union
from app.schemas import Report, User
from app.repositories.report_repository import get_report_repository, ReportRepository


class SearchService:
    def __init__(self, repo: Optional[ReportRepository] = None):
        self.repo = repo or get_report_repository()

    def search(
        self,
        filters: Optional[dict] = None,
        user: Optional[User] = None,
        *,
        current_user: Optional[User] = None,
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
        **kwargs: Any,
    ) -> List[Report]:
        """
        Search and filter reports with role-based visibility strictly enforced INSIDE the service.
        Request parameters can NEVER bypass role restrictions:
        - VIEWER sees APPROVED only.
        - TECHNICIAN sees own reports (any status) + APPROVED reports.
        - REVIEWER and ADMIN see all reports.
        """
        active_user = user or current_user
        if not active_user:
            raise ValueError("A valid authenticated User must be provided for search visibility enforcement.")

        # Extract filters if passed as a dictionary
        if filters and isinstance(filters, dict):
            status = filters.get("status", status)
            model = filters.get("model", model)
            manufacturer = filters.get("manufacturer", manufacturer)
            serialNumber = filters.get("serialNumber", filters.get("serial", serialNumber or serial))
            dateFrom = filters.get("dateFrom", dateFrom)
            dateTo = filters.get("dateTo", dateTo)
            accuracyClass = filters.get("accuracyClass", accuracyClass)
            finalResult = filters.get("finalResult", filters.get("result", finalResult or result))
            q = filters.get("q", q)
            sortBy = filters.get("sortBy", sortBy)
            sortOrder = filters.get("sortOrder", sortOrder)
        else:
            serialNumber = serialNumber or serial
            finalResult = finalResult or result

        # 1. Fetch raw reports from repository
        all_reports = self.repo.list()

        # 2. Enforce Visibility inside the service
        user_id = getattr(active_user, "userId", None) or getattr(active_user, "id", None)
        user_role = getattr(active_user, "role", "VIEWER")

        visible_reports: List[Report] = []
        for r in all_reports:
            creator_id = getattr(r, "createdBy", None) or getattr(r, "technicianId", None)
            if user_role == "VIEWER":
                if r.status == "APPROVED":
                    visible_reports.append(r)
            elif user_role == "TECHNICIAN":
                if r.status == "APPROVED" or (user_id and creator_id == user_id):
                    visible_reports.append(r)
            elif user_role in ("REVIEWER", "ADMIN"):
                visible_reports.append(r)
            else:
                # Default safety: only approved
                if r.status == "APPROVED":
                    visible_reports.append(r)

        # 3. Apply search filters (intersection)
        filtered: List[Report] = []
        for r in visible_reports:
            # 1. status filter
            if status and r.status != status:
                continue

            # 2. model filter (case-insensitive substring)
            r_model = getattr(r.instrument, "model", "") or ""
            if model and model.lower() not in r_model.lower():
                continue

            # 3. manufacturer filter (case-insensitive substring)
            r_mfg = getattr(r.manufacturer, "name", "") or ""
            if manufacturer and manufacturer.lower() not in r_mfg.lower():
                continue

            # 4. serialNumber filter (case-insensitive substring)
            r_serial = getattr(r.instrument, "serialNumber", "") or ""
            if serialNumber and serialNumber.lower() not in r_serial.lower():
                continue

            # 5. accuracyClass filter (exact match)
            r_class = getattr(r.instrument, "accuracyClass", "") or ""
            if accuracyClass and r_class != accuracyClass:
                continue

            # 6. finalResult filter (exact match)
            if finalResult and r.finalResult != finalResult:
                continue

            # 7. dateFrom filter
            if dateFrom and r.createdAt:
                if str(r.createdAt) < dateFrom:
                    continue

            # 8. dateTo filter
            if dateTo and r.createdAt:
                effective_date_to = dateTo + "T23:59:59.999999Z" if len(dateTo) == 10 else dateTo
                if str(r.createdAt) > effective_date_to:
                    continue

            # 9. Free-text query q (substring match across multiple fields)
            if q and q.strip():
                q_term = q.lower().strip()
                matchable_strings = [
                    r.reportId or "",
                    r.applicationNumber or "",
                    r_model,
                    r_serial,
                    r_mfg,
                    getattr(r.laboratory, "name", "") or "",
                    r.createdBy or "",
                ]
                if not any(q_term in s.lower() for s in matchable_strings):
                    continue

            filtered.append(r)

        # 4. Apply Sorting
        def get_sort_key(rep: Report) -> str:
            if sortBy == "reportId":
                return rep.reportId or ""
            elif sortBy == "status":
                return rep.status or ""
            elif sortBy in ("model", "instrument"):
                return getattr(rep.instrument, "model", "") or ""
            elif sortBy in ("serial", "serialNumber"):
                return getattr(rep.instrument, "serialNumber", "") or ""
            elif sortBy == "manufacturer":
                return getattr(rep.manufacturer, "name", "") or ""
            elif sortBy == "accuracyClass":
                return getattr(rep.instrument, "accuracyClass", "") or ""
            elif sortBy in ("finalResult", "result"):
                return rep.finalResult or ""
            elif sortBy == "createdBy":
                return rep.createdBy or ""
            elif sortBy == "updatedAt":
                return rep.updatedAt or ""
            else:
                return rep.createdAt or ""

        is_desc = (sortOrder.lower() != "asc") if sortOrder else True
        filtered.sort(key=get_sort_key, reverse=is_desc)

        return filtered


_search_service = SearchService()


def get_search_service() -> SearchService:
    return _search_service
