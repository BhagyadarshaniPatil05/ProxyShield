# Proxy Capacity Analysis Documentation

This document describes the design, candidate feature selection rules, statistical association tests, mutual information formulas, single-feature predictability experiments, and API contracts for Phase 5: Proxy Capacity Analysis.

---

## 1. Core Methodology & Conceptual Scope

ProxyShield Phase 5 evaluates whether candidate non-protected features contain statistical information overlap with the selected protected attribute ($A$).

### Important Conceptual Distinction
- **Proxy Capacity**: Measures statistical association and single-feature predictability ($X \to A$).
- **Proxy Use**: Measures whether the trained ML decision model relies on Feature $X$ when predicting Outcome $Y$ (Evaluated in Phase 6).
- **Discrimination / Unfairness**: Evaluates fairness impact and real-world trade-offs (Evaluated in Phase 4 and Phase 7).

> **Methodological Rule**: High proxy capacity indicates that a candidate feature contains information associated with the protected attribute, but does **not** prove model reliance or illegal discrimination.

---

## 2. Candidate Proxy Feature Selection Rules

For a dataset with feature set $\mathcal{F}$, target outcome $Y$, and protected attribute $A$:

1. **Candidate Proxy Set**:
   $$\mathcal{C} = \mathcal{F} \setminus \{A, Y, \text{Identifier Columns}, \text{Constant Features}\}$$
2. **Strict Exclusions**:
   - Protected attribute $A$ is **never** a candidate feature.
   - Target outcome $Y$ is **never** a candidate feature.
3. **High-Cardinality Safeguards**:
   - Columns where unique value ratio $> 90\%$ (e.g. record IDs, sequence numbers, GUIDs) are flagged as `IDENTIFIER_EXCLUDED` to prevent misleading high ranking.
4. **Constant Feature Safeguards**:
   - Features with zero variance ($\text{nunique} \le 1$) are marked `NOT_INFORMATIVE`.

---

## 3. Statistical Analysis Metrics

For each candidate feature $X \in \mathcal{C}$ relative to protected attribute $A$:

### 3.1 Statistical Association
- **Categorical $X$ vs Categorical $A$**:
  - **Chi-Square Test**: Calculates $\chi^2$ statistic and $p$-value from contingency table.
  - **Cramér's V**:
    $$V = \sqrt{\frac{\chi^2}{N \cdot \min(k - 1, r - 1)}}$$
- **Numerical $X$ vs Categorical $A$**:
  - **ANOVA F-Test**: Calculates $F$-statistic and $p$-value across groups of $A$.
  - **Correlation Ratio ($\eta^2$)**:
    $$\eta^2 = \frac{SS_{between}}{SS_{total}}$$

### 3.2 Mutual Information $MI(X, A)$
Calculated using non-parametric $k$-nearest neighbors mutual information estimation (`mutual_info_classif`):
$$MI(X, A) = \sum_{x \in \mathcal{X}} \sum_{a \in \mathcal{A}} P(x, a) \log \left( \frac{P(x, a)}{P(x) P(a)} \right)$$

### 3.3 Protected-Attribute Predictability ($X \to A$)
Trains a single-feature classifier (`LogisticRegression`, `random_state=42`) using an 80/20 train/test split:
- Preprocessor (Imputation + Scaling / One-Hot Encoding) is fitted **strictly on the 80% train set** and applied to the 20% test set to prevent data leakage.
- Metrics evaluated on 20% test set: `accuracy`, `balancedAccuracy`, `precision`, `recall`, `f1`, `rocAuc` (when mathematically valid).
- Compared against a majority-class `DummyClassifier` benchmark.

---

## 4. Analytical Capacity Levels & Transparent Ranking

Candidate features are ranked using an implementation-defined analytical composite score ($0.0$ to $1.0$):
$$\text{Score} = 0.40 \cdot \text{BalancedAccuracy} + 0.35 \cdot \text{Normalized}(MI) + 0.25 \cdot \text{Association\_Value}$$

### Capacity Level Classifications
- `HIGH POTENTIAL PROXY CAPACITY`: Composite score $\ge 0.65$ or ($F_1 \ge 0.70$ and $MI \ge 0.15$)
- `MODERATE POTENTIAL PROXY CAPACITY`: Composite score $\ge 0.40$ or ($F_1 \ge 0.55$ or $MI \ge 0.08$)
- `LOW POTENTIAL PROXY CAPACITY`: Composite score $< 0.40$
- `NOT_INFORMATIVE`: Zero variance feature
- `IDENTIFIER_EXCLUDED`: High-cardinality unique record ID

---

## 5. API Endpoints

### 5.1 Trigger Proxy Capacity Analysis
- **Endpoint**: `POST /api/audits/:id/proxy-capacity`
- **Response**: Updates audit status to `PROXY_CAPACITY_COMPLETED` and returns full candidate feature metrics array.

### 5.2 Retrieve Proxy Capacity Results
- **Endpoint**: `GET /api/audits/:id/proxy-capacity`
- **Response**: Returns saved `proxyCapacityResult` object from MongoDB.
