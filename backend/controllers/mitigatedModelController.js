const storageService = require('../services/storageService');
const { trainMitigatedModelWithMlService } = require('../services/mitigatedModelService');

/**
 * @desc Execute Phase 10 Mitigated Model Training for an audit
 * @route POST /api/audits/:id/mitigated-model
 */
const runMitigatedModelTraining = async (req, res, next) => {
  const { id } = req.params;
  const { selectedFeatures: reqSelectedFeatures, strategy: reqStrategy } = req.body || {};

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

    // Must have completed Phase 9 intervention configuration or prerequisite baseline
    if (!audit.interventionResult && !reqSelectedFeatures) {
      return res.status(400).json({
        success: false,
        error: 'No intervention configuration found. Please run Phase 9 Proxy Intervention analysis first.'
      });
    }

    const selectedFeatures = reqSelectedFeatures || (audit.interventionResult && audit.interventionResult.selectedFeatures) || [];
    const strategy = reqStrategy || (audit.interventionResult && audit.interventionResult.strategy) || 'REMOVE_FEATURE';

    if (!selectedFeatures || !Array.isArray(selectedFeatures) || selectedFeatures.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No selected features found in intervention configuration.'
      });
    }

    if (strategy !== 'REMOVE_FEATURE') {
      return res.status(400).json({
        success: false,
        error: 'Unsupported intervention strategy. Only REMOVE_FEATURE is supported.'
      });
    }

    if (selectedFeatures.includes(audit.targetAttribute)) {
      return res.status(400).json({
        success: false,
        error: 'Target attribute cannot be removed as an intervention feature.'
      });
    }

    if (selectedFeatures.includes(audit.protectedAttribute)) {
      return res.status(400).json({
        success: false,
        error: 'Protected attribute cannot be removed as a proxy intervention because it is reserved for fairness auditing.'
      });
    }

    const dataset = await storageService.getDatasetById(audit.datasetId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Associated dataset not found.'
      });
    }

    // Update status to MITIGATED_MODEL_RUNNING
    audit.status = 'MITIGATED_MODEL_RUNNING';
    await audit.save();

    try {
      const mitigatedData = await trainMitigatedModelWithMlService(
        dataset,
        audit.targetAttribute,
        audit.protectedAttribute,
        audit.modelType,
        selectedFeatures,
        strategy
      );

      if (!mitigatedData || !mitigatedData.success) {
        throw new Error('ML Service returned an unsuccessful mitigated model training response.');
      }

      audit.mitigatedModelResult = {
        status: 'COMPLETED',
        strategy: mitigatedData.strategy,
        selectedFeatures: mitigatedData.selectedFeatures,
        removedFeatures: mitigatedData.removedFeatures,
        modelType: mitigatedData.modelType,
        targetAttribute: mitigatedData.targetAttribute,
        protectedAttribute: mitigatedData.protectedAttribute,
        trainRows: mitigatedData.trainRows,
        testRows: mitigatedData.testRows,
        originalFeatureCount: mitigatedData.originalFeatureCount,
        mitigatedFeatureCount: mitigatedData.mitigatedFeatureCount,
        removedFeatureCount: mitigatedData.removedFeatureCount,
        performance: mitigatedData.performance,
        testPredictions: mitigatedData.testPredictions || [],
        testTrue: mitigatedData.testTrue || [],
        completedAt: new Date()
      };
      audit.status = 'MITIGATED_MODEL_COMPLETED';
      await audit.save();

      return res.status(200).json({
        success: true,
        audit: {
          id: audit._id,
          status: audit.status,
          mitigatedModelResult: audit.mitigatedModelResult
        }
      });

    } catch (trainError) {
      audit.status = 'MITIGATED_MODEL_FAILED';
      audit.errorMessage = trainError.message || 'Mitigated model training failed.';
      await audit.save();

      const statusCode = trainError.message && trainError.message.includes('ML Service Error') ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        error: trainError.message || 'Error executing mitigated model training.'
      });
    }

  } catch (error) {
    next(error);
  }
};

/**
 * @desc Retrieve Mitigated Model Training results
 * @route GET /api/audits/:id/mitigated-model
 */
const getMitigatedModelResults = async (req, res, next) => {
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
  runMitigatedModelTraining,
  getMitigatedModelResults
};
