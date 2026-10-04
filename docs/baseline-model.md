# Baseline Model Training & Performance Evaluation Documentation

This document describes the design, preprocessing pipeline, model trainers, evaluation metrics, and API contracts for Phase 3: Baseline ML Model Training & Performance Evaluation.

---

## 1. Supported Supervised ML Models

ProxyShield supports three scikit-learn baseline classifier models:

1. **Logistic Regression (`logistic_regression`)**: Linear classifier using `sklearn.linear_model.LogisticRegression(random_state=42, max_iter=1000)` with `StandardScaler` applied to numerical features.
2. **Decision Tree (`decision_tree`)**: Non-linear tree classifier using `sklearn.tree.DecisionTreeClassifier(random_state=42)`.
3. **Random Forest (`random_forest`)**: Ensemble tree classifier using `sklearn.ensemble.RandomForestClassifier(random_state=42, n_estimators=100)`.

---

## 2. Preprocessing & Train/Test Pipeline

```
Raw CSV Dataset
  ↓
Separate Target Outcome (Y) & Features (X)
  ↓
80% Training Split / 20% Testing Split (random_state = 42, stratified)
  ↓
ColumnTransformer Preprocessing:
  ├── Numeric Features: SimpleImputer(mean) [+ StandardScaler for Logistic Regression]
  └── Categorical Features: SimpleImputer(most_frequent) + OneHotEncoder(ignore unknown)
  ↓
Fit Model on Transformed Train Set
  ↓
Evaluate Predictions & Probabilities on Independent Test Set
```

---

## 3. Evaluated Performance Metrics

All metrics are calculated strictly on the 20% independent test split:

- **Accuracy**: Proportion of correct predictions.
- **Precision**: Positive predictive rate (`binary` for 2 classes, `macro` for multiclass).
- **Recall**: True positive rate (`binary` for 2 classes, `macro` for multiclass).
- **F1 Score**: Harmonic mean of precision and recall.
- **ROC-AUC**: Area under Receiver Operating Characteristic curve (evaluated when binary probability output is valid).
- **Confusion Matrix**: 2D matrix of actual vs. predicted label counts.

---

## 4. API Endpoints

### 4.1 Create Audit Task Configuration
- `POST /api/audits`
- Request: `{"datasetId": "...", "targetAttribute": "income", "protectedAttribute": "sex", "modelType": "random_forest"}`
- Response Status: `201 Created`

### 4.2 Execute Baseline Training
- `POST /api/audits/:id/baseline`
- Relays stream to Python FastAPI `POST /train-baseline`
- Stores results in MongoDB and updates status to `BASELINE_COMPLETED`.

---

## 5. Privacy & Reproducibility Notice

- **Reproducibility**: All random operations (train/test split, model initialization) use deterministic seed `random_state = 42`.
- **Privacy**: Raw CSV dataset contents are **never** stored in MongoDB.
- **Disclaimer**: *"Baseline performance evaluation establishes predictive classification accuracy. No proxy capacity scoring or fairness disparity analysis is performed during Phase 3."*
