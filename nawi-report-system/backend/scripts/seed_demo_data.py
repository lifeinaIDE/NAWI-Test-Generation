import os
import sys
import json
from datetime import datetime, timezone

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.schemas import Report, Instrument
from app.repositories.report_repository import get_report_repository

def create_demo_data():
    repo = get_report_repository()
    
    # Check if demo data already exists (idempotency check)
    existing = repo.list()
    demo_ids = ["NAWI-DEMO-PASS-001", "NAWI-DEMO-FAIL-002", "NAWI-DEMO-WARN-003"]
    if any(r.reportId in demo_ids for r in existing):
        print("Demo data already loaded. Skipping.")
        return

    print("Loading FICTIONAL DEMO DATA — not real government or laboratory test data...")

    base_report = {
        "title": "FICTIONAL DEMO DATA - Routine Verification",
        "applicationNumber": "DEMO-APP-2026",
        "laboratory": {"name": "Central Demo Legal Metrology Laboratory"},
        "manufacturer": {"name": "DemoWeigh Systems"},
        "instrument": {
            "model": "BP-Platform-300",
            "serialNumber": "BP300-DEMO-001",
            "type": "Platform Scale",
            "accuracyClass": "III",
            "maxCapacity": 300,
            "minCapacity": 2,
            "verificationIntervalE": 0.1,
            "actualIntervalD": 0.1,
            "numberOfIntervalsN": 3000,
            "unit": "kg",
            "softwareVersion": "v1.0"
        },
        "environment": {
            "temperatureStart": 22.0,
            "temperatureEnd": 22.5,
            "relativeHumidity": 45.0,
            "barometricPressure": 1013.0
        },
        "createdBy": "user-tech-01",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "ruleSetVersion": "OIML-R76-PROTOTYPE-V1",
        "tests": []
    }

    # 1. ALL-PASS
    pass_report = base_report.copy()
    pass_report["reportId"] = demo_ids[0]
    pass_report["status"] = "APPROVED"
    pass_report["finalResult"] = "PASS"
    pass_report["tests"] = [
        {
            "testCode": "WP",
            "testName": "Weighing Performance",
            "testType": "WEIGHING_PERFORMANCE",
            "applicable": True,
            "observations": [{"testLoad": 150, "indication": 150.0, "zeroError": 0}],
            "result": "PASS",
            "calculatedError": 0.0,
            "maxPermissibleError": 0.1
        }
    ]
    repo.create(Report(**pass_report))

    # 2. FAIL
    fail_report = base_report.copy()
    fail_report["reportId"] = demo_ids[1]
    fail_report["status"] = "APPROVED"
    fail_report["finalResult"] = "FAIL"
    fail_report["tests"] = [
        {
            "testCode": "WP",
            "testName": "Weighing Performance",
            "testType": "WEIGHING_PERFORMANCE",
            "applicable": True,
            "observations": [{"testLoad": 50, "indication": 50.18, "zeroError": 0}],
            "result": "FAIL",
            "calculatedError": 0.18,
            "maxPermissibleError": 0.05,
            "remarks": "Observed error 0.18 kg exceeds MPE ±0.05 kg at load 50 kg"
        }
    ]
    repo.create(Report(**fail_report))

    # 3. WARNING
    warn_report = base_report.copy()
    warn_report["reportId"] = demo_ids[2]
    warn_report["status"] = "APPROVED"
    warn_report["finalResult"] = "PASS"
    warn_report["tests"] = [
        {
            "testCode": "WP",
            "testName": "Weighing Performance",
            "testType": "WEIGHING_PERFORMANCE",
            "applicable": True,
            "observations": [{"testLoad": 50, "indication": 50.045, "zeroError": 0}],
            "result": "WARNING",
            "calculatedError": 0.045,
            "maxPermissibleError": 0.05,
            "remarks": "Warning: Error is very close to MPE threshold."
        }
    ]
    repo.create(Report(**warn_report))
    
    print("Demo data loaded successfully!")

if __name__ == "__main__":
    create_demo_data()
