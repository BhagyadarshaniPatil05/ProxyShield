import sys
import os
import pandas as pd
import numpy as np

# Add ml-service directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml-service')))

from explainability.proxy_use import analyze_proxy_use

def test_proxy_use_analysis():
    # Construct synthetic dataset with clear feature relationships
    # Outcome y: income (>50K, <=50K) based strongly on education & occupation
    np.random.seed(42)
    n_samples = 120

    educations = ['Bachelors' if i % 2 == 0 else 'HS-grad' for i in range(n_samples)]
    occupations = ['Doctor' if i % 3 == 0 else 'Service' for i in range(n_samples)]
    ages = np.random.randint(20, 65, size=n_samples)
    sexes = ['Male' if i % 2 == 0 else 'Female' for i in range(n_samples)]
    
    # Target income strongly depends on education and occupation
    incomes = ['>50K' if (educations[i] == 'Bachelors' or occupations[i] == 'Doctor') else '<=50K' for i in range(n_samples)]

    df = pd.DataFrame({
        'education': educations,
        'occupation': occupations,
        'age': ages,
        'sex': sexes,
        'income': incomes
    })

    models_to_test = ['logistic_regression', 'decision_tree', 'random_forest']

    for model_type in models_to_test:
        print(f"Testing Proxy Use Analysis for model_type: {model_type}...")
        
        analysis = analyze_proxy_use(
            df,
            target_col='income',
            protected_col='sex',
            model_type=model_type,
            selected_candidate_cols=['education', 'occupation', 'age']
        )

        assert analysis['modelType'] == model_type
        assert analysis['protectedAttribute'] == 'sex'
        assert analysis['targetAttribute'] == 'income'
        assert analysis['candidateFeatureCount'] == 3

        features = analysis['candidateFeatures']
        assert len(features) == 3

        for feat in features:
            assert 'feature' in feat
            assert 'shap' in feat
            assert 'permutation' in feat
            assert 'ablation' in feat
            assert 'modelUseEvidence' in feat

            # Metric bounds assertions
            assert feat['shap']['meanAbsoluteValue'] is not None
            assert feat['permutation']['meanImportance'] is not None
            assert feat['ablation']['predictionChangeRate'] >= 0.0
            assert feat['ablation']['predictionChangeRate'] <= 1.0

        # Verify education/occupation have high model reliance
        top_feature = features[0]['feature']
        assert top_feature in ['education', 'occupation', 'age']
        print(f"  -> Model {model_type} top feature: {top_feature}, Evidence: {features[0]['modelUseEvidence']}")

    print("[PASS] Python ML Service proxy use unit test passed successfully!")

if __name__ == "__main__":
    test_proxy_use_analysis()
