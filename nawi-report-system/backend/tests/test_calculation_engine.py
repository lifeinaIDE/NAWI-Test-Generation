import os
import copy
import re
from decimal import Decimal
import pytest

from app.services.calculation_engine import (
    calculate_weighing_performance,
    calculate_eccentricity,
    calculate_repeatability,
    calculate_discrimination,
    _get_mpe,
)
from app.schemas import RuleSet
from app.rules.rule_loader import get_rule_repository, clear_rule_cache


@pytest.fixture
def proto_ruleset() -> RuleSet:
    clear_rule_cache()
    repo = get_rule_repository()
    repo._load_all()
    ruleset = repo.get_by_id("OIML-R76-PROTOTYPE-V1")
    if not ruleset:
        ruleset = repo.get_active()
    return ruleset


@pytest.fixture
def boundary_ruleset() -> RuleSet:
    """Rule set with warningRatio omitted so abs(error) == MPE evaluates directly to PASS."""
    return RuleSet(
        ruleSetId="BOUNDARY-TEST-V1",
        standard="OIML R-76",
        edition="Standard Test Edition",
        effectiveFrom="2026-01-01",
        warningRatio=None,
        mpeRules={
            "III": [
                {"minIntervals": 0, "maxIntervals": 5000, "mpeInE": 0.5},
                {"minIntervals": 5000, "maxIntervals": 20000, "mpeInE": 1.0},
                {"minIntervals": 20000, "maxIntervals": 100000, "mpeInE": 1.5},
            ]
        },
        testRules={
            "weighingPerformance": {"criterion": "abs(observedError) <= mpe"},
            "eccentricity": {"criterion": "abs(error_at_each_position) <= mpe"},
            "repeatability": {"criterion": "range_less_than_or_equal_to_mpe"},
            "discrimination": {"criterion": "indication_change_greater_than_or_equal_to_d"},
        },
    )


# ---------------------------------------------------------------------------
# 1. Class III band matching: load/e = 3000 -> 0.5 e; load/e = 10000 -> 1.0 e
# ---------------------------------------------------------------------------
def test_class_iii_band_matching(proto_ruleset):
    # load/e = 3000 falls in [0, 5000] -> 0.5 e
    assert _get_mpe(Decimal("3000"), "III", proto_ruleset) == Decimal("0.5")

    # load/e = 5000 is inclusive in first band -> 0.5 e
    assert _get_mpe(Decimal("5000"), "III", proto_ruleset) == Decimal("0.5")

    # load/e = 5000.1 steps into second band (5000, 20000] -> 1.0 e
    assert _get_mpe(Decimal("5000.1"), "III", proto_ruleset) == Decimal("1.0")

    # load/e = 10000 falls in (5000, 20000] -> 1.0 e
    assert _get_mpe(Decimal("10000"), "III", proto_ruleset) == Decimal("1.0")

    # load/e = 20000 is inclusive in second band -> 1.0 e
    assert _get_mpe(Decimal("20000"), "III", proto_ruleset) == Decimal("1.0")

    # load/e = 25000 falls in (20000, 100000] -> 1.5 e
    assert _get_mpe(Decimal("25000"), "III", proto_ruleset) == Decimal("1.5")


# ---------------------------------------------------------------------------
# 2. PASS, FAIL, WARNING and BOUNDARY (abs(error) == MPE -> PASS)
# ---------------------------------------------------------------------------
def test_weighing_performance_pass_warning_fail(proto_ruleset):
    # e = 1.0, test_load = 3000 -> load/e = 3000 -> MPE = 0.5, warningRatio = 0.9 -> warning threshold = 0.45
    # PASS: error = 0.2 (<= 0.45)
    res_pass = calculate_weighing_performance(
        test_load=3000.0, indication=3000.2, zero_error=0.0,
        e=1.0, accuracy_class="III", rule_set=proto_ruleset
    )
    assert res_pass.result == "PASS"
    assert res_pass.observedError == pytest.approx(0.2)
    assert res_pass.correctedError == pytest.approx(0.2)
    assert res_pass.mpe == pytest.approx(0.5)
    assert res_pass.mpeInE == pytest.approx(0.5)
    assert res_pass.failureReason is None
    assert "abs(correctedError) <= mpe" in res_pass.criterion

    # WARNING: error = 0.48 (> 0.45 and <= 0.5)
    res_warn = calculate_weighing_performance(
        test_load=3000.0, indication=3000.48, zero_error=0.0,
        e=1.0, accuracy_class="III", rule_set=proto_ruleset
    )
    assert res_warn.result == "WARNING"
    assert len(res_warn.messages) > 0
    assert res_warn.failureReason is None

    # FAIL: error = 0.6 (> 0.5)
    res_fail = calculate_weighing_performance(
        test_load=3000.0, indication=3000.6, zero_error=0.0,
        e=1.0, accuracy_class="III", rule_set=proto_ruleset
    )
    assert res_fail.result == "FAIL"
    assert res_fail.failureReason is not None
    assert "exceeds" in res_fail.failureReason


def test_weighing_performance_boundary(boundary_ruleset):
    # BOUNDARY: abs(error) == MPE -> PASS
    # e = 1.0, test_load = 3000 -> MPE = 0.5. error = 0.5 == MPE -> PASS
    res = calculate_weighing_performance(
        test_load=3000.0, indication=3000.5, zero_error=0.0,
        e=1.0, accuracy_class="III", rule_set=boundary_ruleset
    )
    assert res.result == "PASS"
    assert res.correctedError == pytest.approx(0.5)
    assert res.mpe == pytest.approx(0.5)


# ---------------------------------------------------------------------------
# 3. Eccentricity: worst position, overall result, PASS / WARNING / FAIL
# ---------------------------------------------------------------------------
def test_eccentricity_pass_warning_fail_and_worst_position(proto_ruleset):
    # e = 1.0, ref = 3000 -> MPE = 0.5, warningRatio = 0.9 -> threshold = 0.45
    # PASS: all positions <= 0.45
    loads_pass = [
        {"position": "CENTER", "indication": 3000.1, "reference": 3000.0},
        {"position": "FRONT_LEFT", "indication": 3000.2, "reference": 3000.0},
        {"position": "FRONT_RIGHT", "indication": 3000.15, "reference": 3000.0},
        {"position": "REAR_LEFT", "indication": 3000.05, "reference": 3000.0},
        {"position": "REAR_RIGHT", "indication": 3000.1, "reference": 3000.0},
    ]
    res_pass = calculate_eccentricity(loads_pass, 1.0, "III", proto_ruleset)
    assert res_pass.result == "PASS"
    assert res_pass.details["worstPosition"] == "FRONT_LEFT"
    assert res_pass.observedError == pytest.approx(0.2)

    # WARNING: one position in warning range (0.48), none fails
    loads_warn = [
        {"position": "CENTER", "indication": 3000.1, "reference": 3000.0},
        {"position": "FRONT_LEFT", "indication": 3000.48, "reference": 3000.0},
        {"position": "FRONT_RIGHT", "indication": 3000.1, "reference": 3000.0},
        {"position": "REAR_LEFT", "indication": 3000.0, "reference": 3000.0},
        {"position": "REAR_RIGHT", "indication": 3000.1, "reference": 3000.0},
    ]
    res_warn = calculate_eccentricity(loads_warn, 1.0, "III", proto_ruleset)
    assert res_warn.result == "WARNING"
    assert res_warn.details["worstPosition"] == "FRONT_LEFT"
    assert res_warn.observedError == pytest.approx(0.48)

    # FAIL: REAR_RIGHT error is 0.7 (> 0.5)
    loads_fail = [
        {"position": "CENTER", "indication": 3000.1, "reference": 3000.0},
        {"position": "FRONT_LEFT", "indication": 3000.2, "reference": 3000.0},
        {"position": "FRONT_RIGHT", "indication": 3000.1, "reference": 3000.0},
        {"position": "REAR_LEFT", "indication": 3000.1, "reference": 3000.0},
        {"position": "REAR_RIGHT", "indication": 3000.7, "reference": 3000.0},
    ]
    res_fail = calculate_eccentricity(loads_fail, 1.0, "III", proto_ruleset)
    assert res_fail.result == "FAIL"
    assert res_fail.details["worstPosition"] == "REAR_RIGHT"
    assert res_fail.observedError == pytest.approx(0.7)
    assert res_fail.failureReason is not None


# ---------------------------------------------------------------------------
# 4. Repeatability: range = max - min, MPE, max, min, readings
# ---------------------------------------------------------------------------
def test_repeatability_pass_warning_fail(proto_ruleset):
    # e = 1.0, test_load = 3000 -> MPE = 0.5, warning threshold = 0.45
    # PASS: range = 0.3 (<= 0.45)
    readings_pass = [3000.1, 3000.4, 3000.2]
    res_pass = calculate_repeatability(3000.0, readings_pass, 1.0, "III", proto_ruleset)
    assert res_pass.result == "PASS"
    assert res_pass.observedError == pytest.approx(0.3)
    assert res_pass.details["range"] == pytest.approx(0.3)
    assert res_pass.details["max"] == pytest.approx(3000.4)
    assert res_pass.details["min"] == pytest.approx(3000.1)
    assert res_pass.details["readings"] == readings_pass

    # WARNING: range = 0.48 (> 0.45 and <= 0.5)
    readings_warn = [3000.0, 3000.48, 3000.2]
    res_warn = calculate_repeatability(3000.0, readings_warn, 1.0, "III", proto_ruleset)
    assert res_warn.result == "WARNING"
    assert res_warn.observedError == pytest.approx(0.48)

    # FAIL: range = 0.7 (> 0.5)
    readings_fail = [3000.0, 3000.7, 3000.2]
    res_fail = calculate_repeatability(3000.0, readings_fail, 1.0, "III", proto_ruleset)
    assert res_fail.result == "FAIL"
    assert res_fail.failureReason is not None


# ---------------------------------------------------------------------------
# 5. Discrimination: delta = newIndication - initialIndication, PASS if delta >= d
# ---------------------------------------------------------------------------
def test_discrimination_pass_fail(proto_ruleset):
    # d = 1.0
    # PASS: delta = 101.0 - 100.0 = 1.0 >= 1.0
    res_pass = calculate_discrimination(100.0, 1.4, 101.0, 1.0, proto_ruleset)
    assert res_pass.result == "PASS"
    assert res_pass.observedError == pytest.approx(1.0)
    assert res_pass.details["delta"] == pytest.approx(1.0)
    assert res_pass.details["d"] == pytest.approx(1.0)

    # FAIL: delta = 100.5 - 100.0 = 0.5 < 1.0
    res_fail = calculate_discrimination(100.0, 1.4, 100.5, 1.0, proto_ruleset)
    assert res_fail.result == "FAIL"
    assert res_fail.observedError == pytest.approx(0.5)
    assert res_fail.failureReason is not None


# ---------------------------------------------------------------------------
# 6. Rule-set swap: change mpeInE in copy of JSON, same inputs, different result
# ---------------------------------------------------------------------------
def test_ruleset_swap(proto_ruleset):
    # Create strict copy where Band 1 MPE is reduced from 0.5 to 0.2
    strict_ruleset = copy.deepcopy(proto_ruleset)
    strict_ruleset.ruleSetId = "OIML-R76-STRICT"
    strict_ruleset.mpeRules["III"][0]["mpeInE"] = 0.2

    # Inputs: test_load = 3000, indication = 3000.35, e = 1.0, zero_error = 0.0
    # Error = 0.35
    # With proto_ruleset: MPE = 0.5, warningRatio = 0.9 -> threshold = 0.45. 0.35 <= 0.45 -> PASS
    res1 = calculate_weighing_performance(
        test_load=3000.0, indication=3000.35, zero_error=0.0,
        e=1.0, accuracy_class="III", rule_set=proto_ruleset
    )
    assert res1.result == "PASS"

    # With strict_ruleset: MPE = 0.2. 0.35 > 0.2 -> FAIL!
    res2 = calculate_weighing_performance(
        test_load=3000.0, indication=3000.35, zero_error=0.0,
        e=1.0, accuracy_class="III", rule_set=strict_ruleset
    )
    assert res2.result == "FAIL"
    assert res2.ruleSetVersion == "OIML-R76-STRICT"


# ---------------------------------------------------------------------------
# 7. Invalid input -> INCOMPLETE with messages, never raises 500
# ---------------------------------------------------------------------------
def test_invalid_input_returns_incomplete(proto_ruleset):
    # Missing load / indication
    res1 = calculate_weighing_performance(test_load=None, indication=100.0, e=1.0, rule_set=proto_ruleset)
    assert res1.result == "INCOMPLETE"
    assert len(res1.messages) > 0

    # Negative verification interval e
    res2 = calculate_weighing_performance(test_load=100.0, indication=100.0, e=-1.0, rule_set=proto_ruleset)
    assert res2.result == "INCOMPLETE"
    assert len(res2.messages) > 0

    # Repeatability with empty readings or < 2 readings
    res3 = calculate_repeatability(100.0, [], 1.0, "III", proto_ruleset)
    assert res3.result == "INCOMPLETE"

    res4 = calculate_repeatability(100.0, [100.0], 1.0, "III", proto_ruleset)
    assert res4.result == "INCOMPLETE"

    # Eccentricity with empty loads
    res5 = calculate_eccentricity([], 1.0, "III", proto_ruleset)
    assert res5.result == "INCOMPLETE"

    # Discrimination with negative or zero d
    res6 = calculate_discrimination(100.0, 1.4, 101.0, 0.0, proto_ruleset)
    assert res6.result == "INCOMPLETE"

    # None rule-set
    res7 = calculate_weighing_performance(test_load=100.0, indication=100.0, e=1.0, rule_set=None)
    assert res7.result == "INCOMPLETE"


# ---------------------------------------------------------------------------
# 8. Floating point 0.1 + 0.2 style precision case does not false-FAIL
# ---------------------------------------------------------------------------
def test_floating_point_precision_no_false_fail(proto_ruleset):
    # In standard IEEE 754 float: 0.1 + 0.2 = 0.30000000000000004
    # Suppose e = 0.1, test_load = 100.0, indication = 100.0 + (0.1 + 0.2)
    # Corrected error is mathematically 0.3.
    # Suppose MPE is 0.3 (load_in_e = 1000 -> mpeInE = 0.5? For load/e = 1000 in Class III, MPE = 0.5 * 0.1 = 0.05).
    # Let's create a boundary case where mathematically correctedError == MPE:
    float_noisy_error = 0.1 + 0.2  # 0.30000000000000004
    test_ruleset = RuleSet(
        ruleSetId="PRECISION-TEST",
        standard="OIML R-76",
        edition="Test",
        effectiveFrom="2026-01-01",
        warningRatio=None,
        mpeRules={
            "III": [{"minIntervals": 0, "maxIntervals": 5000, "mpeInE": 3.0}]
        },
        testRules={"weighingPerformance": {"criterion": "abs(error) <= mpe"}},
    )
    # e = 0.1 -> MPE = 3.0 * 0.1 = 0.3
    # If indication = 100.0 + float_noisy_error (100.30000000000001):
    # Naive float subtraction: 100.30000000000001 - 100.0 = 0.3000000000000043 > 0.3 -> would false FAIL!
    res = calculate_weighing_performance(
        test_load=100.0,
        indication=100.0 + float_noisy_error,
        zero_error=0.0,
        e=0.1,
        accuracy_class="III",
        rule_set=test_ruleset,
    )
    assert res.result == "PASS"
    assert res.correctedError == pytest.approx(0.3)


# ---------------------------------------------------------------------------
# 9. Gate Criterion: calculation_engine.py contains NO threshold literals
# ---------------------------------------------------------------------------
def test_gate_no_threshold_literals_in_calculation_engine():
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    engine_path = os.path.join(backend_dir, "app", "services", "calculation_engine.py")

    with open(engine_path, "r", encoding="utf-8") as f:
        content = f.read()

    forbidden_pattern = re.compile(r"0\.5|1\.0|1\.5|0\.9")
    matches = forbidden_pattern.findall(content)
    assert len(matches) == 0, f"Found forbidden threshold literals in calculation_engine.py: {matches}"


# ---------------------------------------------------------------------------
# 10. API Endpoints: Stateless, authenticated, no reportId, active rule-set
# ---------------------------------------------------------------------------
def test_calculations_api_endpoints():
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # Login to get auth token
    login_res = client.post("/api/auth/login", json={"username": "technician", "password": "demo123"})
    assert login_res.status_code == 200
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Weighing performance endpoint (valid, defaults to active rule-set)
    wp_res = client.post(
        "/api/calculations/weighing-performance",
        json={"testLoad": 3000.0, "indication": 3000.2, "zeroError": 0.0, "e": 1.0, "accuracyClass": "III"},
        headers=headers,
    )
    assert wp_res.status_code == 200
    assert wp_res.json()["result"] == "PASS"
    repo = get_rule_repository()
    assert wp_res.json()["ruleSetVersion"] == repo.get_active().ruleSetId

    # 1b. Weighing performance with explicit ruleSetId
    wp_explicit = client.post(
        "/api/calculations/weighing-performance",
        json={
            "testLoad": 3000.0,
            "indication": 3000.2,
            "zeroError": 0.0,
            "e": 1.0,
            "accuracyClass": "III",
            "ruleSetId": "OIML-R76-PROTOTYPE-V1",
        },
        headers=headers,
    )
    assert wp_explicit.status_code == 200
    assert wp_explicit.json()["result"] == "PASS"
    assert wp_explicit.json()["ruleSetVersion"] == "OIML-R76-PROTOTYPE-V1"

    # 2. Weighing performance with invalid/missing input -> INCOMPLETE, not 500
    wp_invalid = client.post(
        "/api/calculations/weighing-performance",
        json={"testLoad": None, "indication": 3000.2},
        headers=headers,
    )
    assert wp_invalid.status_code == 200
    assert wp_invalid.json()["result"] == "INCOMPLETE"
    assert len(wp_invalid.json()["messages"]) > 0

    # 3. Eccentricity endpoint
    ecc_res = client.post(
        "/api/calculations/eccentricity",
        json={
            "loads": [
                {"position": "CENTER", "indication": 3000.1, "reference": 3000.0},
                {"position": "FRONT_LEFT", "indication": 3000.2, "reference": 3000.0},
            ],
            "e": 1.0,
            "accuracyClass": "III",
        },
        headers=headers,
    )
    assert ecc_res.status_code == 200
    assert ecc_res.json()["result"] == "PASS"
    assert ecc_res.json()["details"]["worstPosition"] == "FRONT_LEFT"

    # 4. Repeatability endpoint
    rep_res = client.post(
        "/api/calculations/repeatability",
        json={"testLoad": 3000.0, "readings": [3000.1, 3000.3, 3000.2], "e": 1.0, "accuracyClass": "III"},
        headers=headers,
    )
    assert rep_res.status_code == 200
    assert rep_res.json()["result"] == "PASS"
    assert rep_res.json()["details"]["range"] == pytest.approx(0.2)

    # 5. Discrimination endpoint
    disc_res = client.post(
        "/api/calculations/discrimination",
        json={"initialIndication": 100.0, "addedLoad": 1.4, "newIndication": 101.0, "d": 1.0},
        headers=headers,
    )
    assert disc_res.status_code == 200
    assert disc_res.json()["result"] == "PASS"

    # 6. Optional ruleSetId override in body
    wp_override = client.post(
        "/api/calculations/weighing-performance",
        json={
            "testLoad": 3000.0,
            "indication": 3000.2,
            "e": 1.0,
            "accuracyClass": "III",
            "ruleSetId": "NON-EXISTENT-RULE-SET",
        },
        headers=headers,
    )
    assert wp_override.status_code == 200
    assert wp_override.json()["result"] == "INCOMPLETE"
