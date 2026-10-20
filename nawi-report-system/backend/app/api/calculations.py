"""
Calculations router — stateless OIML R-76 calculation endpoints.

All four endpoints require no reportId — used for live preview during wizard data entry.
Any authenticated user may call them.
Calculations are driven by the active rule-set, or an optional ruleSetId provided in the body.
Invalid/missing input returns result "INCOMPLETE" with descriptive messages, never an HTTP 500.
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends

from app.schemas import CalculationResult, User
from app.core.security import get_current_user
from app.rules.rule_loader import get_rule_repository, RuleRepository
from app.services import calculation_engine

router = APIRouter(prefix="/api/calculations", tags=["calculations"])


def _resolve_rule_set(body: Dict[str, Any], repo: RuleRepository):
    rule_set_id = body.get("ruleSetId") or body.get("ruleSetVersion") or body.get("ruleSet")
    report_id = body.get("reportId")
    if not rule_set_id and report_id:
        from app.repositories.report_repository import get_report_repository
        rep = get_report_repository().get(report_id)
        if rep and rep.ruleSetVersion:
            rule_set_id = rep.ruleSetVersion

    if rule_set_id:
        rule_set = repo.get_by_id(rule_set_id)
        if not rule_set:
            return None, f"Rule set '{rule_set_id}' not found."
        return rule_set, None
    try:
        return repo.get_active(), None
    except Exception as e:
        return None, f"Failed to resolve active rule-set: {e}"


@router.post("/weighing-performance", response_model=CalculationResult)
async def calc_weighing_performance(
    body: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    repo: RuleRepository = Depends(get_rule_repository),
):
    rule_set, err = _resolve_rule_set(body, repo)
    if err:
        return CalculationResult(result="INCOMPLETE", messages=[err])

    try:
        return calculation_engine.calculate_weighing_performance(
            test_load=body.get("testLoad"),
            indication=body.get("indication"),
            zero_error=body.get("zeroError", 0),
            e=body.get("e"),
            accuracy_class=body.get("accuracyClass", "III"),
            rule_set=rule_set,
        )
    except Exception as exc:
        return CalculationResult(result="INCOMPLETE", messages=[str(exc)])


@router.post("/eccentricity", response_model=CalculationResult)
async def calc_eccentricity(
    body: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    repo: RuleRepository = Depends(get_rule_repository),
):
    rule_set, err = _resolve_rule_set(body, repo)
    if err:
        return CalculationResult(result="INCOMPLETE", messages=[err])

    try:
        return calculation_engine.calculate_eccentricity(
            loads=body.get("loads"),
            e=body.get("e"),
            accuracy_class=body.get("accuracyClass", "III"),
            rule_set=rule_set,
        )
    except Exception as exc:
        return CalculationResult(result="INCOMPLETE", messages=[str(exc)])


@router.post("/repeatability", response_model=CalculationResult)
async def calc_repeatability(
    body: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    repo: RuleRepository = Depends(get_rule_repository),
):
    rule_set, err = _resolve_rule_set(body, repo)
    if err:
        return CalculationResult(result="INCOMPLETE", messages=[err])

    try:
        return calculation_engine.calculate_repeatability(
            test_load=body.get("testLoad"),
            readings=body.get("readings"),
            e=body.get("e"),
            accuracy_class=body.get("accuracyClass", "III"),
            rule_set=rule_set,
        )
    except Exception as exc:
        return CalculationResult(result="INCOMPLETE", messages=[str(exc)])


@router.post("/discrimination", response_model=CalculationResult)
async def calc_discrimination(
    body: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    repo: RuleRepository = Depends(get_rule_repository),
):
    rule_set, err = _resolve_rule_set(body, repo)
    if err:
        return CalculationResult(result="INCOMPLETE", messages=[err])

    try:
        return calculation_engine.calculate_discrimination(
            initial_indication=body.get("initialIndication"),
            added_load=body.get("addedLoad"),
            new_indication=body.get("newIndication"),
            d=body.get("d"),
            rule_set=rule_set,
        )
    except Exception as exc:
        return CalculationResult(result="INCOMPLETE", messages=[str(exc)])
