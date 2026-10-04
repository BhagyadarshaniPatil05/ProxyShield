import hashlib
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from preprocessing.pipeline import build_preprocessing_pipeline
from models.trainer import get_baseline_model
from evaluation.performance import evaluate_classification_performance
from fairness.metrics import calculate_group_metrics, calculate_fairness_disparities

def compute_dataset_hash(df: pd.DataFrame) -> str:
    """
    Computes a deterministic SHA-256 fingerprint for a DataFrame.
    """
    csv_bytes = df.to_csv(index=False).encode('utf-8')
    return hashlib.sha256(csv_bytes).hexdigest()

def get_canonical_experiment(
    df: pd.DataFrame,
    target_col: str,
    protected_col: str,
    model_type: str = "random_forest",
    reference_group: Optional[str] = None,
    random_state: int = 42,
    test_size: float = 0.2
) -> Dict[str, Any]:
    """
    Constructs and executes the single authoritative canonical baseline experiment for ProxyShield.
    
    Ensures:
    1. Deterministic dataset fingerprint (SHA-256 hash, row/col count).
    2. Strict attribute scoping: target_col is encoded y; protected_col is recorded as audit variable A;
       model features X strictly exclude both target_col and protected_col.
    3. Deterministic 80/20 train/test split with random_state=42 and stratify.
    4. Exact row index tracking for experiment reproducibility.
    5. Intact preprocessing pipeline fitted ONLY on X_train.
    6. Baseline model trained on X_train_proc.
    7. Identical prediction generation, performance metrics, group metrics, and fairness disparities.
    """
    if target_col not in df.columns or protected_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' or protected column '{protected_col}' not found in dataset.")

    dataset_hash = compute_dataset_hash(df)
    row_count = len(df)
    col_count = len(df.columns)
    column_names = list(df.columns)

    # 1. Clean missing target rows
    df_clean = df.dropna(subset=[target_col]).copy()
    if len(df_clean) < 10:
        raise ValueError("Insufficient dataset samples for baseline experiment (minimum 10 rows required).")

    y_raw = df_clean[target_col]
    A_raw = df_clean[protected_col].astype(str)

    if y_raw.nunique() < 2:
        raise ValueError("Target attribute must contain at least 2 unique classes for classification.")

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)

    # 2. Model Feature Matrix X strictly excludes target and protected attributes
    drop_cols = [target_col, protected_col]
    X = df_clean.drop(columns=[c for c in drop_cols if c in df_clean.columns])
    model_features = list(X.columns)

    if X.shape[1] == 0:
        raise ValueError("No feature columns remaining for model training after excluding target and protected attributes.")

    # 3. Deterministic train/test partition (80/20, random_state=42)
    try:
        stratify_y = y if pd.Series(y).value_counts().min() >= 2 else None
        X_train, X_test, y_train, y_test, A_train, A_test, idx_train, idx_test = train_test_split(
            X, y, A_raw, df_clean.index, test_size=test_size, random_state=random_state, stratify=stratify_y
        )
    except Exception:
        X_train, X_test, y_train, y_test, A_train, A_test, idx_train, idx_test = train_test_split(
            X, y, A_raw, df_clean.index, test_size=test_size, random_state=random_state
        )

    # 4. Preprocessing Pipeline fitted strictly on X_train
    preprocessor = build_preprocessing_pipeline(X, model_type=model_type)
    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)

    # 5. Baseline Model Training
    model = get_baseline_model(model_type, random_state=random_state)
    model.fit(X_train_proc, y_train)

    # 6. Prediction Generation
    y_pred = model.predict(X_test_proc)
    y_prob = None
    if hasattr(model, "predict_proba"):
        try:
            y_prob = model.predict_proba(X_test_proc)
        except Exception:
            y_prob = None

    # 7. Classification Performance Metrics
    perf_metrics = evaluate_classification_performance(y_test, y_pred, y_prob)

    # 8. Group Metrics & Fairness Disparities
    group_stats = calculate_group_metrics(y_test, y_pred, A_test.values)
    fairness_res = calculate_fairness_disparities(group_stats, reference_group=reference_group)

    ref_group = fairness_res.get("referenceGroup", "")
    comp_groups = fairness_res.get("comparisonGroups", [])
    raw_fairness_metrics = fairness_res.get("metrics", {})

    dpd_val = raw_fairness_metrics.get("demographicParityDifference")
    di_val = raw_fairness_metrics.get("disparateImpact")
    eod_val = raw_fairness_metrics.get("equalOpportunityDifference")
    eq_odds_val = raw_fairness_metrics.get("equalizedOdds", {})

    return {
        "datasetHash": dataset_hash,
        "rowCount": row_count,
        "colCount": col_count,
        "columnNames": column_names,
        "targetAttribute": target_col,
        "protectedAttribute": protected_col,
        "modelType": model_type,
        "referenceGroup": ref_group,
        "comparisonGroups": comp_groups,
        "split": {
            "testSize": test_size,
            "randomState": random_state,
            "trainRowCount": len(X_train),
            "testRowCount": len(X_test),
            "trainIndices": idx_train.tolist(),
            "testIndices": idx_test.tolist()
        },
        "modelFeatures": model_features,
        "modelFeatureCount": len(model_features),
        "encodedFeatureCount": X_train_proc.shape[1],
        "model": model,
        "preprocessor": preprocessor,
        "labelEncoder": label_encoder,
        "df_clean": df_clean,
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "A_train": A_train,
        "A_test": A_test,
        "y_pred": y_pred,
        "y_prob": y_prob,
        "performance": perf_metrics,
        "fairness": {
            "dpd": dpd_val,
            "di": di_val,
            "eod": eod_val,
            "equalizedOdds": eq_odds_val,
            "groupStats": group_stats,
            "rawMetrics": raw_fairness_metrics
        }
    }
