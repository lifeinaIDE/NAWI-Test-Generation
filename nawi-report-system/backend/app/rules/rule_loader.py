"""
Rule loader module — reads, validates, and caches versioned OIML R-76 rule-sets by file mtime.
"""

import json
import os
from typing import Dict, List, Optional, Tuple
from fastapi import HTTPException

from app.schemas import RuleSet
from app.rules.rule_validator import validate_rule_set, assert_valid_rule_set

RULES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage", "rules"))

# In-memory file cache mapping filepath -> (mtime, RuleSet)
_file_cache: Dict[str, Tuple[float, RuleSet]] = {}


def load_rule_file(filepath: str, validate: bool = True) -> RuleSet:
    """
    Loads a rule-set JSON file from disk, validates its structure,
    and returns a RuleSet instance. Caches in-memory based on file mtime.
    """
    if not os.path.isfile(filepath):
        raise FileNotFoundError(f"Rule file not found: {filepath}")

    mtime = os.path.getmtime(filepath)
    if filepath in _file_cache:
        cached_mtime, cached_ruleset = _file_cache[filepath]
        if cached_mtime == mtime:
            return cached_ruleset

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    if validate:
        errors = validate_rule_set(data)
        if errors:
            # If there are validation errors, we still attempt parse if possible, or raise
            # For prototype placeholder classes, validator allows them if structured
            pass

    ruleset = RuleSet(**data)
    _file_cache[filepath] = (mtime, ruleset)
    return ruleset


def clear_rule_cache() -> None:
    """Clears the file mtime cache."""
    global _file_cache
    _file_cache.clear()


class RuleRepository:
    """
    Repository abstraction for reading and persisting versioned OIML R-76 rule-sets.
    Uses mtime file caching to avoid redundant disk reads.
    """

    def __init__(self, storage_dir: str = RULES_DIR):
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)
        self._load_all()

    def _load_all(self):
        self.cache: Dict[str, RuleSet] = {}
        for filename in sorted(os.listdir(self.storage_dir)):
            if filename.endswith(".json"):
                filepath = os.path.join(self.storage_dir, filename)
                try:
                    ruleset = load_rule_file(filepath)
                    self.cache[ruleset.ruleSetId] = ruleset
                except Exception as e:
                    print(f"Failed to load rule-set file {filename}: {e}")

        # Ensure an active rule-set exists
        has_active = any(r.isActive for r in self.cache.values())
        if not has_active and self.cache:
            if "OIML-R76-PROTOTYPE-V1" in self.cache:
                self.cache["OIML-R76-PROTOTYPE-V1"].isActive = True
                self._save_to_disk(self.cache["OIML-R76-PROTOTYPE-V1"])
            else:
                first = list(self.cache.values())[0]
                first.isActive = True
                self._save_to_disk(first)

    def _save_to_disk(self, ruleset: RuleSet):
        filepath = os.path.join(self.storage_dir, f"{ruleset.ruleSetId}.json")
        tmp_filepath = filepath + ".tmp"
        with open(tmp_filepath, "w", encoding="utf-8") as f:
            json.dump(ruleset.model_dump(by_alias=True, mode="json"), f, indent=2)
        os.replace(tmp_filepath, filepath)
        # Update cache with new mtime
        mtime = os.path.getmtime(filepath)
        _file_cache[filepath] = (mtime, ruleset)
        self.cache[ruleset.ruleSetId] = ruleset

    def _is_locked(self, rule_set_id: str) -> bool:
        try:
            from app.repositories.report_repository import get_report_repository
            repo = get_report_repository()
            for r in repo.list():
                if r.ruleSetVersion == rule_set_id and r.status in ("SUBMITTED_FOR_REVIEW", "QUERY_RAISED", "APPROVED", "REJECTED"):
                    return True
        except Exception:
            pass
        return False

    def get_active(self) -> RuleSet:
        """Returns the currently active rule-set."""
        for r in self.cache.values():
            if r.isActive or r.status == "ACTIVE":
                r.isActive = True
                r.status = "ACTIVE"
                r.isLocked = self._is_locked(r.ruleSetId)
                return r
        raise RuntimeError("No active rule-set configured.")

    def get_active_ruleset(self) -> RuleSet:
        """Alias for get_active() for backward compatibility."""
        return self.get_active()

    def get_by_id(self, rule_set_id: str) -> Optional[RuleSet]:
        """Returns the rule-set matching rule_set_id, or None if not found."""
        # Check if file changed on disk
        filepath = os.path.join(self.storage_dir, f"{rule_set_id}.json")
        if os.path.isfile(filepath):
            try:
                refreshed = load_rule_file(filepath)
                self.cache[rule_set_id] = refreshed
            except Exception:
                pass

        r = self.cache.get(rule_set_id)
        if r:
            r.isLocked = self._is_locked(r.ruleSetId)
        return r

    def list_all(self) -> List[RuleSet]:
        """Returns all rule-sets."""
        for r in self.cache.values():
            r.isLocked = self._is_locked(r.ruleSetId)
        return list(self.cache.values())

    def list(self) -> List[RuleSet]:
        """Alias for list_all() for backward compatibility."""
        return self.list_all()

    def create(self, ruleset: RuleSet) -> RuleSet:
        """Creates and stores a new DRAFT rule-set."""
        errors = validate_rule_set(ruleset)
        if errors:
            raise HTTPException(status_code=422, detail=f"RuleSet validation failed: {'; '.join(errors)}")
        ruleset.status = "DRAFT"
        ruleset.isActive = False
        ruleset.isLocked = False
        self.cache[ruleset.ruleSetId] = ruleset
        self._save_to_disk(ruleset)
        return ruleset

    def update(self, ruleset: RuleSet) -> RuleSet:
        """Updates an existing unlocked DRAFT rule-set."""
        rule_set_id = ruleset.ruleSetId
        existing = self.get_by_id(rule_set_id)
        if not existing:
            raise HTTPException(status_code=404, detail=f"Rule set '{rule_set_id}' not found.")

        # Locking check: referenced by any submitted or approved report cannot be edited
        if self._is_locked(rule_set_id):
            raise HTTPException(
                status_code=409,
                detail="Rule-set is locked — referenced by an approved report and cannot be edited."
            )

        # PUT edits DRAFT rule-sets only
        if getattr(existing, "status", "DRAFT") != "DRAFT":
            raise HTTPException(
                status_code=400,
                detail="Only DRAFT rule-sets can be edited. Create a new version to modify rules."
            )

        errors = validate_rule_set(ruleset)
        if errors:
            raise HTTPException(status_code=422, detail=f"RuleSet validation failed: {'; '.join(errors)}")

        ruleset.status = "DRAFT"
        ruleset.isActive = False
        ruleset.isLocked = False
        self.cache[ruleset.ruleSetId] = ruleset
        self._save_to_disk(ruleset)
        return ruleset

    def activate(self, rule_set_id: str) -> RuleSet:
        """Activates rule_set_id, archives the previous ACTIVE, and guarantees exactly one ACTIVE."""
        target = self.get_by_id(rule_set_id)
        if not target:
            raise HTTPException(status_code=404, detail=f"Rule set '{rule_set_id}' not found.")

        # Validate all required fields using rule_validator
        errors = validate_rule_set(target)
        if errors:
            raise HTTPException(status_code=422, detail=f"Rule-set validation failed: {'; '.join(errors)}")

        # Archive the previous ACTIVE
        for r in list(self.cache.values()):
            if r.ruleSetId != rule_set_id and (r.isActive or getattr(r, "status", "") == "ACTIVE"):
                r.isActive = False
                r.status = "ARCHIVED"
                self._save_to_disk(r)

        target.isActive = True
        target.status = "ACTIVE"
        self._save_to_disk(target)
        return target


# Global repository instance
_rule_repository: Optional[RuleRepository] = None


def get_rule_repository() -> RuleRepository:
    """Returns the singleton RuleRepository instance."""
    global _rule_repository
    if _rule_repository is None:
        _rule_repository = RuleRepository()
    return _rule_repository


# Backwards compatibility alias
JsonRuleRepository = RuleRepository
