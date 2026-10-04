const axios = require('axios');

const getMlServiceUrl = () => process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Calls the Python FastAPI ML Service health endpoint.
 */
const getMlHealth = async () => {
  try {
    const mlUrl = getMlServiceUrl();
    const response = await axios.get(`${mlUrl}/health`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error(`[mlService] Error reaching ML service at ${getMlServiceUrl()}:`, error.message);
    throw new Error(`ML Service unreachable: ${error.message}`);
  }
};

module.exports = {
  getMlHealth
};
