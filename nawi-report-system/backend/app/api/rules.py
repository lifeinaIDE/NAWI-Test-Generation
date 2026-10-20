"""Rules router — full CRUD with activation locking for rule-set versioning."""
import re
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import Field

from app.schemas import RuleSet, User, CamelModel
from app.core.security import get_current_user, require_role
from app.rules.rule_loader import get_rule_repository, RuleRepository

router = APIRouter(prefix="/api/rules", tags=["rules"])


class CreateRuleDraftRequest(CamelModel):
    copyFrom: Optional[str] = Field(default=None, alias="copyFrom")
    standard: Optional[str] = Field(default=None, alias="standard")
    edition: Optional[str] = Field(default=None, alias="edition")
    changeNotes: Optional[str] = Field(default=None, alias="changeNotes")


@router.get("", response_model=List[RuleSet], summary="List all rule-set versions")
async def list_rules(
    current_user: User = Depends(get_current_user),
    repo: RuleRepository = Depends(get_rule_repository),
):
    return repo.list_all()


@router.get("/active", response_model=RuleSet, summary="Active rule-set")
async def get_active_rule(
    current_user: User = Depends(get_current_user),
    repo: RuleRepository = Depends(get_rule_repository),
):
    return repo.get_active()


@router.get("/{rule_set_id}", response_model=RuleSet, summary="Get rule-set by ID")
async def get_rule(
    rule_set_id: str,
    current_user: User = Depends(get_current_user),
    repo: RuleRepository = Depends(get_rule_repository),
):
    res = repo.get_by_id(rule_set_id)
    if not res:
        raise HTTPException(status_code=404, detail="Rule set not found")
    return res


@router.post("", response_model=RuleSet, summary="Create draft rule-set")
async def create_rule(
    body: Optional[CreateRuleDraftRequest] = None,
    current_user: User = Depends(require_role(["ADMIN"])),
    repo: RuleRepository = Depends(get_rule_repository),
):
    copy_source = None
    if body and body.copyFrom:
        copy_source = repo.get_by_id(body.copyFrom)
    if not copy_source:
        copy_source = repo.get_active()

    # Determine next version number
    all_rules = repo.list_all()
    version_nums = []
    for r in all_rules:
        m = re.search(r"-V(\d+)$", r.ruleSetId)
        if m:
            version_nums.append(int(m.group(1)))
    next_ver = max(version_nums, default=0) + 1
    new_id = f"OIML-R76-2006-V{next_ver}"

    now_date = datetime.utcnow().strftime("%Y-%m-%d")
    now_iso = datetime.utcnow().isoformat() + "Z"

    new_ruleset = RuleSet(
        ruleSetId=new_id,
        standard=body.standard if body and body.standard else copy_source.standard,
        edition=body.edition if body and body.edition else (copy_source.edition or "Draft version"),
        effectiveFrom=now_date,
        changeNotes=body.changeNotes if body and body.changeNotes else f"Draft version created from {copy_source.ruleSetId}",
        status="DRAFT",
        createdBy=current_user.username,
        createdAt=now_iso,
        warningRatio=copy_source.warningRatio if copy_source.warningRatio is not None else 0.9,
        mpeRules=copy_source.mpeRules,
        testRules=copy_source.testRules,
        isActive=False,
        isLocked=False,
    )

    return repo.create(new_ruleset)


@router.put("/{rule_set_id}", response_model=RuleSet, summary="Edit draft rule-set")
async def update_rule(
    rule_set_id: str,
    ruleset: RuleSet,
    current_user: User = Depends(require_role(["ADMIN"])),
    repo: RuleRepository = Depends(get_rule_repository),
):
    if ruleset.ruleSetId != rule_set_id:
        ruleset.ruleSetId = rule_set_id

    return repo.update(ruleset)


@router.post("/{rule_set_id}/activate", response_model=RuleSet, summary="Activate rule-set")
async def activate_rule(
    rule_set_id: str,
    current_user: User = Depends(require_role(["ADMIN"])),
    repo: RuleRepository = Depends(get_rule_repository),
):
    return repo.activate(rule_set_id)
