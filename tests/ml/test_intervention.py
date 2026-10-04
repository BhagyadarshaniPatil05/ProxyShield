import sys
import os
import pandas as pd
import numpy as np

# Add ml-service directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml-service')))

from intervention.recommendation import generate_intervention_recommendation

def test_proxy_intervention_recommendation():
    # Construct synthetic dataset with clear feature relationships
    np.random.seed(42)
    n_samples = 150

    educations = ['Bachelors' if i % 2 == 0 else 'HS-grad' for i in range(n_samples)]
    occupations = ['Doctor' if i % 3 == 0 else 'Service' for i in range(n_samples)]
    ages = np.random.randint(20, 65, size=n_samples)
    sexes = ['Male' if i % 2 == 0 else 'Female' for i in range(n_samples)]
    constant_col = ['Constant_Val'] * n_samples
    incomes = ['>50K' if (educations[i] == 'Bachelors' or occupations[i] == 'Doctor') else '<=50K' for i in range(n_samples)]

    df = pd.DataFrame({
        'education': educations,
        'occupation': occupations,
        'age': ages,
        'sex': sexes,
        'constant_feature': constant_col,
        'income': incomes
    })

    original_df_columns = list(df.columns)
    original_df_shape = df.shape

    # Construct synthetic prior phase results
    mock_proxy_capacity = {
        'results': [
            {'feature': 'education', 'proxyCapacityLevel': 'HIGH POTENTIAL PROXY CAPACITY', 'proxyCapacityScore': 0.85},
            {'feature': 'occupation', 'proxyCapacityLevel': 'MODERATE POTENTIAL PROXY CAPACITY', 'proxyCapacityScore': 0.55},
            {'feature': 'age', 'proxyCapacityLevel': 'LOW POTENTIAL PROXY CAPACITY', 'proxyCapacityScore': 0.15}
        ]
    }

    mock_proxy_use = {
        'candidateFeatures': [
            {'feature': 'education', 'modelUseEvidence': 'STRONG MODEL-USE EVIDENCE', 'shap': {'meanAbsoluteValue': 0.12}},
            {'feature': 'occupation', 'modelUseEvidence': 'MODERATE MODEL-USE EVIDENCE', 'shap': {'meanAbsoluteValue': 0.05}},
            {'feature': 'age', 'modelUseEvidence': 'WEAK MODEL-USE EVIDENCE', 'shap': {'meanAbsoluteValue': 0.01}}
        ]
    }

    mock_ablation = {
        'features': [
            {'feature': 'education', 'predictionChangeRate': 0.15, 'performanceDelta': {'f1': -0.06}},
            {'feature': 'occupation', 'predictionChangeRate': 0.04, 'performanceDelta': {'f1': -0.02}},
            {'feature': 'age', 'predictionChangeRate': 0.0, 'performanceDelta': {'f1': 0.0}}
        ]
    }

    mock_fairness_impact = {
        'experiments': [
            {'feature': 'education', 'evidenceSummary': 'Reduced disparity across evaluated metrics', 'fairnessDelta': {'demographicParityDifference': -0.04}},
            {'feature': 'occupation', 'evidenceSummary': 'Mixed fairness impact', 'fairnessDelta': {'demographicParityDifference': 0.01}},
            {'feature': 'age', 'evidenceSummary': 'Minimal observed fairness change', 'fairnessDelta': {'demographicParityDifference': 0.0}}
        ]
    }

    print("Testing Proxy Intervention Analysis...")
    result = generate_intervention_recommendation(
        df,
        target_col='income',
        protected_col='sex',
        selected_candidate_cols=['education', 'occupation', 'age', 'income', 'sex', 'constant_feature'],
        proxy_capacity_data=mock_proxy_capacity,
        proxy_use_data=mock_proxy_use,
        feature_ablation_data=mock_ablation,
        fairness_impact_data=mock_fairness_impact
    )

    # Test 10: Strategy & Decision Status
    assert result['strategy'] == 'REMOVE_FEATURE'
    assert result['decisionStatus'] == 'PENDING_HUMAN_REVIEW'
    assert result['targetAttribute'] == 'income'
    assert result['protectedAttribute'] == 'sex'

    # Test 2, 3, 4: Candidate exclusions (target, protected_col, constant_feature)
    candidates = result['candidates']
    cand_names = [c['featureName'] for c in candidates]
    assert 'income' not in cand_names, "Target attribute must be excluded"
    assert 'sex' not in cand_names, "Protected attribute must be excluded"
    assert 'constant_feature' not in cand_names, "Constant feature must be excluded"
    assert len(candidates) == 3

    # Test 5 & Test 9: Independent candidate evidence synthesis
    cand_dict = {c['featureName']: c for c in candidates}

    # Test 6 (Case A — Strong evidence -> RECOMMEND_INTERVENTION)
    edu_cand = cand_dict['education']
    assert edu_cand['recommendation'] == 'RECOMMEND_INTERVENTION'
    assert edu_cand['selected'] is True
    assert 'education' in result['selectedFeatures']
    assert 'recommend' in edu_cand['rationale'].lower()

    # Test 7 (Case B — Mixed evidence -> REVIEW_REQUIRED)
    occ_cand = cand_dict['occupation']
    assert occ_cand['recommendation'] == 'REVIEW_REQUIRED'
    assert occ_cand['selected'] is False

    # Test 8 (Case C — Weak evidence -> DO_NOT_INTERVENE)
    age_cand = cand_dict['age']
    assert age_cand['recommendation'] == 'DO_NOT_INTERVENE'
    assert age_cand['selected'] is False

    # Test 11: Original dataset not modified
    assert list(df.columns) == original_df_columns
    assert df.shape == original_df_shape

    # Test 12: Deterministic execution parity
    result_again = generate_intervention_recommendation(
        df,
        target_col='income',
        protected_col='sex',
        selected_candidate_cols=['education', 'occupation', 'age'],
        proxy_capacity_data=mock_proxy_capacity,
        proxy_use_data=mock_proxy_use,
        feature_ablation_data=mock_ablation,
        fairness_impact_data=mock_fairness_impact
    )
    assert result['selectedFeatures'] == result_again['selectedFeatures']
    assert result['candidates'][0]['recommendation'] == result_again['candidates'][0]['recommendation']

    print("[PASS] Python ML Service proxy intervention unit test passed successfully!")

if __name__ == "__main__":
    test_proxy_intervention_recommendation()
