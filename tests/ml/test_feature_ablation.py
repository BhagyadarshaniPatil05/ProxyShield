import sys
import os
import pandas as pd
import numpy as np

# Add ml-service directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml-service')))

from evaluation.feature_ablation import run_controlled_feature_ablation

def test_controlled_feature_ablation():
    # Construct synthetic dataset with clear feature relationships
    np.random.seed(42)
    n_samples = 150

    educations = ['Bachelors' if i % 2 == 0 else 'HS-grad' for i in range(n_samples)]
    occupations = ['Doctor' if i % 3 == 0 else 'Service' for i in range(n_samples)]
    ages = np.random.randint(20, 65, size=n_samples)
    sexes = ['Male' if i % 2 == 0 else 'Female' for i in range(n_samples)]
    constant_col = ['Constant_Val'] * n_samples
    
    # Target income strongly depends on education and occupation
    incomes = ['>50K' if (educations[i] == 'Bachelors' or occupations[i] == 'Doctor') else '<=50K' for i in range(n_samples)]

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
        print(f"Testing Controlled Feature Ablation for model_type: {model_type}...")
        
        result = run_controlled_feature_ablation(
            df,
            target_col='income',
            protected_col='sex',
            model_type=model_type,
            selected_candidate_cols=['education', 'occupation', 'age', 'constant_feature']
        )

        # Baseline & Metadata Assertions
        assert result['modelType'] == model_type
        assert result['protectedAttribute'] == 'sex'
        assert result['targetAttribute'] == 'income'
        assert result['testSetSize'] > 0
        assert 'baselinePerformance' in result
        
        baseline = result['baselinePerformance']
        assert 0.0 <= baseline['accuracy'] <= 1.0
        assert 0.0 <= baseline['precision'] <= 1.0
        assert 0.0 <= baseline['recall'] <= 1.0
        assert 0.0 <= baseline['f1'] <= 1.0
        assert 0.0 <= baseline['rocAuc'] <= 1.0
        assert 'confusionMatrix' in baseline
        assert isinstance(baseline['confusionMatrix'], list)

        # Candidate Features Assertions
        features = result['candidateFeatures']
        feature_names = [f['feature'] for f in features]
        
        # Verify candidate exclusions: sex, income, constant_feature should NOT be candidate features
        assert 'sex' not in feature_names
        assert 'income' not in feature_names
        assert 'constant_feature' not in feature_names
        assert len(features) == 3  # education, occupation, age

        for feat in features:
            assert 'feature' in feat
            assert feat['neutralizationValue'] is not None
            assert feat['neutralizationStrategy'] in ['training_set_median', 'training_set_mode', 'median', 'mode']
            
            # Ablated performance metrics
            ablated = feat['ablatedPerformance']
            assert 0.0 <= ablated['accuracy'] <= 1.0
            assert 0.0 <= ablated['f1'] <= 1.0
            
            # Delta metrics
            delta = feat['deltas']
            assert -1.0 <= delta['accuracyDelta'] <= 1.0
            assert -1.0 <= delta['f1Delta'] <= 1.0
            assert -1.0 <= delta['precisionDelta'] <= 1.0
            assert -1.0 <= delta['recallDelta'] <= 1.0
            assert -1.0 <= delta['rocAucDelta'] <= 1.0
            
            # Prediction change rate and mean probability change
            assert 0.0 <= feat['predictionChangeRate'] <= 1.0
            assert 0.0 <= feat['meanProbabilityChange'] <= 1.0
            
            # Observation string
            assert isinstance(feat['analyticalObservation'], str)
            assert len(feat['analyticalObservation']) > 10

        print(f"  -> Successfully verified ablation for {model_type} with {len(features)} candidate features.")

    print("[PASS] Python ML Service controlled feature ablation unit test passed successfully!")

if __name__ == "__main__":
    test_controlled_feature_ablation()
