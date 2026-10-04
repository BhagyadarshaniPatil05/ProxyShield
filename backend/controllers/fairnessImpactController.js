const storageService = require('../services/storageService');
const { evaluateFairnessImpactWithMlService } = require('../services/fairnessImpactService');

/**
 * @desc Execute Fairness Impact Analysis for an audit
 * @route POST /api/audits/:id/fairness-impact
 */
const runFairnessImpactAnalysis = async (req, res, next) => {
  const { id } = req.params;
  const { selectedFeatures, referenceGroup } = req.body;

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

    if (!audit.status.includes('COMPLETED') && audit.status !== 'BASELINE_COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Baseline model training and prerequisite analysis must be completed before running fairness impact analysis.'
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

    // Resolve reference group from body or prior fairness analysis
    const refGroup = referenceGroup || audit.fairnessResult?.referenceGroup || null;

    // Update status to FAIRNESS_IMPACT_RUNNING
    audit.status = 'FAIRNESS_IMPACT_RUNNING';
    await storageService.saveAudit(audit);

    try {
      const impactData = await evaluateFairnessImpactWithMlService(
        dataset,
        audit.targetAttribute,
        audit.protectedAttribute,
        audit.modelType,
        selectedFeatures,
        refGroup
      );

      if (!impactData || !impactData.success) {
        throw new Error('ML Service returned an unsuccessful fairness impact analysis.');
      }

      audit.fairnessImpactResult = {
        status: 'COMPLETED',
        modelType: impactData.modelType,
        targetAttribute: impactData.targetAttribute,
        protectedAttribute: impactData.protectedAttribute,
        referenceGroup: impactData.referenceGroup,
        comparisonGroups: impactData.comparisonGroups || [],
        testRows: impactData.testRows || 0,
        candidateFeatureCount: impactData.candidateFeatureCount,
        baselineFairness: impactData.baselineFairness || {},
        baselineGroupMetrics: impactData.baselineGroupMetrics || [],
        experiments: impactData.experiments || [],
        features: impactData.experiments || [],
        completedAt: new Date().toISOString()
      };
      audit.status = 'FAIRNESS_IMPACT_COMPLETED';
      audit.errorMessage = null;
      await storageService.saveAudit(audit);

      return res.status(200).json({
        success: true,
        audit
      });

    } catch (evalError) {
      audit.status = 'FAILED';
      audit.errorMessage = evalError.message || 'Fairness impact analysis failed.';
      await storageService.saveAudit(audit);

      return res.status(500).json({
        success: false,
        error: evalError.message || 'Error executing fairness impact analysis.'
      });
    }

  } catch (error) {
    next(error);
  }
};

/**
 * @desc Retrieve Fairness Impact Analysis results
 * @route GET /api/audits/:id/fairness-impact
 */
const getFairnessImpactResults = async (req, res, next) => {
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
  runFairnessImpactAnalysis,
  getFairnessImpactResults
};
