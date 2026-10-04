# Fairness Impact Analysis Documentation (Phase 8)

This document describes the methodology, fairness metrics, delta calculations, interpretation logic, API contracts, and academic caveats for **Phase 8: Fairness Impact Analysis** in ProxyShield.

---

## 1. Executive Summary & Core Methodology

Fairness Impact Analysis is the 6th stage of the core ProxyShield auditing pipeline:

```text
Proxy Capacity → Proxy Use → Feature Ablation → Fairness Impact → Intervention → Fairness-Utility Trade-off → Human Review
```

### Research Objective
Phase 8 answers the core research question:
> **Does neutralizing a candidate proxy feature produce a measurable change in the protected-group fairness metrics of the baseline model?**

### Core Conceptual Scope & Safeguards
- **No Model Retraining**: The experiment evaluates neutralized test inputs on the **exact baseline model** trained during Phase 3 without retraining.
- **Reference Group Parity**: The protected attribute $A$, reference group, target outcome $Y$, and evaluation test split ($80/20$, `random_state=42`) remain strictly identical between baseline evaluation (Phase 4) and ablated evaluation (Phase 8).
- **Non-Causal Evidence**: Observed metric changes demonstrate empirical fairness impact under controlled feature neutralization. They do **not** establish causality, legal discrimination, or an absolute ethical judgment.

---

## 2. Fairness Metrics & Delta Calculations

Phase 8 re-uses the exact fairness metric definitions established in Phase 4:

1. **Demographic Parity Difference (DPD)**:
   $$\text{DPD} = \text{SelectionRate}(\text{Comp}) - \text{SelectionRate}(\text{Ref})$$

2. **Disparate Impact (DI)**:
   $$\text{DI} = \frac{\text{SelectionRate}(\text{Comp})}{\text{SelectionRate}(\text{Ref})}$$

3. **Equal Opportunity Difference (EOD)**:
   $$\text{EOD} = \text{TPR}(\text{Comp}) - \text{TPR}(\text{Ref})$$

4. **Equalized Odds Difference**:
   $$\Delta \text{TPR} = \text{TPR}(\text{Comp}) - \text{TPR}(\text{Ref})$$
   $$\Delta \text{FPR} = \text{FPR}(\text{Comp}) - \text{FPR}(\text{Ref})$$

### Metric Shifts ($\Delta$)
For each candidate feature $X_j$:
$$\Delta \text{Metric} = \text{Ablated Metric}_j - \text{Baseline Metric}$$

---

## 3. Metric-Direction Handling & Automated Interpretation

Metrics are evaluated according to their mathematical direction of lower disparity:

- **DPD**: Absolute value closer to $0.0$ indicates lower selection-rate disparity.
- **DI**: Ratio closer to $1.0$ indicates more equal selection rates.
- **EOD**: Absolute value closer to $0.0$ indicates lower True Positive Rate disparity.
- **Equalized Odds**: Absolute TPR and FPR differences closer to $0.0$ indicate lower disparity.

### Interpretation Categories
1. **Reduced Disparity Across Evaluated Metrics**:
   All evaluated metrics move toward lower disparity ($\Delta |\text{DPD}| < 0$, $\Delta |\text{EOD}| < 0$, $|\text{DI} - 1| \to 0$).
2. **Increased Disparity Across Evaluated Metrics**:
   Evaluated metrics move toward higher disparity.
3. **Mixed Fairness Impact**:
   Metrics move in conflicting directions (e.g., selection-rate disparity decreases while TPR disparity increases).
4. **Minimal Observed Fairness Change**:
   Absolute metric changes across all evaluated metrics remain $< 0.005$.

---

## 4. API Endpoints

### 4.1 Execute Fairness Impact Analysis
- **HTTP Method**: `POST`
- **Route**: `/api/audits/:id/fairness-impact`
- **Request Payload** (Optional feature filter & reference group override):
  ```json
  {
    "selectedFeatures": ["education", "occupation"],
    "referenceGroup": "Male"
  }
  ```
- **Backend Flow**: Express fetches dataset CSV and audit configuration from MongoDB $\to$ streams to FastAPI ML Service (`POST /fairness-impact`) $\to$ saves `fairnessImpactResult` object $\to$ updates audit status to `FAIRNESS_IMPACT_COMPLETED`.

### 4.2 Retrieve Fairness Impact Results
- **HTTP Method**: `GET`
- **Route**: `/api/audits/:id/fairness-impact`
- **Response**: Returns saved `fairnessImpactResult` object including baseline fairness, ablated fairness metrics, signed deltas, group-level statistics, interpretation strings, and Recharts visualization data.
