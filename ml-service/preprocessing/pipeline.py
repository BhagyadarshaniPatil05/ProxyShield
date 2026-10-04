import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

def build_preprocessing_pipeline(X: pd.DataFrame, model_type: str = "random_forest") -> ColumnTransformer:
    """
    Builds a scikit-learn ColumnTransformer for numerical and categorical features.
    - Numerical: SimpleImputer(mean) + StandardScaler (for linear models)
    - Categorical: SimpleImputer(most_frequent) + OneHotEncoder(ignore unknown)
    """
    numeric_features = X.select_dtypes(include=[np.number]).columns.tolist()
    categorical_features = X.select_dtypes(exclude=[np.number]).columns.tolist()

    transformers = []

    if numeric_features:
        num_steps = [("imputer", SimpleImputer(strategy="mean"))]
        if model_type == "logistic_regression":
            num_steps.append(("scaler", StandardScaler()))
        numeric_transformer = Pipeline(steps=num_steps)
        transformers.append(("num", numeric_transformer, numeric_features))

    if categorical_features:
        cat_transformer = Pipeline(steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
        ])
        transformers.append(("cat", cat_transformer, categorical_features))

    preprocessor = ColumnTransformer(transformers=transformers, remainder="drop")
    return preprocessor
