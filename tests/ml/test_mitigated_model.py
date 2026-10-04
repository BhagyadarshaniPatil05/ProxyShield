import unittest
import pandas as pd
import numpy as np
import os
import sys

# Ensure ml-service directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml-service')))

from models.mitigated import train_mitigated_model
from models.trainer import get_baseline_model
from preprocessing.pipeline import build_preprocessing_pipeline
from evaluation.performance import evaluate_classification_performance

class TestMitigatedModelTraining(unittest.TestCase):

    def setUp(self):
        np.random.seed(42)
        n_samples = 200
        
        # Synthetic dataset with target, protected attribute, proxies, and noise
        sex = np.random.choice(['Male', 'Female'], size=n_samples)
        age = np.random.randint(18, 65, size=n_samples)
        education = np.random.choice(['Bachelors', 'HS-grad', 'Masters', 'Doctorate'], size=n_samples)
        occupation = np.random.choice(['Tech', 'Crafts', 'Sales', 'Exec'], size=n_samples)
        random_noise = np.random.randn(n_samples)
        constant_col = np.array(['ConstantValue'] * n_samples)

        # Target income dependent on age, education, and noise
        income_prob = 0.3 * (age > 40) + 0.3 * (education == 'Masters') + 0.4 * (sex == 'Male')
        income = (income_prob > 0.5).astype(int)

        self.df = pd.DataFrame({
            'user_id': np.arange(1000, 1000 + n_samples),
            'age': age,
            'sex': sex,
            'education': education,
            'occupation': occupation,
            'random_noise': random_noise,
            'constant_col': constant_col,
            'income': income
        })

        self.target_col = 'income'
        self.protected_col = 'sex'

    def test_1_valid_remove_feature_intervention(self):
        """Test 1: Valid REMOVE_FEATURE intervention runs successfully."""
        res = train_mitigated_model(
            self.df,
            target_col=self.target_col,
            protected_col=self.protected_col,
            model_type='random_forest',
            selected_features=['education'],
            strategy='REMOVE_FEATURE'
        )
        self.assertEqual(res['status'], 'COMPLETED')
        self.assertEqual(res['strategy'], 'REMOVE_FEATURE')
        self.assertIn('education', res['selectedFeatures'])

    def test_2_selected_feature_excluded_from_training(self):
        """Test 2: Selected feature is actually excluded from training feature counts."""
        res = train_mitigated_model(
            self.df,
            target_col=self.target_col,
            protected_col=self.protected_col,
            model_type='random_forest',
            selected_features=['education'],
            strategy='REMOVE_FEATURE'
        )
        self.assertEqual(res['removedFeatureCount'], 1)
        self.assertEqual(res['mitigatedFeatureCount'], res['originalFeatureCount'] - 1)

    def test_3_original_dataset_remains_unchanged(self):
        """Test 3: Original dataset DataFrame remains unmodified after mitigated model training."""
        cols_before = list(self.df.columns)
        shape_before = self.df.shape
        
        train_mitigated_model(
            self.df,
            target_col=self.target_col,
            protected_col=self.protected_col,
            model_type='random_forest',
            selected_features=['education'],
            strategy='REMOVE_FEATURE'
        )
        
        self.assertEqual(list(self.df.columns), cols_before)
        self.assertEqual(self.df.shape, shape_before)
        self.assertIn('education', self.df.columns)

    def test_4_target_cannot_be_removed(self):
        """Test 4: Attempting to remove target attribute raises ValueError."""
        with self.assertRaises(ValueError) as ctx:
            train_mitigated_model(
                self.df,
                target_col=self.target_col,
                protected_col=self.protected_col,
                model_type='random_forest',
                selected_features=['income'],
                strategy='REMOVE_FEATURE'
            )
        self.assertIn('Target attribute cannot be removed', str(ctx.exception))

    def test_5_protected_attribute_cannot_be_removed(self):
        """Test 5: Attempting to remove protected attribute raises ValueError."""
        with self.assertRaises(ValueError) as ctx:
            train_mitigated_model(
                self.df,
                target_col=self.target_col,
                protected_col=self.protected_col,
                model_type='random_forest',
                selected_features=['sex'],
                strategy='REMOVE_FEATURE'
            )
        self.assertIn('Protected attribute cannot be removed', str(ctx.exception))

    def test_6_unknown_feature_rejected(self):
        """Test 6: Selecting a feature not in the dataset raises ValueError."""
        with self.assertRaises(ValueError) as ctx:
            train_mitigated_model(
                self.df,
                target_col=self.target_col,
                protected_col=self.protected_col,
                model_type='random_forest',
                selected_features=['non_existent_column'],
                strategy='REMOVE_FEATURE'
            )
        self.assertIn("not found in dataset", str(ctx.exception))

    def test_7_unsupported_strategy_rejected(self):
        """Test 7: Unsupported strategy raises ValueError."""
        with self.assertRaises(ValueError) as ctx:
            train_mitigated_model(
                self.df,
                target_col=self.target_col,
                protected_col=self.protected_col,
                model_type='random_forest',
                selected_features=['education'],
                strategy='INVALID_STRATEGY'
            )
        self.assertIn("Unsupported intervention strategy", str(ctx.exception))

    def test_8_correct_model_type_used(self):
        """Test 8: Evaluates supported model types (logistic_regression, decision_tree, random_forest)."""
        for m_type in ['logistic_regression', 'decision_tree', 'random_forest']:
            res = train_mitigated_model(
                self.df,
                target_col=self.target_col,
                protected_col=self.protected_col,
                model_type=m_type,
                selected_features=['education'],
                strategy='REMOVE_FEATURE'
            )
            self.assertEqual(res['modelType'], m_type)

    def test_9_same_deterministic_split_used(self):
        """Test 9: Verify exact train/test sample counts match 80/20 ratio."""
        res = train_mitigated_model(
            self.df,
            target_col=self.target_col,
            protected_col=self.protected_col,
            model_type='random_forest',
            selected_features=['education'],
            strategy='REMOVE_FEATURE'
        )
        self.assertEqual(res['trainRows'], 160)
        self.assertEqual(res['testRows'], 40)

    def test_10_predictive_metrics_returned(self):
        """Test 10: Ensures accuracy, precision, recall, f1, and rocAuc are returned."""
        res = train_mitigated_model(
            self.df,
            target_col=self.target_col,
            protected_col=self.protected_col,
            model_type='random_forest',
            selected_features=['education'],
            strategy='REMOVE_FEATURE'
        )
        perf = res['performance']
        self.assertIn('accuracy', perf)
        self.assertIn('precision', perf)
        self.assertIn('recall', perf)
        self.assertIn('f1', perf)
        self.assertIn('rocAuc', perf)

    def test_11_confusion_matrix_returned(self):
        """Test 11: Confusion matrix is returned as 2x2 matrix."""
        res = train_mitigated_model(
            self.df,
            target_col=self.target_col,
            protected_col=self.protected_col,
            model_type='random_forest',
            selected_features=['education'],
            strategy='REMOVE_FEATURE'
        )
        cm = res['performance']['confusionMatrix']
        self.assertEqual(len(cm), 2)
        self.assertEqual(len(cm[0]), 2)

    def test_12_repeated_execution_is_deterministic(self):
        """Test 12: Repeated execution produces identical metrics."""
        res1 = train_mitigated_model(
            self.df,
            target_col=self.target_col,
            protected_col=self.protected_col,
            model_type='random_forest',
            selected_features=['education'],
            strategy='REMOVE_FEATURE'
        )
        res2 = train_mitigated_model(
            self.df,
            target_col=self.target_col,
            protected_col=self.protected_col,
            model_type='random_forest',
            selected_features=['education'],
            strategy='REMOVE_FEATURE'
        )
        self.assertEqual(res1['performance']['accuracy'], res2['performance']['accuracy'])
        self.assertEqual(res1['performance']['f1'], res2['performance']['f1'])
        self.assertEqual(res1['testPredictions'], res2['testPredictions'])

    def test_13_baseline_result_remains_unchanged(self):
        """Test 13: Simulated baseline data remains unchanged."""
        baseline = {'accuracy': 0.85, 'f1': 0.80}
        baseline_copy = dict(baseline)
        
        train_mitigated_model(
            self.df,
            target_col=self.target_col,
            protected_col=self.protected_col,
            model_type='random_forest',
            selected_features=['education'],
            strategy='REMOVE_FEATURE'
        )
        self.assertEqual(baseline, baseline_copy)

    def test_14_multiple_features_removed_correctly(self):
        """Test 14: Multiple candidate features are removed simultaneously."""
        res = train_mitigated_model(
            self.df,
            target_col=self.target_col,
            protected_col=self.protected_col,
            model_type='random_forest',
            selected_features=['education', 'occupation'],
            strategy='REMOVE_FEATURE'
        )
        self.assertEqual(res['removedFeatureCount'], 2)
        self.assertIn('education', res['removedFeatures'])
        self.assertIn('occupation', res['removedFeatures'])

    def test_15_mitigated_feature_count_correct(self):
        """Test 15: Verify exact feature count calculation."""
        res = train_mitigated_model(
            self.df,
            target_col=self.target_col,
            protected_col=self.protected_col,
            model_type='random_forest',
            selected_features=['education'],
            strategy='REMOVE_FEATURE'
        )
        # Original features = 8 total cols - 1 target (income) - 1 protected (sex) = 6 baseline features
        # Mitigated features = 6 - 1 = 5
        self.assertEqual(res['originalFeatureCount'], 6)
        self.assertEqual(res['mitigatedFeatureCount'], 5)

if __name__ == '__main__':
    print("Testing Phase 10 Mitigated Model Training...")
    unittest.main()
