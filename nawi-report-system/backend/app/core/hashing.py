import json
import hashlib
import copy
from typing import Any, Union


def get_canonical_report_dict(report: Union[dict, Any]) -> dict:
    """
    Extracts report dictionary excluding 'hash' and 'auditEvents'.
    Ensures nested fields are canonicalized for JSON serialization.
    """
    if hasattr(report, "model_dump"):
        data = report.model_dump(by_alias=True, mode="json")
    else:
        data = copy.deepcopy(report)

    # Exclude "hash" and "auditEvents"
    data.pop("hash", None)
    data.pop("auditEvents", None)
    return data


def compute_report_hash(report: Union[dict, Any]) -> str:
    """
    Computes SHA-256 of canonical JSON (json.dumps with sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    of the report excluding the "hash" and "auditEvents" fields.
    """
    data = get_canonical_report_dict(report)
    canonical_json = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()
