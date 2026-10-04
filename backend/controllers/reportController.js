const storageService = require('../services/storageService');
const { generateReportWithMlService, validateAuditReadiness } = require('../services/reportService');

/**
 * @desc Generate Phase 13 AI Fairness Audit Report for an audit
 * @route POST /api/audits/:id/report
 */
const generateAuditReport = async (req, res, next) => {
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

    const missingPhases = validateAuditReadiness(audit);
    if (missingPhases.length > 0) {
      return res.status(400).json({
        success: false,
        status: 'REPORT_NOT_READY',
        missingPhases,
        error: `Cannot generate report because required pipeline phases are incomplete: ${missingPhases.join(', ')}`
      });
    }

    audit.status = 'REPORT_GENERATING';
    await audit.save();

    try {
      const dataset = audit.datasetId ? await storageService.getDatasetById(audit.datasetId) : null;
      const auditPayload = { ...audit };
      auditPayload.id = (audit._id || audit.id).toString();
      if (dataset) {
        auditPayload.datasetSummary = {
          name: dataset.name || dataset.originalName,
          rowCount: dataset.rowCount,
          columnCount: dataset.columnCount,
          totalMissingValues: dataset.totalMissingValues || 0,
          duplicateRowCount: dataset.duplicateRowCount || 0,
          columns: dataset.columns || []
        };
      }

      const mlRes = await generateReportWithMlService(auditPayload);

      if (!mlRes || !mlRes.success) {
        throw new Error(mlRes.error || 'ML Service returned an unsuccessful report response.');
      }

      audit.reportResult = {
        status: 'REPORT_GENERATED',
        reportData: mlRes.report,
        htmlReport: mlRes.htmlReport,
        completedAt: new Date()
      };
      audit.status = 'REPORT_GENERATED';
      await audit.save();

      return res.status(200).json({
        success: true,
        audit: {
          id: audit._id,
          status: audit.status,
          reportResult: audit.reportResult
        }
      });

    } catch (genErr) {
      audit.status = 'REPORT_FAILED';
      audit.errorMessage = genErr.message || 'Audit report generation failed.';
      await audit.save();

      return res.status(500).json({
        success: false,
        error: genErr.message || 'Failed to generate audit report.'
      });
    }

  } catch (error) {
    next(error);
  }
};

/**
 * @desc Retrieve JSON report data model
 * @route GET /api/audits/:id/report
 */
const getAuditReportJson = async (req, res, next) => {
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

    if (!audit.reportResult || audit.reportResult.status !== 'REPORT_GENERATED') {
      return res.status(404).json({
        success: false,
        error: 'Audit report has not been generated yet for this audit.'
      });
    }

    return res.status(200).json({
      success: true,
      report: audit.reportResult.reportData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Retrieve HTML printable report
 * @route GET /api/audits/:id/report/html
 */
const getAuditReportHtml = async (req, res, next) => {
  const { id } = req.params;

  if (!storageService.isValidId(id)) {
    return res.status(400).send('Invalid audit ID format.');
  }

  try {
    const audit = await storageService.getAuditById(id);
    if (!audit || !audit.reportResult || !audit.reportResult.htmlReport) {
      return res.status(404).send('<html><body><h1>404 Report Not Found</h1><p>The requested audit report has not been generated.</p></body></html>');
    }

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(audit.reportResult.htmlReport);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateAuditReport,
  getAuditReportJson,
  getAuditReportHtml
};
