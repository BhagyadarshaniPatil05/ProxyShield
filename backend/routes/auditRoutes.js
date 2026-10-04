const express = require('express');
const router = express.Router();
const {
  createAudit,
  getAllAudits,
  getAuditById,
  trainBaselineAudit,
  getAuditResults
} = require('../controllers/auditController');
const {
  runFairnessAnalysis,
  getFairnessResults
} = require('../controllers/fairnessController');
const {
  runProxyCapacityAnalysis,
  getProxyCapacityResults
} = require('../controllers/proxyController');
const {
  runProxyUseAnalysis,
  getProxyUseResults
} = require('../controllers/proxyUseController');
const {
  runFeatureAblationAnalysis,
  getAblationResults
} = require('../controllers/ablationController');
const {
  runFairnessImpactAnalysis,
  getFairnessImpactResults
} = require('../controllers/fairnessImpactController');
const {
  runInterventionAnalysis,
  getInterventionResults
} = require('../controllers/interventionController');
const {
  runMitigatedModelTraining,
  getMitigatedModelResults
} = require('../controllers/mitigatedModelController');
const {
  runBeforeAfterComparison,
  getBeforeAfterResults
} = require('../controllers/beforeAfterController');
const {
  runFairnessUtilityAnalysis,
  getFairnessUtilityResults
} = require('../controllers/fairnessUtilityController');
const {
  generateAuditReport,
  getAuditReportJson,
  getAuditReportHtml
} = require('../controllers/reportController');

router.post('/', createAudit);
router.get('/', getAllAudits);
router.get('/:id', getAuditById);
router.post('/:id/baseline', trainBaselineAudit);
router.get('/:id/results', getAuditResults);

// Phase 4 Fairness Analysis Routes
router.post('/:id/fairness', runFairnessAnalysis);
router.get('/:id/fairness', getFairnessResults);

// Phase 5 Proxy Capacity Analysis Routes
router.post('/:id/proxy-capacity', runProxyCapacityAnalysis);
router.get('/:id/proxy-capacity', getProxyCapacityResults);

// Phase 6 Proxy Use / Model Reliance Routes
router.post('/:id/proxy-use', runProxyUseAnalysis);
router.get('/:id/proxy-use', getProxyUseResults);

// Phase 7 Controlled Feature Ablation Routes
router.post('/:id/ablation', runFeatureAblationAnalysis);
router.get('/:id/ablation', getAblationResults);

// Phase 8 Fairness Impact Analysis Routes
router.post('/:id/fairness-impact', runFairnessImpactAnalysis);
router.get('/:id/fairness-impact', getFairnessImpactResults);

// Phase 9 Proxy Intervention Routes
router.post('/:id/intervention', runInterventionAnalysis);
router.get('/:id/intervention', getInterventionResults);

// Phase 10 Mitigated Model Training Routes
router.post('/:id/mitigated-model', runMitigatedModelTraining);
router.get('/:id/mitigated-model', getMitigatedModelResults);

// Phase 11 Before vs After Comparison Routes
router.post('/:id/before-after', runBeforeAfterComparison);
router.get('/:id/before-after', getBeforeAfterResults);

// Phase 12 Fairness-Utility Trade-off Routes
router.post('/:id/fairness-utility', runFairnessUtilityAnalysis);
router.get('/:id/fairness-utility', getFairnessUtilityResults);

// Phase 13 AI Fairness Audit Report Generation Routes
router.post('/:id/report', generateAuditReport);
router.get('/:id/report', getAuditReportJson);
router.get('/:id/report/html', getAuditReportHtml);

module.exports = router;

