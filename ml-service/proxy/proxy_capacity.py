import pandas as pd
import numpy as np
import math
import re
from sklearn.feature_selection import mutual_info_classif
from sklearn.preprocessing import OrdinalEncoder

from proxy.association import calculate_categorical_association, calculate_numerical_association, clean_float
from proxy.predictability import evaluate_protected_predictability
from proxy.ranking import calculate_ranking_scores

def is_identifier_column(series: pd.Series, col_name: str) -> bool:
    """
    Detects suspicious high-cardinality identifier-like columns.
    """
    name_lower = col_name.lower()
    if re.search(r'^(id|_id|uuid|guid|ssn|index|seq_num)$', name_lower):
        return True
    
    n_unique = series.nunique(dropna=True)
    n_total = len(series.dropna())
    
    if n_total > 50 and (n_unique / n_total) > 0.90:
        return True
    return False

def compute_mutual_information_all(df: pd.DataFrame, candidate_cols: list, protected_col: str) -> dict:
    """
    Computes mutual information MI(X, A) for all candidate features X relative to protected attribute A.
    """
    mi_map = {}
    if not candidate_cols:
        return mi_map

    sub_df = df[candidate_cols + [protected_col]].dropna(subset=[protected_col])
    if len(sub_df) < 5:
        return {col: 0.0 for col in candidate_cols}

    # Encode target A
    a_encoded = pd.factorize(sub_df[protected_col].astype(str))[0]

    # Preprocess candidates for scikit-learn mutual_info_classif
    X_processed = pd.DataFrame(index=sub_df.index)
    discrete_features_mask = []

    for col in candidate_cols:
        series = sub_df[col]
        is_num = pd.api.types.is_numeric_dtype(series)
        
        if is_num:
            X_processed[col] = series.fillna(series.mean() if not pd.isna(series.mean()) else 0)
            discrete_features_mask.append(False)
        else:
            encoder = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
            vals = series.astype(str).values.reshape(-1, 1)
            X_processed[col] = encoder.fit_transform(vals).ravel()
            discrete_features_mask.append(True)

    try:
        mi_scores = mutual_info_classif(
            X_processed,
            a_encoded,
            discrete_features=discrete_features_mask,
            random_state=42
        )
        for col, mi_val in zip(candidate_cols, mi_scores):
            mi_map[col] = clean_float(mi_val)
    except Exception:
        for col in candidate_cols:
            mi_map[col] = 0.0

    return mi_map

def analyze_proxy_capacity(df: pd.DataFrame, target_col: str, protected_col: str) -> dict:
    """
    Orchestrates Phase 5 Proxy Capacity Analysis across all candidate features in a dataset.
    """
    if protected_col not in df.columns:
        raise ValueError(f"Protected attribute '{protected_col}' not found in dataset.")
    if target_col not in df.columns:
        raise ValueError(f"Target attribute '{target_col}' not found in dataset.")

    # 1. Candidate Proxy Feature Selection (Excluding protected attribute and target outcome)
    candidate_cols = [c for c in df.columns if c != protected_col and c != target_col]

    # Compute Mutual Information across candidates
    mi_map = compute_mutual_information_all(df, candidate_cols, protected_col)

    feature_results = []
    baseline_pred_benchmark = None

    for col in candidate_cols:
        series = df[col]
        is_numeric = pd.api.types.is_numeric_dtype(series)
        data_type = 'numerical' if is_numeric else 'categorical'

        # Check Constant / Near-Constant
        if series.nunique(dropna=True) <= 1:
            feature_results.append({
                'feature': col,
                'dataType': data_type,
                'association': {
                    'method': 'cramers_v' if not is_numeric else 'anova_f_test',
                    'value': 0.0,
                    'pValue': 1.0,
                    'status': 'NOT_INFORMATIVE',
                    'explanation': 'Constant feature with zero variance.'
                },
                'mutualInformation': 0.0,
                'predictability': {
                    'model': 'logistic_regression',
                    'accuracy': None,
                    'balancedAccuracy': None,
                    'precision': None,
                    'recall': None,
                    'f1': None,
                    'rocAuc': None
                },
                'status': 'NOT_INFORMATIVE',
                'explanation': 'Feature has zero variance across dataset observations.'
            })
            continue

        # Check High-Cardinality Identifier Safeguards
        if is_identifier_column(series, col):
            feature_results.append({
                'feature': col,
                'dataType': data_type,
                'association': {
                    'method': 'cramers_v' if not is_numeric else 'anova_f_test',
                    'value': 0.0,
                    'pValue': 1.0,
                    'status': 'IDENTIFIER_EXCLUDED',
                    'explanation': 'High-cardinality unique record identifier.'
                },
                'mutualInformation': 0.0,
                'predictability': {
                    'model': 'logistic_regression',
                    'accuracy': None,
                    'balancedAccuracy': None,
                    'precision': None,
                    'recall': None,
                    'f1': None,
                    'rocAuc': None
                },
                'status': 'IDENTIFIER_EXCLUDED',
                'explanation': 'Excluded from proxy ranking because it appears to be a unique record identifier or sequence key.'
            })
            continue

        # 2. Statistical Association
        if is_numeric:
            assoc_res = calculate_numerical_association(series, df[protected_col])
        else:
            assoc_res = calculate_categorical_association(series, df[protected_col])

        # 3. Protected-Attribute Predictability (X -> A)
        pred_res = evaluate_protected_predictability(df, col, protected_col)
        
        if baseline_pred_benchmark is None and 'baselinePredictability' in pred_res:
            baseline_pred_benchmark = pred_res['baselinePredictability']

        mi_val = mi_map.get(col, 0.0)

        feature_results.append({
            'feature': col,
            'dataType': data_type,
            'association': {
                'method': assoc_res.get('method', 'unknown'),
                'value': assoc_res.get('value'),
                'pValue': assoc_res.get('pValue'),
                'status': assoc_res.get('status', 'ANALYZED'),
                'explanation': assoc_res.get('explanation', '')
            },
            'mutualInformation': mi_val,
            'predictability': {
                'model': pred_res.get('model', 'logistic_regression'),
                'accuracy': pred_res.get('accuracy'),
                'balancedAccuracy': pred_res.get('balancedAccuracy'),
                'precision': pred_res.get('precision'),
                'recall': pred_res.get('recall'),
                'f1': pred_res.get('f1'),
                'rocAuc': pred_res.get('rocAuc')
            },
            'status': pred_res.get('status', 'ANALYZED'),
            'explanation': pred_res.get('explanation', '')
        })

    # Rank features based on metrics
    ranked_results = calculate_ranking_scores(feature_results)

    return {
        'protectedAttribute': protected_col,
        'targetAttribute': target_col,
        'candidateFeatureCount': len(candidate_cols),
        'baselinePredictability': baseline_pred_benchmark or {'accuracy': None, 'f1': None},
        'results': ranked_results
    }
