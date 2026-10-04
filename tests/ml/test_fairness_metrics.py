import sys
import os
import numpy as np

# Add ml-service directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml-service')))

from fairness.metrics import calculate_group_metrics, calculate_fairness_disparities

def test_fairness_metrics_calculation():
    # Synthetic ground truth, predictions, and sensitive features
    # Group A: 10 samples (5 y_true=1, 5 y_true=0). Predictions: 4 y_pred=1 (3 TP, 1 FP)
    # Group B: 10 samples (5 y_true=1, 5 y_true=0). Predictions: 2 y_pred=1 (1 TP, 1 FP)
    
    y_true = np.array([1, 1, 1, 1, 1, 0, 0, 0, 0, 0,   1, 1, 1, 1, 1, 0, 0, 0, 0, 0])
    y_pred = np.array([1, 1, 1, 0, 0, 1, 0, 0, 0, 0,   1, 0, 0, 0, 0, 1, 0, 0, 0, 0])
    group  = np.array(['A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'])

    group_stats = calculate_group_metrics(y_true, y_pred, group)

    assert len(group_stats) == 2
    
    stat_a = next(g for g in group_stats if g['group'] == 'A')
    stat_b = next(g for g in group_stats if g['group'] == 'B')

    assert stat_a['sampleCount'] == 10
    assert stat_a['positivePredictionCount'] == 4
    assert stat_a['selectionRate'] == 0.4
    assert stat_a['truePositiveRate'] == 0.6  # 3 TP / 5 P
    assert stat_a['falsePositiveRate'] == 0.2 # 1 FP / 5 N

    assert stat_b['sampleCount'] == 10
    assert stat_b['positivePredictionCount'] == 2
    assert stat_b['selectionRate'] == 0.2
    assert stat_b['truePositiveRate'] == 0.2  # 1 TP / 5 P
    assert stat_b['falsePositiveRate'] == 0.2 # 1 FP / 5 N

    # Calculate disparities with referenceGroup='A'
    disparities = calculate_fairness_disparities(group_stats, reference_group='A')

    assert disparities['referenceGroup'] == 'A'
    assert disparities['comparisonGroups'] == ['B']

    metrics = disparities['metrics']
    # DPD: B (0.2) - A (0.4) = -0.2
    assert metrics['demographicParityDifference'] == -0.2
    # DI: B (0.2) / A (0.4) = 0.5
    assert metrics['disparateImpact'] == 0.5
    # EOD: TPR(B) (0.2) - TPR(A) (0.6) = -0.4
    assert metrics['equalOpportunityDifference'] == -0.4
    # Equalized Odds
    assert metrics['equalizedOdds']['tprDifference'] == -0.4
    assert metrics['equalizedOdds']['fprDifference'] == 0.0

    print("[PASS] Python ML Service fairness metrics unit test passed successfully!")

if __name__ == "__main__":
    test_fairness_metrics_calculation()
