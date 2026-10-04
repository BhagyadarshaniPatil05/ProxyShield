import sys
import os
import io
import pandas as pd
import numpy as np

# Add ml-service directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml-service')))

from proxy.proxy_capacity import analyze_proxy_capacity
from proxy.association import calculate_categorical_association, calculate_numerical_association
from proxy.predictability import evaluate_protected_predictability

def test_proxy_capacity_analysis():
    # Construct synthetic dataset
    # Target: income (<=50K, >50K)
    # Protected: sex (Male, Female)
    # Feature 1 (High Proxy Candidate): relationship (Wife -> Female, Husband -> Male)
    # Feature 2 (Numerical Candidate): age (correlated with sex in sample)
    # Feature 3 (Constant Feature): constant_col (all 'Same')
    # Feature 4 (ID Feature): user_id (unique numbers 1..N)
    
    np.random.seed(42)
    n_samples = 100
    
    sexes = ['Male'] * 50 + ['Female'] * 50
    relationships = ['Husband' if s == 'Male' else 'Wife' for s in sexes]
    ages = [45 if s == 'Male' else 25 for s in sexes]
    incomes = ['>50K' if s == 'Male' else '<=50K' for s in sexes]
    constant_col = ['Same'] * n_samples
    user_ids = [f"ID_{i}" for i in range(n_samples)]
    random_noise = np.round(np.random.randn(n_samples), 1)

    df = pd.DataFrame({
        'user_id': user_ids,
        'age': ages,
        'relationship': relationships,
        'constant_col': constant_col,
        'random_noise': random_noise,
        'sex': sexes,
        'income': incomes
    })

    analysis = analyze_proxy_capacity(df, target_col='income', protected_col='sex')

    assert analysis['protectedAttribute'] == 'sex'
    assert analysis['targetAttribute'] == 'income'
    assert analysis['candidateFeatureCount'] == 5

    results = analysis['results']
    feature_names = [r['feature'] for r in results]

    # Rule 1: Protected attribute & Target must NEVER appear as candidate proxy features
    assert 'sex' not in feature_names
    assert 'income' not in feature_names

    # Rule 2: Constant feature detection
    const_res = next(r for r in results if r['feature'] == 'constant_col')
    assert const_res['status'] == 'NOT_INFORMATIVE'
    assert const_res['capacityLevel'] == 'NOT_INFORMATIVE'

    # Rule 3: Identifier column safeguard
    id_res = next(r for r in results if r['feature'] == 'user_id')
    assert id_res['status'] == 'IDENTIFIER_EXCLUDED'
    assert id_res['capacityLevel'] == 'IDENTIFIER_EXCLUDED'

    # Rule 4: High potential proxy capacity candidate (relationship)
    rel_res = next(r for r in results if r['feature'] == 'relationship')
    assert rel_res['capacityLevel'] == 'HIGH POTENTIAL PROXY CAPACITY'
    assert rel_res['association']['value'] > 0.80
    assert rel_res['predictability']['accuracy'] > 0.90

    # Rule 5: Low potential proxy capacity candidate (random_noise)
    noise_res = next(r for r in results if r['feature'] == 'random_noise')
    assert noise_res['capacityLevel'] in ['LOW POTENTIAL PROXY CAPACITY', 'MODERATE POTENTIAL PROXY CAPACITY']

    print("Ranked features:")
    for r in results:
        print(f"Feature: {r['feature']}, Score: {r.get('rankingScore')}, Level: {r.get('capacityLevel')}, Assoc: {r.get('association', {}).get('value')}, MI: {r.get('mutualInformation')}, F1: {r.get('predictability', {}).get('f1')}")

    # Rule 5: Transparent ranking order
    assert results[0]['feature'] in ['relationship', 'age']

    print("[PASS] Python ML Service proxy capacity unit test passed successfully!")

if __name__ == "__main__":
    test_proxy_capacity_analysis()
