from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier

def get_baseline_model(model_type: str, random_state: int = 42):
    """
    Factory function returning scikit-learn model instances with deterministic random_state.
    """
    model_type = model_type.lower()
    
    if model_type == "logistic_regression":
        return LogisticRegression(random_state=random_state, max_iter=1000)
    elif model_type == "decision_tree":
        return DecisionTreeClassifier(random_state=random_state)
    elif model_type == "random_forest":
        return RandomForestClassifier(random_state=random_state, n_estimators=100)
    else:
        raise ValueError(f"Unsupported model type '{model_type}'. Supported models: 'logistic_regression', 'decision_tree', 'random_forest'.")
