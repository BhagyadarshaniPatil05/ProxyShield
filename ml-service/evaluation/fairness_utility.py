import math
from typing import List, Dict, Any, Optional

DEFAULT_CHANGE_THRESHOLD = 0.01

def run_fairness_utility_analysis(
    before_after_result: Dict[str, Any],
    threshold: float = DEFAULT_CHANGE_THRESHOLD
) -> Dict[str, Any]:
    """
    Executes Phase 12 Fairness-Utility Trade-off Analysis.
    Evaluates fairness changes and predictive utility changes from existing Phase 11 beforeAfterResult.
    Performs direction-aware metric classifications, threshold filtering, counts, and trade-off classification.
    """
    if not before_after_result or not isinstance(before_after_result, dict):
        raise ValueError("Invalid or missing beforeAfterResult object.")

    status = before_after_result.get("status")
    if status != "COMPLETED":
        raise ValueError(f"Cannot run Fairness-Utility analysis on beforeAfterResult with status '{status}'. Must be 'COMPLETED'.")

    baseline = before_after_result.get("baseline", {})
    mitigated = before_after_result.get("mitigated", {})

    baseline_perf = baseline.get("performance", {})
    mitigated_perf = mitigated.get("performance", {})
    baseline_fairness = baseline.get("fairness", {})
    mitigated_fairness = mitigated.get("fairness", {})

    if not baseline_perf or not mitigated_perf or not baseline_fairness or not mitigated_fairness:
        raise ValueError("Incomplete baseline or mitigated results in beforeAfterResult object.")

    # Helper function to find float value by candidate keys
    def extract_val(fair_dict, keys, nested_keys=None, default_val=0.0):
        if not isinstance(fair_dict, dict):
            return default_val
        # Try direct keys
        for k in keys:
            if k in fair_dict and fair_dict[k] is not None and not isinstance(fair_dict[k], dict):
                try:
                    return float(fair_dict[k])
                except (ValueError, TypeError):
                    pass
        # Try nested keys
        if nested_keys:
            for parent_key, child_key in nested_keys:
                parent = fair_dict.get(parent_key)
                if isinstance(parent, dict):
                    val = parent.get(child_key)
                    if val is not None:
                        try:
                            return float(val)
                        except (ValueError, TypeError):
                            pass
        return default_val

    # 1. Fairness Metrics Analysis
    fairness_configs = [
        ("DPD", ["dpd", "demographicParityDifference", "demographic_parity_difference"], None, 0.0),
        ("DI", ["di", "disparateImpactRatio", "disparate_impact_ratio", "disparateImpact"], None, 1.0),
        ("EOD", ["eod", "equalOpportunityDifference", "equal_opportunity_difference"], None, 0.0),
        ("EO TPR", ["equalizedOddsTprDifference", "equalized_odds_tpr_difference", "eoTpr"], [("equalizedOdds", "tprDifference"), ("equalized_odds", "tpr_difference"), ("equalizedOdds", "tpr")], 0.0),
        ("EO FPR", ["equalizedOddsFprDifference", "equalized_odds_fpr_difference", "eoFpr"], [("equalizedOdds", "fprDifference"), ("equalized_odds", "fpr_difference"), ("equalizedOdds", "fpr")], 0.0)
    ]

    fairness_metrics_list = []
    for display_name, keys, nested_keys, default_val in fairness_configs:
        b_val = extract_val(baseline_fairness, keys, nested_keys, default_val=default_val)
        m_val = extract_val(mitigated_fairness, keys, nested_keys, default_val=default_val)

        b_val = float(b_val) if b_val is not None else default_val
        m_val = float(m_val) if m_val is not None else default_val
        delta = round(m_val - b_val, 4)

        if display_name == "DI":
            dist_before = abs(b_val - 1.0)
            dist_after = abs(m_val - 1.0)

            if abs(delta) < threshold:
                direction = "UNCHANGED"
                interpretation = f"Disparate impact ratio change ({delta:+.4f}) is negligible within threshold ±{threshold:.4f}"
            elif dist_after < dist_before - 1e-9:
                direction = "IMPROVED"
                interpretation = f"Disparate impact ratio moved closer to parity 1.0 (from {b_val:.4f} to {m_val:.4f})"
            elif dist_after > dist_before + 1e-9:
                direction = "WORSENED"
                interpretation = f"Disparate impact ratio moved away from parity 1.0 (from {b_val:.4f} to {m_val:.4f})"
            else:
                direction = "UNCHANGED"
                interpretation = f"Disparate impact ratio unchanged at {b_val:.4f}"
        else:
            dist_before = abs(b_val)
            dist_after = abs(m_val)

            if abs(delta) < threshold:
                direction = "UNCHANGED"
                interpretation = f"Disparity metric change ({delta:+.4f}) is negligible within threshold ±{threshold:.4f}"
            elif dist_after < dist_before - 1e-9:
                direction = "IMPROVED"
                interpretation = f"Disparity reduced toward zero (from {b_val:.4f} to {m_val:.4f})"
            elif dist_after > dist_before + 1e-9:
                direction = "WORSENED"
                interpretation = f"Disparity increased away from zero (from {b_val:.4f} to {m_val:.4f})"
            else:
                direction = "UNCHANGED"
                interpretation = f"Disparity metric unchanged at {b_val:.4f}"

        fairness_metrics_list.append({
            "metric": display_name,
            "key": display_name.lower().replace(" ", "_"),
            "before": round(b_val, 4),
            "after": round(m_val, 4),
            "delta": delta,
            "direction": direction,
            "interpretation": interpretation
        })

    fairness_improved_count = sum(1 for m in fairness_metrics_list if m["direction"] == "IMPROVED")
    fairness_worsened_count = sum(1 for m in fairness_metrics_list if m["direction"] == "WORSENED")
    fairness_unchanged_count = sum(1 for m in fairness_metrics_list if m["direction"] == "UNCHANGED")

    # 2. Predictive Utility Metrics Analysis
    utility_metric_keys = [
        ("Accuracy", "accuracy"),
        ("Precision", "precision"),
        ("Recall", "recall"),
        ("F1", "f1"),
        ("ROC-AUC", "rocAuc")
    ]

    utility_metrics_list = []
    for display_name, key in utility_metric_keys:
        b_val = baseline_perf.get(key)
        m_val = mitigated_perf.get(key)

        if b_val is None or m_val is None:
            b_val = 0.0 if b_val is None else float(b_val)
            m_val = 0.0 if m_val is None else float(m_val)

        b_val = float(b_val)
        m_val = float(m_val)
        delta = round(m_val - b_val, 4)

        if delta >= threshold:
            direction = "IMPROVED"
            interpretation = f"Predictive utility metric increased by {delta:+.4f}"
        elif delta <= -threshold:
            direction = "WORSENED"
            interpretation = f"Predictive utility metric decreased by {delta:+.4f}"
        else:
            direction = "PRESERVED"
            interpretation = f"Predictive utility metric preserved within threshold ±{threshold:.4f}"

        utility_metrics_list.append({
            "metric": display_name,
            "key": key,
            "before": round(b_val, 4),
            "after": round(m_val, 4),
            "delta": delta,
            "direction": direction,
            "interpretation": interpretation
        })

    utility_improved_count = sum(1 for m in utility_metrics_list if m["direction"] == "IMPROVED")
    utility_worsened_count = sum(1 for m in utility_metrics_list if m["direction"] == "WORSENED")
    utility_unchanged_count = sum(1 for m in utility_metrics_list if m["direction"] == "PRESERVED")

    # 3. Overall Trade-off Classification
    max_utility_drop = 0.0
    if utility_worsened_count > 0:
        max_utility_drop = max((m["before"] - m["after"]) for m in utility_metrics_list if m["direction"] == "WORSENED")

    if fairness_improved_count > 0 and fairness_worsened_count == 0:
        if utility_improved_count > 0 and utility_worsened_count == 0:
            classification = "FAIRNESS AND UTILITY BOTH IMPROVED"
        elif utility_worsened_count == 0:
            classification = "FAIRNESS IMPROVEMENT / UTILITY PRESERVED"
        else:
            if max_utility_drop >= 0.05:
                classification = "FAIRNESS IMPROVEMENT / MATERIAL UTILITY COST"
            else:
                classification = "FAIRNESS IMPROVEMENT / MINOR UTILITY COST"
    elif fairness_worsened_count > 0 and fairness_improved_count == 0:
        if utility_improved_count > 0:
            classification = "FAIRNESS WORSENED / UTILITY IMPROVED"
        else:
            classification = "MIXED FAIRNESS / MIXED UTILITY"
    elif fairness_improved_count > 0 and fairness_worsened_count > 0:
        classification = "MIXED FAIRNESS / MIXED UTILITY"
    elif utility_improved_count > 0 and utility_worsened_count > 0:
        classification = "MIXED FAIRNESS / MIXED UTILITY"
    elif fairness_improved_count == 0 and fairness_worsened_count == 0 and utility_improved_count == 0 and utility_worsened_count == 0:
        classification = "NO MATERIAL CHANGE"
    else:
        classification = "INCONCLUSIVE"

    # 4. Dynamic Overall Interpretation Generation
    if classification == "FAIRNESS IMPROVEMENT / UTILITY PRESERVED":
        overall_interpretation = (
            f"The intervention reduced measured disparity across {fairness_improved_count} evaluated fairness metrics "
            f"while predictive performance remained preserved within the threshold ±{threshold:.4f}. "
            f"This indicates a favorable fairness–utility outcome under the evaluated experiment."
        )
    elif classification == "FAIRNESS AND UTILITY BOTH IMPROVED":
        overall_interpretation = (
            f"The intervention improved both evaluated fairness metrics ({fairness_improved_count} improved) "
            f"and predictive performance metrics ({utility_improved_count} improved). "
            f"This represents a Pareto-superior outcome where fairness moved closer to parity without utility degradation."
        )
    elif classification in ("FAIRNESS IMPROVEMENT / MINOR UTILITY COST", "FAIRNESS IMPROVEMENT / MATERIAL UTILITY COST"):
        severity = "minor" if classification == "FAIRNESS IMPROVEMENT / MINOR UTILITY COST" else "material"
        overall_interpretation = (
            f"The intervention reduced disparity across {fairness_improved_count} fairness metrics, "
            f"but produced a {severity} decrease in predictive performance ({utility_worsened_count} utility metrics decreased). "
            f"This represents a trade-off where fairness improvement was accompanied by a predictive utility cost."
        )
    elif classification == "FAIRNESS WORSENED / UTILITY IMPROVED":
        overall_interpretation = (
            f"Predictive performance improved ({utility_improved_count} metrics increased), "
            f"however evaluated fairness disparity worsened across {fairness_worsened_count} metrics. "
            f"The utility gains should not obscure the observed increase in group disparity."
        )
    elif classification == "MIXED FAIRNESS / MIXED UTILITY":
        overall_interpretation = (
            f"Evaluation metrics moved in conflicting directions ({fairness_improved_count} fairness improved, "
            f"{fairness_worsened_count} fairness worsened; {utility_improved_count} utility improved, "
            f"{utility_worsened_count} utility decreased). "
            f"The intervention should not be characterized as uniformly improving fairness or preserving utility."
        )
    elif classification == "NO MATERIAL CHANGE":
        overall_interpretation = (
            f"Neither fairness disparity metrics nor predictive performance metrics changed beyond the configured "
            f"threshold ±{threshold:.4f}. The intervention produced no material impact on the evaluated model."
        )
    else:
        overall_interpretation = (
            "The empirical evidence collected from the controlled comparison does not support a definitive single-direction trade-off classification."
        )

    methodology_notes = [
        "Fairness–utility trade-off analysis evaluates empirical changes observed between baseline and mitigated models.",
        f"Qualitative directions are computed using a configurable change threshold of ±{threshold:.4f}. Raw numerical deltas remain fully transparent.",
        "Disparity metrics (DPD, EOD, EO) evaluate distance from 0; Disparate Impact (DI) evaluate distance from 1.0; Utility metrics evaluate higher values.",
        "No single composite score was created to preserve metric-level transparency across distinct fairness and predictive utility dimensions.",
        "The classification is an analytical interpretation of the controlled experiment and does NOT constitute a legal, ethical, or causal determination of discrimination or fairness."
    ]

    return {
        "status": "COMPLETED",
        "threshold": threshold,
        "fairnessAnalysis": {
            "metrics": fairness_metrics_list,
            "improvedCount": fairness_improved_count,
            "worsenedCount": fairness_worsened_count,
            "unchangedCount": fairness_unchanged_count
        },
        "utilityAnalysis": {
            "metrics": utility_metrics_list,
            "improvedCount": utility_improved_count,
            "worsenedCount": utility_worsened_count,
            "unchangedCount": utility_unchanged_count
        },
        "tradeoffClassification": classification,
        "overallInterpretation": overall_interpretation,
        "methodologyNotes": methodology_notes
    }
