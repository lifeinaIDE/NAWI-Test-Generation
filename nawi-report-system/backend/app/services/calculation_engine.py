from typing import List, Dict, Any
from app.schemas import CalculationResult, RuleSet

def _get_mpe(load_in_e: float, accuracy_class: str, rule_set: RuleSet) -> float:
    """Helper to look up MPE in the rule set based on class and load (in e)."""
    mpe_rules = rule_set.mpeRules.get(accuracy_class, [])
    if not mpe_rules:
        # Default or fail safely if class not found
        return 0.0
    
    # Sort rules just in case they aren't sorted
    mpe_rules = sorted(mpe_rules, key=lambda x: x["minIntervals"])
    
    for rule in mpe_rules:
        if rule["minIntervals"] <= load_in_e <= rule["maxIntervals"]:
            return rule["mpeInE"]
            
    # If it exceeds the maximum intervals defined, usually it falls back to the max rule
    # For prototype, we'll return the highest MPE of the class
    return mpe_rules[-1]["mpeInE"] if mpe_rules else 0.0

def calculate_weighing_performance(
    test_load: float, 
    indication: float, 
    zero_error: float, 
    e: float, 
    accuracy_class: str, 
    rule_set: RuleSet
) -> CalculationResult:
    
    observed_error = indication - test_load
    corrected_error = observed_error - zero_error
    
    load_in_e = test_load / e if e > 0 else 0
    mpe_in_e = _get_mpe(load_in_e, accuracy_class, rule_set)
    mpe = mpe_in_e * e
    
    result = "PASS" if abs(corrected_error) <= mpe else "FAIL"
    
    return CalculationResult(
        observedError=observed_error,
        correctedError=corrected_error,
        maxPermissibleError=mpe,
        result=result,
        formulaUsed="OBSERVED_ERROR_V1",
        ruleSetVersion=rule_set.ruleSetId,
        details={
            "testLoad": test_load,
            "indication": indication,
            "zeroError": zero_error,
            "mpeInE": mpe_in_e
        }
    )

def calculate_eccentricity(
    loads: List[Dict[str, Any]], # List of {"position": str, "indication": float, "reference": float}
    e: float, 
    accuracy_class: str, 
    rule_set: RuleSet
) -> CalculationResult:
    
    worst_error = 0.0
    worst_position = ""
    mpe_used = 0.0
    mpe_in_e = 0.0
    
    results_per_position = []
    
    for load in loads:
        position = load.get("position", "")
        indication = load.get("indication", 0.0)
        reference = load.get("reference", 0.0)
        
        error = indication - reference
        
        load_in_e = reference / e if e > 0 else 0
        current_mpe_in_e = _get_mpe(load_in_e, accuracy_class, rule_set)
        current_mpe = current_mpe_in_e * e
        
        results_per_position.append({
            "position": position,
            "error": error,
            "mpe": current_mpe
        })
        
        if abs(error) > abs(worst_error):
            worst_error = error
            worst_position = position
            mpe_used = current_mpe
            mpe_in_e = current_mpe_in_e
            
        # In case worst error is 0, we still want to record the mpe
        if mpe_used == 0.0:
            mpe_used = current_mpe
            mpe_in_e = current_mpe_in_e

    # Check if ANY position failed
    result = "PASS"
    for r in results_per_position:
        if abs(r["error"]) > r["mpe"]:
            result = "FAIL"
            break
            
    return CalculationResult(
        observedError=worst_error,
        correctedError=None,
        maxPermissibleError=mpe_used,
        result=result,
        formulaUsed="ECCENTRICITY_V1",
        ruleSetVersion=rule_set.ruleSetId,
        details={
            "worstPosition": worst_position,
            "mpeInE": mpe_in_e,
            "positions": results_per_position
        }
    )

def calculate_repeatability(
    test_load: float, 
    readings: List[float], 
    e: float, 
    accuracy_class: str, 
    rule_set: RuleSet
) -> CalculationResult:
    
    if not readings:
        return CalculationResult(result="INCOMPLETE")
        
    calc_range = max(readings) - min(readings)
    
    load_in_e = test_load / e if e > 0 else 0
    mpe_in_e = _get_mpe(load_in_e, accuracy_class, rule_set)
    mpe = mpe_in_e * e
    
    result = "PASS" if calc_range <= mpe else "FAIL"
    
    return CalculationResult(
        observedError=calc_range,
        correctedError=None,
        maxPermissibleError=mpe,
        result=result,
        formulaUsed="REPEATABILITY_RANGE_V1",
        ruleSetVersion=rule_set.ruleSetId,
        details={
            "testLoad": test_load,
            "range": calc_range,
            "mpeInE": mpe_in_e
        }
    )

def calculate_discrimination(
    initial_indication: float, 
    added_load: float, 
    new_indication: float, 
    d: float, 
    rule_set: RuleSet
) -> CalculationResult:
    
    delta = new_indication - initial_indication
    
    result = "PASS" if delta >= d else "FAIL"
    
    return CalculationResult(
        observedError=delta,
        correctedError=None,
        maxPermissibleError=d, # for discrimination, MPE is conceptually d
        result=result,
        formulaUsed="DISCRIMINATION_V1",
        ruleSetVersion=rule_set.ruleSetId,
        details={
            "initialIndication": initial_indication,
            "newIndication": new_indication,
            "addedLoad": added_load,
            "d": d
        }
    )
