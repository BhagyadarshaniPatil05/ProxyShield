const storageService = require('../services/storageService');
const { evaluateFeatureAblationWithMlService } = require('../services/ablationService');

/**
 * @desc Execute Controlled Feature Ablation analysis for an audit
 * @route POST /api/audits/:id/ablation
 */
const runFeatureAblationAnalysis = async (req, res, next) => {
  const { id } = req.params;
  const { selectedFeatures } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid audit ID format.'
    });
  }

  try {
    const audit = await storageService.getAuditById(id);
    if (!audit) {
      return res.status(404).json({
        success: false,
        error: 'Audit task not found.'
      });
    }

    if (!['BASELINE_COMPLETED', 'FAIRNESS_ANALYSIS_COMPLETED', 'PROXY_CAPACITY_COMPLETED', 'PROXY_USE_COMPLETED', 'ABLATION_COMPLETED'].includes(audit.status) && !audit.status.includes('COMPLETED')) {
      return res.status(400).json({
        success: false,
        error: 'Baseline model training must be completed before running feature ablation experiments.'
      });
    }

    const datasetId = typeof audit.datasetId === 'object' ? (audit.datasetId._id || audit.datasetId.id) : audit.datasetId;
    const dataset = await storageService.getDatasetById(datasetId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Associated dataset not found.'
      });
    }

    // Update status to ABLATION_RUNNING
    audit.status = 'ABLATION_RUNNING';
    await storageService.saveAudit(audit);

    try {
      const ablationData = await evaluateFeatureAblationWithMlService(
        dataset,
        audit.targetAttribute,
        audit.protectedAttribute,
        audit.modelType,
        selectedFeatures
      );

      if (!ablationData || !ablationData.success) {
        throw new Error('ML Service returned an unsuccessful feature ablation analysis.');
      }

      audit.featureAblationResult = {
        status: 'COMPLETED',
        modelType: ablationData.modelType,
        targetAttribute: ablationData.targetAttribute,
        protectedAttribute: ablationData.protectedAttribute,
        testRows: ablationData.testRows || ablationData.testSetSize || 0,
        candidateFeatureCount: ablationData.candidateFeatureCount,
        baselinePerformance: ablationData.baselinePerformance || null,
        features: ablationData.features || [],
        candidateFeatures: ablationData.features || [],
        completedAt: new Date().toISOString()
      };
      audit.status = 'ABLATION_COMPLETED';
      audit.errorMessage = null;
      await storageService.saveAudit(audit);

      return res.status(200).json({
        success: true,
        audit
      });

    } catch (evalError) {
      audit.status = 'FAILED';
      audit.errorMessage = evalError.message || 'Controlled feature ablation analysis failed.';
      await storageService.saveAudit(audit);

      return res.status(500).json({
        success: false,
        error: evalError.message || 'Error executing controlled feature ablation analysis.'
      });
    }

  } catch (error) {
    next(error);
  }
};

/**
 * @desc Retrieve Controlled Feature Ablation results
 * @route GET /api/audits/:id/ablation
 */
const getAblationResults = async (req, res, next) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid audit ID format.'
    });
  }

  try {
    const audit = await storageService.getAuditById(id);
    if (!audit) {
      return res.status(404).json({
        success: false,
        error: 'Audit task not found.'
      });
    }

    return res.status(200).json({
      success: true,
      audit
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  runFeatureAblationAnalysis,
  getAblationResults
};
