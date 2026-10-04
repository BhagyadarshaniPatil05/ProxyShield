import pandas as pd
import numpy as np
import shap
import math

def clean_float(val):
    if val is None or pd.isna(val) or math.isnan(val) or math.isinf(val):
        return None
    return round(float(val), 4)

def calculate_shap_importance(
    model,
    preprocessor,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    candidate_cols: list,
    model_type: str,
    max_samples: int = 500
) -> dict:
    """
    Calculates SHAP global feature importance on test set observations.
    Aggregates transformed one-hot encoded feature SHAP values back to original source candidate columns.
    """
    shap_results = {}
    if not candidate_cols or len(X_test) == 0:
        return shap_results

    # Preprocess train and test data
    X_train_proc = preprocessor.transform(X_train)
    X_test_proc = preprocessor.transform(X_test)

    # Apply sampling limit if test set is large
    if X_test_proc.shape[0] > max_samples:
        indices = np.random.RandomState(42).choice(X_test_proc.shape[0], max_samples, replace=False)
        X_test_proc = X_test_proc[indices]

    # Retrieve transformed column feature names
    try:
        feature_names = preprocessor.get_feature_names_out()
    except Exception:
        feature_names = [f"feature_{i}" for i in range(X_test_proc.shape[1])]

    # Select model-appropriate SHAP Explainer
    try:
        if model_type in ['decision_tree', 'random_forest', 'gradient_boosting', 'xgboost']:
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_test_proc)
        else:
            # Linear model / Logistic Regression
            try:
                explainer = shap.LinearExplainer(model, X_train_proc)
                shap_values = explainer.shap_values(X_test_proc)
            except Exception:
                explainer = shap.Explainer(model, X_train_proc)
                shap_values = explainer(X_test_proc).values

        # Handle list or multi-class array output structure
        if isinstance(shap_values, list):
            # Binary/Multiclass list of arrays: select positive class (index 1) if available
            sv = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        elif hasattr(shap_values, 'values'):
            sv = shap_values.values
            if sv.ndim == 3:
                sv = sv[:, :, 1] if sv.shape[2] > 1 else sv[:, :, 0]
        else:
            sv = shap_values
            if sv.ndim == 3:
                sv = sv[:, :, 1] if sv.shape[2] > 1 else sv[:, :, 0]

        # Calculate mean absolute SHAP for each transformed feature column
        mean_abs_transformed = np.mean(np.abs(sv), axis=0)

        # Aggregate transformed SHAP values back to original candidate columns
        col_shap_map = {col: 0.0 for col in candidate_cols}

        for idx, feat_name in enumerate(feature_names):
            feat_val = mean_abs_transformed[idx] if idx < len(mean_abs_transformed) else 0.0
            
            matched_col = None
            for col in candidate_cols:
                # Match col name in feature_names (e.g. num__col, cat__col_val)
                clean_feat = feat_name.replace('cat__', '').replace('num__', '').replace('remainder__', '')
                if clean_feat == col or clean_feat.startswith(f"{col}_") or f"_{col}_" in feat_name:
                    matched_col = col
                    break
            
            if matched_col:
                col_shap_map[matched_col] += float(feat_val)

        # Compute relative importance percentage
        total_shap = sum(col_shap_map.values())
        max_shap = max(col_shap_map.values()) if col_shap_map and max(col_shap_map.values()) > 0 else 1.0

        for col in candidate_cols:
            val = col_shap_map.get(col, 0.0)
            shap_results[col] = {
                'meanAbsoluteValue': clean_float(val),
                'relativeImportance': clean_float(val / max_shap) if max_shap > 0 else 0.0
            }

    except Exception as e:
        for col in candidate_cols:
            shap_results[col] = {
                'meanAbsoluteValue': None,
                'relativeImportance': None,
                'error': str(e)
            }

    return shap_results
