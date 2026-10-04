const storageService = require('../services/storageService');
const { compareBeforeAfterWithMlService } = require('../services/beforeAfterService');

/**
 * @desc Execute Phase 11 Before vs After Comparison for an audit
 * @route POST /api/audits/:id/before-after
 */
const runBeforeAfterComparison = async (req, res, next) => {
  const { id } = req.params;
  const { referenceGroup: reqRefGroup } = req.body || {};

  if (!storageService.isValidId(id)) {
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

    if (!audit.baselineResult) {
      return res.status(400).json({
        success: false,
        error: 'Missing baseline model training result. Please run Phase 3 Baseline Model training first.'
      });
    }

    if (!audit.fairnessResult) {
      return res.status(400).json({
        success: false,
        error: 'Missing baseline fairness analysis result. Please run Phase 4 Baseline Fairness analysis first.'
      });
    }

    if (!audit.interventionResult) {
      return res.status(400).json({
        success: false,
        error: 'Missing proxy intervention configuration. Please run Phase 9 Proxy Intervention analysis first.'
      });
    }

    if (!audit.mitigatedModelResult) {
      return res.status(400).json({
        success: false,
        error: 'Missing mitigated model training result. Please run Phase 10 Mitigated Model training first.'
      });
    }

    const selectedFeatures = audit.mitigatedModelResult.selectedFeatures || audit.interventionResult.selectedFeatures || [];
    const strategy = audit.mitigatedModelResult.strategy || audit.interventionResult.strategy || 'REMOVE_FEATURE';
    const referenceGroup = reqRefGroup || (audit.fairnessResult && audit.fairnessResult.referenceGroup) || null;

    if (!selectedFeatures || !Array.isArray(selectedFeatures) || selectedFeatures.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No intervention features found in mitigated model or intervention configuration.'
      });
    }

    const dataset = await storageService.getDatasetById(audit.datasetId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Associated dataset not found.'
      });
    }

    // Update status to BEFORE_AFTER_RUNNING
    audit.status = 'BEFORE_AFTER_RUNNING';
    await audit.save();

    try {
      const compData = await compareBeforeAfterWithMlService(
        dataset,
        audit.targetAttribute,
        audit.protectedAttribute,
        audit.modelType,
        selectedFeatures,
        strategy,
        referenceGroup
      );

      if (!compData || !compData.success) {
        throw new Error('ML Service returned an unsuccessful before vs after comparison response.');
      }

      audit.beforeAfterResult = {
        status: 'COMPLETED',
        referenceGroup: compData.referenceGroup,
        comparisonGroups: compData.comparisonGroups || [],
        baseline: compData.baseline,
        mitigated: compData.mitigated,
        performanceDelta: compData.performanceDelta,
        fairnessDelta: compData.fairnessDelta,
        metricInterpretations: compData.metricInterpretations,
        fairnessInterpretation: compData.fairnessInterpretation,
        fairnessInterpretationDetails: compData.fairnessInterpretationDetails,
        performanceInterpretation: compData.performanceInterpretation,
        performanceInterpretationDetails: compData.performanceInterpretationDetails,
        methodologyNotes: compData.methodologyNotes || [],
        completedAt: new Date()
      };
      audit.status = 'BEFORE_AFTER_COMPLETED';
      await audit.save();

      return res.status(200).json({
        success: true,
        audit: {
          id: audit._id,
          status: audit.status,
          beforeAfterResult: audit.beforeAfterResult
        }
      });

    } catch (compError) {
      audit.status = 'BEFORE_AFTER_FAILED';
      audit.errorMessage = compError.message || 'Before vs after comparison failed.';
      await audit.save();

      const statusCode = compError.message && compError.message.includes('ML Service Error') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        error: compError.message || 'Error executing before vs after comparison.'
      });
    }

  } catch (error) {
    next(error);
  }
};

/**
 * @desc Retrieve Before vs After Comparison results
 * @route GET /api/audits/:id/before-after
 */
const getBeforeAfterResults = async (req, res, next) => {
  const { id } = req.params;

  if (!storageService.isValidId(id)) {
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
  runBeforeAfterComparison,
  getBeforeAfterResults
};
