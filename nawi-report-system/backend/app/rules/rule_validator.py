"""
OIML R-76 Rule Set Validator

Band Matching Convention:
-------------------------
For a given load and verification scale interval e, the normalized load in intervals is:
    normalized_intervals = load / e

MPE (Maximum Permissible Error) bands are defined by [minIntervals, maxIntervals] with an associated mpeInE.
The standard OIML R-76 band matching rule applied across all accuracy classes is:
    minIntervals < normalized_intervals <= maxIntervals

Exception for the first band:
    The lower bound of the first band includes 0:
    minIntervals <= normalized_intervals <= maxIntervals  (where minIntervals == 0)

Example (Class III):
    Band 1: [0, 5000]       -> 0 <= load/e <= 5000       -> MPE = 0.5 e
    Band 2: (5000, 20000]   -> 5000 < load/e <= 20000    -> MPE = 1.0 e
    Band 3: (20000, 100000] -> 20000 < load/e <= 100000  -> MPE = 1.5 e
"""

from typing import Any, Dict, List, Union
from app.schemas import RuleSet


BAND_MATCHING_DOC = """
Band matching rule:
    minIntervals < load/e <= maxIntervals, except the first band includes 0 (minIntervals <= load/e <= maxIntervals).
"""


REQUIRED_RULE_SET_FIELDS = [
    "ruleSetId",
    "standard",
    "edition",
    "effectiveFrom",
    "mpeRules",
    "testRules",
]

REQUIRED_TEST_RULES = [
    "weighingPerformance",
    "eccentricity",
    "repeatability",
    "discrimination",
]


def validate_rule_set(data: Union[Dict[str, Any], RuleSet]) -> List[str]:
    """
    Validates a rule-set configuration dictionary or RuleSet model against schema
    and legal-metrology domain requirements. Returns a list of error descriptions (empty if valid).
    """
    errors: List[str] = []

    if isinstance(data, RuleSet):
        data_dict = data.model_dump(by_alias=True)
    elif isinstance(data, dict):
        data_dict = data
    else:
        return ["Rule-set must be a dictionary or RuleSet instance."]

    # 1. Check required top-level fields
    for field in REQUIRED_RULE_SET_FIELDS:
        val = data_dict.get(field)
        if val is None or (isinstance(val, str) and not val.strip()):
            errors.append(f"Missing required field: '{field}'")

    # 2. Validate warningRatio if present
    warning_ratio = data_dict.get("warningRatio")
    if warning_ratio is not None:
        try:
            wr_val = float(warning_ratio)
            if wr_val <= 0 or wr_val > 1.0:
                errors.append(f"warningRatio must be between 0 and 1.0, got {warning_ratio}")
        except (ValueError, TypeError):
            errors.append(f"warningRatio must be a numeric value, got {warning_ratio}")

    # 3. Validate mpeRules
    mpe_rules = data_dict.get("mpeRules")
    if not isinstance(mpe_rules, dict) or not mpe_rules:
        errors.append("Field 'mpeRules' must be a non-empty dictionary of accuracy classes.")
    else:
        for accuracy_class, bands in mpe_rules.items():
            if not isinstance(bands, list) or len(bands) == 0:
                errors.append(f"Class '{accuracy_class}' in mpeRules must contain a non-empty list of bands.")
                continue

            last_max = None
            for idx, band in enumerate(bands):
                if not isinstance(band, dict):
                    errors.append(f"Class '{accuracy_class}' band #{idx} must be an object.")
                    continue

                min_int = band.get("minIntervals")
                max_int = band.get("maxIntervals")
                mpe_in_e = band.get("mpeInE")

                if min_int is None or max_int is None or mpe_in_e is None:
                    errors.append(
                        f"Class '{accuracy_class}' band #{idx} must specify minIntervals, maxIntervals, and mpeInE."
                    )
                    continue

                try:
                    min_f = float(min_int)
                    max_f = float(max_int)
                    mpe_f = float(mpe_in_e)

                    if min_f >= max_f:
                        errors.append(
                            f"Class '{accuracy_class}' band #{idx}: minIntervals ({min_f}) must be < maxIntervals ({max_f})."
                        )
                    if mpe_f <= 0:
                        errors.append(
                            f"Class '{accuracy_class}' band #{idx}: mpeInE ({mpe_f}) must be positive."
                        )

                    # Check continuity
                    if idx == 0:
                        if min_f != 0:
                            errors.append(
                                f"Class '{accuracy_class}' first band must start at 0 intervals, got {min_f}."
                            )
                    elif last_max is not None and min_f != last_max:
                        errors.append(
                            f"Class '{accuracy_class}' band #{idx} minIntervals ({min_f}) does not match previous maxIntervals ({last_max})."
                        )
                    last_max = max_f
                except (ValueError, TypeError) as e:
                    errors.append(f"Class '{accuracy_class}' band #{idx} has invalid numeric values: {e}")

    # 4. Validate testRules
    test_rules = data_dict.get("testRules")
    if not isinstance(test_rules, dict):
        errors.append("Field 'testRules' must be a dictionary.")
    else:
        for required_test in REQUIRED_TEST_RULES:
            if required_test not in test_rules:
                errors.append(f"Missing required test definition in 'testRules': '{required_test}'")
            elif not isinstance(test_rules[required_test], dict):
                errors.append(f"Test rule '{required_test}' must be a dictionary.")

    return errors


def assert_valid_rule_set(data: Union[Dict[str, Any], RuleSet]) -> None:
    """
    Validates the rule-set and raises ValueError if any validation errors are detected.
    """
    errors = validate_rule_set(data)
    if errors:
        raise ValueError(f"RuleSet validation failed: {'; '.join(errors)}")
