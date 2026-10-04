const storageService = require('../services/storageService');
const { evaluateProxyUseWithMlService } = require('../services/proxyUseService');

/**
 * @desc Execute proxy use / model reliance analysis for an audit
 * @route POST /api/audits/:id/proxy-use
 */
const runProxyUseAnalysis = async (req, res, next) => {
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

    if (!['BASELINE_COMPLETED', 'FAIRNESS_ANALYSIS_COMPLETED', 'PROXY_CAPACITY_COMPLETED', 'PROXY_USE_COMPLETED'].includes(audit.status) && !audit.status.includes('COMPLETED')) {
      return res.status(400).json({
        success: false,
        error: 'Baseline model training must be completed before running proxy use analysis.'
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

    // Update status to PROXY_USE_RUNNING
    audit.status = 'PROXY_USE_RUNNING';
    await storageService.saveAudit(audit);

    try {
      const proxyUseData = await evaluateProxyUseWithMlService(
        dataset,
        audit.targetAttribute,
        audit.protectedAttribute,
        audit.modelType,
        selectedFeatures
      );

      if (!proxyUseData || !proxyUseData.success) {
        throw new Error('ML Service returned an unsuccessful proxy use analysis.');
      }

      audit.proxyUseResult = {
        status: 'COMPLETED',
        modelType: proxyUseData.modelType,
        targetAttribute: proxyUseData.targetAttribute,
        protectedAttribute: proxyUseData.protectedAttribute,
        candidateFeatureCount: proxyUseData.candidateFeatureCount,
        candidateFeatures: proxyUseData.candidateFeatures,
        completedAt: new Date().toISOString()
      };
      audit.status = 'PROXY_USE_COMPLETED';
      audit.errorMessage = null;
      await storageService.saveAudit(audit);

      return res.status(200).json({
        success: true,
        audit
      });

    } catch (evalError) {
      audit.status = 'FAILED';
      audit.errorMessage = evalError.message || 'Proxy use analysis evaluation failed.';
      await storageService.saveAudit(audit);

      return res.status(500).json({
        success: false,
        error: evalError.message || 'Error executing proxy use analysis.'
      });
    }

  } catch (error) {
    next(error);
  }
};

/**
 * @desc Retrieve proxy use / model reliance analysis results
 * @route GET /api/audits/:id/proxy-use
 */
const getProxyUseResults = async (req, res, next) => {
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
  runProxyUseAnalysis,
  getProxyUseResults
};
