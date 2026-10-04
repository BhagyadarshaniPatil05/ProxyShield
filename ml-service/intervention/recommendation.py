import pandas as pd
import numpy as np

def generate_intervention_recommendation(
    df: pd.DataFrame,
    target_col: str,
    protected_col: str,
    selected_candidate_cols: list = None,
    proxy_capacity_data: dict = None,
    proxy_use_data: dict = None,
    feature_ablation_data: dict = None,
    fairness_impact_data: dict = None
) -> dict:
    """
    Executes Phase 9 Proxy Intervention:
    Synthesizes empirical evidence across Phase 5 (Proxy Capacity), Phase 6 (Proxy Use),
    Phase 7 (Controlled Ablation), and Phase 8 (Fairness Impact) to formulate
    explainable rule-based intervention recommendations (RECOMMEND_INTERVENTION, REVIEW_REQUIRED, DO_NOT_INTERVENE)
    and an explicit intervention configuration (REMOVE_FEATURE strategy).
    """
    if target_col not in df.columns or protected_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' or protected column '{protected_col}' not found in dataset.")

    # 1. Identify Candidate Features for Intervention
    exclude_cols = {target_col, protected_col, 'id', 'ID', 'Id', 'user_id', 'uuid', 'index'}
    all_candidates = [c for c in df.columns if c not in exclude_cols]

    if selected_candidate_cols and len(selected_candidate_cols) > 0:
        candidate_cols = [c for c in selected_candidate_cols if c in all_candidates]
    else:
        candidate_cols = all_candidates

    # Exclude constant features (zero variance)
    candidate_cols = [c for c in candidate_cols if df[c].nunique(dropna=True) > 1]

    if not candidate_cols:
        raise ValueError("No valid candidate proxy features available for intervention analysis.")

    # Index prior results by feature name if available
    cap_map = {}
    if proxy_capacity_data and 'results' in proxy_capacity_data:
        for item in proxy_capacity_data['results']:
            feat = item.get('feature') or item.get('featureName')
            if feat:
                cap_map[feat] = item

    use_map = {}
    if proxy_use_data and 'candidateFeatures' in proxy_use_data:
        for item in proxy_use_data['candidateFeatures']:
            feat = item.get('feature') or item.get('featureName')
            if feat:
                use_map[feat] = item

    abl_map = {}
    if feature_ablation_data:
        feats_list = feature_ablation_data.get('features') or feature_ablation_data.get('candidateFeatures') or []
        for item in feats_list:
            feat = item.get('feature') or item.get('featureName')
            if feat:
                abl_map[feat] = item

    impact_map = {}
    if fairness_impact_data:
        exps_list = fairness_impact_data.get('experiments') or fairness_impact_data.get('features') or []
        for item in exps_list:
            feat = item.get('feature') or item.get('featureName')
            if feat:
                impact_map[feat] = item

    candidates_evaluated = []
    recommended_for_removal = []

    for col in candidate_cols:
        cap = cap_map.get(col, {})
        use = use_map.get(col, {})
        abl = abl_map.get(col, {})
        impact = impact_map.get(col, {})

        # Extract Evidence Signals
        cap_level = cap.get('proxyCapacityLevel', 'UNKNOWN')
        cap_score = cap.get('proxyCapacityScore', 0.0)

        use_evidence = use.get('modelUseEvidence', 'INCONCLUSIVE')
        shap_val = use.get('shap', {}).get('meanAbsoluteValue', 0.0)

        change_rate = abl.get('predictionChangeRate', 0.0)
        f1_delta = abl.get('performanceDelta', {}).get('f1', 0.0) or abl.get('deltas', {}).get('f1Delta', 0.0) or 0.0

        impact_summary = impact.get('evidenceSummary', 'Minimal observed fairness change')
        dpd_delta = impact.get('fairnessDelta', {}).get('demographicParityDifference', 0.0) or 0.0
        eod_delta = impact.get('fairnessDelta', {}).get('equalOpportunityDifference', 0.0) or 0.0

        # Synthesize Evidence Strengths
        has_high_capacity = cap_level in ['HIGH POTENTIAL PROXY CAPACITY', 'MODERATE POTENTIAL PROXY CAPACITY'] or cap_score >= 0.35
        has_model_reliance = use_evidence in ['STRONG MODEL-USE EVIDENCE', 'MODERATE MODEL-USE EVIDENCE'] or shap_val >= 0.03
        has_ablation_effect = change_rate >= 0.01 or abs(f1_delta) >= 0.01
        has_disparity_reduction = (
            impact_summary == 'Reduced disparity across evaluated metrics' or
            (dpd_delta is not None and dpd_delta < -0.005) or
            (eod_delta is not None and eod_delta < -0.005)
        )
        has_mixed_fairness = impact_summary == 'Mixed fairness impact'

        # Rule-Based Recommendation Logic
        if has_high_capacity and (has_model_reliance or has_ablation_effect) and has_disparity_reduction:
            recommendation = 'RECOMMEND_INTERVENTION'
            selected_by_default = True
            rationale = (
                f"Feature '{col}' demonstrated proxy capacity ({cap_level}), model reliance evidence ({use_evidence}), "
                f"prediction shifts under ablation (Change Rate: {round(change_rate * 100, 1)}%), and a measurable "
                "reduction in protected-group fairness disparity. Excluding this feature in Phase 10 is recommended."
            )
            recommended_for_removal.append(col)
        elif has_high_capacity or has_model_reliance or has_mixed_fairness:
            recommendation = 'REVIEW_REQUIRED'
            selected_by_default = False
            rationale = (
                f"Feature '{col}' demonstrated proxy signals, but evidence across proxy use, ablation, and fairness impact is mixed "
                f"(Ablation Change Rate: {round(change_rate * 100, 1)}%, Impact: {impact_summary}). Human review is recommended before intervention."
            )
        else:
            recommendation = 'DO_NOT_INTERVENE'
            selected_by_default = False
            rationale = (
                f"Feature '{col}' shows low proxy capacity ({cap_level}), weak model reliance ({use_evidence}), and minimal fairness impact. "
                "Intervention is not indicated based on current empirical evidence."
            )

        candidates_evaluated.append({
            'feature': col,
            'featureName': col,
            'evidence': {
                'proxyCapacity': {
                    'level': cap_level,
                    'score': cap_score,
                    'mutualInformation': cap.get('mutualInformation'),
                    'predictabilityAccuracy': cap.get('predictabilityAccuracy')
                },
                'proxyUse': {
                    'evidenceLevel': use_evidence,
                    'shapMeanValue': shap_val,
                    'permutationF1Delta': use.get('permutation', {}).get('meanImportance')
                },
                'ablation': {
                    'predictionChangeRate': change_rate,
                    'f1Delta': f1_delta,
                    'neutralizationStrategy': abl.get('neutralizationStrategy')
                },
                'fairnessImpact': {
                    'evidenceSummary': impact_summary,
                    'dpdDelta': dpd_delta,
                    'eodDelta': eod_delta
                }
            },
            'recommendation': recommendation,
            'selected': selected_by_default,
            'strategy': 'REMOVE_FEATURE',
            'rationale': rationale
        })

    return {
        'targetAttribute': target_col,
        'protectedAttribute': protected_col,
        'candidateFeatureCount': len(candidates_evaluated),
        'recommendedFeatureCount': len(recommended_for_removal),
        'strategy': 'REMOVE_FEATURE',
        'selectedFeatures': recommended_for_removal,
        'decisionStatus': 'PENDING_HUMAN_REVIEW',
        'candidates': candidates_evaluated,
        'features': candidates_evaluated
    }
