const storageService = require('../services/storageService');
const { trainBaselineWithMlService } = require('../services/auditService');

/**
 * @desc Create new baseline audit configuration
 * @route POST /api/audits
 */
const createAudit = async (req, res, next) => {
  const { datasetId, targetAttribute, protectedAttribute, modelType } = req.body;

  if (!datasetId || !targetAttribute || !protectedAttribute || !modelType) {
    return res.status(400).json({
      success: false,
      error: 'Please provide datasetId, targetAttribute, protectedAttribute, and modelType.'
    });
  }

  if (targetAttribute === protectedAttribute) {
    return res.status(400).json({
      success: false,
      error: 'Target and protected attributes must be different.'
    });
  }

  try {
    const dataset = await storageService.getDatasetById(datasetId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Selected dataset does not exist.'
      });
    }

    if (!dataset.columnNames.includes(targetAttribute)) {
      return res.status(400).json({
        success: false,
        error: `Target attribute '${targetAttribute}' does not exist in dataset.`
      });
    }

    if (!dataset.columnNames.includes(protectedAttribute)) {
      return res.status(400).json({
        success: false,
        error: `Protected attribute '${protectedAttribute}' does not exist in dataset.`
      });
    }

    const validModels = ['logistic_regression', 'decision_tree', 'random_forest'];
    if (!validModels.includes(modelType)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported model type '${modelType}'. Supported: ${validModels.join(', ')}`
      });
    }

    const audit = await storageService.createAudit({
      datasetId,
      targetAttribute,
      protectedAttribute,
      modelType,
      status: 'CONFIGURED'
    });

    return res.status(201).json({
      success: true,
      audit: {
        id: audit._id,
        _id: audit._id,
        datasetId: audit.datasetId,
        targetAttribute: audit.targetAttribute,
        protectedAttribute: audit.protectedAttribute,
        modelType: audit.modelType,
        status: audit.status,
        createdAt: audit.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get all audit runs
 * @route GET /api/audits
 */
const getAllAudits = async (req, res, next) => {
  try {
    const audits = await storageService.getAllAudits();

    return res.status(200).json({
      success: true,
      count: audits.length,
      audits
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get single audit details by ID
 * @route GET /api/audits/:id
 */
const getAuditById = async (req, res, next) => {
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
        error: id === 'latest' ? 'No audit tasks found. Please configure an audit first.' : 'Audit task not found.'
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

/**
 * @desc Execute baseline ML training for an audit
 * @route POST /api/audits/:id/baseline
 */
const trainBaselineAudit = async (req, res, next) => {
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

    const datasetId = typeof audit.datasetId === 'object' ? (audit.datasetId._id || audit.datasetId.id) : audit.datasetId;
    const dataset = await storageService.getDatasetById(datasetId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Associated dataset not found.'
      });
    }

    // Update status to TRAINING
    audit.status = 'TRAINING';
    await storageService.saveAudit(audit);

    // Call FastAPI ML Service
    try {
      const mlResult = await trainBaselineWithMlService(
        dataset,
        audit.targetAttribute,
        audit.protectedAttribute,
        audit.modelType
      );

      if (!mlResult || !mlResult.success) {
        throw new Error('ML Service returned an unsuccessful training response.');
      }

      audit.status = 'BASELINE_COMPLETED';
      audit.preprocessingSummary = mlResult.preprocessingSummary || '';
      audit.baselineResult = {
        modelType: mlResult.model?.type || audit.modelType,
        trainRows: mlResult.model?.trainRows || 0,
        testRows: mlResult.model?.testRows || 0,
        featureCount: mlResult.model?.featureCount || 0,
        accuracy: mlResult.performance?.accuracy || 0,
        precision: mlResult.performance?.precision || 0,
        recall: mlResult.performance?.recall || 0,
        f1: mlResult.performance?.f1 || 0,
        rocAuc: mlResult.performance?.rocAuc !== undefined ? mlResult.performance.rocAuc : null,
        confusionMatrix: mlResult.performance?.confusionMatrix || []
      };
      audit.completedAt = new Date().toISOString();
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
        error: mlErr.message || 'Baseline ML training failed.'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get audit baseline results
 * @route GET /api/audits/:id/results
 */
const getAuditResults = async (req, res, next) => {
  return getAuditById(req, res, next);
};

module.exports = {
  createAudit,
  getAllAudits,
  getAuditById,
  trainBaselineAudit,
  getAuditResults
};
