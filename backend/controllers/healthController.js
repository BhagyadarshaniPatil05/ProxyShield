const mlService = require('../services/mlService');

/**
 * @desc Get Node.js Backend Health Status
 * @route GET /api/health
 */
const getBackendHealth = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'ProxyShield Backend'
  });
};

/**
 * @desc Get Python FastAPI ML Service Health via Node Backend Proxy
 * @route GET /api/ml/health
 */
const getMlServiceHealth = async (req, res, next) => {
  try {
    const mlHealth = await mlService.getMlHealth();
    res.status(200).json(mlHealth);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'ProxyShield ML Service Proxy',
      message: error.message
    });
  }
};

module.exports = {
  getBackendHealth,
  getMlServiceHealth
};
