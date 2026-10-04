import pandas as pd
import numpy as np
import math
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

from preprocessing.pipeline import build_preprocessing_pipeline
from models.trainer import get_baseline_model

def clean_float(val):
    if val is None or pd.isna(val) or math.isnan(val) or math.isinf(val):
        return None
    return round(float(val), 4)

def run_controlled_feature_ablation(
    df: pd.DataFrame,
    target_col: str,
    protected_col: str,
    model_type: str,
    selected_candidate_cols: list = None
) -> dict:
    """
    Orchestrates Phase 7 Controlled Feature Ablation experiments.
    Evaluates the exact trained baseline model on the test split when selected candidate
    proxy features are neutralized using training-derived statistics (median for numeric, mode for categorical).
    """
    # 1. Validation & Input Sanitization
    if target_col not in df.columns or protected_col not in df.columns:
        raise ValueError("Target or protected attribute not found in dataset.")

    df = df.dropna(subset=[target_col])
    
    # Candidate features exclude protected attribute and target outcome strictly
    all_candidates = [c for c in df.columns if c != target_col and c != protected_col]
    
    if selected_candidate_cols:
        candidate_cols = [c for c in selected_candidate_cols if c in all_candidates]
    else:
        candidate_cols = all_candidates

    # Exclude constant features
    candidate_cols = [c for c in candidate_cols if df[c].nunique(dropna=True) > 1]

    if not candidate_cols:
        raise ValueError("No valid candidate proxy features available for ablation analysis.")

    # 2. Recreate Exact Deterministic Baseline Experiment (random_state=42, 80/20 split)
    y_raw = df[target_col]
    X = df.drop(columns=[target_col])

    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    avg_mode = 'macro' if len(np.unique(y)) > 2 else 'binary'

    try:
        stratify_y = y if pd.Series(y).value_counts().min() >= 2 else None
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=stratify_y
        )
    except Exception:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

    # Fit Preprocessor strictly on X_train and train Baseline Model
    preprocessor = build_preprocessing_pipeline(X, model_type=model_type)
    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)

    model = get_baseline_model(model_type, random_state=42)
    model.fit(X_train_proc, y_train)

    # 3. Evaluate Intact Baseline Predictions & Metrics
    y_pred_base = model.predict(X_test_proc)
    
    base_acc = accuracy_score(y_test, y_pred_base)
    base_prec = precision_score(y_test, y_pred_base, average=avg_mode, zero_division=0)
    base_rec = recall_score(y_test, y_pred_base, average=avg_mode, zero_division=0)
    base_f1 = f1_score(y_test, y_pred_base, average=avg_mode, zero_division=0)
    
    base_roc = None
    y_prob_base = None
    if hasattr(model, 'predict_proba'):
        try:
            y_prob_base = model.predict_proba(X_test_proc)
            if len(np.unique(y)) == 2:
                base_roc = roc_auc_score(y_test, y_prob_base[:, 1])
            else:
                base_roc = roc_auc_score(y_test, y_prob_base, multi_class='ovr')
        except Exception:
            base_roc = None

    base_cm = confusion_matrix(y_test, y_pred_base).tolist()
    base_sel_rate = float((y_pred_base == 1).sum() / len(y_pred_base)) if len(y_pred_base) > 0 else 0.0

    ablation_experiments = []

    # 4. Perform One-Feature-at-a-Time Controlled Ablation
    for col in candidate_cols:
        if col not in X_test.columns:
            continue

        X_test_ablated = X_test.copy()
        is_numeric = pd.api.types.is_numeric_dtype(X_train[col])
        feat_type = 'numerical' if is_numeric else 'categorical'

        # Derive neutralization value strictly from X_train
        if is_numeric:
            train_median = X_train[col].median()
            neutral_val = train_median if not pd.isna(train_median) else 0.0
            neutral_strat = 'training_set_median'
        else:
            train_modes = X_train[col].mode()
            neutral_val = train_modes[0] if len(train_modes) > 0 else 'Missing'
            neutral_strat = 'training_set_mode'

        X_test_ablated[col] = neutral_val

        try:
            X_test_ablated_proc = preprocessor.transform(X_test_ablated)
            y_pred_ablated = model.predict(X_test_ablated_proc)

            abl_acc = accuracy_score(y_test, y_pred_ablated)
            abl_prec = precision_score(y_test, y_pred_ablated, average=avg_mode, zero_division=0)
            abl_rec = recall_score(y_test, y_pred_ablated, average=avg_mode, zero_division=0)
            abl_f1 = f1_score(y_test, y_pred_ablated, average=avg_mode, zero_division=0)

            abl_roc = None
            y_prob_ablated = None
            if hasattr(model, 'predict_proba'):
                try:
                    y_prob_ablated = model.predict_proba(X_test_ablated_proc)
                    if len(np.unique(y)) == 2:
                        abl_roc = roc_auc_score(y_test, y_prob_ablated[:, 1])
                    else:
                        abl_roc = roc_auc_score(y_test, y_prob_ablated, multi_class='ovr')
                except Exception:
                    abl_roc = None

            abl_cm = confusion_matrix(y_test, y_pred_ablated).tolist()
            abl_sel_rate = float((y_pred_ablated == 1).sum() / len(y_pred_ablated)) if len(y_pred_ablated) > 0 else 0.0

            # Calculate Prediction Change Rate & Count
            changed_count = int((y_pred_base != y_pred_ablated).sum())
            change_rate = changed_count / len(y_pred_base) if len(y_pred_base) > 0 else 0.0

            # Calculate Mean Probability Change (if probability prediction available)
            mean_prob_change = None
            if y_prob_base is not None and y_prob_ablated is not None:
                try:
                    mean_prob_change = float(np.mean(np.abs(y_prob_base - y_prob_ablated)))
                except Exception:
                    mean_prob_change = None

            # Deltas = Ablated - Baseline
            delta_acc = abl_acc - base_acc
            delta_prec = abl_prec - base_prec
            delta_rec = abl_rec - base_rec
            delta_f1 = abl_f1 - base_f1
            delta_roc = (abl_roc - base_roc) if (abl_roc is not None and base_roc is not None) else None
            delta_sel_rate = abl_sel_rate - base_sel_rate

            # Formulate Analytical Observations
            if change_rate >= 0.10 or abs(delta_f1) >= 0.05:
                obs = f"Neutralizing '{col}' produced a strong observable change (Prediction Change: {round(change_rate * 100, 1)}%, ΔF1: {round(delta_f1, 4)}), demonstrating model dependence on this feature."
            elif change_rate >= 0.03 or abs(delta_f1) >= 0.02:
                obs = f"Neutralizing '{col}' produced a moderate observable change (Prediction Change: {round(change_rate * 100, 1)}%, ΔF1: {round(delta_f1, 4)})."
            else:
                obs = f"Neutralizing '{col}' produced minimal aggregate output change (Prediction Change: {round(change_rate * 100, 1)}%). Redundant or correlated features may preserve similar information."

            ablation_experiments.append({
                'feature': col,
                'featureName': col,
                'featureType': feat_type,
                'neutralizationStrategy': neutral_strat,
                'neutralizationValue': str(neutral_val),
                'baselinePerformance': {
                    'accuracy': clean_float(base_acc),
                    'precision': clean_float(base_prec),
                    'recall': clean_float(base_rec),
                    'f1': clean_float(base_f1),
                    'rocAuc': clean_float(base_roc)
                },
                'ablatedPerformance': {
                    'accuracy': clean_float(abl_acc),
                    'precision': clean_float(abl_prec),
                    'recall': clean_float(abl_rec),
                    'f1': clean_float(abl_f1),
                    'rocAuc': clean_float(abl_roc)
                },
                'performanceDelta': {
                    'accuracy': clean_float(delta_acc),
                    'precision': clean_float(delta_prec),
                    'recall': clean_float(delta_rec),
                    'f1': clean_float(delta_f1),
                    'rocAuc': clean_float(delta_roc)
                },
                'deltas': {
                    'accuracyDelta': clean_float(delta_acc),
                    'precisionDelta': clean_float(delta_prec),
                    'recallDelta': clean_float(delta_rec),
                    'f1Delta': clean_float(delta_f1),
                    'rocAucDelta': clean_float(delta_roc)
                },
                'baselineSelectionRate': clean_float(base_sel_rate),
                'ablatedSelectionRate': clean_float(abl_sel_rate),
                'selectionRateDelta': clean_float(delta_sel_rate),
                'predictionChangeRate': clean_float(change_rate),
                'changedPredictionCount': changed_count,
                'totalSampleCount': len(y_pred_base),
                'meanProbabilityChange': clean_float(mean_prob_change),
                'baselineConfusionMatrix': base_cm,
                'ablatedConfusionMatrix': abl_cm,
                'analyticalObservation': obs,
                'observations': obs
            })

        except Exception as e:
            ablation_experiments.append({
                'featureName': col,
                'featureType': feat_type,
                'neutralizationStrategy': neutral_strat,
                'neutralizationValue': 'N/A',
                'error': f"Ablation execution error: {str(e)}"
            })

    # Sort experiments by predictionChangeRate descending
    ablation_experiments.sort(key=lambda x: (x.get('predictionChangeRate') or 0.0), reverse=True)

    return {
        'modelType': model_type,
        'targetAttribute': target_col,
        'protectedAttribute': protected_col,
        'testRows': len(X_test),
        'testSetSize': len(X_test),
        'candidateFeatureCount': len(ablation_experiments),
        'baselinePerformance': {
            'accuracy': clean_float(base_acc),
            'precision': clean_float(base_prec),
            'recall': clean_float(base_rec),
            'f1': clean_float(base_f1),
            'rocAuc': clean_float(base_roc),
            'confusionMatrix': base_cm
        },
        'features': ablation_experiments,
        'candidateFeatures': ablation_experiments
    }
