import pandas as pd
import numpy as np

def calculate_ranking_scores(results: list) -> list:
    """
    Ranks candidate proxy features using transparent empirical signals (Predictability F1/ROC-AUC,
    Mutual Information, and Statistical Association).
    Computes an implementation-defined analytical ranking score and assigns capacity levels.
    """
    if not results:
        return []

    # Find max MI for normalization
    valid_mis = [r.get('mutualInformation') for r in results if r.get('mutualInformation') is not None]
    max_mi = max(valid_mis) if valid_mis and max(valid_mis) > 0 else 1.0

    ranked_results = []

    for r in results:
        status = r.get('status', 'ANALYZED')
        
        if status in ['NOT_INFORMATIVE', 'IDENTIFIER_EXCLUDED', 'NOT_APPLICABLE']:
            r['rankingScore'] = 0.0
            r['capacityLevel'] = status
            ranked_results.append(r)
            continue

        # Extract underlying metrics
        assoc_val = r.get('association', {}).get('value') or 0.0
        mi_val = r.get('mutualInformation') or 0.0
        pred_dict = r.get('predictability', {})
        f1_val = pred_dict.get('f1') or pred_dict.get('accuracy') or 0.0
        bal_acc_val = pred_dict.get('balancedAccuracy') or f1_val

        # Normalized MI (0 to 1)
        norm_mi = min(1.0, mi_val / max_mi) if max_mi > 0 else 0.0

        # Implementation-defined analytical composite score (0.0 to 1.0)
        # Weights: Predictability (40%), Mutual Info (35%), Statistical Association (25%)
        composite_score = round(
            (0.40 * bal_acc_val) + (0.35 * norm_mi) + (0.25 * assoc_val), 4
        )
        r['rankingScore'] = composite_score

        # Categorize Capacity Level
        if composite_score >= 0.65 or (bal_acc_val >= 0.70 and mi_val >= 0.15):
            r['capacityLevel'] = 'HIGH POTENTIAL PROXY CAPACITY'
        elif composite_score >= 0.40 or (bal_acc_val >= 0.55 or mi_val >= 0.08):
            r['capacityLevel'] = 'MODERATE POTENTIAL PROXY CAPACITY'
        else:
            r['capacityLevel'] = 'LOW POTENTIAL PROXY CAPACITY'

        ranked_results.append(r)

    # Sort descending by rankingScore
    ranked_results.sort(key=lambda x: x.get('rankingScore', 0.0), reverse=True)

    # Assign rank integer
    for idx, item in enumerate(ranked_results, 1):
        item['rank'] = idx

    return ranked_results
