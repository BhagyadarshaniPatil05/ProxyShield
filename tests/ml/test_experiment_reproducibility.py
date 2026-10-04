import unittest
import pandas as pd
import numpy as np
import os
import sys

# Ensure ml-service directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml-service')))

from evaluation.experiment import get_canonical_experiment, compute_dataset_hash
from fairness.fairness_impact import run_fairness_impact_analysis
from evaluation.before_after import run_before_after_comparison
from evaluation.fairness_utility import run_fairness_utility_analysis

class TestBaselineExperimentReproducibility(unittest.TestCase):

    def setUp(self):
        np.random.seed(42)
        n_samples = 300
        
        sex = np.random.choice(['Male', 'Female'], size=n_samples)
        age = np.random.randint(18, 65, size=n_samples)
        education = np.random.choice(['Bachelors', 'HS-grad', 'Masters', 'Doctorate'], size=n_samples)
        occupation = np.random.choice(['Tech', 'Crafts', 'Sales', 'Exec'], size=n_samples)
        hours_per_week = np.random.randint(20, 60, size=n_samples)
        capital_gain = np.random.choice([0, 1000, 5000, 10000], size=n_samples)

        # Target income
        income_prob = (
            0.3 * (age > 40) + 
            0.3 * (education == 'Masters') + 
            0.2 * (hours_per_week > 40) + 
            0.2 * (sex == 'Male')
        )
        income = (income_prob > 0.5).astype(int)

        self.df = pd.DataFrame({
            'user_id': np.arange(1000, 1000 + n_samples),
            'age': age,
            'sex': sex,
            'education': education,
            'occupation': occupation,
            'hours_per_week': hours_per_week,
            'capital_gain': capital_gain,
            'income': income
        })

        self.target_col = 'income'
        self.protected_col = 'sex'
        self.reference_group = 'Male'

    def test_1_compute_dataset_hash(self):
        """Test 1: Dataset fingerprint is deterministic and identical for same DataFrame."""
        hash1 = compute_dataset_hash(self.df)
        hash2 = compute_dataset_hash(self.df.copy())
        self.assertEqual(hash1, hash2)
        self.assertEqual(len(hash1), 64)

    def test_2_canonical_experiment_structure(self):
        """Test 2: Canonical experiment returns complete structure with required metadata."""
        exp = get_canonical_experiment(
            self.df, self.target_col, self.protected_col, 'random_forest', self.reference_group
        )
        self.assertIn('datasetHash', exp)
        self.assertIn('split', exp)
        self.assertIn('modelFeatures', exp)
        self.assertIn('performance', exp)
        self.assertIn('fairness', exp)

    def test_3_feature_scoping_excludes_protected_and_target(self):
        """Test 3: Model feature matrix X strictly excludes target and protected attributes."""
        exp = get_canonical_experiment(
            self.df, self.target_col, self.protected_col, 'random_forest', self.reference_group
        )
        model_features = exp['modelFeatures']
        self.assertNotIn(self.target_col, model_features)
        self.assertNotIn(self.protected_col, model_features)
        self.assertIn('age', model_features)
        self.assertIn('education', model_features)

    def test_4_deterministic_split_indices(self):
        """Test 4: Repeated canonical experiment runs produce identical train/test indices."""
        exp1 = get_canonical_experiment(self.df, self.target_col, self.protected_col, 'random_forest', self.reference_group)
        exp2 = get_canonical_experiment(self.df, self.target_col, self.protected_col, 'random_forest', self.reference_group)
        self.assertEqual(exp1['split']['trainIndices'], exp2['split']['trainIndices'])
        self.assertEqual(exp1['split']['testIndices'], exp2['split']['testIndices'])

    def test_5_zero_prediction_mismatches_repeated_calls(self):
        """Test 5: Repeated calls produce zero prediction mismatches (100% bitwise identity)."""
        exp1 = get_canonical_experiment(self.df, self.target_col, self.protected_col, 'random_forest', self.reference_group)
        exp2 = get_canonical_experiment(self.df, self.target_col, self.protected_col, 'random_forest', self.reference_group)
        mismatches = np.sum(exp1['y_pred'] != exp2['y_pred'])
        self.assertEqual(mismatches, 0)

    def test_6_fairness_metric_equality_repeated_calls(self):
        """Test 6: Repeated canonical experiment runs produce identical fairness metrics."""
        exp1 = get_canonical_experiment(self.df, self.target_col, self.protected_col, 'random_forest', self.reference_group)
        exp2 = get_canonical_experiment(self.df, self.target_col, self.protected_col, 'random_forest', self.reference_group)
        self.assertAlmostEqual(exp1['fairness']['dpd'], exp2['fairness']['dpd'], places=6)
        self.assertAlmostEqual(exp1['fairness']['di'], exp2['fairness']['di'], places=6)
        self.assertAlmostEqual(exp1['fairness']['eod'], exp2['fairness']['eod'], places=6)

    def test_7_fairness_impact_baseline_parity(self):
        """Test 7: Phase 8 baseline metrics match canonical experiment baseline exactly."""
        exp = get_canonical_experiment(self.df, self.target_col, self.protected_col, 'random_forest', self.reference_group)
        impact_res = run_fairness_impact_analysis(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], self.reference_group
        )
        base_fairness = impact_res['baselineFairness']
        self.assertAlmostEqual(exp['fairness']['dpd'], base_fairness['demographicParityDifference'], places=6)
        self.assertAlmostEqual(exp['fairness']['di'], base_fairness['disparateImpact'], places=6)
        self.assertAlmostEqual(exp['fairness']['eod'], base_fairness['equalOpportunityDifference'], places=6)

    def test_8_before_after_baseline_parity(self):
        """Test 8: Phase 11 baseline metrics match canonical experiment baseline exactly."""
        exp = get_canonical_experiment(self.df, self.target_col, self.protected_col, 'random_forest', self.reference_group)
        ba_res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        base_ba = ba_res['baseline']['fairness']
        self.assertAlmostEqual(exp['fairness']['dpd'], base_ba['dpd'], places=6)
        self.assertAlmostEqual(exp['fairness']['di'], base_ba['di'], places=6)
        self.assertAlmostEqual(exp['fairness']['eod'], base_ba['eod'], places=6)

    def test_9_fairness_utility_baseline_parity(self):
        """Test 9: Phase 12 baseline metrics match canonical experiment baseline exactly."""
        exp = get_canonical_experiment(self.df, self.target_col, self.protected_col, 'random_forest', self.reference_group)
        ba_res = run_before_after_comparison(
            self.df, self.target_col, self.protected_col, 'random_forest', ['education'], 'REMOVE_FEATURE', self.reference_group
        )
        fu_res = run_fairness_utility_analysis(ba_res)
        fu_metrics = {m['metric']: m['before'] for m in fu_res['fairnessAnalysis']['metrics']}
        self.assertAlmostEqual(exp['fairness']['dpd'], fu_metrics['DPD'], places=4)
        self.assertAlmostEqual(exp['fairness']['di'], fu_metrics['DI'], places=4)
        self.assertAlmostEqual(exp['fairness']['eod'], fu_metrics['EOD'], places=4)

    def test_10_missing_target_col_raises(self):
        """Test 10: Missing target column raises ValueError."""
        with self.assertRaises(ValueError):
            get_canonical_experiment(self.df, 'non_existent_col', self.protected_col)

    def test_11_missing_protected_col_raises(self):
        """Test 11: Missing protected column raises ValueError."""
        with self.assertRaises(ValueError):
            get_canonical_experiment(self.df, self.target_col, 'non_existent_col')

    def test_12_insufficient_samples_raises(self):
        """Test 12: Small dataset under 10 rows raises ValueError."""
        small_df = self.df.head(5)
        with self.assertRaises(ValueError):
            get_canonical_experiment(small_df, self.target_col, self.protected_col)

if __name__ == '__main__':
    unittest.main()
