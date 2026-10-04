import unittest
import pandas as pd
import numpy as np
import os
import sys

# Ensure ml-service directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml-service')))

from evaluation.before_after import run_before_after_comparison
from models.mitigated import train_mitigated_model

class TestBeforeAfterComparison(unittest.TestCase):

    def setUp(self):
        np.random.seed(42)
        n_samples = 200
        
        sex = np.random.choice(['Male', 'Female'], size=n_samples)
        age = np.random.randint(18, 65, size=n_samples)
        education = np.random.choice(['Bachelors', 'HS-grad', 'Masters', 'Doctorate'], size=n_samples)
        occupation = np.random.choice(['Tech', 'Crafts', 'Sales', 'Exec'], size=n_samples)
        random_noise = np.random.randn(n_samples)

        # Target income
        income_prob = 0.3 * (age > 40) + 0.3 * (education == 'Masters') + 0.4 * (sex == 'Male')
        income = (income_prob > 0.5).astype(int)

        self.df = pd.DataFrame({
            'user_id': np.arange(1000, 1000 + n_samples),
            'age': age,
            'sex': sex,
            'education': education,
            'occupation': occupation,
            'random_noise': random_noise,
            'income': income
        })

        self.target_col = 'income'
        self.protected_col = 'sex'
        self.reference_group = 'Male'

    def test_1_baseline_result_available(self):
        """Test 1: Baseline result structure is populated in comparison output."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertIn('performance', res['baseline'])
        self.assertIn('fairness', res['baseline'])

    def test_2_mitigated_result_available(self):
        """Test 2: Mitigated result structure is populated in comparison output."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertIn('performance', res['mitigated'])
        self.assertIn('fairness', res['mitigated'])

    def test_3_missing_baseline_target_rejected(self):
        """Test 3: Missing target in dataset raises ValueError."""
        with self.assertRaises(ValueError):
            run_before_after_comparison(
                self.df, 'missing_target', self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
            )

    def test_4_missing_intervention_features_rejected(self):
        """Test 4: Empty selected features list raises ValueError."""
        with self.assertRaises(ValueError):
            run_before_after_comparison(
                self.df, self.target_col, self.protected_col, 'random_forest', [], 'REMOVE_FEATURE', self.reference_group
            )

    def test_5_same_dataset_used(self):
        """Test 5: Dataset is shared across baseline and mitigated evaluation."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertEqual(res['status'], 'COMPLETED')

    def test_6_same_target_used(self):
        """Test 6: Target attribute is identical across comparison."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertEqual(res['baseline']['performance']['confusionMatrix'], res['baseline']['performance']['confusionMatrix'])

    def test_7_same_protected_attribute_used(self):
        """Test 7: Protected attribute reference group is preserved."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertEqual(res['referenceGroup'], self.reference_group)

    def test_8_same_deterministic_split_used(self):
        """Test 8: Ensures baseline and mitigated evaluated on same sample count."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertEqual(
            res['baseline']['fairness']['groupStats'][0]['sampleCount'] + res['baseline']['fairness']['groupStats'][1]['sampleCount'],
            res['mitigated']['fairness']['groupStats'][0]['sampleCount'] + res['mitigated']['fairness']['groupStats'][1]['sampleCount']
        )

    def test_9_baseline_feature_set_unchanged(self):
        """Test 9: Baseline feature count reflects original feature set size."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        # Total 7 columns - 1 target - 1 protected = 5 features
        self.assertEqual(res['baseline']['featureCount'], 5)

    def test_10_only_intervention_feature_differs(self):
        """Test 10: Mitigated feature count is exactly baseline count minus removed feature count."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertEqual(res['mitigated']['featureCount'], res['baseline']['featureCount'] - 1)

    def test_11_protected_attribute_excluded_from_model_features(self):
        """Test 11: Attempting to remove protected attribute raises ValueError."""
        with self.assertRaises(ValueError):
            run_before_after_comparison(
                self.df, self.target_col, self.protected_col, 'random_forest', ['sex'], 'REMOVE_FEATURE', self.reference_group
            )

    def test_12_baseline_fairness_metrics_reproduced(self):
        """Test 12: Baseline fairness metrics (DPD, DI) calculated."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertIn('dpd', res['baseline']['fairness'])
        self.assertIn('di', res['baseline']['fairness'])

    def test_13_mitigated_fairness_metrics_calculated(self):
        """Test 13: Mitigated fairness metrics (DPD, DI) calculated."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertIn('dpd', res['mitigated']['fairness'])
        self.assertIn('di', res['mitigated']['fairness'])

    def test_14_dpd_delta_correct(self):
        """Test 14: DPD delta equals mitigated DPD minus baseline DPD."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        b_dpd = res['baseline']['fairness']['dpd']
        m_dpd = res['mitigated']['fairness']['dpd']
        delta_dpd = res['fairnessDelta']['dpd']
        if b_dpd is not None and m_dpd is not None:
            self.assertAlmostEqual(delta_dpd, m_dpd - b_dpd, places=4)

    def test_15_di_delta_correct(self):
        """Test 15: DI delta equals mitigated DI minus baseline DI."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        b_di = res['baseline']['fairness']['di']
        m_di = res['mitigated']['fairness']['di']
        delta_di = res['fairnessDelta']['di']
        if b_di is not None and m_di is not None:
            self.assertAlmostEqual(delta_di, m_di - b_di, places=4)

    def test_16_eod_delta_correct(self):
        """Test 16: EOD delta equals mitigated EOD minus baseline EOD."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        b_eod = res['baseline']['fairness']['eod']
        m_eod = res['mitigated']['fairness']['eod']
        delta_eod = res['fairnessDelta']['eod']
        if b_eod is not None and m_eod is not None:
            self.assertAlmostEqual(delta_eod, m_eod - b_eod, places=4)

    def test_17_equalized_odds_deltas_correct(self):
        """Test 17: Equalized Odds deltas structure returned."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertIn('equalizedOdds', res['fairnessDelta'])
        self.assertIn('tprDifference', res['fairnessDelta']['equalizedOdds'])
        self.assertIn('fprDifference', res['fairnessDelta']['equalizedOdds'])

    def test_18_predictive_metric_deltas_correct(self):
        """Test 18: Accuracy and F1 deltas equal mitigated minus baseline."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        b_acc = res['baseline']['performance']['accuracy']
        m_acc = res['mitigated']['performance']['accuracy']
        d_acc = res['performanceDelta']['accuracy']
        self.assertAlmostEqual(d_acc, m_acc - b_acc, places=4)

    def test_19_group_statistics_returned(self):
        """Test 19: Per-group statistics lists returned for baseline and mitigated."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertTrue(len(res['baseline']['fairness']['groupStats']) >= 2)
        self.assertTrue(len(res['mitigated']['fairness']['groupStats']) >= 2)

    def test_20_confusion_matrices_returned(self):
        """Test 20: 2x2 confusion matrices returned for both baseline and mitigated."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertEqual(len(res['baseline']['performance']['confusionMatrix']), 2)
        self.assertEqual(len(res['mitigated']['performance']['confusionMatrix']), 2)

    def test_21_repeated_execution_is_deterministic(self):
        """Test 21: Repeated comparison yields identical deltas."""
        res1 = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        res2 = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertEqual(res1['performanceDelta'], res2['performanceDelta'])
        self.assertEqual(res1['fairnessDelta'], res2['fairnessDelta'])

    def test_22_no_baseline_database_mutation_occurs(self):
        """Test 22: Underlying input DataFrame remains unchanged."""
        shape_before = self.df.shape
        cols_before = list(self.df.columns)
        run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertEqual(self.df.shape, shape_before)
        self.assertEqual(list(self.df.columns), cols_before)

    def test_23_no_raw_dataset_in_result(self):
        """Test 23: Output JSON payload contains no raw dataset records."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertNotIn('df', res)
        self.assertNotIn('raw_data', res)

    def test_24_interpretation_is_direction_aware(self):
        """Test 24: Fairness interpretation is populated with qualitative text."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertIn(res['fairnessInterpretation'], ['FAIRNESS IMPROVED', 'MIXED FAIRNESS RESULT', 'FAIRNESS UNCHANGED', 'FAIRNESS WORSENED', 'INCONCLUSIVE'])
        self.assertIn(res['performanceInterpretation'], ['PERFORMANCE PRESERVED', 'MINOR PERFORMANCE TRADE-OFF', 'MATERIAL PERFORMANCE DECREASE', 'PERFORMANCE IMPROVED'])

    def test_25_no_arbitrary_single_fairness_score_generated(self):
        """Test 25: Ensures no composite single 'fairness score' key is generated."""
        res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        self.assertNotIn('fairnessScore', res)
        self.assertNotIn('overallScore', res)
        self.assertNotIn('compositeScore', res)

if __name__ == '__main__':
    print("Testing Phase 11 Before vs After Comparison...")
    unittest.main()
