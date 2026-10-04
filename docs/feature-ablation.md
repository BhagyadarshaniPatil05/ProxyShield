# Controlled Feature Ablation Documentation (Phase 7)

This document describes the methodology, neutralization rules, metrics, analytical observations, and API contracts for **Phase 7: Controlled Feature Ablation** in ProxyShield.

---

## 1. Executive Summary & Core Methodology

Controlled Feature Ablation is the 5th stage of the core ProxyShield auditing pipeline:

```text
Proxy Capacity → Proxy Use → Feature Ablation → Fairness Impact → Intervention → Fairness-Utility Trade-off → Human Review
```

### Key Objective
Phase 7 evaluates model dependence and performance shifts by systematically neutralizing candidate features **one at a time** on a copy of the evaluation test set ($X_{test}$). Neutralized test inputs are passed to the **exact baseline model** trained during Phase 3 without retraining the model or altering prior audit results.

### Neutralization Leakage Prevention
To prevent target and distribution data leakage:
- Neutralization statistics (median for numerical features, mode for categorical features) are derived **strictly from the training dataset ($X_{train}$)**.
- Test observations ($X_{test}$) are neutralized using these pre-computed training values before applying the fitted `ColumnTransformer` preprocessing pipeline.

---

## 2. Feature Neutralization Rules

For a candidate feature $X_j$:

1. **Candidate Exclusion Rules**:
   - Protected attribute $A$ (e.g., `sex`, `race`) is excluded from ablation candidate selection.
   - Target variable $Y$ (e.g., `income`, `credit_risk`) is excluded.
   - Constant/zero-variance columns are excluded.
   - Unique identifier columns are excluded.

2. **Numerical Feature Neutralization**:
   $$X_{j, \text{ablated}}^{\text{test}} = \text{median}(X_{j}^{\text{train}})$$

3. **Categorical Feature Neutralization**:
   $$X_{j, \text{ablated}}^{\text{test}} = \text{mode}(X_{j}^{\text{train}})$$
   If multiple modes exist, the first mode is selected deterministically.

---

## 3. Evaluation Metrics & Performance Comparisons

For each neutralized feature $X_j$, the baseline model predictions $\hat{y}_{\text{ablated}}$ and probability estimates $\hat{P}_{\text{ablated}}(Y=1|X)$ are generated on $X_{\text{ablated}}^{\text{test}}$.

### 3.1 Classification Metrics & Performance Deltas ($\Delta$)
- **Accuracy**: $\text{Acc}_{\text{ablated}}$, $\Delta \text{Acc} = \text{Acc}_{\text{ablated}} - \text{Acc}_{\text{baseline}}$
- **Precision**: $\text{Prec}_{\text{ablated}}$, $\Delta \text{Prec} = \text{Prec}_{\text{ablated}} - \text{Prec}_{\text{baseline}}$
- **Recall**: $\text{Rec}_{\text{ablated}}$, $\Delta \text{Rec} = \text{Rec}_{\text{ablated}} - \text{Rec}_{\text{baseline}}$
- **F1 Score**: $F1_{\text{ablated}}$, $\Delta F1 = F1_{\text{ablated}} - F1_{\text{baseline}}$
- **ROC-AUC**: $\text{AUC}_{\text{ablated}}$, $\Delta \text{AUC} = \text{AUC}_{\text{ablated}} - \text{AUC}_{\text{baseline}}$

### 3.2 Prediction Shift & Reliance Metrics
- **Prediction Change Rate**:
  Proportion of test observations whose discrete prediction changed:
  $$\text{PCR}_j = \frac{1}{N_{\text{test}}} \sum_{i=1}^{N_{\text{test}}} \mathbb{I}(\hat{y}_i^{\text{baseline}} \neq \hat{y}_i^{\text{ablated}})$$

- **Mean Absolute Probability Change**:
  $$\text{MAPC}_j = \frac{1}{N_{\text{test}}} \sum_{i=1}^{N_{\text{test}}} \left| \hat{P}^{\text{baseline}}(Y=1|x_i) - \hat{P}^{\text{ablated}}(Y=1|x_i) \right|$$

- **Positive Selection Rate Shift**:
  $$\text{Selection Rate}_{\text{ablated}} = \frac{1}{N_{\text{test}}} \sum_{i=1}^{N_{\text{test}}} \mathbb{I}(\hat{y}_i^{\text{ablated}} = 1)$$
  $$\Delta \text{Selection Rate} = \text{Selection Rate}_{\text{ablated}} - \text{Selection Rate}_{\text{baseline}}$$

### 3.3 Confusion Matrix Shifts
For both baseline and ablated evaluations:
- True Positives ($TP$)
- False Positives ($FP$)
- True Negatives ($TN$)
- False Negatives ($FN$)

---

## 4. Automated Synthesis & Observation Generation

Based on empirical deltas, an automated summary observation string is generated for each ablated feature:

- **High Reliance / Critical Feature**:
  $\text{PCR} \ge 0.10$ OR $|\Delta F1| \ge 0.05$ OR $\text{MAPC} \ge 0.08$
  *"Feature ablation resulted in significant model prediction shifts (Change Rate: X%, F1 Δ: Y). The baseline model relies heavily on this feature for classification decisions."*

- **Moderate Reliance Feature**:
  $\text{PCR} \ge 0.03$ OR $|\Delta F1| \ge 0.02$ OR $\text{MAPC} \ge 0.03$
  *"Feature ablation caused moderate prediction changes (Change Rate: X%, F1 Δ: Y). The model relies partially on this feature."*

- **Low / Negligible Reliance Feature**:
  $\text{PCR} < 0.03$ AND $|\Delta F1| < 0.02$ AND $\text{MAPC} < 0.03$
  *"Feature ablation caused negligible change in model predictions (Change Rate: X%, F1 Δ: Y). The baseline model has minimal reliance on this feature."*

---

## 5. API Endpoints

### 5.1 Execute Controlled Feature Ablation
- **HTTP Method**: `POST`
- **Route**: `/api/audits/:id/ablation`
- **Request Payload** (Optional feature subset):
  ```json
  {
    "selectedFeatures": ["education", "occupation", "capital-gain"]
  }
  ```
- **Backend Flow**: Express fetches dataset CSV and audit configuration from MongoDB $\to$ streams to FastAPI ML Service (`POST /feature-ablation`) $\to$ saves `featureAblationResult` object $\to$ updates audit status to `ABLATION_COMPLETED`.

### 5.2 Retrieve Ablation Results
- **HTTP Method**: `GET`
- **Route**: `/api/audits/:id/ablation`
- **Response**: Returns saved feature ablation results including single feature metric cards, confusion matrix shifts, delta comparison tables, and Recharts visualization data.
