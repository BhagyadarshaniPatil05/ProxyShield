import pandas as pd
import numpy as np
import math

def clean_float(val):
    if val is None or pd.isna(val) or math.isnan(val) or math.isinf(val):
        return None
    return round(float(val), 4)

def calculate_group_metrics(y_true: np.ndarray, y_pred: np.ndarray, sensitive_features: np.ndarray) -> list:
    """
    Calculates detailed group-level statistics for each unique protected group value:
    - sampleCount, positivePredictionCount, selectionRate, truePositiveRate, falsePositiveRate, trueNegativeRate, falseNegativeRate.
    """
    df = pd.DataFrame({
        'y_true': y_true,
        'y_pred': y_pred,
        'group': sensitive_features
    })

    unique_groups = df['group'].unique()
    group_stats = []

    for grp in unique_groups:
        grp_df = df[df['group'] == grp]
        count = len(grp_df)
        
        pos_pred_count = int((grp_df['y_pred'] == 1).sum())
        selection_rate = pos_pred_count / count if count > 0 else 0.0

        # Positives (y_true == 1) and Negatives (y_true == 0)
        pos_true = grp_df[grp_df['y_true'] == 1]
        neg_true = grp_df[grp_df['y_true'] == 0]

        # True Positive Rate (TPR) = TP / (TP + FN)
        if len(pos_true) > 0:
            tpr = (pos_true['y_pred'] == 1).sum() / len(pos_true)
            fnr = (pos_true['y_pred'] == 0).sum() / len(pos_true)
        else:
            tpr = None
            fnr = None

        # False Positive Rate (FPR) = FP / (FP + TN)
        if len(neg_true) > 0:
            fpr = (neg_true['y_pred'] == 1).sum() / len(neg_true)
            tnr = (neg_true['y_pred'] == 0).sum() / len(neg_true)
        else:
            fpr = None
            tnr = None

        group_stats.append({
            'group': str(grp),
            'sampleCount': count,
            'positivePredictionCount': pos_pred_count,
            'selectionRate': clean_float(selection_rate),
            'truePositiveRate': clean_float(tpr),
            'falsePositiveRate': clean_float(fpr),
            'trueNegativeRate': clean_float(tnr),
            'falseNegativeRate': clean_float(fnr),
        })

    return group_stats

def calculate_fairness_disparities(group_stats: list, reference_group: str = None) -> dict:
    """
    Calculates fairness disparity metrics (DPD, Disparate Impact, EOD, Equalized Odds)
    relative to a reference group.
    """
    if not group_stats:
        return {}

    groups = [g['group'] for g in group_stats]

    # Select reference group if not specified or invalid
    if not reference_group or reference_group not in groups:
        reference_group = groups[0]

    ref_stat = next((g for g in group_stats if g['group'] == reference_group), group_stats[0])
    ref_sr = ref_stat['selectionRate']
    ref_tpr = ref_stat['truePositiveRate']
    ref_fpr = ref_stat['falsePositiveRate']

    comparison_groups = [g['group'] for g in group_stats if g['group'] != reference_group]

    dpd_list = []
    di_list = []
    eod_list = []
    eq_odds_tpr_list = []
    eq_odds_fpr_list = []

    for comp_group in comparison_groups:
        comp_stat = next(g for g in group_stats if g['group'] == comp_group)
        comp_sr = comp_stat['selectionRate']
        comp_tpr = comp_stat['truePositiveRate']
        comp_fpr = comp_stat['falsePositiveRate']

        # 1. Demographic Parity Difference = SelectionRate(comp) - SelectionRate(ref)
        if comp_sr is not None and ref_sr is not None:
            dpd_list.append(comp_sr - ref_sr)

        # 2. Disparate Impact = SelectionRate(comp) / SelectionRate(ref)
        if ref_sr is not None and ref_sr > 0 and comp_sr is not None:
            di_list.append(comp_sr / ref_sr)

        # 3. Equal Opportunity Difference = TPR(comp) - TPR(ref)
        if comp_tpr is not None and ref_tpr is not None:
            eod_list.append(comp_tpr - ref_tpr)

        # 4. Equalized Odds
        if comp_tpr is not None and ref_tpr is not None:
            eq_odds_tpr_list.append(comp_tpr - ref_tpr)
        if comp_fpr is not None and ref_fpr is not None:
            eq_odds_fpr_list.append(comp_fpr - ref_fpr)

    # Aggregate max magnitude disparities
    dpd_max = clean_float(max(dpd_list, key=abs)) if dpd_list else 0.0
    di_min = clean_float(min(di_list)) if di_list else None
    eod_max = clean_float(max(eod_list, key=abs)) if eod_list else None
    eq_tpr_max = clean_float(max(eq_odds_tpr_list, key=abs)) if eq_odds_tpr_list else None
    eq_fpr_max = clean_float(max(eq_odds_fpr_list, key=abs)) if eq_odds_fpr_list else None

    return {
        'referenceGroup': reference_group,
        'comparisonGroups': comparison_groups,
        'metrics': {
            'demographicParityDifference': dpd_max,
            'disparateImpact': di_min,
            'equalOpportunityDifference': eod_max,
            'equalizedOdds': {
                'tprDifference': eq_tpr_max,
                'fprDifference': eq_fpr_max
            }
        },
        'groupMetrics': group_stats
    }
