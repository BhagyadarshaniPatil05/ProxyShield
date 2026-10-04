import os
import sys
import unittest
import numpy as np
from typing import Dict, Any

# Ensure ml-service directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml-service')))

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

class TestFairnessUtility(unittest.TestCase):

    # 1. Input / Validation Tests
    def test_input_validation_missing_result(self):
        with self.assertRaisesRegex(ValueError, "Invalid or missing beforeAfterResult"):
            run_fairness_utility_analysis(None)

    def test_input_validation_uncompleted_status(self):
        mock_res = build_mock_before_after_result(status="FAILED")
        with self.assertRaisesRegex(ValueError, "Must be 'COMPLETED'"):
            run_fairness_utility_analysis(mock_res)

    def test_input_validation_incomplete_nested_dict(self):
        mock_res = {"status": "COMPLETED", "baseline": {}}
        with self.assertRaisesRegex(ValueError, "Incomplete baseline or mitigated results"):
            run_fairness_utility_analysis(mock_res)

    def test_input_validation_completed_accepted(self):
        mock_res = build_mock_before_after_result()
        res = run_fairness_utility_analysis(mock_res)
        self.assertEqual(res["status"], "COMPLETED")

    # 2. Fairness Calculations Tests
    def test_dpd_delta_correct(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
            mit_fair={"demographicParityDifference": 0.12, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
        )
        res = run_fairness_utility_analysis(mock_res)
        dpd_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "DPD")
        self.assertAlmostEqual(dpd_entry["delta"], -0.08, delta=1e-4)

    def test_di_delta_correct(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 0.50, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
            mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 0.75, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
        )
        res = run_fairness_utility_analysis(mock_res)
        di_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "DI")
        self.assertAlmostEqual(di_entry["delta"], 0.25, delta=1e-4)

    def test_eod_delta_correct(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.25, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
            mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.10, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
        )
        res = run_fairness_utility_analysis(mock_res)
        eod_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "EOD")
        self.assertAlmostEqual(eod_entry["delta"], -0.15, delta=1e-4)

    def test_eo_tpr_delta_correct(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.20, "equalizedOddsFprDifference": 0.0},
            mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.05, "equalizedOddsFprDifference": 0.0}
        )
        res = run_fairness_utility_analysis(mock_res)
        tpr_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "EO TPR")
        self.assertAlmostEqual(tpr_entry["delta"], -0.15, delta=1e-4)

    def test_eo_fpr_delta_correct(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.18},
            mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.04}
        )
        res = run_fairness_utility_analysis(mock_res)
        fpr_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "EO FPR")
        self.assertAlmostEqual(fpr_entry["delta"], -0.14, delta=1e-4)

    # 3. Fairness Direction Tests
    def test_dpd_toward_zero_improved(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
            mit_fair={"demographicParityDifference": 0.05, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
        )
        res = run_fairness_utility_analysis(mock_res)
        dpd_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "DPD")
        self.assertEqual(dpd_entry["direction"], "IMPROVED")

    def test_dpd_away_from_zero_worsened(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.10, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
            mit_fair={"demographicParityDifference": 0.25, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
        )
        res = run_fairness_utility_analysis(mock_res)
        dpd_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "DPD")
        self.assertEqual(dpd_entry["direction"], "WORSENED")

    def test_di_toward_one_improved(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 0.40, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
            mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 0.85, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
        )
        res = run_fairness_utility_analysis(mock_res)
        di_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "DI")
        self.assertEqual(di_entry["direction"], "IMPROVED")

    def test_di_away_from_one_worsened(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 0.80, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
            mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 0.40, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
        )
        res = run_fairness_utility_analysis(mock_res)
        di_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "DI")
        self.assertEqual(di_entry["direction"], "WORSENED")

    def test_eod_toward_zero_improved(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.18, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0},
            mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.04, "equalizedOddsTprDifference": 0.0, "equalizedOddsFprDifference": 0.0}
        )
        res = run_fairness_utility_analysis(mock_res)
        eod_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "EOD")
        self.assertEqual(eod_entry["direction"], "IMPROVED")

    def test_equalized_odds_mixed_handled(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.20, "equalizedOddsFprDifference": 0.05},
            mit_fair={"demographicParityDifference": 0.0, "disparateImpactRatio": 1.0, "equalOpportunityDifference": 0.0, "equalizedOddsTprDifference": 0.05, "equalizedOddsFprDifference": 0.18}
        )
        res = run_fairness_utility_analysis(mock_res)
        tpr_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "EO TPR")
        fpr_entry = next(m for m in res["fairnessAnalysis"]["metrics"] if m["metric"] == "EO FPR")
        self.assertEqual(tpr_entry["direction"], "IMPROVED")
        self.assertEqual(fpr_entry["direction"], "WORSENED")
        self.assertEqual(res["tradeoffClassification"], "MIXED FAIRNESS / MIXED UTILITY")

    # 4. Utility Calculations Tests
    def test_accuracy_delta_correct(self):
        mock_res = build_mock_before_after_result(base_perf={"accuracy": 0.80}, mit_perf={"accuracy": 0.84})
        res = run_fairness_utility_analysis(mock_res)
        acc_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "Accuracy")
        self.assertAlmostEqual(acc_entry["delta"], 0.04, delta=1e-4)

    def test_precision_delta_correct(self):
        mock_res = build_mock_before_after_result(base_perf={"precision": 0.75}, mit_perf={"precision": 0.70})
        res = run_fairness_utility_analysis(mock_res)
        prec_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "Precision")
        self.assertAlmostEqual(prec_entry["delta"], -0.05, delta=1e-4)

    def test_recall_delta_correct(self):
        mock_res = build_mock_before_after_result(base_perf={"recall": 0.50}, mit_perf={"recall": 0.55})
        res = run_fairness_utility_analysis(mock_res)
        rec_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "Recall")
        self.assertAlmostEqual(rec_entry["delta"], 0.05, delta=1e-4)

    def test_f1_delta_correct(self):
        mock_res = build_mock_before_after_result(base_perf={"f1": 0.60}, mit_perf={"f1": 0.62})
        res = run_fairness_utility_analysis(mock_res)
        f1_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "F1")
        self.assertAlmostEqual(f1_entry["delta"], 0.02, delta=1e-4)

    def test_roc_auc_delta_correct(self):
        mock_res = build_mock_before_after_result(base_perf={"rocAuc": 0.82}, mit_perf={"rocAuc": 0.88})
        res = run_fairness_utility_analysis(mock_res)
        auc_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "ROC-AUC")
        self.assertAlmostEqual(auc_entry["delta"], 0.06, delta=1e-4)

    # 5. Utility Direction Tests
    def test_positive_utility_delta_improved(self):
        mock_res = build_mock_before_after_result(base_perf={"accuracy": 0.80}, mit_perf={"accuracy": 0.85})
        res = run_fairness_utility_analysis(mock_res)
        acc_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "Accuracy")
        self.assertEqual(acc_entry["direction"], "IMPROVED")

    def test_negative_utility_delta_worsened(self):
        mock_res = build_mock_before_after_result(base_perf={"accuracy": 0.80}, mit_perf={"accuracy": 0.75})
        res = run_fairness_utility_analysis(mock_res)
        acc_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "Accuracy")
        self.assertEqual(acc_entry["direction"], "WORSENED")

    def test_small_utility_change_preserved(self):
        mock_res = build_mock_before_after_result(base_perf={"accuracy": 0.80}, mit_perf={"accuracy": 0.804})
        res = run_fairness_utility_analysis(mock_res, threshold=0.01)
        acc_entry = next(m for m in res["utilityAnalysis"]["metrics"] if m["metric"] == "Accuracy")
        self.assertEqual(acc_entry["direction"], "PRESERVED")

    # 6. Trade-off Classification Categories
    def test_classification_fairness_improved_utility_preserved(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 0.50, "equalOpportunityDifference": 0.15, "equalizedOddsTprDifference": 0.15, "equalizedOddsFprDifference": 0.10},
            mit_fair={"demographicParityDifference": 0.05, "disparateImpactRatio": 0.90, "equalOpportunityDifference": 0.02, "equalizedOddsTprDifference": 0.02, "equalizedOddsFprDifference": 0.02},
            base_perf={"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85},
            mit_perf={"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85}
        )
        res = run_fairness_utility_analysis(mock_res)
        self.assertEqual(res["tradeoffClassification"], "FAIRNESS IMPROVEMENT / UTILITY PRESERVED")

    def test_classification_fairness_improved_minor_utility_cost(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 0.50, "equalOpportunityDifference": 0.15, "equalizedOddsTprDifference": 0.15, "equalizedOddsFprDifference": 0.10},
            mit_fair={"demographicParityDifference": 0.05, "disparateImpactRatio": 0.90, "equalOpportunityDifference": 0.02, "equalizedOddsTprDifference": 0.02, "equalizedOddsFprDifference": 0.02},
            base_perf={"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85},
            mit_perf={"accuracy": 0.78, "precision": 0.68, "recall": 0.58, "f1": 0.63, "rocAuc": 0.83}
        )
        res = run_fairness_utility_analysis(mock_res)
        self.assertEqual(res["tradeoffClassification"], "FAIRNESS IMPROVEMENT / MINOR UTILITY COST")

    def test_classification_fairness_improved_material_utility_cost(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 0.50, "equalOpportunityDifference": 0.15, "equalizedOddsTprDifference": 0.15, "equalizedOddsFprDifference": 0.10},
            mit_fair={"demographicParityDifference": 0.05, "disparateImpactRatio": 0.90, "equalOpportunityDifference": 0.02, "equalizedOddsTprDifference": 0.02, "equalizedOddsFprDifference": 0.02},
            base_perf={"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85},
            mit_perf={"accuracy": 0.70, "precision": 0.60, "recall": 0.50, "f1": 0.55, "rocAuc": 0.75}
        )
        res = run_fairness_utility_analysis(mock_res)
        self.assertEqual(res["tradeoffClassification"], "FAIRNESS IMPROVEMENT / MATERIAL UTILITY COST")

    def test_classification_both_improved(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 0.50, "equalOpportunityDifference": 0.15, "equalizedOddsTprDifference": 0.15, "equalizedOddsFprDifference": 0.10},
            mit_fair={"demographicParityDifference": 0.05, "disparateImpactRatio": 0.90, "equalOpportunityDifference": 0.02, "equalizedOddsTprDifference": 0.02, "equalizedOddsFprDifference": 0.02},
            base_perf={"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85},
            mit_perf={"accuracy": 0.85, "precision": 0.75, "recall": 0.65, "f1": 0.70, "rocAuc": 0.90}
        )
        res = run_fairness_utility_analysis(mock_res)
        self.assertEqual(res["tradeoffClassification"], "FAIRNESS AND UTILITY BOTH IMPROVED")

    def test_classification_fairness_worsened_utility_improved(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.05, "disparateImpactRatio": 0.90, "equalOpportunityDifference": 0.02, "equalizedOddsTprDifference": 0.02, "equalizedOddsFprDifference": 0.02},
            mit_fair={"demographicParityDifference": 0.20, "disparateImpactRatio": 0.50, "equalOpportunityDifference": 0.15, "equalizedOddsTprDifference": 0.15, "equalizedOddsFprDifference": 0.10},
            base_perf={"accuracy": 0.80, "precision": 0.70, "recall": 0.60, "f1": 0.65, "rocAuc": 0.85},
            mit_perf={"accuracy": 0.85, "precision": 0.75, "recall": 0.65, "f1": 0.70, "rocAuc": 0.90}
        )
        res = run_fairness_utility_analysis(mock_res)
        self.assertEqual(res["tradeoffClassification"], "FAIRNESS WORSENED / UTILITY IMPROVED")

    def test_classification_no_material_change(self):
        mock_res = build_mock_before_after_result(
            base_fair={"demographicParityDifference": 0.1802, "disparateImpactRatio": 0.2526, "equalOpportunityDifference": 0.0984, "equalizedOddsTprDifference": 0.0984, "equalizedOddsFprDifference": 0.0617},
            mit_fair={"demographicParityDifference": 0.1802, "disparateImpactRatio": 0.2526, "equalOpportunityDifference": 0.0984, "equalizedOddsTprDifference": 0.0984, "equalizedOddsFprDifference": 0.0617},
            base_perf={"accuracy": 0.8037, "precision": 0.6774, "recall": 0.2692, "f1": 0.3853, "rocAuc": 0.8252},
            mit_perf={"accuracy": 0.8037, "precision": 0.6774, "recall": 0.2692, "f1": 0.3853, "rocAuc": 0.8252}
        )
        res = run_fairness_utility_analysis(mock_res)
        self.assertEqual(res["tradeoffClassification"], "NO MATERIAL CHANGE")

    # 7. Safety / Transparency Requirements
    def test_no_single_fairness_score(self):
        mock_res = build_mock_before_after_result()
        res = run_fairness_utility_analysis(mock_res)
        self.assertNotIn("fairnessScore", res)
        self.assertNotIn("overallScore", res)
        self.assertNotIn("proxyShieldScore", res)

    def test_no_single_utility_score(self):
        mock_res = build_mock_before_after_result()
        res = run_fairness_utility_analysis(mock_res)
        self.assertNotIn("utilityScore", res)
        self.assertNotIn("tradeoffScore", res)

    def test_threshold_exposed_in_response(self):
        mock_res = build_mock_before_after_result()
        res = run_fairness_utility_analysis(mock_res, threshold=0.02)
        self.assertEqual(res["threshold"], 0.02)

    def test_actual_deltas_remain_visible(self):
        mock_res = build_mock_before_after_result()
        res = run_fairness_utility_analysis(mock_res)
        for m in res["fairnessAnalysis"]["metrics"]:
            self.assertIn("delta", m)
            self.assertIn("before", m)
            self.assertIn("after", m)
        for m in res["utilityAnalysis"]["metrics"]:
            self.assertIn("delta", m)
            self.assertIn("before", m)
            self.assertIn("after", m)

    def test_non_causal_disclaimer_included(self):
        mock_res = build_mock_before_after_result()
        res = run_fairness_utility_analysis(mock_res)
        notes_str = " ".join(res["methodologyNotes"])
        self.assertIn("legal, ethical, or causal determination", notes_str)

if __name__ == '__main__':
    unittest.main()
