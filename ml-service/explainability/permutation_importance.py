import pandas as pd
import numpy as np
import math
from sklearn.metrics import f1_score, accuracy_score

def clean_float(val):
    if val is None or pd.isna(val) or math.isnan(val) or math.isinf(val):
        return None
    return round(float(val), 4)

def calculate_permutation_importance(
    model,
    preprocessor,
    X_test: pd.DataFrame,
    y_test: np.ndarray,
    candidate_cols: list,
    n_repeats: int = 10,
    random_state: int = 42
) -> dict:
    """
    Calculates multi-repeat permutation importance on original test feature columns.
    Measures the decrease in model performance (F1 Score) when a feature's values are permuted.
    """
    perm_results = {}
    if not candidate_cols or len(X_test) == 0:
        return perm_results

    # Baseline performance on unpermuted test set
    X_test_proc = preprocessor.transform(X_test)
    y_pred_base = model.predict(X_test_proc)
    avg_mode = 'macro' if len(np.unique(y_test)) > 2 else 'binary'
    
    baseline_f1 = f1_score(y_test, y_pred_base, average=avg_mode, zero_division=0)
    baseline_acc = accuracy_score(y_test, y_pred_base)

    rng = np.random.RandomState(random_state)

    for col in candidate_cols:
        if col not in X_test.columns:
            perm_results[col] = {'meanImportance': 0.0, 'stdImportance': 0.0}
            continue

        f1_drops = []
        for _ in range(n_repeats):
            X_test_perm = X_test.copy()
            X_test_perm[col] = rng.permutation(X_test_perm[col].values)
            
            try:
                X_test_perm_proc = preprocessor.transform(X_test_perm)
                y_pred_perm = model.predict(X_test_perm_proc)
                perm_f1 = f1_score(y_test, y_pred_perm, average=avg_mode, zero_division=0)
                f1_drop = baseline_f1 - perm_f1
                f1_drops.append(f1_drop)
            except Exception:
                f1_drops.append(0.0)

        mean_imp = np.mean(f1_drops) if f1_drops else 0.0
        std_imp = np.std(f1_drops) if f1_drops else 0.0

        perm_results[col] = {
            'meanImportance': clean_float(mean_imp),
            'stdImportance': clean_float(std_imp),
            'baselineF1': clean_float(baseline_f1)
        }

    return perm_results
