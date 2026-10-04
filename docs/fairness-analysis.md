# Baseline Fairness Analysis Documentation

This document describes the design, group metric calculation, disparity formulas, API contracts, and MongoDB schemas for Phase 4: Baseline Fairness Analysis.

---

## 1. Core Methodology & Scope

ProxyShield evaluates demographic fairness metrics on the **exact same 20% test split** evaluated during Phase 3 baseline model evaluation.

### Evaluated Fairness Metrics

1. **Group-Level Statistics**:
   - `sampleCount`: Total observations for the subgroup in the test split.
   - `positivePredictionCount`: Number of positive predictions ($\hat{y} = 1$) for the subgroup.
   - `selectionRate`: Proportion of positive predictions ($\hat{y} = 1$) out of total subgroup samples.
   - `truePositiveRate` (TPR): $\frac{TP}{TP + FN}$ for positive ground truth ($y=1$) within subgroup.
   - `falsePositiveRate` (FPR): $\frac{FP}{FP + TN}$ for negative ground truth ($y=0$) within subgroup.
   - `trueNegativeRate` (TNR): $\frac{TN}{TN + FP}$ for negative ground truth ($y=0$) within subgroup.
   - `falseNegativeRate` (FNR): $\frac{FN}{FN + TP}$ for positive ground truth ($y=1$) within subgroup.

2. **Disparity Metrics** (Calculated relative to a chosen reference group $g_{ref}$):
   - **Demographic Parity Difference (DPD)**: Maximum magnitude difference in selection rates:
     $$\text{DPD} = \max_{g \neq g_{ref}} \left( \text{SelectionRate}(g) - \text{SelectionRate}(g_{ref}) \right)$$
   - **Disparate Impact (DI)**: Ratio of selection rates:
     $$\text{DI} = \min_{g \neq g_{ref}} \left( \frac{\text{SelectionRate}(g)}{\text{SelectionRate}(g_{ref})} \right)$$
     *(Safe handling when reference selection rate is 0).*
   - **Equal Opportunity Difference (EOD)**: Maximum magnitude difference in True Positive Rates:
     $$\text{EOD} = \max_{g \neq g_{ref}} \left( \text{TPR}(g) - \text{TPR}(g_{ref}) \right)$$
   - **Equalized Odds Difference**: Difference in both TPR and FPR across groups:
     $$\text{TPR}_{diff} = \max_{g \neq g_{ref}} \left( \text{TPR}(g) - \text{TPR}(g_{ref}) \right)$$
     $$\text{FPR}_{diff} = \max_{g \neq g_{ref}} \left( \text{FPR}(g) - \text{FPR}(g_{ref}) \right)$$

---

## 2. API Endpoints

### 2.1 Trigger Baseline Fairness Analysis
- **Endpoint**: `POST /api/audits/:id/fairness`
- **Request Body**:
  ```json
  {
    "referenceGroup": "Male" // Optional
  }
  ```
- **Express Backend Action**:
  Retrieves dataset file stream and forwards `file`, `targetAttribute`, `protectedAttribute`, `modelType`, and `referenceGroup` to Python FastAPI `POST /fairness-analysis`.
- **Response Status**: `200 OK`
- **Response Body**:
  ```json
  {
    "success": true,
    "audit": {
      "id": "...",
      "status": "FAIRNESS_ANALYSIS_COMPLETED",
      "fairnessResult": {
        "referenceGroup": "Male",
        "comparisonGroups": ["Female"],
        "metrics": {
          "demographicParityDifference": -0.1982,
          "disparateImpact": 0.3541,
          "equalOpportunityDifference": -0.1812,
          "equalizedOdds": {
            "tprDifference": -0.1812,
            "fprDifference": -0.0415
          }
        },
        "groupMetrics": [
          {
            "group": "Male",
            "sampleCount": 4280,
            "positivePredictionCount": 1320,
            "selectionRate": 0.3084,
            "truePositiveRate": 0.6210,
            "falsePositiveRate": 0.1250,
            "trueNegativeRate": 0.8750,
            "falseNegativeRate": 0.3790
          },
          {
            "group": "Female",
            "sampleCount": 2233,
            "positivePredictionCount": 246,
            "selectionRate": 0.1102,
            "truePositiveRate": 0.4398,
            "falsePositiveRate": 0.0835,
            "trueNegativeRate": 0.9165,
            "falseNegativeRate": 0.5602
          }
        ],
        "executedAt": "2026-09-07T17:15:00.000Z"
      }
    }
  }
  ```

### 2.2 Retrieve Fairness Analysis Results
- **Endpoint**: `GET /api/audits/:id/fairness`
- **Response Status**: `200 OK`
- **Response Body**: Returns audit status and `fairnessResult` object.

---

## 3. MongoDB Schema Updates

The `Audit` document stores the fairness results under `fairnessResult`:

```javascript
fairnessResult: {
  referenceGroup: { type: String, default: null },
  comparisonGroups: [{ type: String }],
  metrics: {
    demographicParityDifference: { type: Number, default: null },
    disparateImpact: { type: Number, default: null },
    equalOpportunityDifference: { type: Number, default: null },
    equalizedOdds: {
      tprDifference: { type: Number, default: null },
      fprDifference: { type: Number, default: null }
    }
  },
  groupMetrics: [{
    group: { type: String, required: true },
    sampleCount: { type: Number, required: true },
    positivePredictionCount: { type: Number, required: true },
    selectionRate: { type: Number, default: null },
    truePositiveRate: { type: Number, default: null },
    falsePositiveRate: { type: Number, default: null },
    trueNegativeRate: { type: Number, default: null },
    falseNegativeRate: { type: Number, default: null }
  }],
  executedAt: { type: Date, default: Date.now }
}
```
