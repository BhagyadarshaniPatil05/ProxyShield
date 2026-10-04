import pandas as pd
import numpy as np
import io
from typing import List, Dict, Any, Optional
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from preprocessing.pipeline import build_preprocessing_pipeline
from models.trainer import get_baseline_model
from evaluation.performance import evaluate_classification_performance
from fairness.metrics import calculate_group_metrics, calculate_fairness_disparities

from evaluation.experiment import get_canonical_experiment

def run_before_after_comparison(
    df: pd.DataFrame,
    target_col: str,
    protected_col: str,
    model_type: str,
    selected_features: List[str],
    strategy: str = "REMOVE_FEATURE",
    reference_group: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes Phase 11 Before vs After Controlled Comparison:
    Evaluates baseline model (Control) vs mitigated model (Treatment) on identical test observations (random_state=42).
    Computes before vs after performance metrics, group fairness disparities, signed deltas, and direction-aware interpretations.
    """
    if strategy != "REMOVE_FEATURE":
        raise ValueError(f"Unsupported intervention strategy '{strategy}'. Only 'REMOVE_FEATURE' is supported.")

    if not selected_features:
        raise ValueError("No intervention features provided for before vs after comparison.")

    if target_col in selected_features:
        raise ValueError("Target attribute cannot be removed as an intervention feature.")

    if protected_col in selected_features:
        raise ValueError("Protected attribute cannot be removed as a proxy intervention because it is reserved for fairness auditing.")

    if target_col not in df.columns or protected_col not in df.columns:
        raise ValueError("Target attribute or protected attribute not found in dataset.")

    for feat in selected_features:
        if feat not in df.columns:
            raise ValueError(f"Feature '{feat}' not found in dataset.")

    # 1. Run Canonical Baseline Experiment
    canonical_exp = get_canonical_experiment(
        df,
        target_col=target_col,
        protected_col=protected_col,
        model_type=model_type,
        reference_group=reference_group,
        random_state=42
    )

    df_clean = canonical_exp["df_clean"]
    X_train = canonical_exp["X_train"]
    X_test = canonical_exp["X_test"]
    baseline_feature_count = canonical_exp["modelFeatureCount"]

    y_train = canonical_exp["y_train"]
    y_test = canonical_exp["y_test"]
    A_train = canonical_exp["A_train"]
    A_test = canonical_exp["A_test"]

    # 2. Prepare Mitigated Feature Matrix (remove selected proxy features)
    X_mit_train = X_train.drop(columns=[f for f in selected_features if f in X_train.columns], errors="ignore")
    X_mit_test = X_test.drop(columns=[f for f in selected_features if f in X_test.columns], errors="ignore")
    mitigated_feature_count = X_mit_train.shape[1]

    if mitigated_feature_count == 0:
        raise ValueError("Cannot remove all features. At least one feature must remain for model training.")

    # Fit & Predict Mitigated Model
    preprocessor_mit = build_preprocessing_pipeline(X_mit_train, model_type=model_type)
    X_mit_train_proc = preprocessor_mit.fit_transform(X_mit_train)
    X_mit_test_proc = preprocessor_mit.transform(X_mit_test)

    model_mit = get_baseline_model(model_type, random_state=42)
    model_mit.fit(X_mit_train_proc, y_train)

    y_pred_mit = model_mit.predict(X_mit_test_proc)
    y_prob_mit = model_mit.predict_proba(X_mit_test_proc) if hasattr(model_mit, "predict_proba") else None

    # Baseline results from Canonical Experiment
    perf_base = canonical_exp["performance"]
    fairness_base = canonical_exp["fairness"]["rawMetrics"]
    group_stats_base = canonical_exp["fairness"]["groupStats"]

    # Mitigated Performance & Fairness
    perf_mit = evaluate_classification_performance(y_test, y_pred_mit, y_prob_mit)
    group_stats_mit = calculate_group_metrics(y_test, y_pred_mit, A_test.values)
    fairness_mit_res = calculate_fairness_disparities(group_stats_mit, reference_group=reference_group)
    fairness_mit = fairness_mit_res.get("metrics", {})

    ref_group = canonical_exp["referenceGroup"]
    comp_groups = canonical_exp["comparisonGroups"]

    # 5. Compute Predictive Performance Deltas
    perf_delta = {
        "accuracy": round(perf_mit["accuracy"] - perf_base["accuracy"], 4),
        "precision": round(perf_mit["precision"] - perf_base["precision"], 4),
        "recall": round(perf_mit["recall"] - perf_base["recall"], 4),
        "f1": round(perf_mit["f1"] - perf_base["f1"], 4),
        "rocAuc": round(perf_mit["rocAuc"] - perf_base["rocAuc"], 4) if (perf_mit["rocAuc"] is not None and perf_base["rocAuc"] is not None) else None
    }

    # 6. Compute Fairness Disparity Deltas
    dpd_base = fairness_base.get("demographicParityDifference")
    dpd_mit = fairness_mit.get("demographicParityDifference")
    dpd_delta = round(dpd_mit - dpd_base, 4) if (dpd_mit is not None and dpd_base is not None) else None

    di_base = fairness_base.get("disparateImpact")
    di_mit = fairness_mit.get("disparateImpact")
    di_delta = round(di_mit - di_base, 4) if (di_mit is not None and di_base is not None) else None

    eod_base = fairness_base.get("equalOpportunityDifference")
    eod_mit = fairness_mit.get("equalOpportunityDifference")
    eod_delta = round(eod_mit - eod_base, 4) if (eod_mit is not None and eod_base is not None) else None

    eo_tpr_base = fairness_base.get("equalizedOdds", {}).get("tprDifference")
    eo_tpr_mit = fairness_mit.get("equalizedOdds", {}).get("tprDifference")
    eo_tpr_delta = round(eo_tpr_mit - eo_tpr_base, 4) if (eo_tpr_mit is not None and eo_tpr_base is not None) else None

    eo_fpr_base = fairness_base.get("equalizedOdds", {}).get("fprDifference")
    eo_fpr_mit = fairness_mit.get("equalizedOdds", {}).get("fprDifference")
    eo_fpr_delta = round(eo_fpr_mit - eo_fpr_base, 4) if (eo_fpr_mit is not None and eo_fpr_base is not None) else None

    fairness_delta = {
        "dpd": dpd_delta,
        "di": di_delta,
        "eod": eod_delta,
        "equalizedOdds": {
            "tprDifference": eo_tpr_delta,
            "fprDifference": eo_fpr_delta
        }
    }

    # 7. Synthesize Metric-Level & Overall Direction-Aware Interpretations
    dpd_interp = _interpret_dpd(dpd_base, dpd_mit)
    di_interp = _interpret_di(di_base, di_mit)
    eod_interp = _interpret_eod(eod_base, eod_mit)
    
    fairness_interp_label, fairness_interp_desc = _interpret_overall_fairness(
        dpd_base, dpd_mit, di_base, di_mit, eod_base, eod_mit
    )

    perf_interp_label, perf_interp_desc = _interpret_overall_performance(
        perf_base, perf_mit, perf_delta
    )

    methodology_notes = [
        "Evaluated Baseline (Control) vs Mitigated Model (Treatment) on identical 20% test partition (random_state=42).",
        f"Protected attribute '{protected_col}' was strictly excluded from predictive model inputs and used exclusively for group fairness auditing.",
        "Deliberate model difference: Baseline feature set vs intervention feature set (removal of selected candidate features).",
        "This analysis provides experimental evidence for human review. It does not establish causality or constitute a legal/ethical determination of discrimination."
    ]

    return {
        "status": "COMPLETED",
        "referenceGroup": ref_group,
        "comparisonGroups": comp_groups,
        "baseline": {
            "modelType": model_type,
            "featureCount": baseline_feature_count,
            "performance": perf_base,
            "fairness": {
                "dpd": dpd_base,
                "di": di_base,
                "eod": eod_base,
                "equalizedOdds": fairness_base.get("equalizedOdds", {}),
                "groupStats": group_stats_base
            }
        },
        "mitigated": {
            "modelType": model_type,
            "strategy": strategy,
            "removedFeatures": selected_features,
            "featureCount": mitigated_feature_count,
            "performance": perf_mit,
            "fairness": {
                "dpd": dpd_mit,
                "di": di_mit,
                "eod": eod_mit,
                "equalizedOdds": fairness_mit.get("equalizedOdds", {}),
                "groupStats": group_stats_mit
            }
        },
        "performanceDelta": perf_delta,
        "fairnessDelta": fairness_delta,
        "metricInterpretations": {
            "dpd": dpd_interp,
            "di": di_interp,
            "eod": eod_interp
        },
        "fairnessInterpretation": fairness_interp_label,
        "fairnessInterpretationDetails": fairness_interp_desc,
        "performanceInterpretation": perf_interp_label,
        "performanceInterpretationDetails": perf_interp_desc,
        "methodologyNotes": methodology_notes
    }

def _interpret_dpd(before: Optional[float], after: Optional[float]) -> str:
    if before is None or after is None:
        return "Demographic parity difference metric unavailable."
    abs_before, abs_after = abs(before), abs(after)
    diff = abs_after - abs_before
    if diff < -0.001:
        return f"Reduced demographic selection disparity (DPD moved closer to parity from {before:.4f} to {after:.4f})."
    elif diff > 0.001:
        return f"Increased demographic selection disparity (DPD moved farther from parity from {before:.4f} to {after:.4f})."
    else:
        return f"No material change in demographic selection disparity (DPD before: {before:.4f}, after: {after:.4f})."

def _interpret_di(before: Optional[float], after: Optional[float]) -> str:
    if before is None or after is None:
        return "Disparate impact ratio metric unavailable."
    dist_before, dist_after = abs(before - 1.0), abs(after - 1.0)
    diff = dist_after - dist_before
    if diff < -0.001:
        return f"Disparate impact ratio moved closer to 1.0 parity (from {before:.4f} to {after:.4f})."
    elif diff > 0.001:
        return f"Disparate impact ratio moved farther from 1.0 parity (from {before:.4f} to {after:.4f})."
    else:
        return f"No material change in disparate impact ratio (DI before: {before:.4f}, after: {after:.4f})."

def _interpret_eod(before: Optional[float], after: Optional[float]) -> str:
    if before is None or after is None:
        return "Equal opportunity difference metric unavailable due to zero positive group samples."
    abs_before, abs_after = abs(before), abs(after)
    diff = abs_after - abs_before
    if diff < -0.001:
        return f"Reduced true positive rate disparity across protected groups (EOD moved from {before:.4f} to {after:.4f})."
    elif diff > 0.001:
        return f"Increased true positive rate disparity across protected groups (EOD moved from {before:.4f} to {after:.4f})."
    else:
        return f"No material change in true positive rate disparity (EOD before: {before:.4f}, after: {after:.4f})."

def _interpret_overall_fairness(
    dpd_b: Optional[float], dpd_a: Optional[float],
    di_b: Optional[float], di_a: Optional[float],
    eod_b: Optional[float], eod_a: Optional[float]
) -> tuple:
    improvements = 0
    worsenings = 0
    total_eval = 0

    if dpd_b is not None and dpd_a is not None:
        total_eval += 1
        if abs(dpd_a) < abs(dpd_b) - 0.001:
            improvements += 1
        elif abs(dpd_a) > abs(dpd_b) + 0.001:
            worsenings += 1

    if di_b is not None and di_a is not None:
        total_eval += 1
        if abs(di_a - 1.0) < abs(di_b - 1.0) - 0.001:
            improvements += 1
        elif abs(di_a - 1.0) > abs(di_b - 1.0) + 0.001:
            worsenings += 1

    if eod_b is not None and eod_a is not None:
        total_eval += 1
        if abs(eod_a) < abs(eod_b) - 0.001:
            improvements += 1
        elif abs(eod_a) > abs(eod_b) + 0.001:
            worsenings += 1

    if total_eval == 0:
        return "INCONCLUSIVE", "Available test observations do not support reliable fairness evaluation."

    if improvements > 0 and worsenings == 0:
        return "FAIRNESS IMPROVED", f"Evaluated disparity metrics consistently moved toward parity across {improvements} metrics."
    elif worsenings > 0 and improvements == 0:
        return "FAIRNESS WORSENED", f"Evaluated disparity metrics consistently moved away from parity across {worsenings} metrics."
    elif improvements > 0 and worsenings > 0:
        return "MIXED FAIRNESS RESULT", f"Fairness signals are mixed: {improvements} metric(s) improved toward parity while {worsenings} metric(s) worsened."
    else:
        return "FAIRNESS UNCHANGED", "Observed changes in demographic parity, disparate impact, and equal opportunity metrics were negligible (< 0.001)."

def _interpret_overall_performance(perf_b: dict, perf_a: dict, delta: dict) -> tuple:
    acc_d = delta.get("accuracy", 0.0) or 0.0
    f1_d = delta.get("f1", 0.0) or 0.0

    if acc_d >= -0.005 and f1_d >= -0.005:
        if acc_d > 0.005 or f1_d > 0.005:
            return "PERFORMANCE IMPROVED", f"Predictive performance increased slightly (ΔAccuracy: {acc_d:+.4f}, ΔF1: {f1_d:+.4f})."
        return "PERFORMANCE PRESERVED", f"Predictive performance remained effectively unchanged (ΔAccuracy: {acc_d:+.4f}, ΔF1: {f1_d:+.4f})."
    elif acc_d >= -0.03 and f1_d >= -0.03:
        return "MINOR PERFORMANCE TRADE-OFF", f"Mitigation caused a minor predictive performance trade-off (ΔAccuracy: {acc_d:+.4f}, ΔF1: {f1_d:+.4f})."
    else:
        return "MATERIAL PERFORMANCE DECREASE", f"Mitigation resulted in a material decrease in predictive utility (ΔAccuracy: {acc_d:+.4f}, ΔF1: {f1_d:+.4f})."
