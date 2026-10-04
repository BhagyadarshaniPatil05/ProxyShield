# ProxyShield Research Methodology

ProxyShield is an offline AI auditing and decision-support framework designed for supervised machine-learning models trained on structured datasets. It provides a formal, repeatable research methodology for auditing proxy bias without relying on ad-hoc heuristic scoring or generic fairness dashboards.

---

## The 6-Stage Research Methodology Pipeline

```
Proxy Capacity → Proxy Use → Fairness Impact → Proxy Intervention → Fairness–Utility Trade-off → Human Review
```

---

### Stage 1: Proxy Capacity Evaluation
- **Objective**: Measure the extent to which non-protected features in a dataset encode or predict sensitive protected attributes (e.g., race, gender, age).
- **Core Concept**: A feature $X_j$ possesses high proxy capacity relative to sensitive attribute $A$ if knowing $X_j$ significantly reduces uncertainty about $A$.
- **Analytical Methods**:
  - Mutual Information $I(X_j; A)$
  - Information Gain & Normalized Mutual Information
  - Conditional Association & Cramer's V (for categorical variables)

---

### Stage 2: Proxy Use Analysis (Model Reliance)
- **Objective**: Determine whether the trained machine-learning model actually relies on high-capacity proxy features when making predictions for target outcome $Y$.
- **Core Concept**: A feature can have high proxy capacity, but if the model does not utilize it during decision-making, it does not contribute to model-driven proxy bias.
- **Analytical Methods**:
  - SHAP (SHapley Additive exPlanations) global feature importance values $\sum |\phi_j|$.
  - SHAP dependence plots revealing interactions between proxy features and protected groups.

---

### Stage 3: Fairness Impact Assessment
- **Objective**: Evaluate baseline group fairness disparities across protected demographic groups under the model's predictions.
- **Core Concept**: Measure quantitative disparities between privileged ($A=1$) and unprivileged ($A=0$) groups across standard group fairness metrics.
- **Analytical Metrics**:
  - **Demographic Parity Difference**: $P(\hat{Y}=1 | A=1) - P(\hat{Y}=1 | A=0)$
  - **Disparate Impact Ratio**: $\frac{P(\hat{Y}=1 | A=0)}{P(\hat{Y}=1 | A=1)}$
  - **Equalized Odds Difference**: Disparity in True Positive Rate (TPR) and False Positive Rate (FPR) across groups.

---

### Stage 4: Proxy Intervention
- **Objective**: Test targeted feature mitigation strategies to eliminate or reduce proxy bias.
- **Core Concept**: Evaluate how model behavior changes when suspected proxy features are modified or removed.
- **Intervention Strategies**:
  - **Feature Removal (Ablation)**: Excluding identified proxy features $X_{\text{proxy}}$ from the feature matrix prior to model training.
  - **Threshold Adjustments & Post-Processing**: Group-specific decision threshold calibration.

---

### Stage 5: Fairness–Utility Trade-off Analysis
- **Objective**: Quantify predictive performance retention versus fairness improvements across baseline and post-intervention models.
- **Core Concept**: Compare baseline model $M_0$ and intervened model $M_1$ on both utility (Accuracy, ROC-AUC, F1 Score) and fairness metrics.
- **Outcome**: Pareto-frontier analysis illustrating the exact cost in accuracy required to achieve measurable fairness gains.

---

### Stage 6: Human Review & Evidence Reporting
- **Objective**: Provide structured, auditable evidence and visual metrics to assist human experts in making final deployment decisions.
- **Core Concept**: AI auditing is a decision-support process; human domain experts retain final decision authority based on generated evidence.
- **Deliverables**: Comprehensive technical audit reports, feature proxy risk rankings, and trade-off comparison matrices.
