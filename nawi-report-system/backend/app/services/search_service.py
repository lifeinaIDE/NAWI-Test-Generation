from typing import List, Optional
from datetime import datetime
from app.schemas import Report, User
from app.repositories.report_repository import get_report_repository, ReportRepository

class SearchService:
    def __init__(self, repo: ReportRepository = None):
        self.repo = repo or get_report_repository()

    def search(
        self,
        current_user: User,
        status: Optional[str] = None,
        model: Optional[str] = None,
        serial: Optional[str] = None,
        manufacturer: Optional[str] = None,
        dateFrom: Optional[str] = None,
        dateTo: Optional[str] = None,
        accuracyClass: Optional[str] = None,
        result: Optional[str] = None
    ) -> List[Report]:
        
        reports = self.repo.list()

        # 1. Apply Role-based filtering
        filtered = []
        for r in reports:
            if current_user.role == "VIEWER":
                if r.status == "APPROVED":
                    filtered.append(r)
            elif current_user.role == "TECHNICIAN":
                if r.status == "APPROVED" or r.createdBy == current_user.id:
                    filtered.append(r)
            else:
                # REVIEWER and ADMIN see all
                filtered.append(r)

        reports = filtered
        filtered = []

        # 2. Apply explicit search filters
        for r in reports:
            # status filter
            if status and r.status != status:
                continue
            
            # model filter (case-insensitive substring)
            if model and (not r.instrument.model or model.lower() not in r.instrument.model.lower()):
                continue
                
            # serial filter
            if serial and (not r.instrument.serialNumber or serial.lower() not in r.instrument.serialNumber.lower()):
                continue
                
            # manufacturer filter
            if manufacturer and (not r.manufacturer.name or manufacturer.lower() not in r.manufacturer.name.lower()):
                continue
                
            # accuracyClass filter
            if accuracyClass and r.instrument.accuracyClass != accuracyClass:
                continue
                
            # result filter
            if result and r.finalResult != result:
                continue
                
            # dateFrom filter
            if dateFrom and r.createdAt:
                if r.createdAt < dateFrom:
                    continue
                    
            # dateTo filter
            if dateTo and r.createdAt:
                # Basic string comparison works for ISO dates
                if r.createdAt > dateTo:
                    continue

            filtered.append(r)

        # 3. Sort by createdAt descending
        filtered.sort(key=lambda r: r.createdAt or "", reverse=True)
        return filtered

_search_service = SearchService()

def get_search_service() -> SearchService:
    return _search_service
