import json
import os
import glob
from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.schemas import Report

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "reports")

class ReportRepository(ABC):
    @abstractmethod
    def create(self, report: Report) -> Report:
        pass

    @abstractmethod
    def get(self, report_id: str) -> Optional[Report]:
        pass

    @abstractmethod
    def update(self, report: Report) -> Report:
        pass

    @abstractmethod
    def list(self) -> List[Report]:
        pass

    @abstractmethod
    def delete(self, report_id: str) -> bool:
        pass


class JsonReportRepository(ReportRepository):
    def __init__(self, storage_dir: str = REPORTS_DIR):
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)

    def _get_filepath(self, report_id: str) -> str:
        return os.path.join(self.storage_dir, f"{report_id}.json")

    def _generate_id(self) -> str:
        year = datetime.now().year
        pattern = os.path.join(self.storage_dir, f"NAWI-{year}-*.json")
        files = glob.glob(pattern)
        
        max_seq = 0
        for f in files:
            basename = os.path.basename(f)
            # NAWI-2026-0001.json -> split('-') -> ["NAWI", "2026", "0001.json"]
            parts = basename.split('-')
            if len(parts) == 3:
                try:
                    seq_str = parts[2].split('.')[0]
                    seq = int(seq_str)
                    if seq > max_seq:
                        max_seq = seq
                except ValueError:
                    pass
        
        next_seq = max_seq + 1
        return f"NAWI-{year}-{next_seq:04d}"

    def create(self, report: Report) -> Report:
        if not report.reportId or report.reportId == "stub":
            report.reportId = self._generate_id()
        
        self.update(report)
        return report

    def get(self, report_id: str) -> Optional[Report]:
        filepath = self._get_filepath(report_id)
        if not os.path.exists(filepath):
            return None
        
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            return Report(**data)

    def update(self, report: Report) -> Report:
        filepath = self._get_filepath(report.reportId)
        tmp_filepath = filepath + ".tmp"
        
        # Atomic write
        with open(tmp_filepath, "w", encoding="utf-8") as f:
            # model_dump(mode='json') or exclude_none if appropriate
            json.dump(report.model_dump(mode='json'), f, indent=2)
        
        os.replace(tmp_filepath, filepath)
        return report

    def list(self) -> List[Report]:
        reports = []
        pattern = os.path.join(self.storage_dir, "*.json")
        for f in glob.glob(pattern):
            try:
                with open(f, "r", encoding="utf-8") as file:
                    data = json.load(file)
                    reports.append(Report(**data))
            except Exception:
                pass
        return reports

    def delete(self, report_id: str) -> bool:
        filepath = self._get_filepath(report_id)
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        return False

# Dependency injection instance
report_repository = JsonReportRepository()

def get_report_repository() -> ReportRepository:
    return report_repository
