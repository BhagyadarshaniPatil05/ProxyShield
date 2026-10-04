# ProxyShield Phase 12 — Fairness–Utility Trade-off Analysis

This document details the research methodology, technical implementation, metric direction rules, threshold logic, trade-off classifications, API contracts, database schemas, and Responsible AI principles for **Phase 12: Fairness–Utility Trade-off Analysis** in ProxyShield.

---

## 1. Research Objective

Phase 12 addresses the central research question:

> **What fairness improvement or deterioration was obtained from the proxy intervention, and what predictive-performance cost or benefit accompanied that change?**

Phase 11 established the raw before-vs-after empirical comparison between the original **Baseline Model (Control)** and the retrained **Mitigated Model (Treatment)**. Phase 12 provides a structured analytical interpretation of those results by evaluating the trade-off between protected-group fairness changes and predictive utility changes.

---

## 2. Key Architectural Guarantees

1. **No Model Retraining / Dataset Re-splitting**: Phase 12 is an analytical layer over the existing Phase 11 `beforeAfterResult`. It does NOT train a third model, create new mitigations, or mutate any dataset.
2. **Metric-Level Transparency (No Single Composite Score)**: Evaluates protected-group fairness metrics (DPD, DI, EOD, EO-TPR, EO-FPR) and predictive performance metrics (Accuracy, Precision, Recall, F1, ROC-AUC) independently. **No single composite "Fairness Score", "Utility Score", or "ProxyShield Score" is calculated.**
3. **Threshold-Aware & Direction-Aware**: Uses explicit mathematical rules for fairness metric movement (distance from parity target) and utility movement (higher is better). Uses a configurable change threshold (default $\pm 0.01$) while displaying raw numerical deltas at all times.
4. **Responsible AI Safeguards**: Includes explicit legal, ethical, and non-causal disclaimers that experimental evidence does NOT constitute a legal or ethical determination of discrimination.

---

## 3. Metric Definitions & Direction Rules

### 3.1 Group Fairness Metrics

Signed metric delta:
$$\Delta \text{Metric} = \text{After} - \text{Before}$$

1. **Demographic Parity Difference (DPD)**:
   * Target: `0.0` (zero disparity)
   * Improvement: $| \text{After} | < | \text{Before} |$ (disparity moved toward zero)
   * Worsening: $| \text{After} | > | \text{Before} |$ (disparity moved away from zero)

2. **Disparate Impact Ratio (DI)**:
   * Target: `1.0` (parity)
   * Improvement: $| \text{After} - 1.0 | < | \text{Before} - 1.0 |$ (ratio moved closer to 1.0)
   * Worsening: $| \text{After} - 1.0 | > | \text{Before} - 1.0 |$ (ratio moved away from 1.0)

3. **Equal Opportunity Difference (EOD)**:
   * Target: `0.0` (equal True Positive Rates across groups)
   * Improvement: $| \text{After} | < | \text{Before} |$
   * Worsening: $| \text{After} | > | \text{Before} |$

4. **Equalized Odds TPR Difference (EO TPR)**:
   * Target: `0.0`
   * Improvement: $| \text{After} | < | \text{Before} |$
   * Worsening: $| \text{After} | > | \text{Before} |$

5. **Equalized Odds FPR Difference (EO FPR)**:
   * Target: `0.0`
   * Improvement: $| \text{After} | < | \text{Before} |$
   * Worsening: $| \text{After} | > | \text{Before} |$

---

### 3.2 Predictive Utility Metrics

For all classification performance metrics (`Accuracy`, `Precision`, `Recall`, `F1`, `ROC-AUC`), higher values indicate better predictive performance:

* **Improved**: $\Delta \text{Metric} \ge +\text{Threshold}$
* **Decreased / Worsened**: $\Delta \text{Metric} \le -\text{Threshold}$
* **Preserved**: $| \Delta \text{Metric} | < \text{Threshold}$

---

## 4. Configurable Change Threshold

ProxyShield defines a configurable qualitative classification boundary:
$$\text{DEFAULT\_CHANGE\_THRESHOLD} = 0.01 \quad (\pm 1.0\%)$$

* Numerical changes where $| \Delta | < \text{Threshold}$ are treated as **negligible / unchanged** for qualitative label assignment.
* **Full Transparency**: Raw numerical values, signed deltas, and exact decimal places remain visible in all API responses and UI components regardless of threshold status.

---

## 5. Trade-off Classification Framework

Phase 12 dynamically assigns 1 of 8 mutually exclusive trade-off classifications:

1. **FAIRNESS IMPROVEMENT / UTILITY PRESERVED**: Fairness metrics improved while predictive performance metrics remained within threshold $\pm 0.01$.
2. **FAIRNESS AND UTILITY BOTH IMPROVED**: Both fairness metrics and predictive performance metrics improved (Pareto-superior outcome).
3. **FAIRNESS IMPROVEMENT / MINOR UTILITY COST**: Fairness metrics improved with a minor decrease in predictive utility (maximum utility drop $< 0.05$).
4. **FAIRNESS IMPROVEMENT / MATERIAL UTILITY COST**: Fairness metrics improved with a substantial decrease in predictive utility (maximum utility drop $\ge 0.05$).
5. **FAIRNESS WORSENED / UTILITY IMPROVED**: Predictive performance improved but protected-group disparity increased.
6. **MIXED FAIRNESS / MIXED UTILITY**: Evaluation metrics moved in conflicting directions across different fairness or utility metrics.
7. **NO MATERIAL CHANGE**: Neither fairness metrics nor utility metrics changed beyond threshold $\pm 0.01$.
8. **INCONCLUSIVE**: Insufficient or ambiguous evidence to support a single-direction classification.

---

## 6. API Specifications

### Python FastAPI ML Service: `POST /fairness-utility`

* **Request Body**:
```json
{
  "beforeAfterResult": { ... },
  "threshold": 0.01
}
```

* **Response Body**:
```json
{
  "success": true,
  "status": "COMPLETED",
  "threshold": 0.01,
  "fairnessAnalysis": {
    "metrics": [
      {
        "metric": "DPD",
        "key": "demographicParityDifference",
        "before": 0.1802,
        "after": 0.1802,
        "delta": 0.0,
        "direction": "UNCHANGED",
        "interpretation": "Disparity metric change (0.0000) is negligible within threshold ±0.0100"
      }
    ],
    "improvedCount": 0,
    "worsenedCount": 0,
    "unchangedCount": 5
  },
  "utilityAnalysis": {
    "metrics": [
      {
        "metric": "Accuracy",
        "key": "accuracy",
        "before": 0.8037,
        "after": 0.8037,
        "delta": 0.0,
        "direction": "PRESERVED",
        "interpretation": "Predictive utility metric preserved within threshold ±0.0100"
      }
    ],
    "improvedCount": 0,
    "worsenedCount": 0,
    "unchangedCount": 5
  },
  "tradeoffClassification": "NO MATERIAL CHANGE",
  "overallInterpretation": "Neither fairness disparity metrics nor predictive performance metrics changed beyond the configured threshold ±0.0100. The intervention produced no material impact on the evaluated model.",
  "methodologyNotes": [ ... ]
}
```

---

### Node.js Express Backend: `POST /api/audits/:id/fairness-utility`

* **Prerequisite Validation**: Requires `audit.beforeAfterResult` to be present and `status === 'COMPLETED'`. Returns status code `400` if incomplete.
* **Database Updates**: Stores output in `audit.fairnessUtilityResult` and updates status to `FAIRNESS_UTILITY_COMPLETED`.

---

## 7. MongoDB Schema (`Audit.js`)

```javascript
fairnessUtilityResult: {
  status: { type: String, enum: ['COMPLETED', 'FAILED'], default: 'COMPLETED' },
  threshold: { type: Number, default: 0.01 },
  fairnessAnalysis: {
    metrics: [{
      metric: String,
      key: String,
      before: Number,
      after: Number,
      delta: Number,
      direction: String,
      interpretation: String
    }],
    improvedCount: Number,
    worsenedCount: Number,
    unchangedCount: Number
  },
  utilityAnalysis: {
    metrics: [{
      metric: String,
      key: String,
      before: Number,
      after: Number,
      delta: Number,
      direction: String,
      interpretation: String
    }],
    improvedCount: Number,
    worsenedCount: Number,
    unchangedCount: Number
  },
  tradeoffClassification: String,
  overallInterpretation: String,
  methodologyNotes: [String],
  completedAt: Date
}
```

---

## 8. Responsible AI Non-Causal Principles

> **IMPORTANT**:
> * ProxyShield NEVER outputs "The model is fair", "The model is unbiased", or "Discrimination has been eliminated".
> * All trade-off results describe empirical observations from controlled experimentation under a specific dataset partition.
> * Results do NOT constitute legal advice or ethical compliance determinations. Human oversight remains mandatory.
