# ProxyShield Phase 11: Before vs After Comparison

## 1. Overview & Research Methodology

Phase 11 implements the **Before vs After Controlled Comparison** stage of ProxyShield.

The official ProxyShield research pipeline is:
```text
Proxy Capacity
      ↓
Proxy Use
      ↓
Controlled Feature Ablation
      ↓
Fairness Impact
      ↓
Proxy Intervention
      ↓
Mitigated Model Training
      ↓
Before-vs-After Comparison
      ↓
Fairness–Utility Trade-off
      ↓
Audit Report
      ↓
Human Review
```

Having retrained a mitigated machine learning model in Phase 10 (applying the `REMOVE_FEATURE` proxy intervention), Phase 11 answers the core empirical research question:
> **After applying the selected proxy intervention, how did the model's fairness outcomes and predictive performance change compared with the original baseline model?**

---

## 2. Experimental Design & Principles

### A. Controlled Experimental Comparison
Phase 11 evaluates the **Baseline Model (Control)** against the **Mitigated Model (Treatment)** under strictly identical experimental conditions:
- **Same Dataset & Columns**: Original dataset source of truth is preserved.
- **Same Target ($Y$) & Protected ($A$) Attributes**: Identical target variable and auditing protected attribute.
- **Same Test Partition**: $80/20$ split using `random_state=42` ensures identical test observations are evaluated.
- **Same Model Algorithm**: Identical classifier type (`logistic_regression`, `decision_tree`, `random_forest`) and hyperparameters.
- **Same Preprocessing**: Identical imputation, scaling, and one-hot encoding pipelines.
- **Single Intentional Difference**: Baseline feature set ($X_{\text{baseline}}$) vs Mitigated feature set ($X_{\text{mitigated}} = X_{\text{baseline}} \setminus \text{selected\_features}$).

### B. Multi-Metric Evaluation (No Single Arbitrary Score)
ProxyShield explicitly rejects collapsing disparate metrics into a single arbitrary "fairness score". Instead, Phase 11 independently tracks and compares:
1. **Predictive Performance Metrics**: Accuracy, Precision, Recall, F1 Score, ROC-AUC, and Confusion Matrices.
2. **Protected-Group Disparity Metrics**:
   - **Demographic Parity Difference (DPD)**: Selection rate gap relative to the reference group.
   - **Disparate Impact (DI)**: Selection rate ratio relative to the reference group.
   - **Equal Opportunity Difference (EOD)**: True Positive Rate (TPR) gap relative to the reference group.
   - **Equalized Odds**: TPR and False Positive Rate (FPR) gaps relative to the reference group.
3. **Subgroup Performance Statistics**: Per-group sample counts, selection rates, TPR, and FPR.

### C. Direction-Aware Qualitative Interpretation Rules

- **Demographic Parity Difference (DPD)**:
  - $| \text{DPD}_{\text{after}} | < | \text{DPD}_{\text{before}} | - 0.001 \implies$ **Reduced demographic selection disparity**.
  - $| \text{DPD}_{\text{after}} | > | \text{DPD}_{\text{before}} | + 0.001 \implies$ **Increased demographic selection disparity**.
- **Disparate Impact (DI)**:
  - $| \text{DI}_{\text{after}} - 1.0 | < | \text{DI}_{\text{before}} - 1.0 | - 0.001 \implies$ **Disparate impact ratio moved closer to parity (1.0)**.
  - $| \text{DI}_{\text{after}} - 1.0 | > | \text{DI}_{\text{before}} - 1.0 | + 0.001 \implies$ **Disparate impact ratio moved farther from parity (1.0)**.
- **Equal Opportunity Difference (EOD)**:
  - $| \text{EOD}_{\text{after}} | < | \text{EOD}_{\text{before}} | - 0.001 \implies$ **Reduced TPR disparity**.
- **Overall Fairness Outcome Labels**:
  - `FAIRNESS IMPROVED`: Disparity metrics consistently moved toward parity.
  - `MIXED FAIRNESS RESULT`: Some metrics improved while others worsened.
  - `FAIRNESS UNCHANGED`: Metric deltas were $< 0.001$.
  - `FAIRNESS WORSENED`: Disparity metrics consistently moved away from parity.
  - `INCONCLUSIVE`: Test sample size or positive count insufficient for evaluation.
- **Overall Performance Outcome Labels**:
  - `PERFORMANCE PRESERVED`, `MINOR PERFORMANCE TRADE-OFF`, `MATERIAL PERFORMANCE DECREASE`, `PERFORMANCE IMPROVED`.

---

## 3. Architecture & API Specifications

### FastAPI Endpoint
- `POST /before-after`
  - **Form Fields**: `file`, `target_attribute`, `protected_attribute`, `model_type`, `selected_features`, `strategy`, `reference_group`.
  - **Response**: `BeforeAfterResponse` JSON.

### Express Backend Endpoints
- `POST /api/audits/:id/before-after`
- `GET /api/audits/:id/before-after`

---

## 4. MongoDB Database Schema (`Audit.beforeAfterResult`)

```json
{
  "status": "COMPLETED",
  "referenceGroup": "Male",
  "comparisonGroups": ["Female"],
  "baseline": {
    "modelType": "random_forest",
    "featureCount": 10,
    "performance": { "accuracy": 0.85, "precision": 0.74, "recall": 0.62, "f1": 0.67, "rocAuc": 0.89, "confusionMatrix": [[130, 20], [25, 25]] },
    "fairness": { "dpd": 0.1782, "di": 0.6250, "eod": 0.1250, "equalizedOdds": { "tprDifference": 0.1250, "fprDifference": 0.0412 }, "groupStats": [...] }
  },
  "mitigated": {
    "modelType": "random_forest",
    "strategy": "REMOVE_FEATURE",
    "removedFeatures": ["education"],
    "featureCount": 9,
    "performance": { "accuracy": 0.84, "precision": 0.73, "recall": 0.61, "f1": 0.66, "rocAuc": 0.88, "confusionMatrix": [[128, 22], [26, 24]] },
    "fairness": { "dpd": 0.1412, "di": 0.7100, "eod": 0.0910, "equalizedOdds": { "tprDifference": 0.0910, "fprDifference": 0.0310 }, "groupStats": [...] }
  },
  "performanceDelta": { "accuracy": -0.0100, "precision": -0.0100, "recall": -0.0100, "f1": -0.0100, "rocAuc": -0.0100 },
  "fairnessDelta": { "dpd": -0.0370, "di": +0.0850, "eod": -0.0340, "equalizedOdds": { "tprDifference": -0.0340, "fprDifference": -0.0102 } },
  "fairnessInterpretation": "FAIRNESS IMPROVED",
  "fairnessInterpretationDetails": "Evaluated disparity metrics consistently moved toward parity across 3 metrics.",
  "performanceInterpretation": "PERFORMANCE PRESERVED",
  "performanceInterpretationDetails": "Predictive performance remained effectively unchanged (ΔAccuracy: -0.0100, ΔF1: -0.0100).",
  "methodologyNotes": [...],
  "completedAt": "2026-09-08T00:36:00.000Z"
}
```

---

## 5. Important Legal & Ethical Disclaimer

> **Responsible-AI Disclaimer**: Before/after controlled comparison demonstrates empirical changes under an experimental setup. It does not establish causal attribution and does not constitute a legal or ethical determination of discrimination.
