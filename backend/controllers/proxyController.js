const storageService = require('../services/storageService');
const { evaluateProxyCapacityWithMlService } = require('../services/proxyService');

/**
 * @desc Execute proxy capacity analysis for an audit
 * @route POST /api/audits/:id/proxy-capacity
 */
const runProxyCapacityAnalysis = async (req, res, next) => {
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

    if (!['BASELINE_COMPLETED', 'FAIRNESS_ANALYSIS_COMPLETED', 'PROXY_CAPACITY_COMPLETED'].includes(audit.status) && !audit.status.includes('COMPLETED')) {
      return res.status(400).json({
        success: false,
        error: 'Baseline model training must be completed before running proxy capacity analysis.'
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

    // Update status to PROXY_CAPACITY_RUNNING
    audit.status = 'PROXY_CAPACITY_RUNNING';
    await storageService.saveAudit(audit);

    try {
      const proxyData = await evaluateProxyCapacityWithMlService(
        dataset,
        audit.targetAttribute,
        audit.protectedAttribute
      );

      if (!proxyData || !proxyData.success) {
        throw new Error('ML Service returned an unsuccessful proxy capacity analysis.');
      }

      audit.proxyCapacityResult = {
        status: 'COMPLETED',
        protectedAttribute: proxyData.protectedAttribute,
        targetAttribute: proxyData.targetAttribute,
        candidateFeatureCount: proxyData.candidateFeatureCount,
        baselinePredictability: proxyData.baselinePredictability,
        results: proxyData.results,
        completedAt: new Date().toISOString()
      };
      audit.status = 'PROXY_CAPACITY_COMPLETED';
      audit.errorMessage = null;
      await storageService.saveAudit(audit);

      return res.status(200).json({
        success: true,
        audit
      });

    } catch (evalError) {
      audit.status = 'FAILED';
      audit.errorMessage = evalError.message || 'Proxy capacity analysis evaluation failed.';
      await storageService.saveAudit(audit);

      return res.status(500).json({
        success: false,
        error: evalError.message || 'Error executing proxy capacity analysis.'
      });
    }

  } catch (error) {
    next(error);
  }
};

/**
 * @desc Retrieve proxy capacity analysis results
 * @route GET /api/audits/:id/proxy-capacity
 */
const getProxyCapacityResults = async (req, res, next) => {
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
  runProxyCapacityAnalysis,
  getProxyCapacityResults
};
