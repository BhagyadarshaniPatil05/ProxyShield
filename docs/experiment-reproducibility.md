# ProxyShield — Baseline Experiment Reproducibility & Technical Specification

## 1. Overview & Problem Statement

During full pipeline verification of **ProxyShield**, a numerical discrepancy was detected between baseline fairness results reported in earlier analytical phases (Phase 4 Baseline Fairness, Phase 8 Fairness Impact) and later comparative phases (Phase 11 Before-vs-After Comparison, Phase 12 Fairness–Utility Trade-off).

### Historical Discrepancy Observed

| Metric | Phase 4 & Phase 8 Baseline | Phase 11 & Phase 12 Baseline | Status Prior to Correction |
| :--- | :---: | :---: | :---: |
| **Demographic Parity Difference (DPD)** | `0.1782` | `0.1802` | Discrepancy (`+0.0020`) |
| **Disparate Impact Ratio (DI)** | `0.3841` | `0.2526` | Discrepancy (`-0.1315`) |
| **Equal Opportunity Difference (EOD)** | `0.1245` | `0.0984` | Discrepancy (`-0.0261`) |
| **Equalized Odds TPR Difference** | `0.1245` | `0.0984` | Discrepancy (`-0.0261`) |
| **Equalized Odds FPR Difference** | `0.0412` | `0.0617` | Discrepancy (`+0.0205`) |

Even though both baseline runs reported using an 80/20 train/test split with `random_state = 42`, the numerical values differed materially, invalidating rigorous scientific comparison.

---

## 2. Root Cause Analysis

A thorough code audit revealed the exact root cause of the numerical mismatch:

1. **Phase 4 & Phase 8 Feature Matrix Scope**:
   In Phase 4 (`POST /fairness-analysis`) and Phase 8 (`fairness_impact.py`), the model input feature matrix $X$ included the protected attribute column (`sex`), resulting in a **15-feature input matrix**.

2. **Phase 11 & Phase 12 Feature Matrix Scope**:
   In Phase 11 (`before_after.py`) and Phase 12 (`fairness_utility.py`), the protected attribute (`sex`) was explicitly dropped from model input features $X$, producing a **14-feature input matrix**.

3. **Impact on Prediction Generation**:
   Training the baseline model (Random Forest / Logistic Regression) on 15 features vs. 14 features produced two distinctly trained estimator weight sets. Consequently, out-of-sample predictions $y_{\text{pred}}$ differed across test instances, altering the confusion matrices and producing non-identical fairness metrics.

---

## 3. Canonical Baseline Experiment Specification

To resolve this discrepancy permanently, ProxyShield establishes a single, authoritative, shared baseline experiment module located at `ml-service/evaluation/experiment.py` via `get_canonical_experiment(...)`.

### Key Design Principles

1. **Strict Feature Scoping Rule**:
   The protected attribute ($A$) and target attribute ($y$) are **strictly excluded** from the model feature input matrix $X$:
   $$X = \text{Dataset} \setminus \{\text{target\_col}, \text{protected\_col}\}$$
   The protected attribute is reserved exclusively as an unmodeled audit grouping variable $A_{\text{test}}$ for evaluating demographic disparities.

2. **Deterministic Dataset Fingerprinting**:
   Each baseline experiment execution computes a deterministic SHA-256 fingerprint of the raw dataset:
   $$\text{SHA256}(\text{df.to\_csv(index=False)})$$
   This guarantees that baseline evaluations across Phase 4, Phase 8, Phase 11, and Phase 12 operate on the exact same dataset version.

3. **Deterministic Partitioning**:
   - Test size: `0.2` (80% Train, 20% Test)
   - Random seed: `random_state = 42`
   - Stratification on target variable $y$ (fallback to unstratified split if class count < 2)
   - Exact train/test row index tracking (`idx_train`, `idx_test`).

4. **Isolated Preprocessing Pipeline**:
   The `build_preprocessing_pipeline` object is fitted strictly on $X_{\text{train}}$ and transforms both $X_{\text{train}}$ and $X_{\text{test}}$, preventing data leakage.

5. **Single Baseline Model Instantiation**:
   The baseline model estimator (Random Forest with `n_estimators=100, random_state=42`) is trained strictly on $X_{\text{train, proc}}$ and evaluated on $X_{\text{test, proc}}$.

---

## 4. Verification & Benchmark Parity Results

Following refactoring of Phase 4 (`app/main.py`), Phase 8 (`fairness_impact.py`), Phase 11 (`before_after.py`), and Phase 12 (`fairness_utility.py`) to consume `get_canonical_experiment(...)`, empirical verification was performed on the Adult Census Income dataset (`adult.csv`).

### Prediction Verification

| Stage | Baseline Test Sample Count | Prediction Mismatches vs Phase 4 | Match Percentage |
| :--- | :---: | :---: | :---: |
| **Phase 4 Baseline Fairness** | 6,513 | 0 | **100.0%** |
| **Phase 8 Fairness Impact** | 6,513 | 0 | **100.0%** |
| **Phase 11 Before-vs-After** | 6,513 | 0 | **100.0%** |
| **Phase 12 Fairness–Utility** | 6,513 | 0 | **100.0%** |

### Fairness Metrics Equality Verification

| Metric | Phase 4 | Phase 8 | Phase 11 | Phase 12 | Exact Equality |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Demographic Parity Difference (DPD)** | `0.1802` | `0.1802` | `0.1802` | `0.1802` | **VERIFIED** |
| **Disparate Impact Ratio (DI)** | `0.2526` | `0.2526` | `0.2526` | `0.2526` | **VERIFIED** |
| **Equal Opportunity Difference (EOD)** | `0.0984` | `0.0984` | `0.0984` | `0.0984` | **VERIFIED** |
| **Equalized Odds TPR Difference** | `0.0984` | `0.0984` | `0.0984` | `0.0984` | **VERIFIED** |
| **Equalized Odds FPR Difference** | `0.0617` | `0.0617` | `0.0617` | `0.0617` | **VERIFIED** |

---

## 5. UI Audit Provenance & Verification

The Audit Results UI (`AuditResults.jsx`) displays a dedicated **Experiment Reproducibility & Audit Provenance** card containing:
- **Dataset Fingerprint**: SHA-256 hash preview.
- **Split Parameters**: 80/20 Train/Test split, `random_state = 42`.
- **Feature Scoping**: Protected attribute explicitly excluded from model features $X$.
- **Baseline Parity Badge**: `100% Prediction Match Across All Audit Phases`.

---

## 6. Audit Verdict

> **REPRODUCIBILITY VERIFIED AFTER CORRECTION**  
> All baseline analytical phases (Phase 4, Phase 8, Phase 11, Phase 12) now share a single canonical baseline experiment generator (`get_canonical_experiment`), achieving 100% bitwise prediction identity (0 mismatches) and identical fairness metric values across the entire ProxyShield pipeline.
