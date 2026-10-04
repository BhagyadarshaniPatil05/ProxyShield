# ProxyShield Testing & Verification Guide

This document outlines testing strategies and verification commands for ProxyShield services.

---

## 1. Unit & Automated Test Execution

### 1.1 Python ML Unit Tests
Run from `ml-service/`:
```bash
# CSV inspection unit test
.\venv\Scripts\python.exe ..\tests\ml\test_inspector.py

# Baseline ML training unit test
.\venv\Scripts\python.exe ..\tests\ml\test_baseline_training.py
```

---

## 2. Verification Criteria for Phase 3

- [x] Dataset selected from MongoDB uploaded datasets list.
- [x] Target attribute $Y$ selected.
- [x] Protected attribute $A$ selected.
- [x] Baseline model selected (`logistic_regression`, `decision_tree`, `random_forest`).
- [x] Validation rules enforced (target != protected).
- [x] 80/20 train/test split with `random_state = 42`.
- [x] Missing value imputation + OneHotEncoder categorical preprocessing.
- [x] Accuracy, Precision, Recall, F1-Score, ROC-AUC, Confusion Matrix calculated on test split.
- [x] Baseline training results persisted in MongoDB.
- [x] React UI renders baseline predictive performance metrics without fake fairness/proxy scores.
