import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from preprocessing.pipeline import build_preprocessing_pipeline
from models.trainer import get_baseline_model
from evaluation.performance import evaluate_classification_performance

def train_mitigated_model(
    df: pd.DataFrame,
    target_col: str,
    protected_col: str,
    model_type: str,
    selected_features: List[str],
    strategy: str = "REMOVE_FEATURE"
) -> Dict[str, Any]:
    """
    Trains a mitigated machine learning model by executing a controlled proxy intervention (REMOVE_FEATURE).
    
    Guarantees:
    - Original dataset remains unchanged.
    - Baseline model & baseline metrics remain untouched.
    - Uses exact same row split (random_state=42), preprocessing pipeline, and model hyperparameters as baseline.
    - Protected attribute & target attribute are protected from feature removal.
    """
    if strategy != "REMOVE_FEATURE":
        raise ValueError(f"Unsupported intervention strategy '{strategy}'. Only 'REMOVE_FEATURE' is supported.")

    if not selected_features:
        raise ValueError("No intervention features provided for mitigation.")

    if target_col in selected_features:
        raise ValueError("Target attribute cannot be removed as an intervention feature.")

    if protected_col in selected_features:
        raise ValueError("Protected attribute cannot be removed as a proxy intervention because it is reserved for fairness auditing.")

    # Validate presence of candidate features in dataset
    for feat in selected_features:
        if feat not in df.columns:
            raise ValueError(f"Feature '{feat}' not found in dataset.")

    # Validate feature properties (reject constant features or invalid identifiers)
    for feat in selected_features:
        col_data = df[feat].dropna()
        if len(col_data) == 0 or col_data.nunique() <= 1:
            raise ValueError(f"Candidate feature '{feat}' is constant or empty and cannot be used as an intervention feature.")

    if target_col not in df.columns:
        raise ValueError(f"Target attribute '{target_col}' not found in dataset.")

    if protected_col not in df.columns:
        raise ValueError(f"Protected attribute '{protected_col}' not found in dataset.")

    # Clean missing target values
    df_clean = df.dropna(subset=[target_col]).copy()
    if len(df_clean) < 10:
        raise ValueError("Insufficient dataset samples for training (minimum 10 rows required).")

    y_raw = df_clean[target_col]
    if y_raw.nunique() < 2:
        raise ValueError("Target attribute must contain at least 2 unique classes for classification.")

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(y_raw)

    # Base feature set (excluding target and protected attribute from model input)
    drop_cols = [target_col]
    if protected_col in df_clean.columns:
        drop_cols.append(protected_col)

    X_baseline = df_clean.drop(columns=[c for c in drop_cols if c in df_clean.columns])
    original_feature_count = X_baseline.shape[1]

    # Mitigated feature set (remove selected features)
    X_mitigated = X_baseline.drop(columns=selected_features, errors="ignore")
    mitigated_feature_count = X_mitigated.shape[1]
    removed_feature_count = original_feature_count - mitigated_feature_count

    if mitigated_feature_count == 0:
        raise ValueError("Cannot remove all features. At least one feature must remain for model training.")

    # Deterministic train/test split matching baseline (80/20 split, random_state=42)
    try:
        stratify_y = y if pd.Series(y).value_counts().min() >= 2 else None
        X_train, X_test, y_train, y_test = train_test_split(
            X_mitigated, y, test_size=0.2, random_state=42, stratify=stratify_y
        )
    except Exception:
        X_train, X_test, y_train, y_test = train_test_split(
            X_mitigated, y, test_size=0.2, random_state=42
        )

    # Build and fit preprocessing pipeline on mitigated features
    preprocessor = build_preprocessing_pipeline(X_mitigated, model_type=model_type)
    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)

    # Instantiate model with exact same baseline random_state
    model = get_baseline_model(model_type, random_state=42)
    model.fit(X_train_proc, y_train)

    # Predict & Evaluate
    y_pred = model.predict(X_test_proc)
    y_prob = None
    if hasattr(model, "predict_proba"):
        try:
            y_prob = model.predict_proba(X_test_proc)
        except Exception:
            y_prob = None

    metrics = evaluate_classification_performance(y_test, y_pred, y_prob)

    return {
        "status": "COMPLETED",
        "strategy": strategy,
        "selectedFeatures": selected_features,
        "removedFeatures": selected_features,
        "modelType": model_type,
        "targetAttribute": target_col,
        "protectedAttribute": protected_col,
        "trainRows": len(X_train),
        "testRows": len(X_test),
        "originalFeatureCount": original_feature_count,
        "mitigatedFeatureCount": mitigated_feature_count,
        "removedFeatureCount": removed_feature_count,
        "performance": metrics,
        "testPredictions": y_pred.tolist(),
        "testTrue": y_test.tolist()
    }
