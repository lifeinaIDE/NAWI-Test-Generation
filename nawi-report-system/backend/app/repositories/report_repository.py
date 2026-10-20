import json
import os
import glob
import uuid
import threading
from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime

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
        self._id_lock = threading.Lock()
        self._index_lock = threading.Lock()

    @property
    def _index_path(self) -> str:
        return os.path.join(self.storage_dir, "_index.json")

    def _load_index(self) -> dict:
        if not os.path.exists(self._index_path):
            return self._rebuild_index()
        try:
            with open(self._index_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return self._rebuild_index()

    def _save_index(self, index_data: dict) -> None:
        temp_name = f"._index.{uuid.uuid4().hex}.tmp"
        tmp_filepath = os.path.join(self.storage_dir, temp_name)
        try:
            with open(tmp_filepath, "w", encoding="utf-8") as f:
                json.dump(index_data, f, indent=2)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_filepath, self._index_path)
        except Exception:
            if os.path.exists(tmp_filepath):
                try:
                    os.remove(tmp_filepath)
                except OSError:
                    pass

    def _rebuild_index(self) -> dict:
        index_data = {}
        pattern = os.path.join(self.storage_dir, "*.json")
        for f in glob.glob(pattern):
            basename = os.path.basename(f)
            if basename.startswith(".") or basename == "_index.json":
                continue
            try:
                with open(f, "r", encoding="utf-8") as file:
                    data = json.load(file)
                    r_id = data.get("reportId")
                    if r_id:
                        index_data[r_id] = data
            except Exception:
                pass
        self._save_index(index_data)
        return index_data

    def _update_index_entry(self, report: Report) -> None:
        with self._index_lock:
            index_data = self._load_index()
            index_data[report.reportId] = report.model_dump(by_alias=True, mode="json")
            self._save_index(index_data)

    def _delete_index_entry(self, report_id: str) -> None:
        with self._index_lock:
            index_data = self._load_index()
            if report_id in index_data:
                index_data.pop(report_id, None)
                self._save_index(index_data)

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
        with self._id_lock:
            if not report.reportId or report.reportId in ("stub", ""):
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
        # Atomic write: write to unique temp file in the same directory, then os.replace
        temp_name = f".{report.reportId}.{uuid.uuid4().hex}.tmp"
        tmp_filepath = os.path.join(self.storage_dir, temp_name)
        
        try:
            with open(tmp_filepath, "w", encoding="utf-8") as f:
                json.dump(report.model_dump(by_alias=True, mode='json'), f, indent=2)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_filepath, filepath)
            # Maintain index file updated on every report write
            self._update_index_entry(report)
        except Exception:
            if os.path.exists(tmp_filepath):
                try:
                    os.remove(tmp_filepath)
                except OSError:
                    pass
            raise
            
        return report

    def list(self) -> List[Report]:
        with self._index_lock:
            index_data = self._load_index()
            reports = []
            for data in index_data.values():
                try:
                    reports.append(Report(**data))
                except Exception:
                    pass
            return reports

    def delete(self, report_id: str) -> bool:
        filepath = self._get_filepath(report_id)
        if os.path.exists(filepath):
            os.remove(filepath)
            self._delete_index_entry(report_id)
            return True
        return False

# Dependency injection instance
report_repository = JsonReportRepository()

def get_report_repository() -> ReportRepository:
    return report_repository
