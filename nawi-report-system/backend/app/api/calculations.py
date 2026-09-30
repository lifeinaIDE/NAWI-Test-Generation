"""
Calculations router — stateless OIML R-76 calculation endpoints.

All four endpoints require no reportId — used for live preview during wizard data entry.
Any authenticated user may call them.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from app.schemas import CalculationResult, User
from app.core.security import get_current_user
from app.rules.rule_loader import get_rule_repository, RuleRepository
from app.services import calculation_engine

router = APIRouter(prefix="/api/calculations", tags=["calculations"])

@router.post("/weighing-performance", response_model=CalculationResult)
async def calc_weighing_performance(
    body: Dict[str, Any], 
    current_user: User = Depends(get_current_user),
    repo: RuleRepository = Depends(get_rule_repository)
):
    try:
        rule_set = repo.get_active_ruleset()
        return calculation_engine.calculate_weighing_performance(
            test_load=body.get("testLoad", 0.0),
            indication=body.get("indication", 0.0),
            zero_error=body.get("zeroError", 0.0),
            e=body.get("e", 1.0),
            accuracy_class=body.get("accuracyClass", "III"),
            rule_set=rule_set
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=[{"level": "ERROR", "field": "", "message": str(e)}])

@router.post("/eccentricity", response_model=CalculationResult)
async def calc_eccentricity(
    body: Dict[str, Any], 
    current_user: User = Depends(get_current_user),
    repo: RuleRepository = Depends(get_rule_repository)
):
    try:
        rule_set = repo.get_active_ruleset()
        return calculation_engine.calculate_eccentricity(
            loads=body.get("loads", []),
            e=body.get("e", 1.0),
            accuracy_class=body.get("accuracyClass", "III"),
            rule_set=rule_set
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=[{"level": "ERROR", "field": "", "message": str(e)}])

@router.post("/repeatability", response_model=CalculationResult)
async def calc_repeatability(
    body: Dict[str, Any], 
    current_user: User = Depends(get_current_user),
    repo: RuleRepository = Depends(get_rule_repository)
):
    try:
        rule_set = repo.get_active_ruleset()
        return calculation_engine.calculate_repeatability(
            test_load=body.get("testLoad", 0.0),
            readings=body.get("readings", []),
            e=body.get("e", 1.0),
            accuracy_class=body.get("accuracyClass", "III"),
            rule_set=rule_set
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=[{"level": "ERROR", "field": "", "message": str(e)}])

@router.post("/discrimination", response_model=CalculationResult)
async def calc_discrimination(
    body: Dict[str, Any], 
    current_user: User = Depends(get_current_user),
    repo: RuleRepository = Depends(get_rule_repository)
):
    try:
        rule_set = repo.get_active_ruleset()
        return calculation_engine.calculate_discrimination(
            initial_indication=body.get("initialIndication", 0.0),
            added_load=body.get("addedLoad", 0.0),
            new_indication=body.get("newIndication", 0.0),
            d=body.get("d", 1.0),
            rule_set=rule_set
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=[{"level": "ERROR", "field": "", "message": str(e)}])
