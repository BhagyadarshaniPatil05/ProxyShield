const storageService = require('../services/storageService');
const { analyzeFairnessUtilityWithMlService } = require('../services/fairnessUtilityService');

/**
 * @desc Execute Phase 12 Fairness-Utility Trade-off Analysis for an audit
 * @route POST /api/audits/:id/fairness-utility
 */
const runFairnessUtilityAnalysis = async (req, res, next) => {
  const { id } = req.params;
  const { threshold: reqThreshold } = req.body || {};

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

    if (!audit.beforeAfterResult || audit.beforeAfterResult.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Missing or uncompleted Phase 11 before-after comparison result. Please run Phase 11 Before vs After Comparison first.'
      });
    }

    const threshold = reqThreshold !== undefined && reqThreshold !== null ? Number(reqThreshold) : 0.01;

    // Update status to FAIRNESS_UTILITY_RUNNING
    audit.status = 'FAIRNESS_UTILITY_RUNNING';
    await audit.save();

    try {
      const data = await analyzeFairnessUtilityWithMlService(audit.beforeAfterResult, threshold);

      if (!data || !data.success) {
        throw new Error('ML Service returned an unsuccessful fairness-utility analysis response.');
      }

      audit.fairnessUtilityResult = {
        status: 'COMPLETED',
        threshold: data.threshold || threshold,
        fairnessAnalysis: data.fairnessAnalysis,
        utilityAnalysis: data.utilityAnalysis,
        tradeoffClassification: data.tradeoffClassification,
        overallInterpretation: data.overallInterpretation,
        methodologyNotes: data.methodologyNotes || [],
        completedAt: new Date()
      };
      audit.status = 'FAIRNESS_UTILITY_COMPLETED';
      await audit.save();

      return res.status(200).json({
        success: true,
        audit: {
          id: audit._id,
          status: audit.status,
          fairnessUtilityResult: audit.fairnessUtilityResult
        }
      });

    } catch (analysisError) {
      audit.status = 'FAIRNESS_UTILITY_FAILED';
      audit.errorMessage = analysisError.message || 'Fairness-utility trade-off analysis failed.';
      await audit.save();

      const statusCode = analysisError.message && analysisError.message.includes('ML Service Error') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        error: analysisError.message || 'Error executing fairness-utility trade-off analysis.'
      });
    }

  } catch (error) {
    next(error);
  }
};

/**
 * @desc Retrieve Fairness-Utility Trade-off Analysis results
 * @route GET /api/audits/:id/fairness-utility
 */
const getFairnessUtilityResults = async (req, res, next) => {
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
  runFairnessUtilityAnalysis,
  getFairnessUtilityResults
};
