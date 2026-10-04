import pandas as pd
import numpy as np
import math
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def clean_float(val):
    if val is None or pd.isna(val) or math.isnan(val) or math.isinf(val):
        return None
    return round(float(val), 4)

def evaluate_protected_predictability(
    df: pd.DataFrame,
    candidate_col: str,
    protected_col: str,
    random_state: int = 42
) -> dict:
    """
    Evaluates whether protected attribute A can be predicted from single candidate feature X.
    Uses 80/20 train/test split, strict preprocessor fitting on train set, and compares against
    a majority-class baseline prediction.
    """
    sub_df = df[[candidate_col, protected_col]].dropna(subset=[protected_col])
    if len(sub_df) < 10:
        return {
            'model': 'logistic_regression',
            'accuracy': None,
            'balancedAccuracy': None,
            'precision': None,
            'recall': None,
            'f1': None,
            'rocAuc': None,
            'baselinePredictability': {'accuracy': None, 'f1': None},
            'status': 'NOT_APPLICABLE',
            'explanation': 'Insufficient non-null observations for predictability evaluation.'
        }

    # Encode protected attribute target A
    le = LabelEncoder()
    y = le.fit_transform(sub_df[protected_col].astype(str))
    n_classes = len(le.classes_)

    if n_classes < 2:
        return {
            'model': 'logistic_regression',
            'accuracy': 1.0,
            'balancedAccuracy': 1.0,
            'precision': 1.0,
            'recall': 1.0,
            'f1': 1.0,
            'rocAuc': None,
            'baselinePredictability': {'accuracy': 1.0, 'f1': 1.0},
            'status': 'NOT_INFORMATIVE',
            'explanation': 'Protected attribute has only 1 unique class level.'
        }

    X = sub_df[[candidate_col]]

    # Determine stratification capability
    class_counts = pd.Series(y).value_counts()
    stratify = y if class_counts.min() >= 2 else None

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state, stratify=stratify
    )

    # Preprocessing for single candidate feature X
    is_numeric = pd.api.types.is_numeric_dtype(sub_df[candidate_col])

    if is_numeric:
        preprocessor = Pipeline([
            ('imputer', SimpleImputer(strategy='mean')),
            ('scaler', StandardScaler())
        ])
    else:
        preprocessor = Pipeline([
            ('imputer', SimpleImputer(strategy='most_frequent')),
            ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])

    try:
        X_train_proc = preprocessor.fit_transform(X_train)
        X_test_proc = preprocessor.transform(X_test)
    except Exception as e:
        return {
            'model': 'logistic_regression',
            'accuracy': None,
            'balancedAccuracy': None,
            'precision': None,
            'recall': None,
            'f1': None,
            'rocAuc': None,
            'baselinePredictability': {'accuracy': None, 'f1': None},
            'status': 'NOT_APPLICABLE',
            'explanation': f'Preprocessing error: {str(e)}'
        }

    # 1. Baseline Majority Classifier (Dummy Benchmark)
    dummy = DummyClassifier(strategy='most_frequent')
    dummy.fit(X_train_proc, y_train)
    dummy_pred = dummy.predict(X_test_proc)
    avg_mode = 'binary' if n_classes == 2 else 'macro'
    
    dummy_acc = accuracy_score(y_test, dummy_pred)
    dummy_f1 = f1_score(y_test, dummy_pred, average=avg_mode, zero_division=0)

    # 2. Single Feature Logistic Regression Classifier (X -> A)
    clf = LogisticRegression(random_state=random_state, max_iter=1000)
    try:
        clf.fit(X_train_proc, y_train)
        y_pred = clf.predict(X_test_proc)
        
        acc = accuracy_score(y_test, y_pred)
        bal_acc = balanced_accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average=avg_mode, zero_division=0)
        rec = recall_score(y_test, y_pred, average=avg_mode, zero_division=0)
        f1 = f1_score(y_test, y_pred, average=avg_mode, zero_division=0)

        # ROC-AUC computation
        roc_auc = None
        if hasattr(clf, 'predict_proba'):
            try:
                y_prob = clf.predict_proba(X_test_proc)
                if n_classes == 2:
                    roc_auc = roc_auc_score(y_test, y_prob[:, 1])
                else:
                    roc_auc = roc_auc_score(y_test, y_prob, multi_class='ovr')
            except Exception:
                roc_auc = None

        return {
            'model': 'logistic_regression',
            'accuracy': clean_float(acc),
            'balancedAccuracy': clean_float(bal_acc),
            'precision': clean_float(prec),
            'recall': clean_float(rec),
            'f1': clean_float(f1),
            'rocAuc': clean_float(roc_auc),
            'baselinePredictability': {
                'accuracy': clean_float(dummy_acc),
                'f1': clean_float(dummy_f1)
            },
            'status': 'ANALYZED',
            'explanation': 'Single-feature Logistic Regression classifier predicting protected attribute.'
        }
    except Exception as e:
        return {
            'model': 'logistic_regression',
            'accuracy': None,
            'balancedAccuracy': None,
            'precision': None,
            'recall': None,
            'f1': None,
            'rocAuc': None,
            'baselinePredictability': {
                'accuracy': clean_float(dummy_acc),
                'f1': clean_float(dummy_f1)
            },
            'status': 'NOT_APPLICABLE',
            'explanation': f'Model training error: {str(e)}'
        }
