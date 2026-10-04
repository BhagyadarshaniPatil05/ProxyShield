const storageService = require('../services/storageService');

const ALLOWED_DECISIONS = ['APPROVED', 'CONDITIONAL', 'REJECTED', 'NEEDS_ANALYSIS'];

/**
 * @desc Save Human Review determination for an audit
 * @route POST /api/audits/:id/review
 */
const saveHumanReview = async (req, res, next) => {
  const { id } = req.params;
  const { decision, notes } = req.body || {};

  if (!storageService.isValidId(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid audit ID format.'
    });
  }

  if (!decision || !ALLOWED_DECISIONS.includes(decision)) {
    return res.status(400).json({
      success: false,
      error: `Invalid review decision. Allowed values: ${ALLOWED_DECISIONS.join(', ')}`
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

    audit.reviewResult = {
      status: 'COMPLETED',
      decision,
      notes: typeof notes === 'string' ? notes : (notes || ''),
      reviewedAt: new Date().toISOString()
    };

    await audit.save();

    return res.status(200).json({
      success: true,
      audit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Retrieve Human Review determination for an audit
 * @route GET /api/audits/:id/review
 */
const getHumanReview = async (req, res, next) => {
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
      reviewResult: audit.reviewResult || null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  saveHumanReview,
  getHumanReview
};
