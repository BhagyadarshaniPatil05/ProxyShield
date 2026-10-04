# Proxy Use / Model Reliance Analysis Documentation

This document describes the design, SHAP explainers, permutation importance methodology, controlled feature ablation experiments, prediction change rate calculations, and API contracts for Phase 6: Proxy Use / Model Reliance Analysis.

---

## 1. Core Methodology & Conceptual Scope

ProxyShield Phase 6 evaluates whether and to what degree the trained baseline supervised decision model relies on candidate features when predicting outcome $Y$ ($\hat{Y} = f(X)$).

### Important Conceptual Distinction
- **Proxy Capacity (Phase 5)**: Measures information overlap between non-sensitive features and the protected attribute ($X \to A$).
- **Proxy Use (Phase 6)**: Measures empirical decision model reliance on feature $X$ for predictions ($X \to \hat{Y}$).
- **Fairness Impact (Phase 4 / Phase 8)**: Evaluates whether model reliance on candidate proxy features causes demographic disparities across protected subgroups.

> **Methodological Rule**: Model-use evidence (SHAP, Permutation Importance, Ablation Delta, Prediction Change Rate) indicates that a feature contributes to model predictions. It does **not** by itself establish causality, legal non-compliance, or unfair discrimination.

---

## 2. Explainability & Reliance Methods

### 2.1 SHAP Global Feature Importance
Calculates mean absolute SHAP value across test set observations:
$$\text{mean}(|\text{SHAP}_j|) = \frac{1}{N} \sum_{i=1}^N |\phi_j^{(i)}|$$
- **Model-Specific Explainers**:
  - `TreeExplainer` for `decision_tree` and `random_forest`.
  - `LinearExplainer` / `Explainer` for `logistic_regression`.
- **One-Hot Aggregation**:
  Categorical dummy features (e.g., `cat__education_Bachelors`, `cat__education_Masters`) are aggregated back to their parent candidate feature (`education`).

### 2.2 Multi-Repeat Permutation Importance
Measures the drop in model $F_1$ score when candidate feature $X_j$ is randomly permuted across test observations over $n=10$ random repeats (`random_state=42`):
$$\text{Importance}_j = \text{mean} \left( F_1^{\text{original}} - F_1^{\text{permuted}(j)} \right)$$
- Conducted on original source columns **prior to preprocessing** to evaluate true feature dependence.

### 2.3 Controlled Feature Ablation & Prediction Change Rate
Evaluates model behavior when candidate feature $X_j$ is neutralized in a copy of the evaluation test set:
- **Neutralization**:
  - Numerical features: Neutralized using training-set median ($\text{median}(X_j^{\text{train}})$).
  - Categorical features: Neutralized using training-set mode ($\text{mode}(X_j^{\text{train}})$).
- **Ablation Delta**:
  $$\Delta F_1 = F_1^{\text{ablated}(j)} - F_1^{\text{original}}$$
- **Prediction Change Rate**:
  Calculates the proportion of test predictions that change when feature $X_j$ is neutralized:
  $$\text{Change Rate}_j = \frac{1}{N} \sum_{i=1}^N \mathbb{I} \left( \hat{y}_i^{\text{original}} \neq \hat{y}_i^{\text{ablated}(j)} \right)$$

---

## 3. Transparent Reliance Classification

Features are categorized based on multi-source empirical evidence:
- `STRONG MODEL-USE EVIDENCE`: Change Rate $\ge 10\%$ OR SHAP $\ge 0.08$ OR Permutation Drop $\ge 0.05$ OR $|\Delta F_1| \ge 0.05$
- `MODERATE MODEL-USE EVIDENCE`: Change Rate $\ge 3\%$ OR SHAP $\ge 0.03$ OR Permutation Drop $\ge 0.02$ OR $|\Delta F_1| \ge 0.02$
- `WEAK MODEL-USE EVIDENCE`: Change Rate $> 0\%$ OR SHAP $> 0$ OR Permutation Drop $> 0$
- `INCONCLUSIVE`: Zero contribution across all explainability metrics.

---

## 4. API Endpoints

### 4.1 Trigger Proxy Use Analysis
- **Endpoint**: `POST /api/audits/:id/proxy-use`
- **Request Body** (Optional feature filter):
  ```json
  {
    "selectedFeatures": ["education", "occupation", "marital-status"]
  }
  ```
- **Response**: Updates audit status to `PROXY_USE_COMPLETED` and returns synthesized SHAP, Permutation, Ablation, Prediction Change Rate, and Model Use evidence metrics.

### 4.2 Retrieve Proxy Use Results
- **Endpoint**: `GET /api/audits/:id/proxy-use`
- **Response**: Returns saved `proxyUseResult` object from MongoDB.
