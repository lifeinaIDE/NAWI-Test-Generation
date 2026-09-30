import pytest
from app.services.calculation_engine import (
    calculate_weighing_performance,
    calculate_eccentricity,
    calculate_repeatability,
    calculate_discrimination,
    _get_mpe
)
from app.schemas import RuleSet

@pytest.fixture
def sample_ruleset():
    return RuleSet(
        ruleSetId="TEST-V1",
        standard="OIML R-76",
        edition="Test",
        effectiveFrom="2026-01-01",
        changeNotes="",
        mpeRules={
            "III": [
                {"minIntervals": 0, "maxIntervals": 500, "mpeInE": 0.5},
                {"minIntervals": 500, "maxIntervals": 2000, "mpeInE": 1.0},
                {"minIntervals": 2000, "maxIntervals": 10000, "mpeInE": 1.5}
            ]
        },
        testRules={}
    )

def test_mpe_table_selection(sample_ruleset):
    # Class III, load/e = 300 (between 0 and 500)
    assert _get_mpe(300, "III", sample_ruleset) == 0.5
    # load/e = 1000 (between 500 and 2000) -> 1.0e
    assert _get_mpe(1000, "III", sample_ruleset) == 1.0
    # boundary: 500
    assert _get_mpe(500, "III", sample_ruleset) == 0.5
    # load/e = 3000 (between 2000 and 10000) -> 1.5e
    assert _get_mpe(3000, "III", sample_ruleset) == 1.5

def test_weighing_performance_pass(sample_ruleset):
    # e = 1, test_load = 1000 => load/e = 1000 => mpeInE = 1.0 => mpe = 1.0
    # indication = 1000.5 => error = 0.5, corrected = 0.5 <= mpe(1.0) => PASS
    res = calculate_weighing_performance(
        test_load=1000.0, indication=1000.5, zero_error=0.0,
        e=1.0, accuracy_class="III", rule_set=sample_ruleset
    )
    assert res.result == "PASS"
    assert res.maxPermissibleError == 1.0
    assert res.observedError == 0.5

def test_weighing_performance_fail(sample_ruleset):
    # error = 1.5, mpe = 1.0 => FAIL
    res = calculate_weighing_performance(
        test_load=1000.0, indication=1001.5, zero_error=0.0,
        e=1.0, accuracy_class="III", rule_set=sample_ruleset
    )
    assert res.result == "FAIL"

def test_weighing_performance_boundary(sample_ruleset):
    # error = 1.0, mpe = 1.0 => PASS
    res = calculate_weighing_performance(
        test_load=1000.0, indication=1001.0, zero_error=0.0,
        e=1.0, accuracy_class="III", rule_set=sample_ruleset
    )
    assert res.result == "PASS"

def test_ruleset_swap():
    # Same inputs, different rule set
    base_rs = RuleSet(
        ruleSetId="BASE", standard="A", edition="A", effectiveFrom="A",
        mpeRules={"III": [{"minIntervals": 0, "maxIntervals": 2000, "mpeInE": 1.0}]},
        testRules={}
    )
    strict_rs = RuleSet(
        ruleSetId="STRICT", standard="A", edition="A", effectiveFrom="A",
        mpeRules={"III": [{"minIntervals": 0, "maxIntervals": 2000, "mpeInE": 0.5}]},
        testRules={}
    )
    
    # error = 0.8. mpe = 1.0 (PASS) vs 0.5 (FAIL)
    res1 = calculate_weighing_performance(1000.0, 1000.8, 0.0, 1.0, "III", base_rs)
    assert res1.result == "PASS"
    
    res2 = calculate_weighing_performance(1000.0, 1000.8, 0.0, 1.0, "III", strict_rs)
    assert res2.result == "FAIL"

def test_eccentricity(sample_ruleset):
    loads = [
        {"position": "C", "indication": 1000.2, "reference": 1000.0},
        {"position": "FL", "indication": 1001.1, "reference": 1000.0},
        {"position": "FR", "indication": 1000.0, "reference": 1000.0},
    ]
    # mpe for 1000/1 = 1000e = 1.0
    # worst error = 1.1 at FL. 1.1 > 1.0 => FAIL
    res = calculate_eccentricity(loads, 1.0, "III", sample_ruleset)
    assert res.result == "FAIL"
    assert res.observedError == pytest.approx(1.1)
    assert res.details["worstPosition"] == "FL"

def test_repeatability(sample_ruleset):
    readings = [1000.1, 1000.5, 1001.2, 1000.0]
    # range = 1.2
    # mpe for 1000e = 1.0. 1.2 > 1.0 => FAIL
    res = calculate_repeatability(1000.0, readings, 1.0, "III", sample_ruleset)
    assert res.result == "FAIL"
    assert res.observedError == pytest.approx(1.2)

    # range = 0.8 => PASS
    readings2 = [1000.1, 1000.5, 1000.8, 1000.0]
    res2 = calculate_repeatability(1000.0, readings2, 1.0, "III", sample_ruleset)
    assert res2.result == "PASS"

def test_discrimination(sample_ruleset):
    # d = 1.0
    # delta = 1001.0 - 1000.0 = 1.0 >= 1.0 => PASS
    res = calculate_discrimination(1000.0, 1.4, 1001.0, 1.0, sample_ruleset)
    assert res.result == "PASS"
    
    # delta = 1000.5 - 1000.0 = 0.5 < 1.0 => FAIL
    res2 = calculate_discrimination(1000.0, 1.4, 1000.5, 1.0, sample_ruleset)
    assert res2.result == "FAIL"

def test_invalid_input(sample_ruleset):
    # Empty readings for repeatability should return INCOMPLETE
    res = calculate_repeatability(1000.0, [], 1.0, "III", sample_ruleset)
    assert res.result == "INCOMPLETE"
