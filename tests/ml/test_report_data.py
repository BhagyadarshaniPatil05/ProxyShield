import unittest
import pandas as pd
import numpy as np
import os
import sys

# Ensure ml-service directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml-service')))

from reports.generator import build_report_data_model, render_html_report, validate_audit_readiness

class TestReportDataGeneration(unittest.TestCase):

    def setUp(self):
        self.complete_audit = {
            "id": "audit_test_123",
            "modelType": "random_forest",
            "targetAttribute": "income",
            "protectedAttribute": "sex",
            "referenceGroup": "Male",
            "createdAt": "2026-09-08T01:00:00Z",
            "datasetSummary": {
                "rowCount": 200,
                "columnCount": 10,
                "totalMissingValues": 0,
                "duplicateRowCount": 0
            },
            "baselineResult": {
                "trainRows": 160,
                "testRows": 40,
                "featureCount": 8,
                "accuracy": 0.85,
                "precision": 0.80,
                "recall": 0.75,
                "f1": 0.77,
                "rocAuc": 0.88,
                "confusionMatrix": [[25, 5], [5, 15]]
            },
            "fairnessResult": {
                "referenceGroup": "Male",
                "comparisonGroups": ["Female"],
                "metrics": {
                    "demographicParityDifference": 0.18,
                    "disparateImpact": 0.45,
                    "equalOpportunityDifference": 0.10,
                    "equalizedOdds": {"tprDifference": 0.10, "fprDifference": 0.05}
                },
                "groupMetrics": [
                    {"group": "Male", "sampleCount": 25, "positivePredictionCount": 15, "selectionRate": 0.60},
                    {"group": "Female", "sampleCount": 15, "positivePredictionCount": 4, "selectionRate": 0.27}
                ]
            },
            "proxyCapacityResult": {
                "candidateFeatureCount": 1,
                "results": [
                    {
                        "rank": 1,
                        "feature": "education",
                        "dataType": "categorical",
                        "association": {"method": "cramers_v", "value": 0.42, "pValue": 0.001},
                        "mutualInformation": 0.15,
                        "predictability": {"f1": 0.72, "accuracy": 0.75},
                        "capacityLevel": "HIGH"
                    }
                ]
            },
            "proxyUseResult": {
                "candidateFeatureCount": 1,
                "candidateFeatures": [
                    {
                        "feature": "education",
                        "shap": {"meanAbsoluteValue": 0.22},
                        "permutation": {"meanImportance": 0.08},
                        "ablation": {"f1Delta": 0.05, "predictionChangeRate": 0.12},
                        "modelUseEvidence": "MODERATE"
                    }
                ]
            },
            "featureAblationResult": {
                "results": [
                    {
                        "featureName": "education",
                        "neutralizationStrategy": "NEUTRALIZATION_ZERO",
                        "baselinePerformance": {"f1": 0.77},
                        "ablatedPerformance": {"f1": 0.72},
                        "performanceDelta": {"f1": -0.05},
                        "predictionChangeRate": 0.12,
                        "selectionRateDelta": -0.04
                    }
                ]
            },
            "fairnessImpactResult": {
                "experiments": [
                    {
                        "feature": "education",
                        "neutralizationStrategy": "NEUTRALIZATION_ZERO",
                        "baselineFairness": {"demographicParityDifference": 0.18, "disparateImpact": 0.45, "equalOpportunityDifference": 0.10},
                        "ablatedFairness": {"demographicParityDifference": 0.12, "disparateImpact": 0.60, "equalOpportunityDifference": 0.06},
                        "fairnessDelta": {"demographicParityDifference": -0.06, "disparateImpact": 0.15, "equalOpportunityDifference": -0.04},
                        "interpretation": "Neutralizing education reduced DPD by 0.06."
                    }
                ]
            },
            "interventionResult": {
                "selectedStrategy": "REMOVE_FEATURE",
                "selectedFeatures": ["education"],
                "evidenceSummary": "Education showed high proxy capacity and moderate model use.",
                "humanReviewStatus": "PENDING_HUMAN_REVIEW"
            },
            "mitigatedModelResult": {
                "trainRows": 160,
                "testRows": 40,
                "featureCount": 7,
                "accuracy": 0.84,
                "precision": 0.79,
                "recall": 0.74,
                "f1": 0.76,
                "rocAuc": 0.87,
                "confusionMatrix": [[24, 6], [5, 15]]
            },
            "beforeAfterResult": {
                "baseline": {
                    "performance": {"accuracy": 0.85, "precision": 0.80, "recall": 0.75, "f1": 0.77, "rocAuc": 0.88},
                    "fairness": {"dpd": 0.18, "di": 0.45, "eod": 0.10, "equalizedOdds": {"tprDifference": 0.10, "fprDifference": 0.05}}
                },
                "mitigated": {
                    "performance": {"accuracy": 0.84, "precision": 0.79, "recall": 0.74, "f1": 0.76, "rocAuc": 0.87},
                    "fairness": {"dpd": 0.12, "di": 0.60, "eod": 0.06, "equalizedOdds": {"tprDifference": 0.06, "fprDifference": 0.04}}
                },
                "performanceDelta": {"accuracy": -0.01, "precision": -0.01, "recall": -0.01, "f1": -0.01, "rocAuc": -0.01},
                "fairnessDelta": {"dpd": -0.06, "di": 0.15, "eod": -0.04, "equalizedOdds": {"tprDifference": -0.04, "fprDifference": -0.01}},
                "fairnessInterpretation": "Disparity reduced across DPD and EOD.",
                "performanceInterpretation": "Minor predictive utility change."
            },
            "fairnessUtilityResult": {
                "tradeoffClassification": "FAIRNESS IMPROVEMENT / MINOR UTILITY COST",
                "threshold": 0.01,
                "fairnessAnalysis": {"improvedCount": 3, "worsenedCount": 0, "unchangedCount": 2, "metrics": []},
                "utilityAnalysis": {"improvedCount": 0, "worsenedCount": 1, "unchangedCount": 4, "metrics": []},
                "overallInterpretation": "Fairness improved with a minor utility cost.",
                "methodologyNotes": ["Test note 1", "Test note 2"]
            }
        }

    def test_1_complete_audit_accepted(self):
        """Test 1: Complete audit produces status REPORT_GENERATED."""
        res = build_report_data_model(self.complete_audit)
        self.assertEqual(res["status"], "REPORT_GENERATED")

    def test_2_missing_baseline_rejected(self):
        """Test 2: Missing baseline result produces REPORT_NOT_READY."""
        incomplete = self.complete_audit.copy()
        del incomplete["baselineResult"]
        res = build_report_data_model(incomplete)
        self.assertEqual(res["status"], "REPORT_NOT_READY")

    def test_3_missing_fairness_rejected(self):
        """Test 3: Missing fairness result produces REPORT_NOT_READY."""
        incomplete = self.complete_audit.copy()
        del incomplete["fairnessResult"]
        res = build_report_data_model(incomplete)
        self.assertEqual(res["status"], "REPORT_NOT_READY")

    def test_4_missing_proxy_capacity_rejected(self):
        """Test 4: Missing proxy capacity result produces REPORT_NOT_READY."""
        incomplete = self.complete_audit.copy()
        del incomplete["proxyCapacityResult"]
        res = build_report_data_model(incomplete)
        self.assertEqual(res["status"], "REPORT_NOT_READY")

    def test_5_missing_proxy_use_rejected(self):
        """Test 5: Missing proxy use result produces REPORT_NOT_READY."""
        incomplete = self.complete_audit.copy()
        del incomplete["proxyUseResult"]
        res = build_report_data_model(incomplete)
        self.assertEqual(res["status"], "REPORT_NOT_READY")

    def test_6_missing_ablation_rejected(self):
        """Test 6: Missing ablation result produces REPORT_NOT_READY."""
        incomplete = self.complete_audit.copy()
        del incomplete["featureAblationResult"]
        res = build_report_data_model(incomplete)
        self.assertEqual(res["status"], "REPORT_NOT_READY")

    def test_7_missing_fairness_impact_rejected(self):
        """Test 7: Missing fairness impact result produces REPORT_NOT_READY."""
        incomplete = self.complete_audit.copy()
        del incomplete["fairnessImpactResult"]
        res = build_report_data_model(incomplete)
        self.assertEqual(res["status"], "REPORT_NOT_READY")

    def test_8_missing_intervention_rejected(self):
        """Test 8: Missing intervention result produces REPORT_NOT_READY."""
        incomplete = self.complete_audit.copy()
        del incomplete["interventionResult"]
        res = build_report_data_model(incomplete)
        self.assertEqual(res["status"], "REPORT_NOT_READY")

    def test_9_missing_mitigated_model_rejected(self):
        """Test 9: Missing mitigated model result produces REPORT_NOT_READY."""
        incomplete = self.complete_audit.copy()
        del incomplete["mitigatedModelResult"]
        res = build_report_data_model(incomplete)
        self.assertEqual(res["status"], "REPORT_NOT_READY")

    def test_10_missing_before_after_rejected(self):
        """Test 10: Missing before/after comparison produces REPORT_NOT_READY."""
        incomplete = self.complete_audit.copy()
        del incomplete["beforeAfterResult"]
        res = build_report_data_model(incomplete)
        self.assertEqual(res["status"], "REPORT_NOT_READY")

    def test_11_missing_fairness_utility_rejected(self):
        """Test 11: Missing fairness-utility trade-off result produces REPORT_NOT_READY."""
        incomplete = self.complete_audit.copy()
        del incomplete["fairnessUtilityResult"]
        res = build_report_data_model(incomplete)
        self.assertEqual(res["status"], "REPORT_NOT_READY")

    def test_12_baseline_metrics_copied_correctly(self):
        """Test 12: Baseline predictive performance metrics match stored values."""
        res = build_report_data_model(self.complete_audit)
        base_perf = res["baselinePerformance"]
        self.assertEqual(base_perf["accuracy"], 0.85)
        self.assertEqual(base_perf["f1"], 0.77)

    def test_13_fairness_metrics_copied_correctly(self):
        """Test 13: Baseline fairness metrics match stored values."""
        res = build_report_data_model(self.complete_audit)
        fair_metrics = res["baselineFairness"]["metrics"]
        self.assertEqual(fair_metrics["demographicParityDifference"], 0.18)
        self.assertEqual(fair_metrics["disparateImpact"], 0.45)

    def test_14_reproducibility_metadata_included(self):
        """Test 14: Reproducibility provenance metadata is fully populated."""
        res = build_report_data_model(self.complete_audit)
        repro = res["reproducibility"]
        self.assertTrue(repro["protectedAttributeExcludedFromModelInputs"])
        self.assertEqual(repro["canonicalExperimentModule"], "ml-service/evaluation/experiment.py")
        self.assertIn("100%", repro["predictionConsistencyMatch"])

    def test_15_responsible_ai_disclaimers_included(self):
        """Test 15: Responsible AI disclaimers and analytical distinctions are present."""
        res = build_report_data_model(self.complete_audit)
        rai = res["responsibleAI"]
        self.assertIn("NOT constitute legal", rai["legalDisclaimer"])
        self.assertIn("Proxy Capacity ≠ Proxy Use", rai["analyticalDistinctions"][0])

    def test_16_html_report_rendering(self):
        """Test 16: HTML report is generated with valid structure and print button."""
        res = build_report_data_model(self.complete_audit)
        html = render_html_report(res)
        self.assertIn("ProxyShield AI Fairness Audit Report", html)
        self.assertIn("window.print()", html)
        self.assertIn("FAIRNESS IMPROVEMENT / MINOR UTILITY COST", html)

    def test_17_no_single_composite_score(self):
        """Test 17: Ensures no single composite fairness or utility score is generated."""
        res = build_report_data_model(self.complete_audit)
        self.assertNotIn("singleFairnessScore", res)
        self.assertNotIn("compositeScore", res)

if __name__ == '__main__':
    unittest.main()
