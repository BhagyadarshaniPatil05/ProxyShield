const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const getMlServiceUrl = () => process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Sends dataset CSV stream + audit parameters to FastAPI POST /train-baseline
 * @param {object} datasetDoc Mongoose Dataset document
 * @param {string} targetAttribute Target column name Y
 * @param {string} protectedAttribute Sensitive protected column name A
 * @param {string} modelType Classifier type ('logistic_regression', 'decision_tree', 'random_forest')
 */
const trainBaselineWithMlService = async (datasetDoc, targetAttribute, protectedAttribute, modelType) => {
  const tempDatasetPath = path.join(__dirname, `../../data/temp/datasets/${datasetDoc._id}.csv`);

  let fileStream;

  if (fs.existsSync(tempDatasetPath)) {
    fileStream = fs.createReadStream(tempDatasetPath);
  } else if (datasetDoc.preview && datasetDoc.preview.length > 0) {
    // Reconstruct CSV stream from stored preview records if cached file is unavailable
    const keys = datasetDoc.columnNames && datasetDoc.columnNames.length > 0
      ? datasetDoc.columnNames
      : Object.keys(datasetDoc.preview[0]);
    
    const csvHeader = keys.join(',') + '\n';
    const csvRows = datasetDoc.preview.map(row => 
      keys.map(k => {
        const val = row[k];
        return val === null || val === undefined ? '' : String(val);
      }).join(',')
    ).join('\n');

    const csvContent = csvHeader + csvRows;
    fileStream = Buffer.from(csvContent, 'utf-8');
  } else {
    throw new Error('Dataset CSV content unavailable for model training.');
  }

  try {
    const formData = new FormData();
    formData.append('file', fileStream, {
      filename: datasetDoc.originalFileName || 'dataset.csv',
      contentType: 'text/csv',
    });
    formData.append('target_attribute', targetAttribute);
    formData.append('protected_attribute', protectedAttribute);
    formData.append('model_type', modelType);

    const mlUrl = getMlServiceUrl();
    const response = await axios.post(`${mlUrl}/train-baseline`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000,
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(`ML Training Error: ${error.response.data.detail}`);
    }
    console.error('[auditService] ML Training call failed:', error.message);
    throw new Error(`Baseline ML training failed: ${error.message}`);
  }
};

module.exports = {
  trainBaselineWithMlService,
};
