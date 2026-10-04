import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from preprocessing.pipeline import build_preprocessing_pipeline
from models.trainer import get_baseline_model
from fairness.metrics import calculate_group_metrics, calculate_fairness_disparities, clean_float

from evaluation.experiment import get_canonical_experiment

def run_fairness_impact_analysis(
    df: pd.DataFrame,
    target_col: str,
    protected_col: str,
    model_type: str = 'random_forest',
    selected_candidate_cols: list = None,
    reference_group: str = None
) -> dict:
    """
    Executes Phase 8 Fairness Impact Analysis:
    Measures the shift in protected-group fairness metrics (DPD, Disparate Impact, EOD, Equalized Odds)
    when candidate proxy features are neutralized (one feature at a time) on copy test observations
    using the EXACT intact baseline model from Phase 3 without retraining.
    """
    if target_col not in df.columns or protected_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' or protected column '{protected_col}' not found in dataset.")

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
    y_test = canonical_exp["y_test"]
    A_test = canonical_exp["A_test"]
    model = canonical_exp["model"]
    preprocessor = canonical_exp["preprocessor"]

    # Candidate Features for Ablation (exclude target, protected, ID columns)
    exclude_cols = {target_col, protected_col, 'id', 'ID', 'Id', 'user_id', 'uuid', 'index'}
    all_candidates = [c for c in df_clean.columns if c not in exclude_cols]

    if selected_candidate_cols and len(selected_candidate_cols) > 0:
        candidate_cols = [c for c in selected_candidate_cols if c in all_candidates]
    else:
        candidate_cols = all_candidates

    # Exclude constant features
    candidate_cols = [c for c in candidate_cols if df_clean[c].nunique(dropna=True) > 1]

    if not candidate_cols:
        raise ValueError("No valid candidate proxy features available for fairness impact analysis.")

    # Baseline Fairness Metrics from Canonical Experiment
    group_stats_base = canonical_exp["fairness"]["groupStats"]
    fairness_res_base = canonical_exp["fairness"]["rawMetrics"]
    ref_group_resolved = canonical_exp["referenceGroup"]
    comp_groups_resolved = canonical_exp["comparisonGroups"]

    base_dpd = fairness_res_base.get('demographicParityDifference')
    base_di = fairness_res_base.get('disparateImpact')
    base_eod = fairness_res_base.get('equalOpportunityDifference')
    base_eq = fairness_res_base.get('equalizedOdds', {})
    base_eq_tpr = base_eq.get('tprDifference')
    base_eq_fpr = base_eq.get('fprDifference')

    fairness_experiments = []

    # 4. Perform One-Feature-at-a-Time Fairness Impact Analysis
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

            group_stats_ablated = calculate_group_metrics(y_test, y_pred_ablated, A_test.values)
            fairness_res_ablated = calculate_fairness_disparities(
                group_stats_ablated, reference_group=ref_group_resolved
            )
            abl_metrics = fairness_res_ablated.get('metrics', {})

            abl_dpd = abl_metrics.get('demographicParityDifference')
            abl_di = abl_metrics.get('disparateImpact')
            abl_eod = abl_metrics.get('equalOpportunityDifference')
            abl_eq = abl_metrics.get('equalizedOdds', {})
            abl_eq_tpr = abl_eq.get('tprDifference')
            abl_eq_fpr = abl_eq.get('fprDifference')

            # Calculate Signed Deltas (Ablated - Baseline)
            delta_dpd = (abl_dpd - base_dpd) if (abl_dpd is not None and base_dpd is not None) else None
            delta_di = (abl_di - base_di) if (abl_di is not None and base_di is not None) else None
            delta_eod = (abl_eod - base_eod) if (abl_eod is not None and base_eod is not None) else None
            delta_eq_tpr = (abl_eq_tpr - base_eq_tpr) if (abl_eq_tpr is not None and base_eq_tpr is not None) else None
            delta_eq_fpr = (abl_eq_fpr - base_eq_fpr) if (abl_eq_fpr is not None and base_eq_fpr is not None) else None

            # Determine Metric Directions (Improved / Worsened / Unchanged)
            # DPD: smaller absolute magnitude -> lower selection-rate disparity
            dpd_improved = (
                abs(abl_dpd) < abs(base_dpd) - 0.005
                if (abl_dpd is not None and base_dpd is not None) else False
            )
            dpd_worsened = (
                abs(abl_dpd) > abs(base_dpd) + 0.005
                if (abl_dpd is not None and base_dpd is not None) else False
            )

            # DI: value closer to 1.0 -> more equal selection rates
            di_improved = (
                abs(abl_di - 1.0) < abs(base_di - 1.0) - 0.005
                if (abl_di is not None and base_di is not None) else False
            )
            di_worsened = (
                abs(abl_di - 1.0) > abs(base_di - 1.0) + 0.005
                if (abl_di is not None and base_di is not None) else False
            )

            # EOD: smaller absolute magnitude -> lower TPR disparity
            eod_improved = (
                abs(abl_eod) < abs(base_eod) - 0.005
                if (abl_eod is not None and base_eod is not None) else False
            )
            eod_worsened = (
                abs(abl_eod) > abs(base_eod) + 0.005
                if (abl_eod is not None and base_eod is not None) else False
            )

            # Synthesize Transparent Interpretation
            improvements = sum([dpd_improved, di_improved, eod_improved])
            worsenings = sum([dpd_worsened, di_worsened, eod_worsened])

            if improvements > 0 and worsenings == 0:
                obs = (
                    f"Neutralizing '{col}' consistently reduced group disparity across evaluated metrics "
                    f"(DPD: {clean_float(base_dpd)} -> {clean_float(abl_dpd)}, EOD: {clean_float(base_eod)} -> {clean_float(abl_eod)}). "
                    "This demonstrates observed fairness impact, but does not establish causality or an ethical judgment."
                )
                evidence_summary = "Reduced disparity across evaluated metrics"
            elif worsenings > 0 and improvements == 0:
                obs = (
                    f"Neutralizing '{col}' increased group disparity across evaluated metrics "
                    f"(DPD: {clean_float(base_dpd)} -> {clean_float(abl_dpd)}, EOD: {clean_float(base_eod)} -> {clean_float(abl_eod)})."
                )
                evidence_summary = "Increased disparity across evaluated metrics"
            elif improvements > 0 and worsenings > 0:
                obs = (
                    f"Neutralizing '{col}' produced mixed fairness effects across metrics. Selection-rate disparity changed "
                    f"(DPD: {clean_float(base_dpd)} -> {clean_float(abl_dpd)}), while TPR disparity changed "
                    f"(EOD: {clean_float(base_eod)} -> {clean_float(abl_eod)}). No single fairness conclusion applies."
                )
                evidence_summary = "Mixed fairness impact"
            else:
                obs = (
                    f"Neutralizing '{col}' produced minimal measurable change in protected group fairness metrics "
                    f"(ΔDPD: {clean_float(delta_dpd)}, ΔEOD: {clean_float(delta_eod)})."
                )
                evidence_summary = "Minimal observed fairness change"

            fairness_experiments.append({
                'feature': col,
                'featureName': col,
                'featureType': feat_type,
                'neutralizationStrategy': neutral_strat,
                'neutralizationValue': str(neutral_val),
                'baselineFairness': {
                    'demographicParityDifference': clean_float(base_dpd),
                    'disparateImpact': clean_float(base_di),
                    'equalOpportunityDifference': clean_float(base_eod),
                    'equalizedOdds': {
                        'tprDifference': clean_float(base_eq_tpr),
                        'fprDifference': clean_float(base_eq_fpr)
                    }
                },
                'ablatedFairness': {
                    'demographicParityDifference': clean_float(abl_dpd),
                    'disparateImpact': clean_float(abl_di),
                    'equalOpportunityDifference': clean_float(abl_eod),
                    'equalizedOdds': {
                        'tprDifference': clean_float(abl_eq_tpr),
                        'fprDifference': clean_float(abl_eq_fpr)
                    }
                },
                'fairnessDelta': {
                    'demographicParityDifference': clean_float(delta_dpd),
                    'disparateImpact': clean_float(delta_di),
                    'equalOpportunityDifference': clean_float(delta_eod),
                    'equalizedOdds': {
                        'tprDifference': clean_float(delta_eq_tpr),
                        'fprDifference': clean_float(delta_eq_fpr)
                    }
                },
                'groupStatisticsBaseline': group_stats_base,
                'groupStatisticsAblated': group_stats_ablated,
                'evidenceSummary': evidence_summary,
                'interpretation': obs,
                'observations': obs
            })

        except Exception as e:
            fairness_experiments.append({
                'feature': col,
                'featureName': col,
                'featureType': feat_type,
                'neutralizationStrategy': neutral_strat,
                'error': f"Fairness impact execution error: {str(e)}"
            })

    return {
        'modelType': model_type,
        'targetAttribute': target_col,
        'protectedAttribute': protected_col,
        'referenceGroup': ref_group_resolved,
        'comparisonGroups': comp_groups_resolved,
        'testRows': len(X_test),
        'candidateFeatureCount': len(fairness_experiments),
        'baselineFairness': {
            'demographicParityDifference': clean_float(base_dpd),
            'disparateImpact': clean_float(base_di),
            'equalOpportunityDifference': clean_float(base_eod),
            'equalizedOdds': {
                'tprDifference': clean_float(base_eq_tpr),
                'fprDifference': clean_float(base_eq_fpr)
            }
        },
        'baselineGroupMetrics': group_stats_base,
        'experiments': fairness_experiments,
        'features': fairness_experiments
    }
