import pandas as pd
import numpy as np
import math
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def clean_float(val):
    if val is None or pd.isna(val) or math.isnan(val) or math.isinf(val):
        return None
    return round(float(val), 4)

def evaluate_feature_ablation(
    model,
    preprocessor,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    y_test: np.ndarray,
    candidate_cols: list
) -> dict:
    """
    Evaluates controlled feature ablation on copy test data.
    Neutralizes candidate feature using training-derived statistics (median for numeric, mode for categorical),
    and measures performance delta and Prediction Change Rate.
    """
    ablation_results = {}
    if not candidate_cols or len(X_test) == 0:
        return ablation_results

    avg_mode = 'macro' if len(np.unique(y_test)) > 2 else 'binary'

    # Baseline performance on intact test set
    X_test_proc = preprocessor.transform(X_test)
    y_pred_base = model.predict(X_test_proc)
    
    orig_acc = accuracy_score(y_test, y_pred_base)
    orig_prec = precision_score(y_test, y_pred_base, average=avg_mode, zero_division=0)
    orig_rec = recall_score(y_test, y_pred_base, average=avg_mode, zero_division=0)
    orig_f1 = f1_score(y_test, y_pred_base, average=avg_mode, zero_division=0)
    
    orig_roc = None
    if hasattr(model, 'predict_proba'):
        try:
            y_prob_base = model.predict_proba(X_test_proc)
            if len(np.unique(y_test)) == 2:
                orig_roc = roc_auc_score(y_test, y_prob_base[:, 1])
            else:
                orig_roc = roc_auc_score(y_test, y_prob_base, multi_class='ovr')
        except Exception:
            orig_roc = None

    for col in candidate_cols:
        if col not in X_test.columns:
            continue

        X_test_ablated = X_test.copy()
        is_numeric = pd.api.types.is_numeric_dtype(X_train[col])

        # Derive neutralization statistic strictly from X_train
        if is_numeric:
            train_median = X_train[col].median()
            neutral_val = train_median if not pd.isna(train_median) else 0.0
        else:
            train_modes = X_train[col].mode()
            neutral_val = train_modes[0] if len(train_modes) > 0 else 'Missing'

        X_test_ablated[col] = neutral_val

        try:
            X_test_ablated_proc = preprocessor.transform(X_test_ablated)
            y_pred_ablated = model.predict(X_test_ablated_proc)
            
            abl_acc = accuracy_score(y_test, y_pred_ablated)
            abl_prec = precision_score(y_test, y_pred_ablated, average=avg_mode, zero_division=0)
            abl_rec = recall_score(y_test, y_pred_ablated, average=avg_mode, zero_division=0)
            abl_f1 = f1_score(y_test, y_pred_ablated, average=avg_mode, zero_division=0)

            abl_roc = None
            if hasattr(model, 'predict_proba'):
                try:
                    y_prob_ablated = model.predict_proba(X_test_ablated_proc)
                    if len(np.unique(y_test)) == 2:
                        abl_roc = roc_auc_score(y_test, y_prob_ablated[:, 1])
                    else:
                        abl_roc = roc_auc_score(y_test, y_prob_ablated, multi_class='ovr')
                except Exception:
                    abl_roc = None

            # Calculate Prediction Change Rate
            changed_count = int((y_pred_base != y_pred_ablated).sum())
            change_rate = changed_count / len(y_pred_base) if len(y_pred_base) > 0 else 0.0

            ablation_results[col] = {
                'originalF1': clean_float(orig_f1),
                'ablatedF1': clean_float(abl_f1),
                'f1Delta': clean_float(abl_f1 - orig_f1),
                'originalAccuracy': clean_float(orig_acc),
                'ablatedAccuracy': clean_float(abl_acc),
                'accuracyDelta': clean_float(abl_acc - orig_acc),
                'predictionChangeRate': clean_float(change_rate),
                'changedPredictionCount': changed_count,
                'totalSampleCount': len(y_pred_base)
            }
        except Exception as e:
            ablation_results[col] = {
                'originalF1': clean_float(orig_f1),
                'ablatedF1': None,
                'f1Delta': None,
                'originalAccuracy': clean_float(orig_acc),
                'ablatedAccuracy': None,
                'accuracyDelta': None,
                'predictionChangeRate': 0.0,
                'changedPredictionCount': 0,
                'totalSampleCount': len(y_pred_base),
                'error': str(e)
            }

    return ablation_results
