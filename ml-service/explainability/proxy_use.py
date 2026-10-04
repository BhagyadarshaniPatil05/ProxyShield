import pandas as pd
import numpy as np
import math
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from preprocessing.pipeline import build_preprocessing_pipeline
from models.trainer import get_baseline_model
from explainability.shap_analyzer import calculate_shap_importance
from explainability.permutation_importance import calculate_permutation_importance
from explainability.ablation import evaluate_feature_ablation

def clean_float(val):
    if val is None or pd.isna(val) or math.isnan(val) or math.isinf(val):
        return None
    return round(float(val), 4)

def analyze_proxy_use(
    df: pd.DataFrame,
    target_col: str,
    protected_col: str,
    model_type: str,
    selected_candidate_cols: list = None
) -> dict:
    """
    Orchestrates Phase 6 Proxy Use / Model Reliance Analysis.
    Evaluates SHAP global importance, multi-repeat permutation importance, controlled ablation delta,
    and prediction change rate for selected candidate proxy features on the exact baseline model.
    """
    if target_col not in df.columns or protected_col not in df.columns:
        raise ValueError("Target or protected attribute not found in dataset.")

    df = df.dropna(subset=[target_col])
    
    # 1. Identify Candidate Features
    all_candidates = [c for c in df.columns if c != target_col and c != protected_col]
    if selected_candidate_cols:
        candidate_cols = [c for c in selected_candidate_cols if c in all_candidates]
    else:
        candidate_cols = all_candidates

    # Exclude constant features
    candidate_cols = [c for c in candidate_cols if df[c].nunique(dropna=True) > 1]

    # 2. Recreate Exact Deterministic Experiment (random_state=42, 80/20 split)
    y_raw = df[target_col]
    X = df.drop(columns=[target_col])

    le = LabelEncoder()
    y = le.fit_transform(y_raw)

    try:
        stratify_y = y if pd.Series(y).value_counts().min() >= 2 else None
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=stratify_y
        )
    except Exception:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

    # Preprocessing & Model Training
    preprocessor = build_preprocessing_pipeline(X, model_type=model_type)
    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)

    model = get_baseline_model(model_type, random_state=42)
    model.fit(X_train_proc, y_train)

    # 3. Execute Explainability & Model Reliance Methods
    shap_dict = calculate_shap_importance(
        model, preprocessor, X_train, X_test, candidate_cols, model_type
    )

    perm_dict = calculate_permutation_importance(
        model, preprocessor, X_test, y_test, candidate_cols, n_repeats=10, random_state=42
    )

    abl_dict = evaluate_feature_ablation(
        model, preprocessor, X_train, X_test, y_test, candidate_cols
    )

    # Rank SHAP values for features
    valid_shaps = [(col, res.get('meanAbsoluteValue', 0.0) or 0.0) for col, res in shap_dict.items()]
    valid_shaps.sort(key=lambda x: x[1], reverse=True)
    shap_rank_map = {col: idx + 1 for idx, (col, _) in enumerate(valid_shaps)}

    # Synthesize results per candidate feature
    candidate_results = []
    for col in candidate_cols:
        shap_res = shap_dict.get(col, {})
        perm_res = perm_dict.get(col, {})
        abl_res = abl_dict.get(col, {})

        shap_val = shap_res.get('meanAbsoluteValue') or 0.0
        perm_val = perm_res.get('meanImportance') or 0.0
        change_rate = abl_res.get('predictionChangeRate') or 0.0
        f1_delta = abs(abl_res.get('f1Delta') or 0.0)

        # Implementation-defined analytical classification of model reliance evidence
        if change_rate >= 0.10 or shap_val >= 0.08 or perm_val >= 0.05 or f1_delta >= 0.05:
            model_use = 'STRONG MODEL-USE EVIDENCE'
        elif change_rate >= 0.03 or shap_val >= 0.03 or perm_val >= 0.02 or f1_delta >= 0.02:
            model_use = 'MODERATE MODEL-USE EVIDENCE'
        elif change_rate > 0 or shap_val > 0 or perm_val > 0:
            model_use = 'WEAK MODEL-USE EVIDENCE'
        else:
            model_use = 'INCONCLUSIVE'

        candidate_results.append({
            'feature': col,
            'shap': {
                'meanAbsoluteValue': shap_res.get('meanAbsoluteValue'),
                'relativeImportance': shap_res.get('relativeImportance'),
                'rank': shap_rank_map.get(col, None)
            },
            'permutation': {
                'meanImportance': perm_res.get('meanImportance'),
                'stdImportance': perm_res.get('stdImportance')
            },
            'ablation': {
                'originalF1': abl_res.get('originalF1'),
                'ablatedF1': abl_res.get('ablatedF1'),
                'f1Delta': abl_res.get('f1Delta'),
                'predictionChangeRate': abl_res.get('predictionChangeRate'),
                'changedPredictionCount': abl_res.get('changedPredictionCount')
            },
            'modelUseEvidence': model_use
        })

    # Sort results by SHAP importance / modelUse rank
    candidate_results.sort(
        key=lambda x: (x.get('shap', {}).get('meanAbsoluteValue') or 0.0), reverse=True
    )

    return {
        'modelType': model_type,
        'targetAttribute': target_col,
        'protectedAttribute': protected_col,
        'candidateFeatureCount': len(candidate_results),
        'candidateFeatures': candidate_results
    }
