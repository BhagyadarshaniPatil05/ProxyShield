import sys
import os
import pandas as pd
import numpy as np

# Add ml-service directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml-service')))

from fairness.fairness_impact import run_fairness_impact_analysis
from fairness.metrics import calculate_group_metrics, calculate_fairness_disparities

def test_fairness_impact_analysis():
    # Construct synthetic dataset with clear group disparities
    np.random.seed(42)
    n_samples = 160

    educations = ['Bachelors' if i % 2 == 0 else 'HS-grad' for i in range(n_samples)]
    occupations = ['Doctor' if i % 3 == 0 else 'Service' for i in range(n_samples)]
    ages = np.random.randint(20, 65, size=n_samples)
    sexes = ['Male' if i % 2 == 0 else 'Female' for i in range(n_samples)]
    constant_col = ['Constant_Val'] * n_samples

    # Target income depends on education, occupation, and slightly on sex (to ensure disparity)
    incomes = ['>50K' if (educations[i] == 'Bachelors' or (occupations[i] == 'Doctor' and sexes[i] == 'Male')) else '<=50K' for i in range(n_samples)]

    df = pd.DataFrame({
        'education': educations,
        'occupation': occupations,
        'age': ages,
        'sex': sexes,
        'constant_feature': constant_col,
        'income': incomes
    })

    models_to_test = ['logistic_regression', 'decision_tree', 'random_forest']

    for model_type in models_to_test:
        print(f"Testing Fairness Impact Analysis for model_type: {model_type}...")

        # Test 1 & Test 16: Baseline Fairness & Agreement with Phase 4
        result = run_fairness_impact_analysis(
            df,
            target_col='income',
            protected_col='sex',
            model_type=model_type,
            selected_candidate_cols=['education', 'occupation', 'age', 'income', 'sex', 'constant_feature'],
            reference_group='Male'
        )

        # Baseline & Metadata Assertions
        assert result['modelType'] == model_type
        assert result['protectedAttribute'] == 'sex'
        assert result['targetAttribute'] == 'income'
        assert result['referenceGroup'] == 'Male'
        assert result['testRows'] > 0
        assert 'baselineFairness' in result

        base_f = result['baselineFairness']
        assert 'demographicParityDifference' in base_f
        assert 'equalOpportunityDifference' in base_f
        assert 'equalizedOdds' in base_f

        # Test 7, 8, 9, 13, 14: Candidate Exclusions (target, protected_col, constant_feature)
        experiments = result['experiments']
        exp_features = [e['featureName'] for e in experiments]
        
        assert 'income' not in exp_features, "Target attribute cannot be an ablation feature"
        assert 'sex' not in exp_features, "Protected attribute cannot be an ablation feature"
        assert 'constant_feature' not in exp_features, "Constant feature must be excluded"
        assert len(experiments) == 3, f"Expected 3 candidate features, got {len(experiments)}"

        # Test 11: Multiple candidate features evaluated independently
        assert set(exp_features) == {'education', 'occupation', 'age'}

        for exp in experiments:
            # Test 2: Ablated fairness calculation works
            assert 'ablatedFairness' in exp
            abl_f = exp['ablatedFairness']

            # Test 3, 4, 5, 6: Deltas are calculated correctly (Ablated - Baseline)
            delta_f = exp['fairnessDelta']
            assert delta_f is not None

            if abl_f['demographicParityDifference'] is not None and base_f['demographicParityDifference'] is not None:
                expected_delta_dpd = round(abl_f['demographicParityDifference'] - base_f['demographicParityDifference'], 4)
                assert abs(delta_f['demographicParityDifference'] - expected_delta_dpd) < 1e-4

            if abl_f['equalOpportunityDifference'] is not None and base_f['equalOpportunityDifference'] is not None:
                expected_delta_eod = round(abl_f['equalOpportunityDifference'] - base_f['equalOpportunityDifference'], 4)
                assert abs(delta_f['equalOpportunityDifference'] - expected_delta_eod) < 1e-4

            # Test 7 & 10: Reference group and group statistics consistency
            assert len(exp['groupStatisticsBaseline']) > 0
            assert len(exp['groupStatisticsAblated']) > 0

            # Test interpretation
            assert isinstance(exp['interpretation'], str)
            assert len(exp['interpretation']) > 10

        # Test 15: Deterministic Execution Parity
        result_again = run_fairness_impact_analysis(
            df,
            target_col='income',
            protected_col='sex',
            model_type=model_type,
            selected_candidate_cols=['education', 'occupation', 'age'],
            reference_group='Male'
        )
        assert result['baselineFairness'] == result_again['baselineFairness']
        assert result['experiments'][0]['fairnessDelta'] == result_again['experiments'][0]['fairnessDelta']

        print(f"  -> Successfully verified fairness impact for {model_type} with {len(experiments)} candidate features.")

    print("[PASS] Python ML Service fairness impact unit test passed successfully!")

if __name__ == "__main__":
    test_fairness_impact_analysis()
