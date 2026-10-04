const axios = require('axios');

const getMlServiceUrl = () => process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Sends Phase 11 beforeAfterResult + threshold to FastAPI POST /fairness-utility
 */
const analyzeFairnessUtilityWithMlService = async (beforeAfterResult, threshold = 0.01) => {
  if (!beforeAfterResult || beforeAfterResult.status !== 'COMPLETED') {
    throw new Error('Invalid or uncompleted beforeAfterResult provided for fairness-utility analysis.');
  }

  try {
    const mlUrl = getMlServiceUrl();
    const response = await axios.post(
      `${mlUrl}/fairness-utility`,
      {
        beforeAfterResult,
        threshold: threshold !== undefined && threshold !== null ? Number(threshold) : 0.01
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(`ML Service Error: ${error.response.data.detail}`);
    }
    throw new Error(`Failed to communicate with ML service fairness-utility analysis: ${error.message}`);
  }
};

module.exports = {
  analyzeFairnessUtilityWithMlService
};
