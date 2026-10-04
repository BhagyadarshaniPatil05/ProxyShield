# Proxy Intervention Documentation (Phase 9)

This document describes the purpose, evidence synthesis rules, recommendation logic, intervention strategies, API contracts, and human review boundaries for **Phase 9: Proxy Intervention** in ProxyShield.

---

## 1. Executive Summary & Core Methodology

Proxy Intervention is the 7th stage of the core ProxyShield auditing pipeline:

```text
Proxy Capacity → Proxy Use → Feature Ablation → Fairness Impact → Intervention → Mitigated Model → Fairness-Utility Trade-off → Human Review
```

### Research Objective
Phase 9 answers the core research question:
> **Given the multi-phase evidence collected about candidate proxy features, what controlled intervention configuration should be evaluated next?**

### Core Conceptual Scope & Safeguards
- **Configuration Only**: Phase 9 formulates and records an explicit intervention experiment configuration (`interventionResult`). It does **NOT** train a mitigated model or modify/delete features from the original dataset CSV or database metadata.
- **Supported MVP Strategy (`REMOVE_FEATURE`)**: Configures selected candidate features for exclusion when training the mitigated model in Phase 10.
- **Human Oversight Boundary**: All recommendations are output with `decisionStatus: "PENDING_HUMAN_REVIEW"`. The system provides transparent analytical evidence for human review rather than making automated ethical or legal determinations.

---

## 2. Multi-Phase Evidence Aggregation

For each candidate feature $X_j$, evidence is aggregated across prior phases:

1. **Phase 5: Proxy Capacity**: Capacity level (`HIGH`, `MODERATE`, `LOW`), capacity score, mutual information, predictability accuracy.
2. **Phase 6: Proxy Use**: Model reliance evidence level (`STRONG`, `MODERATE`, `WEAK`), SHAP mean absolute value, permutation $F1$ drop.
3. **Phase 7: Controlled Feature Ablation**: Prediction change rate ($\text{PCR}$), $F1$ performance delta ($\Delta F1$).
4. **Phase 8: Fairness Impact**: Evidence summary (`Reduced disparity`, `Increased disparity`, `Mixed impact`), $\Delta \text{DPD}$, $\Delta \text{EOD}$.

---

## 3. Explainable Recommendation Logic

Rather than collapsing evidence into an arbitrary black-box score, Phase 9 applies transparent, explainable rules:

- **RECOMMEND_INTERVENTION**:
  - High/Moderate Proxy Capacity AND
  - Strong/Moderate Model Reliance or observable prediction change ($\text{PCR} \ge 1\%$) AND
  - Measurable reduction in protected-group fairness disparity under controlled ablation ($\Delta |\text{DPD}| < -0.005$ or $\Delta |\text{EOD}| < -0.005$).
  - *Rationale*: Feature demonstrates converging proxy signals across all 4 auditing phases. Excluding the feature is recommended for Phase 10 evaluation.

- **REVIEW_REQUIRED**:
  - High/Moderate Proxy Capacity or Model Reliance, but ablation or fairness impact evidence is mixed or conflicting.
  - *Rationale*: Evidence across proxy reliance and fairness metrics is mixed. Human review is recommended before intervention.

- **DO_NOT_INTERVENE**:
  - Low proxy capacity, weak model reliance, and minimal fairness impact.
  - *Rationale*: Feature exhibits low proxy potential and minimal disparity impact. Intervention is not indicated.

---

## 4. API Endpoints

### 4.1 Formulate Proxy Intervention Configuration
- **HTTP Method**: `POST`
- **Route**: `/api/audits/:id/intervention`
- **Request Payload**:
  ```json
  {
    "selectedFeatures": ["education", "occupation"],
    "selectedInterventionFeatures": ["education"],
    "strategy": "REMOVE_FEATURE"
  }
  ```
- **Backend Flow**: Express fetches dataset CSV and audit configuration from MongoDB $\to$ streams to FastAPI ML Service (`POST /intervention`) $\to$ saves `interventionResult` object $\to$ updates audit status to `INTERVENTION_COMPLETED`.

### 4.2 Retrieve Proxy Intervention Results
- **HTTP Method**: `GET`
- **Route**: `/api/audits/:id/intervention`
- **Response**: Returns saved `interventionResult` object including candidate recommendations, multi-phase evidence details, rationale strings, strategy, and selected features list.
