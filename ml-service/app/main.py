from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import io
from typing import Optional

from app.config import settings
from app.schemas import HealthResponse, InspectDatasetResponse, TrainBaselineResponse, FairnessAnalysisResponse, ProxyCapacityResponse, ProxyUseResponse, FeatureAblationResponse, FairnessImpactResponse, InterventionResponse, MitigatedModelResponse, BeforeAfterResponse, FairnessUtilityRequest, FairnessUtilityResponse, GenerateReportRequest, GenerateReportResponse
from reports.generator import build_report_data_model, render_html_report, validate_audit_readiness
from preprocessing.inspector import inspect_csv_bytes
from preprocessing.pipeline import build_preprocessing_pipeline
from models.trainer import get_baseline_model
from models.mitigated import train_mitigated_model
from evaluation.experiment import get_canonical_experiment
from evaluation.before_after import run_before_after_comparison
from evaluation.fairness_utility import run_fairness_utility_analysis
from evaluation.performance import evaluate_classification_performance
from fairness.metrics import calculate_group_metrics, calculate_fairness_disparities
from fairness.fairness_impact import run_fairness_impact_analysis
from intervention.recommendation import generate_intervention_recommendation
from proxy.proxy_capacity import analyze_proxy_capacity
from explainability.proxy_use import analyze_proxy_use
from evaluation.feature_ablation import run_controlled_feature_ablation
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.VERSION,
    description="Offline AI auditing & decision-support service for ProxyShield framework."
)

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def get_health():
    """
    Health check endpoint for ProxyShield ML Service.
    """
    return HealthResponse(
        status="ok",
        service=settings.SERVICE_NAME,
        version=settings.VERSION
    )

@app.post("/inspect-dataset", response_model=InspectDatasetResponse)
async def inspect_dataset(file: UploadFile = File(...)):
    """
    Inspects an uploaded CSV dataset using Pandas/NumPy.
    Returns dataset metrics, column breakdown, and a clean row preview.
    """
    filename = file.filename or "dataset.csv"
    if not filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported."
        )

    try:
        contents = await file.read()
        result = inspect_csv_bytes(contents, filename)
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dataset inspection service failed: {str(e)}"
        )

@app.post("/train-baseline", response_model=TrainBaselineResponse)
async def train_baseline(
    file: UploadFile = File(...),
    target_attribute: str = Form(...),
    protected_attribute: str = Form(...),
    model_type: str = Form(...)
):
    """
    Trains a baseline supervised ML model (Logistic Regression, Decision Tree, or Random Forest)
    and evaluates predictive performance metrics.
    """
    if target_attribute == protected_attribute:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target and protected attributes must be different."
        )

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), na_values=["?"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse CSV dataset: {str(e)}"
        )

    if target_attribute not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target attribute '{target_attribute}' not found in dataset."
        )

    if protected_attribute not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Protected attribute '{protected_attribute}' not found in dataset."
        )

    # Execute Canonical Baseline Experiment
    try:
        exp = get_canonical_experiment(
            df,
            target_col=target_attribute,
            protected_col=protected_attribute,
            model_type=model_type,
            random_state=42
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Baseline training failed: {str(e)}"
        )

    summary_str = f"LabelEncoded target '{target_attribute}'. SimpleImputer + OneHotEncoder on {exp['modelFeatureCount']} features ({exp['encodedFeatureCount']} encoded columns). Protected attribute '{protected_attribute}' strictly excluded from model inputs."

    return {
        "success": True,
        "model": {
            "type": model_type,
            "trainRows": exp["split"]["trainRowCount"],
            "testRows": exp["split"]["testRowCount"],
            "featureCount": exp["encodedFeatureCount"]
        },
        "performance": exp["performance"],
        "preprocessingSummary": summary_str
    }

@app.post("/fairness-analysis", response_model=FairnessAnalysisResponse)
async def fairness_analysis(
    file: UploadFile = File(...),
    target_attribute: str = Form(...),
    protected_attribute: str = Form(...),
    model_type: str = Form(...),
    reference_group: Optional[str] = Form(None)
):
    """
    Calculates group fairness metrics (Demographic Parity Difference, Disparate Impact,
    Equal Opportunity Difference, Equalized Odds) on the EXACT same test-set predictions.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), na_values=["?"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse CSV dataset: {str(e)}"
        )

    if target_attribute not in df.columns or protected_attribute not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target or protected attribute not found in dataset."
        )

    try:
        exp = get_canonical_experiment(
            df,
            target_col=target_attribute,
            protected_col=protected_attribute,
            model_type=model_type,
            reference_group=reference_group,
            random_state=42
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fairness analysis failed: {str(e)}"
        )

    return {
        "success": True,
        "protectedAttribute": protected_attribute,
        "referenceGroup": exp["referenceGroup"],
        "comparisonGroups": exp["comparisonGroups"],
        "metrics": exp["fairness"]["rawMetrics"],
        "groupMetrics": exp["fairness"]["groupStats"]
    }

@app.post("/proxy-capacity", response_model=ProxyCapacityResponse)
async def proxy_capacity(
    file: UploadFile = File(...),
    target_attribute: str = Form(...),
    protected_attribute: str = Form(...)
):
    """
    Evaluates proxy capacity across all candidate features in the dataset.
    Establishes statistical association, mutual information, and single-feature predictability
    for each candidate feature relative to the protected attribute.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), na_values=["?"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse CSV dataset: {str(e)}"
        )

    if target_attribute not in df.columns or protected_attribute not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target or protected attribute not found in dataset."
        )

    try:
        analysis_res = analyze_proxy_capacity(df, target_attribute, protected_attribute)
        return {
            "success": True,
            "protectedAttribute": analysis_res["protectedAttribute"],
            "targetAttribute": analysis_res["targetAttribute"],
            "candidateFeatureCount": analysis_res["candidateFeatureCount"],
            "baselinePredictability": analysis_res["baselinePredictability"],
            "results": analysis_res["results"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Proxy capacity analysis failed: {str(e)}"
        )

@app.post("/proxy-use", response_model=ProxyUseResponse)
async def proxy_use(
    file: UploadFile = File(...),
    target_attribute: str = Form(...),
    protected_attribute: str = Form(...),
    model_type: str = Form(...),
    selected_features: Optional[str] = Form(None)
):
    """
    Evaluates proxy use / model reliance across selected candidate features.
    Computes global SHAP importance, multi-repeat permutation importance, controlled ablation delta,
    and prediction change rate on the exact baseline model.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), na_values=["?"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse CSV dataset: {str(e)}"
        )

    if target_attribute not in df.columns or protected_attribute not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target or protected attribute not found in dataset."
        )

    feature_list = [f.strip() for f in selected_features.split(',')] if selected_features else None

    try:
        analysis_res = analyze_proxy_use(
            df,
            target_col=target_attribute,
            protected_col=protected_attribute,
            model_type=model_type,
            selected_candidate_cols=feature_list
        )
        return {
            "success": True,
            "modelType": analysis_res["modelType"],
            "targetAttribute": analysis_res["targetAttribute"],
            "protectedAttribute": analysis_res["protectedAttribute"],
            "candidateFeatureCount": analysis_res["candidateFeatureCount"],
            "candidateFeatures": analysis_res["candidateFeatures"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Proxy use analysis failed: {str(e)}"
        )

@app.post("/feature-ablation", response_model=FeatureAblationResponse)
async def feature_ablation(
    file: UploadFile = File(...),
    target_attribute: str = Form(...),
    protected_attribute: str = Form(...),
    model_type: str = Form(...),
    selected_features: Optional[str] = Form(None)
):
    """
    Executes Phase 7 Controlled Feature Ablation experiments across selected candidate features.
    Neutralizes candidate features on the exact trained baseline model test split using training-set
    derived statistics (median for numeric, mode for categorical), evaluating performance deltas,
    prediction change rates, and confusion matrix shifts.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), na_values=["?"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse CSV dataset: {str(e)}"
        )

    if target_attribute not in df.columns or protected_attribute not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target or protected attribute not found in dataset."
        )

    feature_list = [f.strip() for f in selected_features.split(',')] if selected_features else None

    try:
        ablation_res = run_controlled_feature_ablation(
            df,
            target_col=target_attribute,
            protected_col=protected_attribute,
            model_type=model_type,
            selected_candidate_cols=feature_list
        )
        return {
            "success": True,
            "modelType": ablation_res["modelType"],
            "targetAttribute": ablation_res["targetAttribute"],
            "protectedAttribute": ablation_res["protectedAttribute"],
            "testRows": ablation_res["testRows"],
            "candidateFeatureCount": ablation_res["candidateFeatureCount"],
            "baselinePerformance": ablation_res.get("baselinePerformance"),
            "features": ablation_res["features"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Controlled feature ablation experiment failed: {str(e)}"
        )

@app.post("/fairness-impact", response_model=FairnessImpactResponse)
async def fairness_impact(
    file: UploadFile = File(...),
    target_attribute: str = Form(...),
    protected_attribute: str = Form(...),
    model_type: str = Form(...),
    selected_features: Optional[str] = Form(None),
    reference_group: Optional[str] = Form(None)
):
    """
    Executes Phase 8 Fairness Impact Analysis across selected candidate proxy features.
    Measures baseline vs ablated group fairness disparities (DPD, Disparate Impact, EOD, Equalized Odds)
    when candidate proxy features are neutralized on copy test observations.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), na_values=["?"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse CSV dataset: {str(e)}"
        )

    if target_attribute not in df.columns or protected_attribute not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target or protected attribute not found in dataset."
        )

    feature_list = [f.strip() for f in selected_features.split(',')] if selected_features else None

    try:
        impact_res = run_fairness_impact_analysis(
            df,
            target_col=target_attribute,
            protected_col=protected_attribute,
            model_type=model_type,
            selected_candidate_cols=feature_list,
            reference_group=reference_group
        )
        return {
            "success": True,
            "modelType": impact_res["modelType"],
            "targetAttribute": impact_res["targetAttribute"],
            "protectedAttribute": impact_res["protectedAttribute"],
            "referenceGroup": impact_res["referenceGroup"],
            "comparisonGroups": impact_res["comparisonGroups"],
            "testRows": impact_res["testRows"],
            "candidateFeatureCount": impact_res["candidateFeatureCount"],
            "baselineFairness": impact_res.get("baselineFairness"),
            "baselineGroupMetrics": impact_res.get("baselineGroupMetrics"),
            "experiments": impact_res["experiments"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fairness impact analysis failed: {str(e)}"
        )

@app.post("/intervention", response_model=InterventionResponse)
async def intervention(
    file: UploadFile = File(...),
    target_attribute: str = Form(...),
    protected_attribute: str = Form(...),
    selected_features: Optional[str] = Form(None)
):
    """
    Executes Phase 9 Proxy Intervention Analysis:
    Synthesizes empirical signals to formulate rule-based intervention recommendations
    (RECOMMEND_INTERVENTION, REVIEW_REQUIRED, DO_NOT_INTERVENE) and records a controlled
    intervention configuration (REMOVE_FEATURE) without dataset mutation or model retraining.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), na_values=["?"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse CSV dataset: {str(e)}"
        )

    if target_attribute not in df.columns or protected_attribute not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target or protected attribute not found in dataset."
        )

    feature_list = [f.strip() for f in selected_features.split(',')] if selected_features else None

    try:
        interv_res = generate_intervention_recommendation(
            df,
            target_col=target_attribute,
            protected_col=protected_attribute,
            selected_candidate_cols=feature_list
        )
        return {
            "success": True,
            "targetAttribute": interv_res["targetAttribute"],
            "protectedAttribute": interv_res["protectedAttribute"],
            "candidateFeatureCount": interv_res["candidateFeatureCount"],
            "recommendedFeatureCount": interv_res["recommendedFeatureCount"],
            "strategy": interv_res["strategy"],
            "selectedFeatures": interv_res["selectedFeatures"],
            "decisionStatus": interv_res["decisionStatus"],
            "candidates": interv_res["candidates"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Proxy intervention recommendation failed: {str(e)}"
        )

@app.post("/train-mitigated", response_model=MitigatedModelResponse)
async def train_mitigated(
    file: UploadFile = File(...),
    target_attribute: str = Form(...),
    protected_attribute: str = Form(...),
    model_type: str = Form(...),
    selected_features: str = Form(...),
    strategy: Optional[str] = Form("REMOVE_FEATURE")
):
    """
    Executes Phase 10 Mitigated Model Training:
    Retrains a supervised machine learning model (Logistic Regression, Decision Tree, or Random Forest)
    after applying the controlled proxy intervention (REMOVE_FEATURE) on the original dataset features.
    
    Guarantees baseline immutability, dataset non-mutation, and exact reproducible split alignment.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), na_values=["?"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse CSV dataset: {str(e)}"
        )

    feature_list = [f.strip() for f in selected_features.split(',') if f.strip()]
    if not feature_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No intervention features provided for mitigation."
        )

    try:
        mitigated_res = train_mitigated_model(
            df,
            target_col=target_attribute,
            protected_col=protected_attribute,
            model_type=model_type,
            selected_features=feature_list,
            strategy=strategy or "REMOVE_FEATURE"
        )
        return {
            "success": True,
            **mitigated_res
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Mitigated model training failed: {str(e)}"
        )

@app.post("/before-after", response_model=BeforeAfterResponse)
async def before_after(
    file: UploadFile = File(...),
    target_attribute: str = Form(...),
    protected_attribute: str = Form(...),
    model_type: str = Form(...),
    selected_features: str = Form(...),
    strategy: Optional[str] = Form("REMOVE_FEATURE"),
    reference_group: Optional[str] = Form(None)
):
    """
    Executes Phase 11 Before vs After Controlled Comparison:
    Evaluates Baseline (Control) vs Mitigated (Treatment) models on identical test observations (random_state=42).
    Calculates signed metric deltas, group-level fairness metrics, and direction-aware interpretations.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), na_values=["?"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to parse CSV dataset: {str(e)}"
        )

    feature_list = [f.strip() for f in selected_features.split(',') if f.strip()]
    if not feature_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No intervention features provided for before vs after comparison."
        )

    try:
        comp_res = run_before_after_comparison(
            df,
            target_col=target_attribute,
            protected_col=protected_attribute,
            model_type=model_type,
            selected_features=feature_list,
            strategy=strategy or "REMOVE_FEATURE",
            reference_group=reference_group
        )
        return {
            "success": True,
            **comp_res
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Before vs after comparison failed: {str(e)}"
        )

@app.post("/fairness-utility", response_model=FairnessUtilityResponse)
async def fairness_utility(req: FairnessUtilityRequest):
    """
    Executes Phase 12 Fairness-Utility Trade-off Analysis:
    Evaluates fairness changes and predictive utility changes from existing Phase 11 beforeAfterResult.
    Performs direction-aware metric classifications, threshold filtering, counts, and trade-off classification.
    """
    try:
        res = run_fairness_utility_analysis(
            before_after_result=req.beforeAfterResult,
            threshold=req.threshold if req.threshold is not None else 0.01
        )
        return {
            "success": True,
            **res
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fairness-utility trade-off analysis failed: {str(e)}"
        )

@app.post("/generate-report", response_model=GenerateReportResponse)
async def generate_report(req: GenerateReportRequest):
    """
    Executes Phase 13 AI Fairness Audit Report Generation:
    Compiles stored audit evidence across Phases 2-12 into a structured, evidence-based report data model
    and renders a standalone, print-ready HTML report. Strictly consumes stored data; NO new ML calculations.
    """
    try:
        audit_dict = req.audit
        missing_phases = validate_audit_readiness(audit_dict)
        if missing_phases:
            return {
                "success": False,
                "status": "REPORT_NOT_READY",
                "report": {},
                "htmlReport": f"<html><body><h1>Report Not Ready</h1><p>Missing phases: {', '.join(missing_phases)}</p></body></html>",
                "missingPhases": missing_phases
            }

        report_data = build_report_data_model(audit_dict)
        html_report = render_html_report(report_data)

        return {
            "success": True,
            "status": "REPORT_GENERATED",
            "report": report_data,
            "htmlReport": html_report,
            "missingPhases": []
        }
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation service failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
