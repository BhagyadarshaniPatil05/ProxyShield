const axios = require('axios');

const getMlServiceUrl = () => process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Validates that all required pipeline phases are completed in the audit object.
 * Returns an array of missing phase names, if any.
 */
const validateAuditReadiness = (audit) => {
  const missing = [];
  if (!audit.baselineResult) missing.push('Phase 3: Baseline Model Training');
  if (!audit.fairnessResult) missing.push('Phase 4: Baseline Fairness Analysis');
  if (!audit.proxyCapacityResult) missing.push('Phase 5: Proxy Capacity Analysis');
  if (!audit.proxyUseResult) missing.push('Phase 6: Proxy Use Analysis');
  if (!audit.featureAblationResult) missing.push('Phase 7: Controlled Feature Ablation');
  if (!audit.fairnessImpactResult) missing.push('Phase 8: Fairness Impact Analysis');
  if (!audit.interventionResult) missing.push('Phase 9: Proxy Intervention Configuration');
  if (!audit.mitigatedModelResult) missing.push('Phase 10: Mitigated Model Training');
  if (!audit.beforeAfterResult) missing.push('Phase 11: Before vs After Comparison');
  if (!audit.fairnessUtilityResult) missing.push('Phase 12: Fairness–Utility Trade-off Analysis');
  return missing;
};

/**
 * Sends audit object to FastAPI POST /generate-report
 */
const generateReportWithMlService = async (auditObject) => {
  const missing = validateAuditReadiness(auditObject);
  if (missing.length > 0) {
    return {
      success: false,
      status: 'REPORT_NOT_READY',
      missingPhases: missing,
      error: `Report cannot be generated. Missing required pipeline phases: ${missing.join(', ')}`
    };
  }

  try {
    const mlUrl = getMlServiceUrl();
    const response = await axios.post(
      `${mlUrl}/generate-report`,
      { audit: auditObject },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );

    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(`ML Service Error: ${error.response.data.detail}`);
    }
    throw new Error(`Failed to communicate with ML service report generation: ${error.message}`);
  }
};

module.exports = {
  validateAuditReadiness,
  generateReportWithMlService
};
