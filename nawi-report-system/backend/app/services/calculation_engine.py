"""
Pure calculation engine driven strictly by versioned OIML R-76 rule-sets.
Zero threshold literals are hardcoded in this module.
All limits, tolerances, formulas, and warning ratios are read dynamically from rule-set.
"""

from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional
from app.schemas import CalculationResult, RuleSet


def _clean_decimal(val: Any) -> Optional[Decimal]:
    """
    Converts numeric input into a clean Decimal.
    Rounds floats to 8 decimal places to eliminate IEEE-754 representation noise
    (e.g., 0.1 + 0.2 -> 0.30000000000000004) so step arithmetic never causes a false FAIL.
    """
    if val is None:
        return None
    if isinstance(val, (int, str)):
        try:
            return Decimal(str(val))
        except (InvalidOperation, ValueError, TypeError):
            return None
    if isinstance(val, float):
        return Decimal(str(round(val, 8)))
    if isinstance(val, Decimal):
        return val
    try:
        return Decimal(str(val))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _to_float(d: Optional[Decimal]) -> Optional[float]:
    """Converts a Decimal to standard float, or None."""
    if d is None:
        return None
    return float(d)


def _get_rule_warning_ratio(rule_set: Any) -> Optional[Decimal]:
    """Extracts warningRatio from rule_set without hardcoded fallbacks."""
    if rule_set is None:
        return None
    if isinstance(rule_set, dict):
        ratio = rule_set.get("warningRatio")
    else:
        ratio = getattr(rule_set, "warningRatio", None)
    if ratio is None:
        return None
    return _clean_decimal(ratio)


def _get_rule_set_version(rule_set: Any) -> str:
    """Extracts ruleSetId from rule_set."""
    if rule_set is None:
        return ""
    if isinstance(rule_set, dict):
        return str(rule_set.get("ruleSetId", ""))
    return str(getattr(rule_set, "ruleSetId", ""))


def _get_mpe(load_in_e: Decimal, accuracy_class: str, rule_set: Any) -> Optional[Decimal]:
    """
    Looks up MPE in verification scale intervals (mpeInE) from the rule-set.

    Band matching convention:
        minIntervals < load/e <= maxIntervals, except the first band includes 0
        (minIntervals <= load/e <= maxIntervals when minIntervals == 0).
    """
    if rule_set is None:
        return None

    if isinstance(rule_set, dict):
        mpe_rules = rule_set.get("mpeRules", {})
    else:
        mpe_rules = getattr(rule_set, "mpeRules", {})

    if not isinstance(mpe_rules, dict) or accuracy_class not in mpe_rules:
        return None

    bands = mpe_rules[accuracy_class]
    if not isinstance(bands, list) or len(bands) == 0:
        return None

    zero_dec = Decimal(0)
    sorted_bands = sorted(
        bands,
        key=lambda b: _clean_decimal(b.get("minIntervals", 0)) or zero_dec
    )

    for idx, band in enumerate(sorted_bands):
        min_int = _clean_decimal(band.get("minIntervals"))
        max_int = _clean_decimal(band.get("maxIntervals"))
        mpe_in_e = _clean_decimal(band.get("mpeInE"))

        if min_int is None or max_int is None or mpe_in_e is None:
            continue

        if idx == 0 or min_int == zero_dec:
            if min_int <= load_in_e <= max_int:
                return mpe_in_e
        else:
            if min_int < load_in_e <= max_int:
                return mpe_in_e

    # If load exceeds highest defined interval, fallback to the maximum band's MPE
    last_band = sorted_bands[-1]
    last_max = _clean_decimal(last_band.get("maxIntervals")) or zero_dec
    if load_in_e > last_max:
        return _clean_decimal(last_band.get("mpeInE"))

    return None


def calculate_weighing_performance(
    test_load: Any = None,
    indication: Any = None,
    zero_error: Any = 0,
    e: Any = None,
    accuracy_class: str = "III",
    rule_set: Any = None,
) -> CalculationResult:
    """
    Weighing performance calculation:
        observedError = indication - testLoad
        correctedError = observedError - zeroError
        MPE = mpeInE * e (looked up from rule-set)
        PASS if abs(correctedError) <= MPE (equality is PASS)
        WARNING if abs > warningRatio * MPE and <= MPE
        else FAIL.
    """
    messages: List[str] = []

    if test_load is None or indication is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Missing required input: test_load and indication are required."]
        )
    if e is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Missing required input: verification interval e is required."]
        )
    if rule_set is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Missing required input: rule_set is required."]
        )

    e_dec = _clean_decimal(e)
    zero_dec = Decimal(0)
    if e_dec is None or e_dec <= zero_dec:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Verification interval e must be a positive number."]
        )

    load_dec = _clean_decimal(test_load)
    ind_dec = _clean_decimal(indication)
    zero_err_dec = _clean_decimal(zero_error) if zero_error is not None else zero_dec

    if load_dec is None or ind_dec is None or zero_err_dec is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Numeric values are required for test_load, indication, and zero_error."]
        )

    observed_error = ind_dec - load_dec
    corrected_error = observed_error - zero_err_dec
    load_in_e = load_dec / e_dec

    mpe_in_e = _get_mpe(load_in_e, accuracy_class, rule_set)
    if mpe_in_e is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=[f"Could not determine MPE for class '{accuracy_class}' at load {test_load}."]
        )

    mpe = mpe_in_e * e_dec
    abs_corrected = abs(corrected_error)
    warning_ratio = _get_rule_warning_ratio(rule_set)

    # Compliance logic
    if abs_corrected <= mpe:
        if warning_ratio is not None and abs_corrected > (warning_ratio * mpe):
            result = "WARNING"
            messages.append(
                f"Corrected error {_to_float(corrected_error)} is within MPE ({_to_float(mpe)}) but exceeds warning threshold ({_to_float(warning_ratio * mpe)})."
            )
        else:
            result = "PASS"
    else:
        result = "FAIL"
        messages.append(
            f"Corrected error {_to_float(corrected_error)} exceeds MPE limit of {_to_float(mpe)}."
        )

    failure_reason = None
    if result == "FAIL":
        failure_reason = f"Corrected error {_to_float(corrected_error)} exceeds maximum permissible error {_to_float(mpe)}"

    criterion = f"abs(correctedError) <= mpe ({_to_float(mpe)})"

    return CalculationResult(
        result=result,
        observedError=_to_float(observed_error),
        correctedError=_to_float(corrected_error),
        maxPermissibleError=_to_float(mpe),
        mpe=_to_float(mpe),
        mpeInE=_to_float(mpe_in_e),
        formulaUsed="OBSERVED_ERROR_V1",
        ruleSetVersion=_get_rule_set_version(rule_set),
        criterion=criterion,
        failureReason=failure_reason,
        messages=messages,
        details={
            "testLoad": _to_float(load_dec),
            "indication": _to_float(ind_dec),
            "zeroError": _to_float(zero_err_dec),
            "observedError": _to_float(observed_error),
            "correctedError": _to_float(corrected_error),
            "loadInE": _to_float(load_in_e),
            "mpeInE": _to_float(mpe_in_e),
            "mpe": _to_float(mpe),
        }
    )


def calculate_eccentricity(
    loads: Any = None,
    e: Any = None,
    accuracy_class: str = "III",
    rule_set: Any = None,
) -> CalculationResult:
    """
    Eccentricity calculation:
        error per position = indication - reference
        worst position by max abs error
        overall result: PASS if all pass, WARNING if any warning and no fails, FAIL if any fail.
    """
    if not loads or not isinstance(loads, list):
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Eccentricity requires a non-empty list of load position observations."]
        )
    if e is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Missing verification interval e."]
        )
    if rule_set is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Missing rule_set."]
        )

    e_dec = _clean_decimal(e)
    zero_dec = Decimal(0)
    if e_dec is None or e_dec <= zero_dec:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Verification interval e must be a positive number."]
        )

    warning_ratio = _get_rule_warning_ratio(rule_set)
    position_results: List[Dict[str, Any]] = []

    worst_error: Optional[Decimal] = None
    worst_position = ""
    worst_mpe: Optional[Decimal] = None
    worst_mpe_in_e: Optional[Decimal] = None

    for idx, item in enumerate(loads):
        if not isinstance(item, dict):
            return CalculationResult(
                result="INCOMPLETE",
                messages=[f"Load observation #{idx} must be an object with position, indication, reference."]
            )

        pos = str(item.get("position", f"POS_{idx}"))
        ind_dec = _clean_decimal(item.get("indication"))
        ref_raw = item.get("reference") if item.get("reference") is not None else item.get("load")
        ref_dec = _clean_decimal(ref_raw)

        if ind_dec is None or ref_dec is None:
            return CalculationResult(
                result="INCOMPLETE",
                messages=[f"Position '{pos}' missing valid numeric indication or reference."]
            )

        err = ind_dec - ref_dec
        load_in_e = ref_dec / e_dec
        mpe_in_e = _get_mpe(load_in_e, accuracy_class, rule_set)

        if mpe_in_e is None:
            return CalculationResult(
                result="INCOMPLETE",
                messages=[f"Could not determine MPE for class '{accuracy_class}' at position '{pos}'."]
            )

        mpe = mpe_in_e * e_dec
        abs_err = abs(err)

        if abs_err <= mpe:
            if warning_ratio is not None and abs_err > (warning_ratio * mpe):
                pos_status = "WARNING"
            else:
                pos_status = "PASS"
        else:
            pos_status = "FAIL"

        position_results.append({
            "position": pos,
            "indication": _to_float(ind_dec),
            "reference": _to_float(ref_dec),
            "error": _to_float(err),
            "mpe": _to_float(mpe),
            "mpeInE": _to_float(mpe_in_e),
            "result": pos_status,
        })

        if worst_error is None or abs_err > abs(worst_error):
            worst_error = err
            worst_position = pos
            worst_mpe = mpe
            worst_mpe_in_e = mpe_in_e

    if any(p["result"] == "FAIL" for p in position_results):
        overall_result = "FAIL"
    elif any(p["result"] == "WARNING" for p in position_results):
        overall_result = "WARNING"
    else:
        overall_result = "PASS"

    messages: List[str] = []
    failure_reason = None
    if overall_result == "FAIL":
        failure_reason = f"Worst position '{worst_position}' error {_to_float(worst_error)} exceeds MPE limit of {_to_float(worst_mpe)}"
        messages.append(failure_reason)
    elif overall_result == "WARNING":
        messages.append(
            f"Worst position '{worst_position}' error {_to_float(worst_error)} exceeds warning ratio threshold."
        )

    criterion = f"abs(error_at_each_position) <= mpe ({_to_float(worst_mpe)})"

    return CalculationResult(
        result=overall_result,
        observedError=_to_float(worst_error),
        correctedError=None,
        maxPermissibleError=_to_float(worst_mpe),
        mpe=_to_float(worst_mpe),
        mpeInE=_to_float(worst_mpe_in_e),
        formulaUsed="ECCENTRICITY_V1",
        ruleSetVersion=_get_rule_set_version(rule_set),
        criterion=criterion,
        failureReason=failure_reason,
        messages=messages,
        details={
            "worstPosition": worst_position,
            "mpeInE": _to_float(worst_mpe_in_e),
            "positions": position_results,
        }
    )


def calculate_repeatability(
    test_load: Any = None,
    readings: Any = None,
    e: Any = None,
    accuracy_class: str = "III",
    rule_set: Any = None,
) -> CalculationResult:
    """
    Repeatability calculation:
        range = max - min
        MPE from rule-set
        result: PASS if range <= MPE, WARNING if range > warningRatio * MPE and <= MPE, else FAIL
        returns max, min, readings in details.
    """
    if not readings or not isinstance(readings, list) or len(readings) < 2:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Repeatability requires at least two readings."]
        )
    if test_load is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Missing test_load."]
        )
    if e is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Missing verification interval e."]
        )
    if rule_set is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Missing rule_set."]
        )

    e_dec = _clean_decimal(e)
    zero_dec = Decimal(0)
    if e_dec is None or e_dec <= zero_dec:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Verification interval e must be a positive number."]
        )

    load_dec = _clean_decimal(test_load)
    if load_dec is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["test_load must be numeric."]
        )

    dec_readings: List[Decimal] = []
    for idx, r in enumerate(readings):
        val = _clean_decimal(r)
        if val is None:
            return CalculationResult(
                result="INCOMPLETE",
                messages=[f"Reading #{idx} must be a valid number."]
            )
        dec_readings.append(val)

    max_val = max(dec_readings)
    min_val = min(dec_readings)
    calc_range = max_val - min_val

    load_in_e = load_dec / e_dec
    mpe_in_e = _get_mpe(load_in_e, accuracy_class, rule_set)
    if mpe_in_e is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=[f"Could not determine MPE for class '{accuracy_class}' at load {test_load}."]
        )

    mpe = mpe_in_e * e_dec
    warning_ratio = _get_rule_warning_ratio(rule_set)

    if calc_range <= mpe:
        if warning_ratio is not None and calc_range > (warning_ratio * mpe):
            result = "WARNING"
        else:
            result = "PASS"
    else:
        result = "FAIL"

    messages: List[str] = []
    failure_reason = None
    if result == "FAIL":
        failure_reason = f"Repeatability range {_to_float(calc_range)} exceeds MPE limit of {_to_float(mpe)}"
        messages.append(failure_reason)
    elif result == "WARNING":
        messages.append(
            f"Repeatability range {_to_float(calc_range)} exceeds warning threshold ({_to_float(warning_ratio * mpe)}) but satisfies MPE ({_to_float(mpe)})."
        )

    criterion = f"range_less_than_or_equal_to_mpe ({_to_float(mpe)})"

    return CalculationResult(
        result=result,
        observedError=_to_float(calc_range),
        correctedError=None,
        maxPermissibleError=_to_float(mpe),
        mpe=_to_float(mpe),
        mpeInE=_to_float(mpe_in_e),
        formulaUsed="REPEATABILITY_RANGE_V1",
        ruleSetVersion=_get_rule_set_version(rule_set),
        criterion=criterion,
        failureReason=failure_reason,
        messages=messages,
        details={
            "testLoad": _to_float(load_dec),
            "range": _to_float(calc_range),
            "max": _to_float(max_val),
            "min": _to_float(min_val),
            "readings": [_to_float(r) for r in dec_readings],
            "mpeInE": _to_float(mpe_in_e),
            "mpe": _to_float(mpe),
        }
    )


def calculate_discrimination(
    initial_indication: Any = None,
    added_load: Any = None,
    new_indication: Any = None,
    d: Any = None,
    rule_set: Any = None,
) -> CalculationResult:
    """
    Discrimination calculation:
        delta = newIndication - initialIndication
        PASS if delta >= d, else FAIL.
    """
    if initial_indication is None or new_indication is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["initial_indication and new_indication are required for discrimination."]
        )
    if d is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Missing scale interval d."]
        )
    if rule_set is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Missing rule_set."]
        )

    d_dec = _clean_decimal(d)
    zero_dec = Decimal(0)
    if d_dec is None or d_dec <= zero_dec:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Scale interval d must be a positive number."]
        )

    init_dec = _clean_decimal(initial_indication)
    new_dec = _clean_decimal(new_indication)
    added_dec = _clean_decimal(added_load) if added_load is not None else zero_dec

    if init_dec is None or new_dec is None or added_dec is None:
        return CalculationResult(
            result="INCOMPLETE",
            messages=["Numeric values required for discrimination test."]
        )

    delta = new_dec - init_dec
    result = "PASS" if delta >= d_dec else "FAIL"

    messages: List[str] = []
    failure_reason = None
    if result == "FAIL":
        failure_reason = f"Indication change {_to_float(delta)} is less than scale interval d ({_to_float(d_dec)})"
        messages.append(failure_reason)

    criterion = f"indication_change_greater_than_or_equal_to_d ({_to_float(d_dec)})"

    return CalculationResult(
        result=result,
        observedError=_to_float(delta),
        correctedError=None,
        maxPermissibleError=_to_float(d_dec),
        mpe=_to_float(d_dec),
        mpeInE=None,
        formulaUsed="DISCRIMINATION_V1",
        ruleSetVersion=_get_rule_set_version(rule_set),
        criterion=criterion,
        failureReason=failure_reason,
        messages=messages,
        details={
            "initialIndication": _to_float(init_dec),
            "newIndication": _to_float(new_dec),
            "addedLoad": _to_float(added_dec),
            "delta": _to_float(delta),
            "d": _to_float(d_dec),
        }
    )
