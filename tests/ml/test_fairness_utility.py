import pytest
import numpy as np
from typing import Dict, Any

from evaluation.fairness_utility import run_fairness_utility_analysis, DEFAULT_CHANGE_THRESHOLD

def build_mock_before_after_result(
    base_perf=None,
    mit_perf=None,
    base_fair=None,
    mit_fair=None,
    status="COMPLETED"
) -> Dict[str, Any]:
    if base_perf is None:
        base_perf = {"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85}
    if mit_perf is None:
        mit_perf = {"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85}
    if base_fair is None:
        base_fair = {
            "demographicParityDifference": 0.20,
            "disparateImpactRatio": 0.50,
            "equalOpportunityDifference": 0.15,
            "equalizedOddsTprDifference": 0.15,
            "equalizedOddsFprDifference": 0.10
        }
    if mit_fair is None:
        mit_fair = {
            "demographicParityDifference": 0.20,
            "disparateImpactRatio": 0.50,
            "equalOpportunityDifference": 0.15,
            "equalizedOddsTprDifference": 0.15,
            "equalizedOddsFprDifference": 0.10
        }
    return {
        "status": status,
        "referenceGroup": "Male",
        "comparisonGroups": ["Female"],
        "baseline": {"performance": base_perf, "fairness": base_fair},
        "mitigated": {"performance": mit_perf, "fairness": mit_fair},
        "performanceDelta": {k: mit_perf[k] - base_perf[k] for k in base_perf},
        "fairnessDelta": {k: mit_fair[k] - base_fair[k] for k in base_fair},
        "methodologyNotes": ["Test note"]
    }

# 1. Input / Validation Tests
def test_input_validation_missing_result():
    with pytest.raises(ValueError, match="Invalid or missing beforeAfterResult"):
        run_fairness_utility_analysis(None)

def test_input_validation_uncompleted_status():
    mock_res = build_mock_before_after_result(status="FAILED")
    with pytest.raises(ValueError, match="Must be 'COMPLETED'"):
        run_fairness_utility_analysis(mock_res)

def test_input_validation_incomplete_nested_dict():
    mock_res = {"status": "COMPLETED", "baseline": {}}
    with pytest.raises(ValueError, match="Incomplete baseline or mitigated results"):
        run_fairness_utility_analysis(mock_res)

def test_input_validation_completed_accepted():
    mock_res = build_mock_before_after_result()
    res = run_fairness_utility_analysis(mock_res)
    assert res["status"] == "COMPLETED"

# 2. Fairness Calculations Tests
def test_dpd_delta_correct():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
        mit_fair={"demographicParityDifference": 0.12, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
    )
    res = run_fairness_utility_analysis(mock_res)
    dpd_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "DPD")
    assert pytest.approx(dpd_entry["delta"], abs=1e-4) == -0.08

def test_di_delta_correct():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 0.50, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
        mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 0.75, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
    )
    res = run_fairness_utility_analysis(mock_res)
    di_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "DI")
    assert pytest.approx(di_entry["delta"], abs=1e-4) == 0.25

def test_eod_delta_correct():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.25, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
        mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.10, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
    )
    res = run_fairness_utility_analysis(mock_res)
    eod_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "EOD")
    assert pytest.approx(eod_entry["delta"], abs=1e-4) == -0.15

def test_eo_tpr_delta_correct():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.20, "equalizedOddsFprDifference": 0.0},
        mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.05, "equalizedOddsFprDifference": 0.0}
    )
    res = run_fairness_utility_analysis(mock_res)
    tpr_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "EO TPR")
    assert pytest.approx(tpr_entry["delta"], abs=1e-4) == -0.15

def test_eo_fpr_delta_correct():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.18},
        mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.04}
    )
    res = run_fairness_utility_analysis(mock_res)
    fpr_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "EO FPR")
    assert pytest.approx(fpr_entry["delta"], abs=1e-4) == -0.14

# 3. Fairness Direction Tests
def test_dpd_toward_zero_improved():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
        mit_fair={"demographicParityDifference": 0.05, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
    )
    res = run_fairness_utility_analysis(mock_res)
    dpd_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "DPD")
    assert dpd_entry["direction"] == "IMPROVED"

def test_dpd_away_from_zero_worsened():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.10, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
        mit_fair={"demographicParityDifference": 0.25, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
    )
    res = run_fairness_utility_analysis(mock_res)
    dpd_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "DPD")
    assert dpd_entry["direction"] == "WORSENED"

def test_di_toward_one_improved():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 0.40, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
        mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 0.85, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
    )
    res = run_fairness_utility_analysis(mock_res)
    di_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "DI")
    assert di_entry["direction"] == "IMPROVED"

def test_di_away_from_one_worsened():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 0.80, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
        mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 0.40, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
    )
    res = run_fairness_utility_analysis(mock_res)
    di_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "DI")
    assert di_entry["direction"] == "WORSENED"

def test_eod_toward_zero_improved():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.18, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
        mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.04, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
    )
    res = run_fairness_utility_analysis(mock_res)
    eod_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "EOD")
    assert eod_entry["direction"] == "IMPROVED"

def test_equalized_odds_mixed_handled():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.20, "equalizedOddsFprDifference": 0.05},
        mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.05, "equalizedOddsFprDifference": 0.18}
    )
    res = run_fairness_utility_analysis(mock_res)
    tpr_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "EO TPR")
    fpr_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "EO FPR")
    assert tpr_entry["direction"] == "IMPROVED"
    assert fpr_entry["direction"] == "WORSENED"
    assert res["tradeoffClassification"] == "MIXED FAIRNESS / MIXED UTILITY"

# 4. Utility Calculations Tests
def test_accuracy_delta_correct():
    mock_res = build_mock_before_after_result(base_perf={"accuracy": 0.80}, mit_perf={"accuracy": 0.84})
    res = run_fairness_utility_analysis(mock_res)
    acc_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "Accuracy")
    assert pytest.approx(acc_entry["delta"], abs=1e-4) == 0.04

def test_precision_delta_correct():
    mock_res = build_mock_before_after_result(base_perf={"precision": 0.75}, mit_perf={"precision": 0.70})
    res = run_fairness_utility_analysis(mock_res)
    prec_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "Precision")
    assert pytest.approx(prec_entry["delta"], abs=1e-4) == -0.05

def test_recall_delta_correct():
    mock_res = build_mock_before_after_result(base_perf={"recall": 0.50}, mit_perf={"recall": 0.55})
    res = run_fairness_utility_analysis(mock_res)
    rec_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "Recall")
    assert pytest.approx(rec_entry["delta"], abs=1e-4) == 0.05

def test_f1_delta_correct():
    mock_res = build_mock_before_after_result(base_perf={"f1": 0.60}, mit_perf={"f1": 0.62})
    res = run_fairness_utility_analysis(mock_res)
    f1_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "F1")
    assert pytest.approx(f1_entry["delta"], abs=1e-4) == 0.02

def test_roc_auc_delta_correct():
    mock_res = build_mock_before_after_result(base_perf={"rocAuc": 0.82}, mit_perf={"rocAuc": 0.88})
    res = run_fairness_utility_analysis(mock_res)
    auc_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "ROC-AUC")
    assert pytest.approx(auc_entry["delta"], abs=1e-4) == 0.06

# 5. Utility Direction Tests
def test_positive_utility_delta_improved():
    mock_res = build_mock_before_after_result(base_perf={"accuracy": 0.80}, mit_perf={"accuracy": 0.85})
    res = run_fairness_utility_analysis(mock_res)
    acc_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "Accuracy")
    assert acc_entry["direction"] == "IMPROVED"

def test_negative_utility_delta_worsened():
    mock_res = build_mock_before_after_result(base_perf={"accuracy": 0.80}, mit_perf={"accuracy": 0.75})
    res = run_fairness_utility_analysis(mock_res)
    acc_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "Accuracy")
    assert acc_entry["direction"] == "WORSENED"

def test_small_utility_change_preserved():
    mock_res = build_mock_before_after_result(base_perf={"accuracy": 0.80}, mit_perf={"accuracy": 0.804})
    res = run_fairness_utility_analysis(mock_res, threshold=0.01)
    acc_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "Accuracy")
    assert acc_entry["direction"] == "PRESERVED"

# 6. Trade-off Classification Categories
def test_classification_fairness_improved_utility_preserved():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 0.50, "equalOpportunityDifference": 0.15, "equalizedOddsTprDifference": 0.15, "equalizedOddsFprDifference": 0.10},
        mit_fair={"demographicParityDifference": 0.05, "disparateImpactRatio": 0.90, "equalOpportunityDifference": 0.02, "equalizedOddsTprDifference": 0.02, "equalizedOddsFprDifference": 0.02},
        base_perf={"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85},
        mit_perf={"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85}
    )
    res = run_fairness_utility_analysis(mock_res)
    assert res["tradeoffClassification"] == "FAIRNESS IMPROVEMENT / UTILITY PRESERVED"

def test_classification_fairness_improved_minor_utility_cost():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 0.50, "equalOpportunityDifference": 0.15, "equalizedOddsTprDifference": 0.15, "equalizedOddsFprDifference": 0.10},
        mit_fair={"demographicParityDifference": 0.05, "disparateImpactRatio": 0.90, "equalOpportunityDifference": 0.02, "equalizedOddsTprDifference": 0.02, "equalizedOddsFprDifference": 0.02},
        base_perf={"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85},
        mit_perf={"accuracy": 0.78, "precision": 0.68, "recall": 0.58, "f1": 0.63, "rocAuc": 0.83}
    )
    res = run_fairness_utility_analysis(mock_res)
    assert res["tradeoffClassification"] == "FAIRNESS IMPROVEMENT / MINOR UTILITY COST"

def test_classification_fairness_improved_material_utility_cost():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 0.50, "equalOpportunityDifference": 0.15, "equalizedOddsTprDifference": 0.15, "equalizedOddsFprDifference": 0.10},
        mit_fair={"demographicParityDifference": 0.05, "disparateImpactRatio": 0.90, "equalOpportunityDifference": 0.02, "equalizedOddsTprDifference": 0.02, "equalizedOddsFprDifference": 0.02},
        base_perf={"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85},
        mit_perf={"accuracy": 0.70, "precision": 0.60, "recall": 0.50, "f1": 0.55, "rocAuc": 0.75}
    )
    res = run_fairness_utility_analysis(mock_res)
    assert res["tradeoffClassification"] == "FAIRNESS IMPROVEMENT / MATERIAL UTILITY COST"

def test_classification_both_improved():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 0.50, "equalOpportunityDifference": 0.15, "equalizedOddsTprDifference": 0.15, "equalizedOddsFprDifference": 0.10},
        mit_fair={"demographicParityDifference": 0.05, "disparateImpactRatio": 0.90, "equalOpportunityDifference": 0.02, "equalizedOddsTprDifference": 0.02, "equalizedOddsFprDifference": 0.02},
        base_perf={"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85},
        mit_perf={"accuracy": 0.85, "precision": 0.75, "recall": 0.65, "f1": 0.70, "rocAuc": 0.90}
    )
    res = run_fairness_utility_analysis(mock_res)
    assert res["tradeoffClassification"] == "FAIRNESS AND UTILITY BOTH IMPROVED"

def test_classification_fairness_worsened_utility_improved():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.05, "disparateImpactRatio": 0.90, "equalOpportunityDifference": 0.02, "equalizedOddsTprDifference": 0.02, "equalizedOddsFprDifference": 0.02},
        mit_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 0.50, "equalOpportunityDifference": 0.15, "equalizedOddsTprDifference": 0.15, "equalizedOddsFprDifference": 0.10},
        base_perf={"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85},
        mit_perf={"accuracy": 0.85, "precision": 0.75, "recall": 0.65, "f1": 0.70, "rocAuc": 0.90}
    )
    res = run_fairness_utility_analysis(mock_res)
    assert res["tradeoffClassification"] == "FAIRNESS WORSENED / UTILITY IMPROVED"

def test_classification_no_material_change():
    mock_res = build_mock_before_after_result(
        base_fair={"demographicParityDifference": 0.1802, "disparateImpactRatio": 0.2526, "equalOpportunityDifference": 0.0984, "equalizedOddsTprDifference": 0.0984, "equalizedOddsFprDifference": 0.0617},
        mit_fair={"demographicParityDifference": 0.1802, "disparateImpactRatio": 0.2526, "equalOpportunityDifference": 0.0984, "equalizedOddsTprDifference": 0.0984, "equalizedOddsFprDifference": 0.0617},
        base_perf={"accuracy": 0.8037, "precision": 0.6774, "recall": 0.2692, "f1": 0.3853, "rocAuc": 0.8252},
        mit_perf={"accuracy": 0.8037, "precision": 0.6774, "recall": 0.2692, "f1": 0.3853, "rocAuc": 0.8252}
    )
    res = run_fairness_utility_analysis(mock_res)
    assert res["tradeoffClassification"] == "NO MATERIAL CHANGE"

# 7. Safety / Transparency Requirements
def test_no_single_fairness_score():
    mock_res = build_mock_before_after_result()
    res = run_fairness_utility_analysis(mock_res)
    assert "fairnessScore" not in res
    assert "overallScore" not in res
    assert "proxyShieldScore" not in res

def test_no_single_utility_score():
    mock_res = build_mock_before_after_result()
    res = run_fairness_utility_analysis(mock_res)
    assert "utilityScore" not in res
    assert "tradeoffScore" not in res

def test_threshold_exposed_in_response():
    mock_res = build_mock_before_after_result()
    res = run_fairness_utility_analysis(mock_res, threshold=0.02)
    assert res["threshold"] == 0.02

def test_actual_deltas_remain_visible():
    mock_res = build_mock_before_after_result()
    res = run_fairness_utility_analysis(mock_res)
    for m in res["fairnessAnalysis"]["metrics"]:
        assert "delta" in m
        assert "before" in m
        assert "after" in m
    for m in res["utilityAnalysis"]["metrics"]:
        assert "delta" in m
        assert "before" in m
        assert "after" in m

def test_non_causal_disclaimer_included():
    mock_res = build_mock_before_after_result()
    res = run_fairness_utility_analysis(mock_res)
    notes_str = " ".join(res["methodologyNotes"])
    assert "legal, ethical, or causal determination" in notes_str
