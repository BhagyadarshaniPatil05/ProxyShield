from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class HealthResponse(BaseModel):
    status: str
    service: str
    version: Optional[str] = None

class ColumnDetailSchema(BaseModel):
    name: str
    dataType: str
    missingCount: int
    missingPercentage: float
    uniqueCount: int
    isNumeric: bool
    isCategorical: bool
    sampleValues: List[Any]

class DatasetMetadataSchema(BaseModel):
    name: str
    rows: int
    columns: int
    columnNames: List[str]
    dataTypes: Dict[str, str]
    missingValues: Dict[str, int]
    missingPercentage: Dict[str, float]
    totalMissingValues: int
    duplicateRows: int
    columnDetails: List[ColumnDetailSchema]

class InspectDatasetResponse(BaseModel):
    success: bool
    dataset: DatasetMetadataSchema
    preview: List[Dict[str, Any]]

class PerformanceMetricsSchema(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1: float
    rocAuc: Optional[float] = None
    confusionMatrix: List[List[int]]

class ModelInfoSchema(BaseModel):
    type: str
    trainRows: int
    testRows: int
    featureCount: int

class TrainBaselineResponse(BaseModel):
    success: bool
    model: ModelInfoSchema
    performance: PerformanceMetricsSchema
    preprocessingSummary: str

class GroupMetricSchema(BaseModel):
    group: str
    sampleCount: int
    positivePredictionCount: int
    selectionRate: Optional[float] = None
    truePositiveRate: Optional[float] = None
    falsePositiveRate: Optional[float] = None
    trueNegativeRate: Optional[float] = None
    falseNegativeRate: Optional[float] = None

class EqualizedOddsSchema(BaseModel):
    tprDifference: Optional[float] = None
    fprDifference: Optional[float] = None

class FairnessMetricsSchema(BaseModel):
    demographicParityDifference: float
    disparateImpact: Optional[float] = None
    equalOpportunityDifference: Optional[float] = None
    equalizedOdds: EqualizedOddsSchema

class FairnessAnalysisResponse(BaseModel):
    success: bool
    protectedAttribute: str
    referenceGroup: str
    comparisonGroups: List[str]
    metrics: FairnessMetricsSchema
    groupMetrics: List[GroupMetricSchema]

class AssociationSchema(BaseModel):
    method: str
    value: Optional[float] = None
    pValue: Optional[float] = None
    status: str
    explanation: Optional[str] = None

class ProxyPredictabilitySchema(BaseModel):
    model: str
    accuracy: Optional[float] = None
    balancedAccuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1: Optional[float] = None
    rocAuc: Optional[float] = None

class BaselinePredictabilitySchema(BaseModel):
    accuracy: Optional[float] = None
    f1: Optional[float] = None

class CandidateProxyFeatureSchema(BaseModel):
    rank: Optional[int] = None
    feature: str
    dataType: str
    association: AssociationSchema
    mutualInformation: Optional[float] = None
    predictability: ProxyPredictabilitySchema
    rankingScore: Optional[float] = None
    capacityLevel: str
    status: str
    explanation: Optional[str] = None

class ProxyCapacityResponse(BaseModel):
    success: bool
    protectedAttribute: str
    targetAttribute: str
    candidateFeatureCount: int
    baselinePredictability: BaselinePredictabilitySchema
    results: List[CandidateProxyFeatureSchema]

class ShapMetricSchema(BaseModel):
    meanAbsoluteValue: Optional[float] = None
    relativeImportance: Optional[float] = None
    rank: Optional[int] = None

class PermutationMetricSchema(BaseModel):
    meanImportance: Optional[float] = None
    stdImportance: Optional[float] = None

class AblationMetricSchema(BaseModel):
    originalF1: Optional[float] = None
    ablatedF1: Optional[float] = None
    f1Delta: Optional[float] = None
    predictionChangeRate: Optional[float] = None
    changedPredictionCount: Optional[int] = None

class ProxyUseCandidateSchema(BaseModel):
    feature: str
    shap: ShapMetricSchema
    permutation: PermutationMetricSchema
    ablation: AblationMetricSchema
    modelUseEvidence: str

class ProxyUseResponse(BaseModel):
    success: bool
    modelType: str
    targetAttribute: str
    protectedAttribute: str
    candidateFeatureCount: int
    candidateFeatures: List[ProxyUseCandidateSchema]

class AblatedPerformanceSchema(BaseModel):
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1: Optional[float] = None
    rocAuc: Optional[float] = None

class AblationDeltaSchema(BaseModel):
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1: Optional[float] = None
    rocAuc: Optional[float] = None

class SingleFeatureAblationSchema(BaseModel):
    featureName: str
    featureType: str
    neutralizationStrategy: str
    neutralizationValue: Optional[str] = None
    baselinePerformance: Optional[AblatedPerformanceSchema] = None
    ablatedPerformance: Optional[AblatedPerformanceSchema] = None
    performanceDelta: Optional[AblationDeltaSchema] = None
    deltas: Optional[Dict[str, Optional[float]]] = None
    baselineSelectionRate: Optional[float] = None
    ablatedSelectionRate: Optional[float] = None
    selectionRateDelta: Optional[float] = None
    predictionChangeRate: Optional[float] = None
    changedPredictionCount: Optional[int] = None
    totalSampleCount: Optional[int] = None
    meanProbabilityChange: Optional[float] = None
    baselineConfusionMatrix: Optional[List[List[int]]] = None
    ablatedConfusionMatrix: Optional[List[List[int]]] = None
    analyticalObservation: Optional[str] = None
    observations: Optional[str] = None
    error: Optional[str] = None

class FeatureAblationResponse(BaseModel):
    success: bool
    modelType: str
    targetAttribute: str
    protectedAttribute: str
    testRows: int
    candidateFeatureCount: int
    baselinePerformance: Optional[AblatedPerformanceSchema] = None
    features: List[SingleFeatureAblationSchema]

class FairnessImpactExperimentSchema(BaseModel):
    feature: str
    featureName: str
    featureType: str
    neutralizationStrategy: str
    neutralizationValue: Optional[str] = None
    baselineFairness: Optional[Dict[str, Any]] = None
    ablatedFairness: Optional[Dict[str, Any]] = None
    fairnessDelta: Optional[Dict[str, Any]] = None
    groupStatisticsBaseline: Optional[List[GroupMetricSchema]] = None
    groupStatisticsAblated: Optional[List[GroupMetricSchema]] = None
    evidenceSummary: Optional[str] = None
    interpretation: Optional[str] = None
    observations: Optional[str] = None
    error: Optional[str] = None

class FairnessImpactResponse(BaseModel):
    success: bool
    modelType: str
    targetAttribute: str
    protectedAttribute: str
    referenceGroup: str
    comparisonGroups: List[str]
    testRows: int
    candidateFeatureCount: int
    baselineFairness: Optional[Dict[str, Any]] = None
    baselineGroupMetrics: Optional[List[GroupMetricSchema]] = None
    experiments: List[FairnessImpactExperimentSchema]

class InterventionCandidateSchema(BaseModel):
    feature: str
    featureName: str
    evidence: Optional[Dict[str, Any]] = None
    recommendation: str
    selected: bool
    strategy: str
    rationale: str

class InterventionResponse(BaseModel):
    success: bool
    targetAttribute: str
    protectedAttribute: str
    candidateFeatureCount: int
    recommendedFeatureCount: int
    strategy: str
    selectedFeatures: List[str]
    decisionStatus: str
    candidates: List[InterventionCandidateSchema]

class MitigatedModelResponse(BaseModel):
    success: bool
    status: str
    strategy: str
    selectedFeatures: List[str]
    removedFeatures: List[str]
    modelType: str
    targetAttribute: str
    protectedAttribute: str
    trainRows: int
    testRows: int
    originalFeatureCount: int
    mitigatedFeatureCount: int
    removedFeatureCount: int
    performance: PerformanceMetricsSchema
    testPredictions: Optional[List[int]] = None
    testTrue: Optional[List[int]] = None

class BeforeAfterComparisonSchema(BaseModel):
    status: str
    referenceGroup: str
    comparisonGroups: List[str]
    baseline: Dict[str, Any]
    mitigated: Dict[str, Any]
    performanceDelta: Dict[str, Any]
    fairnessDelta: Dict[str, Any]
    metricInterpretations: Dict[str, str]
    fairnessInterpretation: str
    fairnessInterpretationDetails: str
    performanceInterpretation: str
    performanceInterpretationDetails: str
    methodologyNotes: List[str]

class BeforeAfterResponse(BaseModel):
    success: bool
    status: str
    referenceGroup: str
    comparisonGroups: List[str]
    baseline: Dict[str, Any]
    mitigated: Dict[str, Any]
    performanceDelta: Dict[str, Any]
    fairnessDelta: Dict[str, Any]
    metricInterpretations: Dict[str, str]
    fairnessInterpretation: str
    fairnessInterpretationDetails: str
    performanceInterpretation: str
    performanceInterpretationDetails: str
    methodologyNotes: List[str]

class MetricTradeoffSchema(BaseModel):
    metric: str
    key: str
    before: float
    after: float
    delta: float
    direction: str
    interpretation: str

class FairnessTradeoffAnalysisSchema(BaseModel):
    metrics: List[MetricTradeoffSchema]
    improvedCount: int
    worsenedCount: int
    unchangedCount: int

class UtilityTradeoffAnalysisSchema(BaseModel):
    metrics: List[MetricTradeoffSchema]
    improvedCount: int
    worsenedCount: int
    unchangedCount: int

class FairnessUtilityRequest(BaseModel):
    beforeAfterResult: Dict[str, Any]
    threshold: Optional[float] = 0.01

class FairnessUtilityResponse(BaseModel):
    success: bool
    status: str
    threshold: float
    fairnessAnalysis: FairnessTradeoffAnalysisSchema
    utilityAnalysis: UtilityTradeoffAnalysisSchema
    tradeoffClassification: str
    overallInterpretation: str
    methodologyNotes: List[str]

class GenerateReportRequest(BaseModel):
    audit: Dict[str, Any]

class GenerateReportResponse(BaseModel):
    success: bool
    status: str
    report: Dict[str, Any]
    htmlReport: str
    missingPhases: Optional[List[str]] = None






