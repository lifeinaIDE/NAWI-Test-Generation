"""Rules router — full CRUD with activation locking for rule-set versioning."""
from fastapi import APIRouter, Depends, HTTPException
from app.schemas import RuleSet, User
from app.core.security import get_current_user, require_role

router = APIRouter(prefix="/api/rules", tags=["rules"])


from typing import List
from app.rules.rule_loader import get_rule_repository, RuleRepository

@router.get("", response_model=List[RuleSet], summary="List all rule-set versions")
async def list_rules(current_user: User = Depends(require_role(["ADMIN"])), repo: RuleRepository = Depends(get_rule_repository)):
    return repo.list()


@router.get("/active", response_model=RuleSet, summary="Active rule-set")
async def get_active_rule(current_user: User = Depends(get_current_user), repo: RuleRepository = Depends(get_rule_repository)):
    return repo.get_active_ruleset()


@router.get("/{rule_set_id}", response_model=RuleSet, summary="Get rule-set by ID")
async def get_rule(rule_set_id: str, current_user: User = Depends(require_role(["ADMIN"])), repo: RuleRepository = Depends(get_rule_repository)):
    res = repo.get_by_id(rule_set_id)
    if not res:
        raise HTTPException(status_code=404, detail="Rule set not found")
    return res


@router.post("", response_model=RuleSet, summary="Create draft rule-set")
async def create_rule(
    current_user: User = Depends(require_role(["ADMIN"])),
    repo: RuleRepository = Depends(get_rule_repository)
):
    active = repo.get_active_ruleset()
    
    # Create new ID based on count
    all_rules = repo.list()
    new_version = len(all_rules) + 1
    new_id = f"OIML-R76-2006-V{new_version}"
    
    # Clone the active ruleset
    new_ruleset = RuleSet(
        ruleSetId=new_id,
        standard=active.standard,
        edition=active.edition,
        effectiveFrom=active.effectiveFrom,
        mpeRules=active.mpeRules,
        testRules=active.testRules,
        isActive=False
    )
    
    return repo.create(new_ruleset)


@router.put("/{rule_set_id}", response_model=RuleSet, summary="Edit draft rule-set")
async def update_rule(
    rule_set_id: str,
    ruleset: RuleSet,
    current_user: User = Depends(require_role(["ADMIN"])),
    repo: RuleRepository = Depends(get_rule_repository)
):
    if ruleset.ruleSetId != rule_set_id:
        raise HTTPException(status_code=400, detail="ID mismatch")
        
    target = repo.get_by_id(rule_set_id)
    if not target:
        raise HTTPException(status_code=404, detail="Rule set not found")
        
    return repo.update(ruleset)


@router.post("/{rule_set_id}/activate", response_model=RuleSet, summary="Activate rule-set")
async def activate_rule(
    rule_set_id: str, 
    current_user: User = Depends(require_role(["ADMIN"])),
    repo: RuleRepository = Depends(get_rule_repository)
):
    return repo.activate(rule_set_id)
