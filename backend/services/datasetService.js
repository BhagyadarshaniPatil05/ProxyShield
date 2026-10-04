const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const getMlServiceUrl = () => process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Sends a CSV file stream to the Python FastAPI ML Service for dataset inspection.
 * @param {string} filePath Absolute or relative path to the temporary CSV file.
 * @param {string} originalFileName Original filename.
 * @returns {Promise<object>} Inspection payload from Python ML service.
 */
const inspectDatasetWithMlService = async (filePath, originalFileName) => {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), {
      filename: originalFileName,
      contentType: 'text/csv',
    });

    const mlUrl = getMlServiceUrl();
    const response = await axios.post(`${mlUrl}/inspect-dataset`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(`ML Inspection Error: ${error.response.data.detail}`);
    }
    console.error('[datasetService] ML Inspection call failed:', error.message);
    throw new Error(`Dataset inspection service failed: ${error.message}`);
  }
};

module.exports = {
  inspectDatasetWithMlService,
};
