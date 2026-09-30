import json
import os
from typing import Dict
from app.schemas import RuleSet

RULES_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "rules")

from app.repositories.rule_repository import get_rule_repository_impl, JsonRuleRepository

# For backward compatibility with existing imports
RuleRepository = JsonRuleRepository

def get_rule_repository() -> RuleRepository:
    return get_rule_repository_impl()
