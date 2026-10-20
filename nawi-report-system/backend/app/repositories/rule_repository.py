"""
RuleRepository adapter — re-exports from app.rules.rule_loader for architectural consistency.
"""

from app.rules.rule_loader import (
    RuleRepository,
    JsonRuleRepository,
    get_rule_repository,
    RULES_DIR,
)

def get_rule_repository_impl() -> RuleRepository:
    return get_rule_repository()
