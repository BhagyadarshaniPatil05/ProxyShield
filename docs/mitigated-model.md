# ProxyShield Phase 10: Mitigated Model Training

## 1. Overview & Research Methodology

Phase 10 implements the **Mitigated Model Training** stage of the ProxyShield offline auditing framework.

The official methodology is:
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

Having formulated an explicit proxy intervention configuration in Phase 9 (specifically `REMOVE_FEATURE`), Phase 10 answers the primary research question:
> **What happens to predictive performance when the selected proxy intervention is applied and the model is retrained?**

---

## 2. Experimental Principles & Rules

### A. Controlled Comparison
To ensure observed performance shifts are attributable solely to feature removal:
- **Baseline Immutability**: `baselineResult` remains untouched in MongoDB as the experimental control condition.
- **Identical Pipeline**: The baseline and mitigated models use the exact same algorithm (`logistic_regression`, `decision_tree`, `random_forest`), target attribute ($Y$), protected attribute ($A$), hyperparameters, train/test split ratio ($80/20$), random seed (`random_state=42`), and preprocessing logic (`SimpleImputer`, `OneHotEncoder`, `StandardScaler`).
- **Deterministic Row Alignment**: `random_state=42` ensures identical train/test row partitions between baseline and mitigated experiments.

### B. Dataset Source of Truth & Non-Mutation
- The original dataset CSV file is **never modified or deleted** on disk or in MongoDB.
- Proxy feature removal occurs in-memory during training matrix construction: $X_{\text{mitigated}} = X_{\text{baseline}} \setminus \text{selected\_features}$.

### C. Attribute Safeguards
- **Target Attribute ($Y$)**: Cannot be selected as an intervention feature to remove (HTTP 400 error).
- **Protected Attribute ($A$)**: Used strictly for fairness auditing and is excluded from model feature matrix $X$ (HTTP 400 error if selected for removal).
- **Candidate Validation**: Rejects nonexistent, empty, or constant features.

---

## 3. System Architecture

```text
React Frontend (Port 5173)
       │
       │ POST /api/audits/:id/mitigated-model
       ▼
Node / Express Backend (Port 5000)
       │
       │ POST /train-mitigated (CSV Stream + Config)
       ▼
Python FastAPI ML Service (Port 8000)
       │
       ▼
train_mitigated_model (ml-service/models/mitigated.py)
```

---

## 4. API Specification

### FastAPI Endpoint
- `POST /train-mitigated`
  - **Form Fields**: `file` (UploadFile), `target_attribute` (str), `protected_attribute` (str), `model_type` (str), `selected_features` (str, comma-separated), `strategy` (str, default `'REMOVE_FEATURE'`).
  - **Response**: `MitigatedModelResponse` JSON.

### Express Backend Endpoints
- `POST /api/audits/:id/mitigated-model`
  - Triggers mitigated model training and updates `audit.status` to `MITIGATED_MODEL_COMPLETED`.
- `GET /api/audits/:id/mitigated-model`
  - Fetches stored `mitigatedModelResult`.

---

## 5. MongoDB Data Structure

`Audit.mitigatedModelResult`:
```javascript
{
  status: "COMPLETED",
  strategy: "REMOVE_FEATURE",
  selectedFeatures: ["education"],
  removedFeatures: ["education"],
  modelType: "random_forest",
  targetAttribute: "income",
  protectedAttribute: "sex",
  trainRows: 800,
  testRows: 200,
  originalFeatureCount: 12,
  mitigatedFeatureCount: 11,
  removedFeatureCount: 1,
  performance: {
    accuracy: 0.8520,
    precision: 0.7410,
    recall: 0.6230,
    f1: 0.6770,
    rocAuc: 0.8910,
    confusionMatrix: [[130, 20], [25, 25]]
  },
  testPredictions: [...],
  testTrue: [...],
  completedAt: ISODate("...")
}
```

---

## 6. Disclaimers & Scope Boundaries

> **Important**: Phase 10 trains the mitigated model and measures predictive performance. It does **NOT** by itself evaluate before/after fairness comparisons or fairness-utility trade-offs. Formal before/after fairness comparison and trade-off analysis are performed in subsequent phases.
