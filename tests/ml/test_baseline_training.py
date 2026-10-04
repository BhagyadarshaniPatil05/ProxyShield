import sys
import os
import io
import pandas as pd
from sklearn.preprocessing import LabelEncoder

# Add ml-service directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml-service')))

from preprocessing.pipeline import build_preprocessing_pipeline
from models.trainer import get_baseline_model
from evaluation.performance import evaluate_classification_performance
from sklearn.model_selection import train_test_split

def test_baseline_training_flow():
    csv_content = """age,workclass,sex,income
39,State-gov,Male,<=50K
50,Self-emp-not-inc,Male,<=50K
38,Private,Male,<=50K
53,Private,Male,<=50K
28,Private,Female,<=50K
37,Private,Female,<=50K
49,Private,Female,<=50K
52,Self-emp-not-inc,Male,>50K
31,Private,Female,>50K
42,Private,Male,>50K
35,Private,Female,<=50K
45,Private,Male,>50K
"""
    df = pd.read_csv(io.StringIO(csv_content))
    
    le = LabelEncoder()
    y = le.fit_transform(df["income"])
    X = df.drop(columns=["income"])
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Preprocessing
    preprocessor = build_preprocessing_pipeline(X, model_type="random_forest")
    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)
    
    # Train Random Forest
    model = get_baseline_model("random_forest", random_state=42)
    model.fit(X_train_proc, y_train)
    
    y_pred = model.predict(X_test_proc)
    y_prob = model.predict_proba(X_test_proc) if hasattr(model, "predict_proba") else None
    
    metrics = evaluate_classification_performance(y_test, y_pred, y_prob)
    
    assert "accuracy" in metrics
    assert "precision" in metrics
    assert "recall" in metrics
    assert "f1" in metrics
    assert "confusionMatrix" in metrics
    
    print("[PASS] Python ML Service baseline training unit test passed successfully!")

if __name__ == "__main__":
    test_baseline_training_flow()
