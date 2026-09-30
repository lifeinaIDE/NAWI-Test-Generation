import json
import os
import glob
from typing import List, Optional
from fastapi import HTTPException
from app.schemas import RuleSet
from app.repositories.report_repository import get_report_repository

RULES_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "rules")

class JsonRuleRepository:
    def __init__(self, storage_dir: str = RULES_DIR):
        self.storage_dir = storage_dir
        os.makedirs(self.storage_dir, exist_ok=True)
        self.cache = {}
        self._load_all()

    def _load_all(self):
        self.cache = {}
        for filename in os.listdir(self.storage_dir):
            if filename.endswith(".json"):
                filepath = os.path.join(self.storage_dir, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        ruleset = RuleSet(**data)
                        self.cache[ruleset.ruleSetId] = ruleset
                except Exception as e:
                    print(f"Failed to load rule set {filename}: {e}")

        has_active = False
        for r in self.cache.values():
            if r.isActive:
                has_active = True
                break
        
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
            json.dump(ruleset.model_dump(mode='json'), f, indent=2)
        os.replace(tmp_filepath, filepath)

    def get_active_ruleset(self) -> RuleSet:
        for r in self.cache.values():
            if r.isActive:
                r.isLocked = self._is_locked(r.ruleSetId)
                return r
        raise RuntimeError("No active rule-set configured.")

    def get_by_id(self, rule_set_id: str) -> Optional[RuleSet]:
        r = self.cache.get(rule_set_id)
        if r:
            r.isLocked = self._is_locked(r.ruleSetId)
        return r

    def list(self) -> List[RuleSet]:
        for r in self.cache.values():
            r.isLocked = self._is_locked(r.ruleSetId)
        return list(self.cache.values())

    def _is_locked(self, rule_set_id: str) -> bool:
        # Checking if referenced by an APPROVED report
        repo = get_report_repository()
        for r in repo.list():
            if r.status == "APPROVED" and r.ruleSetVersion == rule_set_id:
                return True
        return False

    def create(self, ruleset: RuleSet) -> RuleSet:
        self.cache[ruleset.ruleSetId] = ruleset
        self._save_to_disk(ruleset)
        return ruleset

    def update(self, ruleset: RuleSet) -> RuleSet:
        # only if status is not locked
        if self._is_locked(ruleset.ruleSetId):
            raise HTTPException(status_code=409, detail="Rule-set is locked — referenced by an approved report.")
        
        self.cache[ruleset.ruleSetId] = ruleset
        self._save_to_disk(ruleset)
        return ruleset

    def activate(self, rule_set_id: str) -> RuleSet:
        if rule_set_id not in self.cache:
            raise KeyError(f"Rule set {rule_set_id} not found.")

        # Set all to inactive
        for r in self.cache.values():
            if r.isActive:
                r.isActive = False
                self._save_to_disk(r)

        # Set new one to active
        target = self.cache[rule_set_id]
        
        # Validate that required fields exist
        if not target.mpeRules or not target.testRules:
            raise HTTPException(status_code=422, detail="Missing required rule tables")
            
        target.isActive = True
        self._save_to_disk(target)
        return target

_rule_repository = JsonRuleRepository()

def get_rule_repository_impl() -> JsonRuleRepository:
    return _rule_repository
