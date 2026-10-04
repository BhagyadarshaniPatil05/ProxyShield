const storageService = require('../services/storageService');
const { evaluateInterventionWithMlService } = require('../services/interventionService');

/**
 * @desc Execute Proxy Intervention analysis for an audit
 * @route POST /api/audits/:id/intervention
 */
const runInterventionAnalysis = async (req, res, next) => {
  const { id } = req.params;
  const { selectedFeatures, selectedInterventionFeatures, strategy } = req.body;

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

    const validPriorStatuses = [
      'BASELINE_COMPLETED',
      'FAIRNESS_ANALYSIS_COMPLETED',
      'PROXY_CAPACITY_COMPLETED',
      'PROXY_USE_COMPLETED',
      'ABLATION_COMPLETED',
      'FAIRNESS_IMPACT_COMPLETED',
      'INTERVENTION_COMPLETED'
    ];

    if (!validPriorStatuses.includes(audit.status)) {
      return res.status(400).json({
        success: false,
        error: 'Prerequisite auditing phases must be completed before creating an intervention configuration.'
      });
    }

    const dataset = await storageService.getDatasetById(audit.datasetId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Associated dataset not found.'
      });
    }

    // Update status to INTERVENTION_RUNNING
    audit.status = 'INTERVENTION_RUNNING';
    await audit.save();

    try {
      const intervData = await evaluateInterventionWithMlService(
        dataset,
        audit.targetAttribute,
        audit.protectedAttribute,
        selectedFeatures
      );

      if (!intervData || !intervData.success) {
        throw new Error('ML Service returned an unsuccessful proxy intervention analysis.');
      }

      // If user explicitly provided selectedInterventionFeatures, override candidates' selected state
      let userSelected = selectedInterventionFeatures || selectedFeatures || intervData.selectedFeatures || [];
      const candidates = (intervData.candidates || []).map((c) => {
        const featName = c.featureName || c.feature;
        const isUserSel = userSelected.includes(featName);
        return {
          ...c,
          selected: isUserSel || (selectedInterventionFeatures ? false : c.selected)
        };
      });

      const finalSelectedList = candidates.filter((c) => c.selected).map((c) => c.featureName || c.feature);

      audit.interventionResult = {
        status: 'COMPLETED',
        targetAttribute: intervData.targetAttribute,
        protectedAttribute: intervData.protectedAttribute,
        candidateFeatureCount: intervData.candidateFeatureCount,
        recommendedFeatureCount: intervData.recommendedFeatureCount,
        strategy: strategy || intervData.strategy || 'REMOVE_FEATURE',
        selectedFeatures: finalSelectedList.length > 0 ? finalSelectedList : userSelected,
        decisionStatus: 'PENDING_HUMAN_REVIEW',
        candidates,
        features: candidates,
        completedAt: new Date()
      };
      audit.status = 'INTERVENTION_COMPLETED';
      await audit.save();

      return res.status(200).json({
        success: true,
        audit: {
          id: audit._id,
          status: audit.status,
          interventionResult: audit.interventionResult
        }
      });

    } catch (evalError) {
      audit.status = 'FAILED';
      audit.errorMessage = evalError.message || 'Proxy intervention analysis failed.';
      await audit.save();

      return res.status(500).json({
        success: false,
        error: evalError.message || 'Error executing proxy intervention analysis.'
      });
    }

  } catch (error) {
    next(error);
  }
};

/**
 * @desc Retrieve Proxy Intervention analysis results
 * @route GET /api/audits/:id/intervention
 */
const getInterventionResults = async (req, res, next) => {
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
  runInterventionAnalysis,
  getInterventionResults
};
