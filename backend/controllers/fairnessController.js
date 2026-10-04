const storageService = require('../services/storageService');
const { evaluateFairnessWithMlService } = require('../services/fairnessService');

/**
 * @desc Execute group fairness analysis for an audit
 * @route POST /api/audits/:id/fairness
 */
const runFairnessAnalysis = async (req, res, next) => {
  const { id } = req.params;
  const { referenceGroup } = req.body;

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

    if (audit.status !== 'BASELINE_COMPLETED' && !audit.status.includes('COMPLETED')) {
      return res.status(400).json({
        success: false,
        error: 'Baseline model training must be completed before running fairness analysis.'
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

    // Update status to FAIRNESS_ANALYSIS_RUNNING
    audit.status = 'FAIRNESS_ANALYSIS_RUNNING';
    await storageService.saveAudit(audit);

    try {
      const fairnessData = await evaluateFairnessWithMlService(
        dataset,
        audit.targetAttribute,
        audit.protectedAttribute,
        audit.modelType,
        referenceGroup
      );

      if (!fairnessData || !fairnessData.success) {
        throw new Error('ML Service returned an unsuccessful fairness evaluation.');
      }

      audit.fairnessResult = {
        status: 'COMPLETED',
        protectedAttribute: fairnessData.protectedAttribute,
        referenceGroup: fairnessData.referenceGroup,
        comparisonGroups: fairnessData.comparisonGroups || [],
        metrics: fairnessData.metrics || {},
        groupMetrics: fairnessData.groupMetrics || [],
        createdAt: new Date().toISOString()
      };
      audit.status = 'FAIRNESS_ANALYSIS_COMPLETED';
      audit.errorMessage = null;

      await storageService.saveAudit(audit);

      return res.status(200).json({
        success: true,
        audit
      });
    } catch (mlErr) {
      audit.status = 'FAILED';
      audit.errorMessage = mlErr.message;
      await storageService.saveAudit(audit);

      return res.status(400).json({
        success: false,
        error: mlErr.message || 'Fairness analysis failed.'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get fairness analysis results for an audit
 * @route GET /api/audits/:id/fairness
 */
const getFairnessResults = async (req, res, next) => {
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

    if (!audit.fairnessResult) {
      return res.status(200).json({
        success: true,
        status: 'NOT_ANALYZED',
        audit
      });
    }

    return res.status(200).json({
      success: true,
      status: audit.fairnessResult.status,
      fairness: audit.fairnessResult,
      audit
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  runFairnessAnalysis,
  getFairnessResults
};
