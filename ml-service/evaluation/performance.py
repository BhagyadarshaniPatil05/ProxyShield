import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix
)

def evaluate_classification_performance(y_true, y_pred, y_prob=None) -> dict:
    """
    Evaluates predictive classification performance metrics on test dataset predictions.
    """
    unique_classes = np.unique(y_true)
    is_binary = len(unique_classes) <= 2
    average_mode = "binary" if is_binary else "macro"

    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, average=average_mode, zero_division=0))
    rec = float(recall_score(y_true, y_pred, average=average_mode, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, average=average_mode, zero_division=0))

    roc_auc = None
    if is_binary and y_prob is not None:
        try:
            # Handle probability array shape for binary classification
            if y_prob.ndim == 2 and y_prob.shape[1] == 2:
                prob_scores = y_prob[:, 1]
            else:
                prob_scores = y_prob
            roc_auc = float(roc_auc_score(y_true, prob_scores))
        except Exception:
            roc_auc = None

    cm = confusion_matrix(y_true, y_pred).tolist()

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "rocAuc": round(roc_auc, 4) if roc_auc is not None else None,
        "confusionMatrix": cm
    }
